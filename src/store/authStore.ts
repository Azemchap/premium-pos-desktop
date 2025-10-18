import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    pin_code?: string;
    permissions?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    theme: 'light' | 'dark';
    login: (user: User) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    toggleTheme: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isAuthenticated: false,
            theme: 'light',
            login: (user: User) => set({ user, isAuthenticated: true }),
            logout: () => set({ user: null, isAuthenticated: false }),
            updateUser: (user: User) => set({ user }),
            setTheme: (theme: 'light' | 'dark') => set({ theme }),
            toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
        }),
        {
            name: 'auth-storage',
        }
    )
);