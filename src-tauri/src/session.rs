use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use uuid::Uuid;

/// Session data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub token: String,
    pub user_id: i64,
    pub username: String,
    pub created_at: u64,
    pub expires_at: u64,
    pub last_activity: u64,
}

/// Session manager with in-memory storage
pub struct SessionManager {
    sessions: Arc<Mutex<HashMap<String, Session>>>,
    failed_attempts: Arc<Mutex<HashMap<String, (u32, u64)>>>, // username -> (count, last_attempt_time)
    session_timeout: Duration,
    max_failed_attempts: u32,
    lockout_duration: Duration,
}

impl SessionManager {
    pub fn new() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            failed_attempts: Arc::new(Mutex::new(HashMap::new())),
            session_timeout: Duration::from_secs(24 * 60 * 60), // 24 hours
            max_failed_attempts: 5,
            lockout_duration: Duration::from_secs(15 * 60), // 15 minutes
        }
    }

    /// Create a new session
    pub fn create_session(&self, user_id: i64, username: String) -> AppResult<String> {
        let token = Uuid::new_v4().to_string();
        let now = current_timestamp();

        let session = Session {
            token: token.clone(),
            user_id,
            username,
            created_at: now,
            expires_at: now + self.session_timeout.as_secs(),
            last_activity: now,
        };

        let mut sessions = self.sessions.lock().unwrap();
        sessions.insert(token.clone(), session);

        Ok(token)
    }

    /// Validate session and update last activity
    pub fn validate_session(&self, token: &str) -> AppResult<Session> {
        let mut sessions = self.sessions.lock().unwrap();

        if token.is_empty() {
            return Err(AppError::session_invalid());
        }

        let session = sessions
            .get_mut(token)
            .ok_or_else(|| AppError::session_invalid())?;

        let now = current_timestamp();

        // Check if session expired
        if now > session.expires_at {
            sessions.remove(token);
            return Err(AppError::session_expired());
        }

        // Update last activity
        session.last_activity = now;

        Ok(session.clone())
    }

    /// Invalidate session (logout)
    pub fn invalidate_session(&self, token: &str) -> AppResult<()> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.remove(token);
        Ok(())
    }

    /// Clean up expired sessions
    pub fn cleanup_expired_sessions(&self) {
        let mut sessions = self.sessions.lock().unwrap();
        let now = current_timestamp();

        sessions.retain(|_, session| now <= session.expires_at);
    }

    /// Check if username is locked out due to failed attempts
    pub fn check_rate_limit(&self, username: &str) -> AppResult<()> {
        let mut failed_attempts = self.failed_attempts.lock().unwrap();
        let now = current_timestamp();

        if let Some((count, last_attempt)) = failed_attempts.get(username) {
            let time_since_last = now.saturating_sub(*last_attempt);

            // Reset if lockout duration has passed
            if time_since_last > self.lockout_duration.as_secs() {
                failed_attempts.remove(username);
                return Ok(());
            }

            // Check if locked out
            if *count >= self.max_failed_attempts {
                return Err(AppError::rate_limit_exceeded());
            }
        }

        Ok(())
    }

    /// Record failed login attempt
    pub fn record_failed_attempt(&self, username: &str) {
        let mut failed_attempts = self.failed_attempts.lock().unwrap();
        let now = current_timestamp();

        let entry = failed_attempts.entry(username.to_string()).or_insert((0, now));
        entry.0 += 1;
        entry.1 = now;
    }

    /// Clear failed attempts for username (on successful login)
    pub fn clear_failed_attempts(&self, username: &str) {
        let mut failed_attempts = self.failed_attempts.lock().unwrap();
        failed_attempts.remove(username);
    }

    /// Get all active sessions for a user
    pub fn get_user_sessions(&self, user_id: i64) -> Vec<Session> {
        let sessions = self.sessions.lock().unwrap();
        sessions
            .values()
            .filter(|s| s.user_id == user_id)
            .cloned()
            .collect()
    }

    /// Invalidate all sessions for a user
    pub fn invalidate_user_sessions(&self, user_id: i64) -> AppResult<()> {
        let mut sessions = self.sessions.lock().unwrap();
        sessions.retain(|_, session| session.user_id != user_id);
        Ok(())
    }

    /// Get session count
    pub fn session_count(&self) -> usize {
        let sessions = self.sessions.lock().unwrap();
        sessions.len()
    }
}

/// Get current timestamp in seconds
fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs()
}

// Global session manager instance
lazy_static::lazy_static! {
    pub static ref SESSION_MANAGER: SessionManager = SessionManager::new();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_and_validate_session() {
        let manager = SessionManager::new();
        let token = manager.create_session(1, "testuser".to_string()).unwrap();
        assert!(manager.validate_session(&token).is_ok());
    }

    #[test]
    fn test_invalid_session() {
        let manager = SessionManager::new();
        assert!(manager.validate_session("invalid-token").is_err());
    }

    #[test]
    fn test_rate_limiting() {
        let manager = SessionManager::new();

        for _ in 0..5 {
            manager.record_failed_attempt("testuser");
        }

        assert!(manager.check_rate_limit("testuser").is_err());
    }
}
