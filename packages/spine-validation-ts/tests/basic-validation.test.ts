/**
 * Unit tests for spine-validation-ts package - Basic validation and formatting.
 *
 * Tests basic validation functionality and violation formatting.
 */

import { validate, formatViolations } from '../src';

describe('Basic Validation', () => {
    it('should export `validate` function', () => {
        expect(typeof validate).toBe('function');
    });

    it('should export `formatViolations` function', () => {
        expect(typeof formatViolations).toBe('function');
    });
});

describe('Format Violations', () => {
    it('should return "No violations" for empty array', () => {
        const result = formatViolations([]);
        expect(result).toBe('No violations');
    });
});
