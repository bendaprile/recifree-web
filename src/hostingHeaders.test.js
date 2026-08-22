import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * The Content-Security-Policy in firebase.json is served only by Firebase
 * Hosting. The Vite dev server does not apply it, so a directive that breaks
 * the app in production passes every browser check made locally.
 *
 * That is not hypothetical: the publish photo picker shipped broken because
 * img-src omitted blob:. The preview never rendered and publishing threw
 * before reaching the network, and neither symptom was reproducible on the
 * dev server. jsdom does not enforce CSP either, so no component test can
 * catch this. Asserting on the config is the only cheap guard there is.
 */

const firebaseConfig = JSON.parse(
  readFileSync(resolve(__dirname, '../firebase.json'), 'utf8')
);

function cspDirectives() {
  const headers = firebaseConfig.hosting.headers || [];
  for (const entry of headers) {
    for (const header of entry.headers || []) {
      if (header.key.toLowerCase() === 'content-security-policy') {
        return Object.fromEntries(
          header.value
            .split(';')
            .map(part => part.trim())
            .filter(Boolean)
            .map(part => {
              const [name, ...values] = part.split(/\s+/);
              return [name, values];
            })
        );
      }
    }
  }
  return null;
}

describe('Firebase Hosting Content-Security-Policy', () => {
  const directives = cspDirectives();

  it('is configured at all', () => {
    expect(directives).not.toBeNull();
  });

  it('allows blob: images, which the publish photo preview depends on', () => {
    // URL.createObjectURL produces a blob: URL. Without this the preview <img>
    // is blocked and prepareImage fails to decode the file.
    expect(directives['img-src']).toContain('blob:');
  });

  it('allows data: images, which the canvas re-encode step produces', () => {
    expect(directives['img-src']).toContain('data:');
  });

  it('allows Firebase Storage images, where published photos are served from', () => {
    expect(directives['img-src']).toContain('https://firebasestorage.googleapis.com');
  });

  it('can reach the Cloud Functions host, which extraction and publishing both call', () => {
    expect(directives['connect-src']).toContain(
      'https://us-central1-recifree-web-4731f.cloudfunctions.net'
    );
  });

  it("still defaults to 'self' rather than a wildcard", () => {
    expect(directives['default-src']).toEqual(["'self'"]);
  });
});
