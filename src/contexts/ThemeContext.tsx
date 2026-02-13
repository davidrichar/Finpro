
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [theme, setThemeState] = useState<Theme>('system');

    // Load theme from user metadata on mount/user change
    useEffect(() => {
        if (user?.user_metadata?.theme) {
            setThemeState(user.user_metadata.theme);
        } else {
            const savedTheme = localStorage.getItem('theme') as Theme;
            if (savedTheme) {
                setThemeState(savedTheme);
            }
        }
    }, [user]);

    // Apply theme to document
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        let effectiveTheme = theme;
        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        root.classList.add(effectiveTheme);
        localStorage.setItem('theme', theme);

        // Listen for system changes if in system mode
        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => {
                root.classList.remove('light', 'dark');
                root.classList.add(mediaQuery.matches ? 'dark' : 'light');
            };
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
    }, [theme]);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);

        if (user) {
            await supabase.auth.updateUser({
                data: { theme: newTheme }
            });
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
