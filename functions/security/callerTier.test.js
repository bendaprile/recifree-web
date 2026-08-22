import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const mockVerifyIdToken = vi.fn();
Object.defineProperty(admin, 'auth', {
    get: () => () => ({ verifyIdToken: mockVerifyIdToken }),
    configurable: true
});

// callerTier is loaded through createRequire, so vi.mock cannot intercept its
// dependencies. Stub the Firestore the real adminGate reads instead, which has
// the side benefit of exercising the actual allowlist logic.
let mockAllowlist = [];
Object.defineProperty(admin, 'firestore', {
    get: () => () => ({
        collection: () => ({
            doc: () => ({
                get: async () => ({ exists: true, data: () => ({ allowlist: mockAllowlist }) })
            })
        })
    }),
    configurable: true
});

const { identifyCaller, anonymousId, TIER_ADMIN, TIER_RESTRICTED } = require('./callerTier');

const request = (headers = {}) => ({ headers, ip: '203.0.113.9' });

describe('identifyCaller', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAllowlist = [];
        delete process.env.FUNCTIONS_EMULATOR;
    });

    afterEach(() => {
        delete process.env.FUNCTIONS_EMULATOR;
    });

    describe('anonymous callers', () => {
        it('admits a caller with no Authorization header at the restricted tier', async () => {
            const caller = await identifyCaller(request());
            expect(caller.tier).toBe(TIER_RESTRICTED);
        });

        it('never returns the raw IP address as the rate-limit key', async () => {
            const caller = await identifyCaller(request());
            expect(caller.id).not.toContain('203.0.113.9');
            expect(caller.id).toMatch(/^anon_[0-9a-f]{32}$/);
        });

        it('gives the same caller the same key, so rate limiting actually binds', async () => {
            const first = await identifyCaller(request());
            const second = await identifyCaller(request());
            expect(first.id).toBe(second.id);
        });

        it('gives different addresses different keys', () => {
            const a = anonymousId({ headers: {}, ip: '198.51.100.1' });
            const b = anonymousId({ headers: {}, ip: '198.51.100.2' });
            expect(a).not.toBe(b);
        });

        it('prefers the first x-forwarded-for entry, which is the real client', () => {
            const direct = anonymousId({ headers: {}, ip: '198.51.100.1' });
            const proxied = anonymousId({
                headers: { 'x-forwarded-for': '198.51.100.1, 10.0.0.1' },
                ip: '10.0.0.1'
            });
            expect(proxied).toBe(direct);
        });
    });

    describe('signed-in callers', () => {
        it('grants the admin tier to an allowlisted email', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({ email: 'owner@recifree.com', uid: 'uid-owner' });
            mockAllowlist = ['owner@recifree.com'];

            const caller = await identifyCaller(request({ authorization: 'Bearer good-token' }));
            expect(caller).toEqual({ id: 'owner@recifree.com', uid: 'uid-owner', tier: TIER_ADMIN });
        });

        it('admits a signed-in non-admin at the restricted tier rather than rejecting them', async () => {
            mockVerifyIdToken.mockResolvedValueOnce({ email: 'someone@example.com', uid: 'uid-someone' });
            mockAllowlist = ['owner@recifree.com'];

            const caller = await identifyCaller(request({ authorization: 'Bearer good-token' }));
            expect(caller).toEqual({ id: 'someone@example.com', uid: 'uid-someone', tier: TIER_RESTRICTED });
        });

        it('rejects a malformed Authorization header', async () => {
            await expect(identifyCaller(request({ authorization: 'good-token' })))
                .rejects.toThrow('UNAUTHORIZED');
        });

        it('rejects an invalid token rather than quietly downgrading it', async () => {
            // Downgrading would let a forged token through as an anonymous caller,
            // which is fine for spend but hides the fact that auth is broken.
            mockVerifyIdToken.mockRejectedValueOnce(new Error('token expired'));

            await expect(identifyCaller(request({ authorization: 'Bearer bad-token' })))
                .rejects.toThrow('UNAUTHORIZED');
        });
    });

    it('keeps the emulator admin bypass for local development', async () => {
        process.env.FUNCTIONS_EMULATOR = 'true';
        const caller = await identifyCaller(request());
        expect(caller.tier).toBe(TIER_ADMIN);
    });
});
