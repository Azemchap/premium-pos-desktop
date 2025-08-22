import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: 'Admin' | 'Manager' | 'Cashier' | 'StockKeeper';
    is_active: boolean;
    last_login?: string;
    created_at: string;
    updated_at: string;
}

interface AuthState {
    user: User | null;
    sessionToken: string | null;
    isAuthenticated: boolean;
    theme: 'light' | 'dark';
    login: (user: User, token: string) => void;
    logout: () => void;
    toggleTheme: () => void;
    setTheme: (theme: 'light' | 'dark') => void;
    hasPermission: (requiredRole: string[]) => boolean;
}

const roleHierarchy = {
    'Admin': 4,
    'Manager': 3,
    'Cashier': 2,
    'StockKeeper': 1,
};

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            sessionToken: null,
            isAuthenticated: false,
            theme: 'light',
            login: (user, token) => {
                set({
                    user,
                    sessionToken: token,
                    isAuthenticated: true,
                });
            },
            logout: () => {
                set({
                    user: null,
                    sessionToken: null,
                    isAuthenticated: false,
                });
            },
            toggleTheme: () => {
                set((state) => ({
                    theme: state.theme === 'light' ? 'dark' : 'light',
                }));
            },
            setTheme: (theme) => {
                set({ theme });
            },
            hasPermission: (allowedRoles) => {
                const { user } = get();
                if (!user) return false;
                return allowedRoles.includes(user.role);
            },
        }),
        {
            name: 'pos-auth-storage',
            partialize: (state) => ({
                user: state.user,
                sessionToken: state.sessionToken,
                isAuthenticated: state.isAuthenticated,
                theme: state.theme,
            }),
        }
    )
);