import { execSync } from 'child_process';

const PORT = 1420;

function killPort(port: number): boolean {
    console.log(`🔍 Checking for processes on port ${port}...`);

    try {
        // Windows: Use netstat to find processes on the port
        const stdout = execSync(`netstat -ano | findstr :${port}`, {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (!stdout.trim()) {
            console.log(`✅ Port ${port} is already free`);
            return true;
        }

        // Extract PID from netstat output
        const lines = stdout.trim().split('\n');
        const pids = new Set<string>();

        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== '0') {
                pids.add(pid);
            }
        }

        if (pids.size === 0) {
            console.log(`✅ Port ${port} is already free`);
            return true;
        }

        console.log(`⚠️  Found ${pids.size} process(es) using port ${port}`);

        for (const pid of pids) {
            try {
                execSync(`taskkill /F /PID ${pid}`, {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                console.log(`✅ Killed process ${pid}`);
            } catch {
                // Ignore errors - process may have already exited
                console.log(`✅ Process ${pid} terminated`);
            }
        }

        console.log(`✅ Port ${port} is now free`);
        return true;
    } catch (error: any) {
        // Exit code 1 from findstr means no matches found = port is free
        if (error.status === 1) {
            console.log(`✅ Port ${port} is already free`);
            return true;
        } else {
            console.error(`❌ Error checking port ${port}:`, error.message);
            return false;
        }
    }
}

// Run the script and set exit code based on success
const success = killPort(PORT);
process.exit(success ? 0 : 1);
