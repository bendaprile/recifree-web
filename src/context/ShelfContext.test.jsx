import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { ShelfProvider, useShelf } from './ShelfContext';
import * as shelfService from '../services/shelfService';

vi.mock('../services/shelfService', () => ({
    getUserShelf: vi.fn(),
    addToShelf: vi.fn(),
    removeFromShelf: vi.fn()
}));

vi.mock('../config/firebase', () => ({ db: {}, auth: {} }));

// Swapped per-test to move between the signed-in and signed-out cases.
let mockAuthValue = { currentUser: null, loadingAuth: false };
vi.mock('./AuthContext', () => ({
    AuthProvider: ({ children }) => <div>{children}</div>,
    useAuth: () => mockAuthValue
}));

const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn(key => store[key] || null),
        setItem: vi.fn((key, val) => { store[key] = val.toString(); }),
        clear: vi.fn(() => { store = {}; }),
        removeItem: vi.fn(key => { delete store[key]; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const recipe = (id, title = 'A Recipe') => ({ id, title, ingredients: [], instructions: [] });

let ctxRef;
const TestComponent = () => {
    const ctx = useShelf();
    ctxRef = ctx;
    if (ctx.loading) return <div data-testid="loading">loading</div>;
    return (
        <div>
            <div data-testid="count">{ctx.shelf.length}</div>
            <div data-testid="titles">{ctx.shelf.map(r => r.id).join(',')}</div>
            <div data-testid="at-risk">{String(ctx.isAtRisk)}</div>
        </div>
    );
};

const renderShelf = async () => {
    render(<ShelfProvider><TestComponent /></ShelfProvider>);
    await waitFor(() => expect(screen.queryByTestId('loading')).toBeNull());
};

describe('ShelfContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        mockAuthValue = { currentUser: null, loadingAuth: false };
        shelfService.getUserShelf.mockResolvedValue([]);
    });

    afterEach(cleanup);

    describe('signed out', () => {
        it('loads an existing shelf from localStorage', async () => {
            localStorageMock.setItem('recifree_shelf', JSON.stringify([recipe('cookies')]));
            await renderShelf();

            expect(screen.getByTestId('count').textContent).toBe('1');
            expect(shelfService.getUserShelf).not.toHaveBeenCalled();
        });

        it('persists a shelved recipe to localStorage, not Firestore', async () => {
            await renderShelf();
            await act(async () => { await ctxRef.shelveRecipe(recipe('cookies')); });

            expect(screen.getByTestId('count').textContent).toBe('1');
            expect(shelfService.addToShelf).not.toHaveBeenCalled();
            expect(JSON.parse(localStorageMock.getItem('recifree_shelf'))).toHaveLength(1);
        });

        it('reports the shelf as at risk once it holds anything', async () => {
            await renderShelf();
            expect(screen.getByTestId('at-risk').textContent).toBe('false');

            await act(async () => { await ctxRef.shelveRecipe(recipe('cookies')); });
            expect(screen.getByTestId('at-risk').textContent).toBe('true');
        });

        it('removes a recipe from localStorage', async () => {
            localStorageMock.setItem('recifree_shelf', JSON.stringify([recipe('cookies'), recipe('bread')]));
            await renderShelf();

            await act(async () => { await ctxRef.unshelveRecipe('cookies'); });
            expect(screen.getByTestId('titles').textContent).toBe('bread');
            expect(shelfService.removeFromShelf).not.toHaveBeenCalled();
        });
    });

    describe('signed in', () => {
        beforeEach(() => {
            mockAuthValue = { currentUser: { uid: 'user-1' }, loadingAuth: false };
        });

        it('loads the shelf from Firestore', async () => {
            shelfService.getUserShelf.mockResolvedValue([recipe('cookies'), recipe('bread')]);
            await renderShelf();

            expect(screen.getByTestId('count').textContent).toBe('2');
            expect(shelfService.getUserShelf).toHaveBeenCalledWith('user-1');
        });

        it('never reports the shelf as at risk', async () => {
            shelfService.getUserShelf.mockResolvedValue([recipe('cookies')]);
            await renderShelf();
            expect(screen.getByTestId('at-risk').textContent).toBe('false');
        });

        it('writes a shelved recipe to Firestore, not localStorage', async () => {
            await renderShelf();
            await act(async () => { await ctxRef.shelveRecipe(recipe('cookies')); });

            expect(shelfService.addToShelf).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'cookies' }));
            expect(localStorageMock.getItem('recifree_shelf')).toBeNull();
        });
    });

    describe('sign-in migration', () => {
        it('drains the localStorage shelf into Firestore and clears it', async () => {
            // The user extracted two recipes before making an account.
            localStorageMock.setItem('recifree_shelf', JSON.stringify([recipe('cookies'), recipe('bread')]));
            mockAuthValue = { currentUser: { uid: 'user-1' }, loadingAuth: false };
            shelfService.getUserShelf.mockResolvedValue([recipe('cookies'), recipe('bread')]);

            await renderShelf();

            expect(shelfService.addToShelf).toHaveBeenCalledTimes(2);
            expect(shelfService.addToShelf).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'cookies' }));
            expect(shelfService.addToShelf).toHaveBeenCalledWith('user-1', expect.objectContaining({ id: 'bread' }));
            // Cleared, so a later sign-in does not re-upload the same recipes.
            expect(localStorageMock.getItem('recifree_shelf')).toBeNull();
            expect(screen.getByTestId('count').textContent).toBe('2');
        });

        it('does not touch localStorage when there is nothing to migrate', async () => {
            mockAuthValue = { currentUser: { uid: 'user-1' }, loadingAuth: false };
            await renderShelf();

            expect(shelfService.addToShelf).not.toHaveBeenCalled();
            expect(localStorageMock.removeItem).not.toHaveBeenCalled();
        });
    });

    describe('deduplication', () => {
        it('replaces rather than duplicates when the same recipe is shelved twice', async () => {
            await renderShelf();

            await act(async () => { await ctxRef.shelveRecipe(recipe('cookies', 'First parse')); });
            await act(async () => { await ctxRef.shelveRecipe(recipe('cookies', 'Re-extracted')); });

            expect(screen.getByTestId('count').textContent).toBe('1');
            expect(ctxRef.shelf[0].title).toBe('Re-extracted');
        });

        it('reports shelf membership', async () => {
            localStorageMock.setItem('recifree_shelf', JSON.stringify([recipe('cookies')]));
            await renderShelf();

            expect(ctxRef.isOnShelf('cookies')).toBe(true);
            expect(ctxRef.isOnShelf('bread')).toBe(false);
        });
    });

    it('waits for auth to resolve before loading anything', async () => {
        mockAuthValue = { currentUser: null, loadingAuth: true };
        render(<ShelfProvider><TestComponent /></ShelfProvider>);

        expect(screen.getByTestId('loading')).toBeTruthy();
        expect(shelfService.getUserShelf).not.toHaveBeenCalled();
    });
});
