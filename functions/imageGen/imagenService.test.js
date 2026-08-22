import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

// Initialize mock functions
const mockSave = vi.fn().mockResolvedValue(true);
const mockMakePublic = vi.fn().mockResolvedValue(true);

// uploadImageToStorage resolves the bucket before writing, because this
// project's default bucket name does not match the provisioned one. The mock
// has to answer exists() or resolution fails and the upload returns null.
const mockExists = vi.fn().mockResolvedValue([true]);

const mockStorage = vi.fn(() => ({
  bucket: () => ({
    name: 'recifree-test-bucket',
    exists: mockExists,
    file: (filePath) => ({
      save: mockSave,
      makePublic: mockMakePublic
    })
  })
}));

// Stub firebase-admin's storage method using defineProperty due to CJS caching
Object.defineProperty(admin, 'storage', {
  get: () => mockStorage,
  configurable: true
});

// Import service under test
import { buildImagenPrompt, generateAiFoodPhoto, uploadImageToStorage } from './imagenService';

// Setup mock for global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('imagenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  describe('buildImagenPrompt', () => {
    it('constructs a prompt with title and tags', () => {
      const prompt = buildImagenPrompt('Anti-Inflammatory Turmeric Chicken Soup', ['Dinner', 'Soup', 'Chicken']);
      expect(prompt).toContain('Anti-Inflammatory Turmeric Chicken Soup');
      expect(prompt).toContain('Tags: Dinner, Soup, Chicken');
      expect(prompt).toContain('professional food photograph');
      expect(prompt).toContain('minimalist ceramic bowl');
    });

    it('handles empty or missing tags gracefully', () => {
      const prompt = buildImagenPrompt('Lemony Garlic Shrimp Pasta');
      expect(prompt).toContain('Lemony Garlic Shrimp Pasta');
      expect(prompt).not.toContain('Tags:');
    });

    it('handles non-array or empty tags array', () => {
      const prompt1 = buildImagenPrompt('Salad', null);
      const prompt2 = buildImagenPrompt('Salad', 'not-an-array');
      const prompt3 = buildImagenPrompt('Salad', []);

      expect(prompt1).not.toContain('Tags:');
      expect(prompt2).not.toContain('Tags:');
      expect(prompt3).not.toContain('Tags:');
    });

    it('handles empty or missing recipe title', () => {
      const prompt = buildImagenPrompt(null, ['Dinner']);
      expect(prompt).toContain('delicious dish');
      expect(prompt).toContain('Tags: Dinner');
    });
  });

  describe('generateAiFoodPhoto', () => {
    it('returns base64 image string on successful Gemini Image API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: 'iVBORw0KGgoAAAANS...'
                    }
                  }
                ]
              }
            }
          ]
        })
      });

      const prompt = 'A professional food photograph of Potato Soup';
      const result = await generateAiFoodPhoto(prompt);

      expect(result).toBe('iVBORw0KGgoAAAANS...');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=test-api-key',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ['IMAGE'],
            },
          })
        })
      );
    });

    it('returns null and logs warning if Gemini Image API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request'
      });

      const result = await generateAiFoodPhoto('Some prompt');
      expect(result).toBeNull();
    });

    it('returns null and logs warning if no base64 string is returned in candidate parts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: []
              }
            }
          ]
        })
      });

      const result = await generateAiFoodPhoto('Some prompt');
      expect(result).toBeNull();
    });

    it('returns null if GEMINI_API_KEY is not defined', async () => {
      delete process.env.GEMINI_API_KEY;
      const result = await generateAiFoodPhoto('Some prompt');
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('returns null and catches error if fetch throws', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await generateAiFoodPhoto('Some prompt');
      expect(result).toBeNull();
    });
  });

  describe('uploadImageToStorage', () => {
    beforeEach(() => {
      // mockResolvedValueOnce queues values; an unconsumed [false] from the
      // no-bucket case would otherwise make the next test fail mysteriously.
      mockExists.mockReset().mockResolvedValue([true]);
    });

    it('uploads base64 image as binary buffer and returns public direct URL', async () => {
      const publicUrl = await uploadImageToStorage('iVBORw0KGgoAAAANS...', 'tasty-potato-soup');
      
      expect(publicUrl).toMatch(
        /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/recifree-test-bucket\/o\/recipes%2Ftasty-potato-soup%2Fimage\.png\?alt=media&token=[0-9a-f-]{36}$/
      );
      expect(mockSave).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          metadata: expect.objectContaining({
            contentType: 'image/png',
            metadata: expect.objectContaining({
              firebaseStorageDownloadTokens: expect.any(String)
            })
          })
        })
      );
      // makePublic is deliberately no longer called. A public GCS ACL does not
      // authorize the firebasestorage.googleapis.com download endpoint, and
      // avoiding object ACLs keeps this working under uniform bucket-level
      // access.
      expect(mockMakePublic).not.toHaveBeenCalled();
    });

    it('returns null if input arguments are missing', async () => {
      const url1 = await uploadImageToStorage(null, 'id');
      const url2 = await uploadImageToStorage('base64', null);
      
      expect(url1).toBeNull();
      expect(url2).toBeNull();
    });

    it('returns null when no bucket exists, rather than reporting a URL for a file that was never written', async () => {
      // This is the failure that lost every generated image on this project:
      // the default bucket name did not exist, the save threw, and the caller
      // carried on with an empty image.
      mockExists.mockReset().mockResolvedValue([false]);
      const result = await uploadImageToStorage('aGVsbG8=', 'tasty-potato-soup');
      expect(result).toBeNull();
    });

    it('attaches a download token, without which the Firebase URL returns 403', async () => {
      // The download endpoint authorizes against Storage rules, not the GCS
      // ACL. The first published recipe shipped with a public object and a
      // broken image for exactly this reason.
      await uploadImageToStorage('aGVsbG8=', 'tasty-potato-soup');
      const saveOptions = mockSave.mock.calls[0][1];
      expect(saveOptions.metadata.metadata.firebaseStorageDownloadTokens).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('gives each upload a distinct token', async () => {
      const first = await uploadImageToStorage('aGVsbG8=', 'soup-one');
      const second = await uploadImageToStorage('aGVsbG8=', 'soup-two');
      expect(first).not.toBe(second);
    });

    it('returns null if save to storage fails', async () => {
      mockSave.mockRejectedValueOnce(new Error('Storage quota exceeded'));
      
      const result = await uploadImageToStorage('base64', 'id');
      expect(result).toBeNull();
    });
  });
});
