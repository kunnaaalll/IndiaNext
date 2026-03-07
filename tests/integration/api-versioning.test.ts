/**
 * Integration Tests: API Versioning
 *
 * Tests version extraction, validation, and path helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  getApiVersion,
  isVersionSupported,
  getVersionInfo,
  createApiPath,
  API_VERSION,
  API_BASE_PATH,
} from '@/lib/api-versioning';

describe('API Versioning', () => {
  describe('getApiVersion', () => {
    it('should extract v1 from versioned path', () => {
      expect(getApiVersion('/api/v1/register')).toBe('v1');
    });

    it('should extract v2 from versioned path', () => {
      expect(getApiVersion('/api/v2/users')).toBe('v2');
    });

    it('should return null for unversioned path', () => {
      expect(getApiVersion('/api/register')).toBeNull();
    });

    it('should return null for non-API path', () => {
      expect(getApiVersion('/admin/dashboard')).toBeNull();
    });

    it('should handle root API path', () => {
      expect(getApiVersion('/api/')).toBeNull();
    });
  });

  describe('isVersionSupported', () => {
    it('should support v1', () => {
      expect(isVersionSupported('v1')).toBe(true);
    });

    it('should not support v2', () => {
      expect(isVersionSupported('v2')).toBe(false);
    });

    it('should not support arbitrary strings', () => {
      expect(isVersionSupported('latest')).toBe(false);
    });
  });

  describe('getVersionInfo', () => {
    it('should return info for v1', () => {
      const info = getVersionInfo('v1');
      expect(info).not.toBeNull();
      expect(info!.version).toBe('1.0.0');
      expect(info!.deprecated).toBe(false);
    });

    it('should return null for unsupported version', () => {
      expect(getVersionInfo('v99')).toBeNull();
    });
  });

  describe('createApiPath', () => {
    it('should create versioned path with default version', () => {
      expect(createApiPath('/register')).toBe(`/api/${API_VERSION}/register`);
    });

    it('should create versioned path with specific version', () => {
      expect(createApiPath('/users', 'v2')).toBe('/api/v2/users');
    });

    it('should handle path without leading slash', () => {
      expect(createApiPath('register')).toBe(`/api/${API_VERSION}/register`);
    });
  });

  describe('constants', () => {
    it('should have correct API base path', () => {
      expect(API_BASE_PATH).toBe('/api/v1');
    });

    it('should have v1 as current version', () => {
      expect(API_VERSION).toBe('v1');
    });
  });
});
