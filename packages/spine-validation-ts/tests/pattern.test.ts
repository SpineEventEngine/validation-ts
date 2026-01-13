/**
 * Unit tests for `(pattern)` validation option.
 *
 * Tests regex pattern validation for string fields.
 */

import { create } from '@bufbuild/protobuf';
import { validate } from '../src';

import {
    PatternValidationSchema,
    RepeatedPatternValidationSchema,
    CaseInsensitivePatternSchema,
    OptionalPatternSchema
} from './generated/test-pattern_pb';

describe('Pattern Field Validation', () => {
    describe('Single Pattern Fields', () => {
        it('should validate alpha-only field', () => {
            const valid = create(PatternValidationSchema, {
                alphaField: 'HelloWorld',
                alphanumericField: 'Test123',
                email: 'test@example.com',
                phone: '555-123-4567',
                website: 'https://example.com',  
                colorHex: '#FF5733',
                username: 'user_name-123'
            });

            const violations = validate(PatternValidationSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect invalid alpha-only field (contains numbers)', () => {
            const invalid = create(PatternValidationSchema, {
                alphaField: 'Hello123',  // Invalid: contains numbers. 
                alphanumericField: 'Test',
                email: 'test@example.com',
                phone: '555-123-4567',
                website: 'https://example.com',  
                colorHex: '#FF5733',
                username: 'username'
            });

            const violations = validate(PatternValidationSchema, invalid);
            const alphaViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'alpha_field');
            expect(alphaViolation).toBeDefined();
            expect(alphaViolation?.message?.withPlaceholders).toContain('must contain only letters');
        });

        it('should detect invalid email `pattern`', () => {
            const invalid = create(PatternValidationSchema, {
                alphaField: 'Test',
                alphanumericField: 'Test',
                email: 'notanemail',  // Invalid email. 
                phone: '555-123-4567',
                website: 'https://example.com',  
                colorHex: '#FF5733',
                username: 'username'
            });

            const violations = validate(PatternValidationSchema, invalid);
            const emailViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'email');
            expect(emailViolation).toBeDefined();
            expect(emailViolation?.message?.withPlaceholders).toContain('Invalid email format');
        });

        it('should detect invalid phone `pattern`', () => {
            const invalid = create(PatternValidationSchema, {
                alphaField: 'Test',
                alphanumericField: 'Test',
                email: 'test@example.com',
                phone: '1234567890',  // Invalid: missing dashes. 
                website: 'https://example.com',  
                colorHex: '#FF5733',
                username: 'username'
            });

            const violations = validate(PatternValidationSchema, invalid);
            const phoneViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'phone');
            expect(phoneViolation).toBeDefined();
            expect(phoneViolation?.message?.withPlaceholders).toContain('XXX-XXX-XXXX');
        });

        it('should detect invalid hex color', () => {
            const invalid = create(PatternValidationSchema, {
                alphaField: 'Test',
                alphanumericField: 'Test',
                email: 'test@example.com',
                phone: '555-123-4567',
                website: 'https://example.com',  
                colorHex: 'FF5733',  // Invalid: missing #. 
                username: 'username'
            });

            const violations = validate(PatternValidationSchema, invalid);
            const colorViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'color_hex');
            expect(colorViolation).toBeDefined();
            expect(colorViolation?.message?.withPlaceholders).toContain('hex code');
        });

        it('should detect invalid username (too short)', () => {
            const invalid = create(PatternValidationSchema, {
                alphaField: 'Test',
                alphanumericField: 'Test',
                email: 'test@example.com',
                phone: '555-123-4567',
                website: 'https://example.com',  
                colorHex: '#FF5733',
                username: 'ab'  // Invalid: too short (needs 3-20). 
            });

            const violations = validate(PatternValidationSchema, invalid);
            const usernameViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'username');
            expect(usernameViolation).toBeDefined();
            expect(usernameViolation?.message?.withPlaceholders).toContain('3-20 characters');
        });
    });

    describe('Repeated Pattern Fields', () => {
        it('should validate repeated fields with all valid values', () => {
            const valid = create(RepeatedPatternValidationSchema, {
                emails: ['user1@example.com', 'user2@test.org'],
                tags: ['tag1', 'tag2', 'tag3']
            });

            const violations = validate(RepeatedPatternValidationSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect invalid email in repeated field', () => {
            const invalid = create(RepeatedPatternValidationSchema, {
                emails: ['valid@example.com', 'invalid-email', 'another@test.org'],
                tags: ['tag1']
            });

            const violations = validate(RepeatedPatternValidationSchema, invalid);
            const emailViolation = violations.find(v => v.fieldPath?.fieldName[0]?.startsWith('emails'));
            expect(emailViolation).toBeDefined();
        });

        it('should detect invalid tag in repeated field', () => {
            const invalid = create(RepeatedPatternValidationSchema, {
                emails: ['valid@example.com'],
                tags: ['validtag', 'invalid-tag!', 'another']  // Middle tag has special char. 
            });

            const violations = validate(RepeatedPatternValidationSchema, invalid);
            const tagViolation = violations.find(v => v.fieldPath?.fieldName[0]?.startsWith('tags'));
            expect(tagViolation).toBeDefined();
        });
    });

    describe('Optional Pattern Fields', () => {
        it('should not `validate` `pattern` on empty optional fields', () => {
            const valid = create(OptionalPatternSchema, {
                optionalEmail: '',
                optionalPhone: ''
            });

            const violations = validate(OptionalPatternSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should validate pattern when optional field has value', () => {
            const invalid = create(OptionalPatternSchema, {
                optionalEmail: 'invalid',  // Invalid email format. 
                optionalPhone: ''
            });

            const violations = validate(OptionalPatternSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
            const emailViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'optional_email');
            expect(emailViolation).toBeDefined();
        });
    });
});

