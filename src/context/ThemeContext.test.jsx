import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

// Helper component to consume context
const TestComponent = () => {
    const { theme, toggleTheme } = useTheme();
    return (
        <div>
            <span data-testid="theme-value">{theme}</span>
            <button onClick={toggleTheme}>Toggle Theme</button>
        </div>
    );
};

describe('ThemeContext', () => {
    beforeEach(() => {
        // Mock matchMedia
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(query => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });

        // Mock localStorage
        const store = {};
        Object.defineProperty(window, 'localStorage', {
            value: {
                getItem: vi.fn((key) => store[key] || null),
                setItem: vi.fn((key, value) => {
                    store[key] = value.toString();
                }),
                removeItem: vi.fn((key) => {
                    delete store[key];
                }),
                clear: vi.fn(() => {
                    for (const key in store) delete store[key];
                }),
            },
            writable: true
        });

        // Clear document classes and attributes
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-theme');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('defaults to light theme if no preference saved', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        expect(screen.getByTestId('theme-value')).toHaveTextContent('light');
        expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    });

    it('toggles theme from light to dark', () => {
        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        const button = screen.getByText('Toggle Theme');

        // Initial state
        expect(screen.getByTestId('theme-value')).toHaveTextContent('light');

        // Toggle
        fireEvent.click(button);

        expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
        expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('initializes with saved theme from localStorage', () => {
        window.localStorage.getItem.mockReturnValue('dark');

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });

    it('respects system preference if no local storage', () => {
        window.matchMedia.mockImplementation(query => ({
            matches: query === '(prefers-color-scheme: dark)',
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        render(
            <ThemeProvider>
                <TestComponent />
            </ThemeProvider>
        );

        expect(screen.getByTestId('theme-value')).toHaveTextContent('dark');
        expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    });
});
