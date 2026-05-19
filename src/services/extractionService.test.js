import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractRecipeFromUrl } from './extractionService';

// Mock Firebase config/auth
vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

import { auth } from '../config/firebase';

describe('extractionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Default auth mock state to null
    auth.currentUser = null;
    // Set import.meta.env mock variables if needed (Vite environment)
    vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'true');
  });

  it('throws an error if the user is not authenticated', async () => {
    await expect(extractRecipeFromUrl('https://example.com/recipe')).rejects.toThrow(
      'Authentication required to extract recipes.'
    );
  });

  it('makes a POST request to emulator endpoint when emulator flag is active', async () => {
    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue('MOCK_TOKEN'),
    };
    auth.currentUser = mockUser;

    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ title: 'Extracted Recipe' }),
    });

    const result = await extractRecipeFromUrl('https://example.com/recipe');

    expect(mockUser.getIdToken).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5001/recifree-web-4731f/us-central1/extractRecipe',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer MOCK_TOKEN',
        },
        body: JSON.stringify({ url: 'https://example.com/recipe' }),
      })
    );
    expect(result).toEqual({ title: 'Extracted Recipe' });
  });

  it('makes a POST request to production endpoint when emulator flag is false', async () => {
    vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'false');
    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue('MOCK_TOKEN'),
    };
    auth.currentUser = mockUser;

    global.fetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ title: 'Extracted Recipe' }),
    });

    await extractRecipeFromUrl('https://example.com/recipe');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://us-central1-recifree-web-4731f.cloudfunctions.net/extractRecipe',
      expect.any(Object)
    );
  });

  it('throws structured error if response is not ok', async () => {
    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue('MOCK_TOKEN'),
    };
    auth.currentUser = mockUser;

    global.fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: vi.fn().mockResolvedValue({ error: 'Forbidden' }),
    });

    await expect(extractRecipeFromUrl('https://example.com/recipe')).rejects.toThrow('Forbidden');
  });

  it('throws fallback HTTP status error if json response has no error key', async () => {
    const mockUser = {
      getIdToken: vi.fn().mockResolvedValue('MOCK_TOKEN'),
    };
    auth.currentUser = mockUser;

    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error('JSON parse fail')),
    });

    await expect(extractRecipeFromUrl('https://example.com/recipe')).rejects.toThrow('HTTP error 500');
  });
});
