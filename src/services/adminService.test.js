import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCapabilities, deleteRecipe } from './adminService';

vi.mock('../config/firebase', () => ({
  auth: { currentUser: null }
}));

import { auth } from '../config/firebase';

const signedIn = () => {
  auth.currentUser = { getIdToken: vi.fn().mockResolvedValue('MOCK_TOKEN') };
};

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    auth.currentUser = null;
    vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'true');
  });

  describe('fetchCapabilities', () => {
    it('reports no admin rights when signed out, without calling the server', async () => {
      expect(await fetchCapabilities()).toEqual({ admin: false });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('passes the caller token so the server can check the allowlist', async () => {
      signedIn();
      global.fetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ admin: true }) });

      expect(await fetchCapabilities()).toEqual({ admin: true });
      expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer MOCK_TOKEN');
    });

    it('fails closed when the server errors', async () => {
      // A missing answer must never reveal destructive controls.
      signedIn();
      global.fetch.mockResolvedValue({ ok: false, status: 500, json: vi.fn() });

      expect(await fetchCapabilities()).toEqual({ admin: false });
    });

    it('fails closed when the request throws', async () => {
      signedIn();
      global.fetch.mockRejectedValue(new Error('offline'));

      expect(await fetchCapabilities()).toEqual({ admin: false });
    });
  });

  describe('deleteRecipe', () => {
    it('sends the slug with the caller token', async () => {
      signedIn();
      global.fetch.mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({ slug: 'kale', deleted: 1 }) });

      const result = await deleteRecipe('kale');

      expect(result).toEqual({ slug: 'kale', deleted: 1 });
      const [, options] = global.fetch.mock.calls[0];
      expect(JSON.parse(options.body)).toEqual({ slug: 'kale' });
      expect(options.headers.Authorization).toBe('Bearer MOCK_TOKEN');
    });

    it('surfaces a server refusal rather than reporting success', async () => {
      signedIn();
      global.fetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: vi.fn().mockResolvedValue({ error: 'Only an administrator can remove a recipe from the catalog.' })
      });

      await expect(deleteRecipe('kale')).rejects.toMatchObject({ status: 403 });
    });
  });
});
