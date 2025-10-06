import { describe, it, expect, vi } from 'vitest';
import { mdocVerifier } from '../MdocVerifier';
import { MdocVerifyHandlerImpl } from 'mdoc-cbor-ts';
import { mdlSchema } from 'mdoc-cbor-ts';

// Mock the mdoc-cbor-ts module
vi.mock('mdoc-cbor-ts', () => ({
  MdocVerifyHandlerImpl: vi.fn(),
  mdlSchema: {
    'org.iso.18013.5.1': {
      family_name: 'string',
      given_name: 'string',
      birth_date: 'date',
    },
  },
}));

describe('MdocVerifier', () => {
  describe('mdocVerifier instance', () => {
    it('should create MdocVerifyHandlerImpl with correct schema configuration', () => {
      expect(MdocVerifyHandlerImpl).toHaveBeenCalledWith({
        'org.iso.18013.5.1': mdlSchema,
      });
    });

    it('should export mdocVerifier instance', () => {
      expect(mdocVerifier).toBeDefined();
      expect(mdocVerifier).toBeInstanceOf(Object);
    });
  });

  describe('integration with mdoc-cbor-ts', () => {
    it('should use mdlSchema for org.iso.18013.5.1 namespace', () => {
      const constructorCall = vi.mocked(MdocVerifyHandlerImpl).mock.calls[0];
      const config = constructorCall[0];

      expect(config).toHaveProperty('org.iso.18013.5.1');
      expect(config?.['org.iso.18013.5.1']).toBe(mdlSchema);
    });

    it('should be properly typed as mdoc verifier', () => {
      // Type check - this will fail at compile time if types are wrong
      expect(typeof mdocVerifier).toBe('object');
      expect(mdocVerifier).not.toBeNull();
    });
  });

  describe('schema configuration', () => {
    it('should configure only the mDL schema', () => {
      const constructorCall = vi.mocked(MdocVerifyHandlerImpl).mock.calls[0];
      const config = constructorCall[0];
      const schemaKeys = Object.keys(config ?? {});

      expect(schemaKeys).toHaveLength(1);
      expect(schemaKeys[0]).toBe('org.iso.18013.5.1');
    });

    it('should use the imported mdlSchema without modification', () => {
      const constructorCall = vi.mocked(MdocVerifyHandlerImpl).mock.calls[0];
      const config = constructorCall[0];

      // Verify the schema is passed as-is from the import
      expect(config?.['org.iso.18013.5.1']).toStrictEqual(mdlSchema);
    });
  });

  describe('module exports', () => {
    it('should export mdocVerifier as named export', () => {
      // Test that the module exports the expected interface
      expect(mdocVerifier).toBeDefined();
    });

    it('should be a singleton instance', async () => {
      // Import again to verify it's the same instance
      const module2 = await import('../MdocVerifier');
      expect(mdocVerifier).toBe(module2.mdocVerifier);
    });
  });
});
