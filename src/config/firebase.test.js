import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We mock the firebase modules BEFORE importing firebase.js
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  connectAuthEmulator: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: vi.fn(),
  enableMultiTabIndexedDbPersistence: vi.fn(() => Promise.resolve()),
}));

describe('Firebase Config', () => {
  let authModule;
  let firestoreModule;
  let consoleInfoSpy;
  let consoleWarnSpy;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Mock consoles
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock import.meta.env
    // Note: Vitest handles import.meta.env, but we might need to stub it
    // However, since we want to test different branches, we'll rely on global state where possible
    window.__FIREBASE_TEST_PERSISTENCE__ = true;
    
    // Lazy import modules to get the mocked versions
    authModule = await import('firebase/auth');
    firestoreModule = await import('firebase/firestore');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete window.__FIREBASE_TEST_PERSISTENCE__;
  });

  it('connects to emulators when USE_FIREBASE_EMULATOR is true', async () => {
    // We need to set the env variables before importing the file
    vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'true');
    vi.stubEnv('VITE_USE_FIRESTORE_EMULATOR', 'true');
    
    // Trigger the side effects by importing the file
    await import('./firebase.js');

    expect(authModule.connectAuthEmulator).toHaveBeenCalledWith(expect.anything(), "http://127.0.0.1:9099");
    expect(firestoreModule.connectFirestoreEmulator).toHaveBeenCalledWith(expect.anything(), '127.0.0.1', 8080);
    expect(consoleInfoSpy).toHaveBeenCalledWith('[Firebase] Connecting to Auth Emulator');
    expect(consoleInfoSpy).toHaveBeenCalledWith('[Firebase] Connecting to Firestore Emulator');
  });

  it('handles persistence "failed-precondition" error', async () => {
    firestoreModule.enableMultiTabIndexedDbPersistence.mockRejectedValueOnce({ code: 'failed-precondition' });
    
    await import('./firebase.js');

    // Wait for the catch block to execute
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleWarnSpy).toHaveBeenCalledWith('[Firebase] Persistence failed: Multiple tabs open');
  });

  it('handles persistence "unimplemented" error', async () => {
    firestoreModule.enableMultiTabIndexedDbPersistence.mockRejectedValueOnce({ code: 'unimplemented' });
    
    await import('./firebase.js');

    // Wait for the catch block to execute
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleWarnSpy).toHaveBeenCalledWith('[Firebase] Persistence failed: Browser not supported');
  });

  it('does not log warnings if persistence succeeds', async () => {
    firestoreModule.enableMultiTabIndexedDbPersistence.mockResolvedValueOnce();
    
    await import('./firebase.js');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it('skips emulators when flags are false', async () => {
    vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'false');
    vi.stubEnv('VITE_USE_FIRESTORE_EMULATOR', 'false');
    
    await import('./firebase.js');

    expect(authModule.connectAuthEmulator).not.toHaveBeenCalled();
    expect(firestoreModule.connectFirestoreEmulator).not.toHaveBeenCalled();
  });

  it('skips emulators in PROD mode', async () => {
    vi.stubEnv('PROD', 'true');
    vi.stubEnv('VITE_USE_FIREBASE_EMULATOR', 'true');
    
    await import('./firebase.js');

    expect(authModule.connectAuthEmulator).not.toHaveBeenCalled();
    expect(consoleInfoSpy).not.toHaveBeenCalledWith('[Firebase] Connecting to Auth Emulator');
  });

  it('skips persistence if flag is false', async () => {
    window.__FIREBASE_TEST_PERSISTENCE__ = false;
    
    await import('./firebase.js');

    expect(firestoreModule.enableMultiTabIndexedDbPersistence).not.toHaveBeenCalled();
  });

  it('ignores unknown persistence errors', async () => {
    firestoreModule.enableMultiTabIndexedDbPersistence.mockRejectedValueOnce({ code: 'unknown-error' });
    
    await import('./firebase.js');
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
