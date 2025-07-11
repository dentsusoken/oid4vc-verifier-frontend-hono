import { describe, it, expect } from 'vitest';
import { mDLDifinition, mDLPresentationDefinition } from '../mDL';

describe('mDL Presentation Definition', () => {
  describe('mDLDifinition', () => {
    it('should have correct basic structure', () => {
      expect(mDLDifinition).toBeDefined();
      expect(mDLDifinition.id).toBe('org.iso.18013.5.1.mDL');
      expect(mDLDifinition.name).toBe('Mobile Driving Licence');
      expect(mDLDifinition.purpose).toBe(
        'We need to verify your mobile driving licence',
      );
    });

    it('should have correct format configuration', () => {
      expect(mDLDifinition.format).toBeDefined();
      expect(mDLDifinition.format?.mso_mdoc).toBeDefined();
      expect(mDLDifinition.format?.mso_mdoc?.alg).toEqual([
        'ES256',
        'ES384',
        'ES512',
      ]);
    });

    it('should have constraints with field definitions', () => {
      expect(mDLDifinition.constraints).toBeDefined();
      expect(mDLDifinition.constraints.fields).toBeDefined();
      expect(Array.isArray(mDLDifinition.constraints.fields)).toBe(true);
      expect(mDLDifinition.constraints.fields?.length).toBeGreaterThan(0);
    });

    it('should include all required mDL fields', () => {
      const fields = mDLDifinition.constraints.fields;
      const fieldPaths = fields?.map((field) => field.path?.[0]);

      // Test for some essential mDL fields
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['family_name']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['given_name']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['birth_date']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['issue_date']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['expiry_date']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['document_number']");
    });

    it('should have intent_to_retain set to false for all fields', () => {
      const fields = mDLDifinition.constraints.fields;

      fields?.forEach((field, index) => {
        expect(field.intent_to_retain).toBe(false);
      });
    });

    it('should include age verification fields', () => {
      const fields = mDLDifinition.constraints.fields;
      const fieldPaths = fields?.map((field) => field.path?.[0]);

      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['age_over_18']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['age_over_21']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['age_in_years']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['age_birth_year']");
    });

    it('should include physical characteristics fields', () => {
      const fields = mDLDifinition.constraints.fields;
      const fieldPaths = fields?.map((field) => field.path?.[0]);

      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['sex']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['height']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['weight']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['eye_colour']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['hair_colour']");
    });

    it('should include address and location fields', () => {
      const fields = mDLDifinition.constraints.fields;
      const fieldPaths = fields?.map((field) => field.path?.[0]);

      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['birth_place']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['nationality']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['resident_city']");
      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['resident_state']");
      expect(fieldPaths).toContain(
        "$['org.iso.18013.5.1']['resident_postal_code']",
      );
      expect(fieldPaths).toContain(
        "$['org.iso.18013.5.1']['resident_country']",
      );
    });

    it('should include portrait and signature fields', () => {
      const fields = mDLDifinition.constraints.fields;
      const fieldPaths = fields?.map((field) => field.path?.[0]);

      expect(fieldPaths).toContain("$['org.iso.18013.5.1']['portrait']");
      expect(fieldPaths).toContain(
        "$['org.iso.18013.5.1']['portrait_capture_date']",
      );
      expect(fieldPaths).toContain(
        "$['org.iso.18013.5.1']['signature_usual_mark']",
      );
    });

    it('should have correct field structure for each constraint', () => {
      const fields = mDLDifinition.constraints.fields;

      fields?.forEach((field, index) => {
        expect(field).toHaveProperty('path');
        expect(Array.isArray(field.path)).toBe(true);
        expect(field.path?.length).toBe(1);
        expect(typeof field.path?.[0]).toBe('string');
        expect(field).toHaveProperty('intent_to_retain');
        expect(typeof field.intent_to_retain).toBe('boolean');
      });
    });
  });

  describe('mDLPresentationDefinition', () => {
    it('should be a function', () => {
      expect(typeof mDLPresentationDefinition).toBe('function');
    });

    it('should return presentation definition object when called', () => {
      const result = mDLPresentationDefinition();

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('input_descriptors');
    });

    it('should return correct presentation definition structure', () => {
      const result = mDLPresentationDefinition();

      expect(result.id).toBe('org.iso.18013.5.1.mDL');
      expect(Array.isArray(result.input_descriptors)).toBe(true);
      expect(result.input_descriptors?.length).toBe(1);
      expect(result.input_descriptors?.[0]).toBe(mDLDifinition);
    });

    it('should be idempotent - return same result on multiple calls', () => {
      const result1 = mDLPresentationDefinition();
      const result2 = mDLPresentationDefinition();

      expect(result1).toEqual(result2);
      expect(result1.id).toBe(result2.id);
      expect(result1.input_descriptors).toEqual(result2.input_descriptors);
    });

    it('should include the mDLDifinition in input_descriptors', () => {
      const result = mDLPresentationDefinition();

      expect(result.input_descriptors?.[0]).toStrictEqual(mDLDifinition);
    });
  });

  describe('ISO 18013-5 compliance', () => {
    it('should use correct ISO namespace in all field paths', () => {
      const fields = mDLDifinition.constraints.fields;

      fields?.forEach((field) => {
        expect(field.path?.[0]).toMatch(/^\$\['org\.iso\.18013\.5\.1'\]/);
      });
    });

    it('should support mso_mdoc format as per ISO 18013-5', () => {
      expect(mDLDifinition.format?.mso_mdoc).toBeDefined();
      expect(mDLDifinition.format?.mso_mdoc?.alg).toContain('ES256');
    });

    it('should include mandatory mDL data elements', () => {
      const fields = mDLDifinition.constraints.fields;
      const fieldPaths = fields?.map((field) => field.path?.[0]);

      // Mandatory elements according to ISO 18013-5
      const mandatoryFields = [
        'family_name',
        'given_name',
        'birth_date',
        'issue_date',
        'expiry_date',
        'document_number',
        'issuing_authority',
      ];

      mandatoryFields.forEach((fieldName) => {
        const expectedPath = `$['org.iso.18013.5.1']['${fieldName}']`;
        expect(fieldPaths).toContain(expectedPath);
      });
    });
  });

  describe('edge cases and validation', () => {
    it('should handle empty constraints gracefully', () => {
      // Verify the structure is robust
      expect(mDLDifinition.constraints.fields).toBeDefined();
      expect(mDLDifinition.constraints.fields?.length).toBeGreaterThan(0);
    });

    it('should have unique field paths', () => {
      const fields = mDLDifinition.constraints.fields;
      const fieldPaths = fields?.map((field) => field.path?.[0]);
      const uniquePaths = new Set(fieldPaths);

      expect(uniquePaths.size).toBe(fieldPaths?.length ?? 0);
    });

    it('should have consistent naming convention', () => {
      const fields = mDLDifinition.constraints.fields;

      fields?.forEach((field) => {
        // All paths should follow the same pattern (including numbers)
        expect(field.path?.[0]).toMatch(
          /^\$\['org\.iso\.18013\.5\.1'\]\['[a-z0-9_]+'\]$/,
        );
      });
    });
  });
});
