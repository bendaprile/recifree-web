import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const generativeAi = require('@google/generative-ai');

const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent
}));

// Stub the GoogleGenerativeAI class on the required CJS module
generativeAi.GoogleGenerativeAI = class MockGoogleGenerativeAI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  getGenerativeModel = mockGetGenerativeModel;
};

let sanitizeHtmlForLlm;
let extractWithLlm;

describe('llmParser', () => {
  beforeAll(async () => {
    // Dynamic import to prevent static ES module hoisting,
    // ensuring the target file consumes our stubbed generativeAi class.
    const parserModule = await import('./llmParser');
    sanitizeHtmlForLlm = parserModule.sanitizeHtmlForLlm;
    extractWithLlm = parserModule.extractWithLlm;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sanitizeHtmlForLlm', () => {
    it('returns empty string if input is empty/falsy', () => {
      expect(sanitizeHtmlForLlm(null)).toBe('');
      expect(sanitizeHtmlForLlm('')).toBe('');
    });

    it('strips irrelevant tags and returns clean text', () => {
      const html = `
        <html>
          <head><title>Recipe</title></head>
          <body>
            <header>Header Info</header>
            <nav>Nav Links</nav>
            <main>
              <h1>Chocolate Cake</h1>
              <script>console.log("bad");</script>
              <style>.bad { color: red; }</style>
              <p>Delicious cake recipe.</p>
              <aside class="sidebar">Ads and details</aside>
            </main>
            <footer>Footer Info</footer>
          </body>
        </html>
      `;
      const text = sanitizeHtmlForLlm(html);
      expect(text).toContain('Chocolate Cake');
      expect(text).toContain('Delicious cake recipe.');
      expect(text).not.toContain('Header Info');
      expect(text).not.toContain('Nav Links');
      expect(text).not.toContain('console.log');
      expect(text).not.toContain('.bad');
      expect(text).not.toContain('Footer Info');
      expect(text).not.toContain('Ads and details');
    });

    it('truncates content and appends warning if over 25000 characters', () => {
      const longText = 'a '.repeat(15000); // 30000 chars
      const html = `<div>${longText}</div>`;
      const text = sanitizeHtmlForLlm(html);
      expect(text.length).toBe(25000 + '... [TRUNCATED]'.length);
      expect(text.endsWith('... [TRUNCATED]')).toBe(true);
    });
  });

  describe('extractWithLlm', () => {
    it('throws error if apiKey is not provided', async () => {
      await expect(extractWithLlm('some text', null)).rejects.toThrow(
        'GEMINI_API_KEY is not configured'
      );
    });

    it('successfully extracts and parses JSON even with markdown codeblocks or conversational text wrappers', async () => {
      const mockResult = {
        title: 'Perfect Pizza',
        ingredients: ['1 cup flour', '1 tsp yeast'],
        instructions: ['Mix flour and yeast', 'Bake']
      };

      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => `Here is the parsed recipe JSON:
\`\`\`json
${JSON.stringify(mockResult)}
\`\`\`
Hope you like it!`
        }
      });

      const result = await extractWithLlm('sanitized html', 'fake-key');
      expect(result).toEqual(mockResult);
      expect(mockGetGenerativeModel).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gemini-3.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      }));
    });

    it('retries on status 503 error and eventually succeeds', async () => {
      vi.useFakeTimers();
      const mockResult = { title: 'Retried Recipe' };

      const error503 = new Error('Service Unavailable');
      error503.status = 503;

      mockGenerateContent
        .mockRejectedValueOnce(error503)
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify(mockResult)
          }
        });

      const extractionPromise = extractWithLlm('some html', 'fake-key');
      extractionPromise.catch(() => {});

      await vi.runAllTimersAsync();
      
      const result = await extractionPromise;
      expect(result).toEqual(mockResult);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('immediately fails and throws error on non-503 error', async () => {
      const apiError = new Error('API Key Invalid');
      apiError.status = 400;

      mockGenerateContent.mockRejectedValueOnce(apiError);

      await expect(extractWithLlm('some html', 'fake-key')).rejects.toThrow(
        'LLM parsing failed after 3 attempts: API Key Invalid'
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('fails after maximum retries if 503 continues', async () => {
      vi.useFakeTimers();
      const error503 = new Error('Service Unavailable');
      error503.status = 503;

      mockGenerateContent.mockRejectedValue(error503);

      const promise = extractWithLlm('some html', 'fake-key');
      promise.catch(() => {});

      await vi.runAllTimersAsync();

      await expect(promise).rejects.toThrow(
        'LLM parsing failed after 3 attempts: Service Unavailable'
      );
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });
});
