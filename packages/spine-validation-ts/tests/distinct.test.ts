/*
 * Copyright 2026, TeamDev. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Redistribution and use in source and/or binary forms, with or without
 * modification, must retain the above copyright notice and the following
 * disclaimer.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Unit tests for `(distinct)` validation option.
 *
 * Tests uniqueness validation for repeated fields.
 */

import { create } from '@bufbuild/protobuf';
import { validate } from '../src';

import {
    DistinctPrimitivesSchema,
    DistinctEnumsSchema,
    Status as DistinctStatus,
    NonDistinctFieldsSchema,
    CombinedConstraintsSchema as DistinctCombinedConstraintsSchema,
    OptionalDistinctSchema,
    UserProfileSchema,
    ShoppingCartSchema,
    DistinctNumericTypesSchema,
    DistinctEdgeCasesSchema
} from './generated/test-distinct_pb';

describe('Distinct Validation', () => {
    describe('Primitive Types with Distinct', () => {
        it('should pass when all elements are unique', () => {
            const valid = create(DistinctPrimitivesSchema, {
                numbers: [1, 2, 3, 4, 5],
                tags: ['alpha', 'beta', 'gamma'],
                scores: [85.5, 92.3, 78.9],
                flags: [true, false]
            });

            const violations = validate(DistinctPrimitivesSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when numbers have duplicates', () => {
            const invalid = create(DistinctPrimitivesSchema, {
                numbers: [1, 2, 3, 2, 4],  // 2 is duplicated at indices 1 and 3. 
                tags: ['alpha', 'beta', 'gamma'],
                scores: [85.5, 92.3, 78.9],
                flags: [true, false]
            });

            const violations = validate(DistinctPrimitivesSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const numberViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'numbers' && v.fieldPath?.fieldName[1] === '3'
            );
            expect(numberViolation).toBeDefined();
            expect(numberViolation?.message?.placeholderValue?.['value']).toBe('2');
            expect(numberViolation?.message?.placeholderValue?.['first_index']).toBe('1');
            expect(numberViolation?.message?.placeholderValue?.['duplicate_index']).toBe('3');
        });

        it('should fail when strings have duplicates', () => {
            const invalid = create(DistinctPrimitivesSchema, {
                numbers: [1, 2, 3],
                tags: ['alpha', 'beta', 'alpha', 'gamma'],  // 'alpha' duplicated. 
                scores: [85.5, 92.3, 78.9],
                flags: [true, false]
            });

            const violations = validate(DistinctPrimitivesSchema, invalid);
            const tagViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'tags');
            expect(tagViolation).toBeDefined();
            expect(tagViolation?.message?.placeholderValue?.['value']).toBe('alpha');
        });

        it('should fail when doubles have duplicates', () => {
            const invalid = create(DistinctPrimitivesSchema, {
                numbers: [1, 2, 3],
                tags: ['alpha', 'beta', 'gamma'],
                scores: [85.5, 92.3, 85.5, 78.9],  // 85.5 duplicated. 
                flags: [true, false]
            });

            const violations = validate(DistinctPrimitivesSchema, invalid);
            const scoreViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'scores');
            expect(scoreViolation).toBeDefined();
        });

        it('should detect multiple duplicates in same field', () => {
            const invalid = create(DistinctPrimitivesSchema, {
                numbers: [1, 2, 1, 3, 2, 4],  // Both 1 and 2 duplicated. 
                tags: ['alpha'],
                scores: [85.5],
                flags: [true]
            });

            const violations = validate(DistinctPrimitivesSchema, invalid);
            const numberViolations = violations.filter(v => v.fieldPath?.fieldName[0] === 'numbers');
            expect(numberViolations.length).toBe(2);  // Two violations for two duplicates. 
        });
    });

    describe('Enum Fields with Distinct', () => {
        it('should pass when all enum values are unique', () => {
            const valid = create(DistinctEnumsSchema, {
                statuses: [DistinctStatus.ACTIVE, DistinctStatus.INACTIVE, DistinctStatus.PENDING]
            });

            const violations = validate(DistinctEnumsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when enum values are duplicated', () => {
            const invalid = create(DistinctEnumsSchema, {
                statuses: [DistinctStatus.ACTIVE, DistinctStatus.INACTIVE, DistinctStatus.ACTIVE]
            });

            const violations = validate(DistinctEnumsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const statusViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'statuses');
            expect(statusViolation).toBeDefined();
        });
    });

    describe('Non-Distinct Fields (Control Group)', () => {
        it('should allow duplicates when `distinct` is not set', () => {
            const withDuplicates = create(NonDistinctFieldsSchema, {
                numbers: [1, 2, 2, 3, 3, 3],  // Duplicates allowed. 
                tags: ['alpha', 'alpha', 'beta']  // Duplicates allowed. 
            });

            const violations = validate(NonDistinctFieldsSchema, withDuplicates);
            expect(violations).toHaveLength(0);  // No violations - duplicates are OK. 
        });
    });

    describe('Combined Constraints (Distinct + Other Options)', () => {
        it('should pass when all constraints are satisfied', () => {
            const valid = create(DistinctCombinedConstraintsSchema, {
                productIds: [1, 100, 500, 999],  // Distinct and within range. 
                emails: ['user1@example.com', 'user2@example.com'],  // Distinct and match pattern. 
                scores: [75, 85, 92]  // Distinct and within min/max. 
            });

            const violations = validate(DistinctCombinedConstraintsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect `distinct` violation even when `range` is satisfied', () => {
            const invalid = create(DistinctCombinedConstraintsSchema, {
                productIds: [100, 200, 100],  // Duplicate but within range. 
                emails: ['user1@example.com', 'user2@example.com'],
                scores: [75, 85, 92]
            });

            const violations = validate(DistinctCombinedConstraintsSchema, invalid);
            const distinctViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'product_ids' &&
                v.message?.withPlaceholders.includes('Duplicate')
            );
            expect(distinctViolation).toBeDefined();
        });

        it('should detect `distinct` violation in repeated emails', () => {
            const invalid = create(DistinctCombinedConstraintsSchema, {
                productIds: [100, 200, 300],
                emails: ['user1@example.com', 'user2@example.com', 'user1@example.com'],  // Duplicate. 
                scores: [75, 85, 92]
            });

            const violations = validate(DistinctCombinedConstraintsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            // Should have distinct violation for duplicate email.
            const distinctViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'emails' &&
                v.message?.withPlaceholders.includes('Duplicate')
            );
            expect(distinctViolation).toBeDefined();
            expect(distinctViolation?.message?.placeholderValue?.['value']).toBe('user1@example.com');
        });

        it('should detect both `distinct` and `range` violations', () => {
            const invalid = create(DistinctCombinedConstraintsSchema, {
                productIds: [100, 200, 300],
                emails: ['user1@example.com', 'user2@example.com'],
                scores: [75, 101, 75]  // 101 violates max, 75 is duplicate. 
            });

            const violations = validate(DistinctCombinedConstraintsSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(2);

            const rangeViolation = violations.find(v =>
                v.fieldPath?.fieldName[1] === '1' &&
                v.message?.withPlaceholders.includes('at most')
            );
            expect(rangeViolation).toBeDefined();

            const distinctViolation = violations.find(v =>
                v.message?.withPlaceholders.includes('Duplicate')
            );
            expect(distinctViolation).toBeDefined();
        });
    });

    describe('Optional/Empty Repeated Fields', () => {
        it('should pass when repeated fields are empty', () => {
            const empty = create(OptionalDistinctSchema, {
                optionalNumbers: [],
                optionalTags: []
            });

            const violations = validate(OptionalDistinctSchema, empty);
            expect(violations).toHaveLength(0);
        });

        it('should pass when repeated field has single element', () => {
            const singleElement = create(OptionalDistinctSchema, {
                optionalNumbers: [42],
                optionalTags: ['solo']
            });

            const violations = validate(OptionalDistinctSchema, singleElement);
            expect(violations).toHaveLength(0);
        });

        it('should `validate` when optional fields have multiple elements', () => {
            const invalid = create(OptionalDistinctSchema, {
                optionalNumbers: [1, 2, 1],  // Duplicate. 
                optionalTags: ['tag1', 'tag2']
            });

            const violations = validate(OptionalDistinctSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
        });
    });

    describe('Real-World Scenarios', () => {
        it('should `validate` user profile with `distinct` tags', () => {
            const valid = create(UserProfileSchema, {
                username: 'johndoe',
                tags: ['developer', 'typescript', 'nodejs'],
                skills: ['javascript', 'react', 'python']
            });

            const violations = validate(UserProfileSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should reject user profile with duplicate tags', () => {
            const invalid = create(UserProfileSchema, {
                username: 'johndoe',
                tags: ['developer', 'typescript', 'developer'],  // Duplicate. 
                skills: ['javascript', 'react', 'python']
            });

            const violations = validate(UserProfileSchema, invalid);
            const tagViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'tags');
            expect(tagViolation).toBeDefined();
        });

        it('should `validate` shopping cart with unique product IDs', () => {
            const valid = create(ShoppingCartSchema, {
                productIds: [101, 202, 303],
                couponCodes: ['SUMMER2024', 'FREESHIP']
            });

            const violations = validate(ShoppingCartSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should reject shopping cart with duplicate product IDs', () => {
            const invalid = create(ShoppingCartSchema, {
                productIds: [101, 202, 101],  // Duplicate product. 
                couponCodes: ['SUMMER2024', 'FREESHIP']
            });

            const violations = validate(ShoppingCartSchema, invalid);
            const productViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'product_ids');
            expect(productViolation).toBeDefined();
        });

        it('should reject duplicate coupon codes', () => {
            const invalid = create(ShoppingCartSchema, {
                productIds: [101, 202, 303],
                couponCodes: ['SUMMER2024', 'FREESHIP', 'SUMMER2024']  // Duplicate. 
            });

            const violations = validate(ShoppingCartSchema, invalid);
            const couponViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'coupon_codes');
            expect(couponViolation).toBeDefined();
        });
    });

    describe('Different Numeric Types with Distinct', () => {
        it('should `validate` `distinct` for all numeric types', () => {
            const valid = create(DistinctNumericTypesSchema, {
                int32Values: [1, 2, 3],
                int64Values: [100n, 200n, 300n],
                uint32Values: [10, 20, 30],
                uint64Values: [1000n, 2000n, 3000n],
                floatValues: [1.1, 2.2, 3.3],
                doubleValues: [10.1, 20.2, 30.3]
            });

            const violations = validate(DistinctNumericTypesSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect duplicates in int64 fields', () => {
            const invalid = create(DistinctNumericTypesSchema, {
                int32Values: [1, 2, 3],
                int64Values: [100n, 200n, 100n],  // Duplicate. 
                uint32Values: [10, 20, 30],
                uint64Values: [1000n, 2000n, 3000n],
                floatValues: [1.1, 2.2, 3.3],
                doubleValues: [10.1, 20.2, 30.3]
            });

            const violations = validate(DistinctNumericTypesSchema, invalid);
            const int64Violation = violations.find(v => v.fieldPath?.fieldName[0] === 'int64_values');
            expect(int64Violation).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should treat empty strings as duplicates', () => {
            const invalid = create(DistinctEdgeCasesSchema, {
                emptyStrings: ['', 'value', ''],  // Two empty strings. 
                zeros: [0, 1, 2],
                caseSensitive: ['Tag', 'tag']
            });

            const violations = validate(DistinctEdgeCasesSchema, invalid);
            const emptyViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'empty_strings');
            expect(emptyViolation).toBeDefined();
        });

        it('should treat zeros as duplicates', () => {
            const invalid = create(DistinctEdgeCasesSchema, {
                emptyStrings: ['value1', 'value2'],
                zeros: [0, 1, 0],  // Two zeros. 
                caseSensitive: ['Tag', 'tag']
            });

            const violations = validate(DistinctEdgeCasesSchema, invalid);
            const zeroViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'zeros');
            expect(zeroViolation).toBeDefined();
        });

        it('should be case-sensitive for strings', () => {
            const valid = create(DistinctEdgeCasesSchema, {
                emptyStrings: ['value1', 'value2'],
                zeros: [0, 1, 2],
                caseSensitive: ['Tag', 'tag', 'TAG']  // All different due to case. 
            });

            const violations = validate(DistinctEdgeCasesSchema, valid);
            expect(violations).toHaveLength(0);  // No violations - case matters. 
        });

        it('should detect case-insensitive duplicates correctly', () => {
            const invalid = create(DistinctEdgeCasesSchema, {
                emptyStrings: ['value1', 'value2'],
                zeros: [0, 1, 2],
                caseSensitive: ['Tag', 'tag', 'Tag']  // 'Tag' duplicated (exact match). 
            });

            const violations = validate(DistinctEdgeCasesSchema, invalid);
            const caseViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'case_sensitive');
            expect(caseViolation).toBeDefined();
        });
    });
});

