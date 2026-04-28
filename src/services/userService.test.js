import { describe, it, expect, vi, beforeEach } from 'vitest';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getUserProfile, createUserProfile, updateUserProfile } from './userService';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn()
}));

vi.mock('../config/firebase', () => ({
  db: {}
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('returns null if uid is missing', async () => {
      const result = await getUserProfile(null);
      expect(result).toBeNull();
    });

    it('returns profile data if document exists', async () => {
      const fakeData = { displayName: 'John' };
      getDoc.mockResolvedValueOnce({ exists: () => true, data: () => fakeData });
      doc.mockReturnValue('mockDocRef');
      
      const result = await getUserProfile('user123');
      expect(doc).toHaveBeenCalledWith(db, 'users', 'user123');
      expect(result).toEqual(fakeData);
    });

    it('returns null if document does not exist', async () => {
      getDoc.mockResolvedValueOnce({ exists: () => false });
      
      const result = await getUserProfile('user123');
      expect(result).toBeNull();
    });
  });

  describe('createUserProfile', () => {
    it('throws error if uid is missing', async () => {
      await expect(createUserProfile(null)).rejects.toThrow();
    });

    it('creates a default profile with provided data', async () => {
      doc.mockReturnValue('mockDocRef');
      const data = { displayName: 'John' };
      
      const result = await createUserProfile('user123', data);
      
      expect(setDoc).toHaveBeenCalled();
      expect(result.displayName).toBe('John');
      expect(result.measurementPreference).toBe('imperial');
      expect(result.onboardingComplete).toBe(true);
    });
  });

  describe('updateUserProfile', () => {
    it('throws error if uid is missing', async () => {
      await expect(updateUserProfile(null, {})).rejects.toThrow();
    });

    it('calls updateDoc with correct arguments', async () => {
      doc.mockReturnValue('mockDocRef');
      const data = { measurementPreference: 'metric' };
      
      await updateUserProfile('user123', data);
      expect(updateDoc).toHaveBeenCalledWith('mockDocRef', data);
    });
  });
});
