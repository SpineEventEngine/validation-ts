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
 * Unit tests for `(min)` and `(max)` validation options.
 *
 * Tests numeric range validation with inclusive/exclusive bounds.
 */

import { create } from '@bufbuild/protobuf';
import { validate } from '../src';

import {
    MinValueSchema,
    MaxValueSchema,
    MinMaxRangeSchema,
    ExclusiveBoundsSchema,
    CustomErrorMessagesSchema,
    NumericTypesSchema,
    RepeatedMinMaxSchema,
    CombinedConstraintsSchema,
    OptionalMinMaxSchema
} from './generated/test-min-max_pb';

describe('Min/Max Validation', () => {
    describe('Basic Min Constraint', () => {
        it('should pass when value meets minimum `(inclusive)`', () => {
            const valid = create(MinValueSchema, {
                positiveId: 1,
                nonNegative: 0,
                price: 0.01
            });

            const violations = validate(MinValueSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when value exceeds minimum', () => {
            const valid = create(MinValueSchema, {
                positiveId: 100,
                nonNegative: 50,
                price: 19.99
            });

            const violations = validate(MinValueSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when value is below minimum', () => {
            const invalid = create(MinValueSchema, {
                positiveId: 0,  // Violates min = 1. 
                nonNegative: 5,
                price: 0.01
            });

            const violations = validate(MinValueSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const positiveIdViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'positive_id');
            expect(positiveIdViolation).toBeDefined();
            expect(positiveIdViolation?.message?.withPlaceholders).toContain('at least');
        });

        it('should fail when price is below minimum', () => {
            const invalid = create(MinValueSchema, {
                positiveId: 1,
                nonNegative: 0,
                price: 0.001  // Violates min = 0.01. 
            });

            const violations = validate(MinValueSchema, invalid);
            const priceViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'price');
            expect(priceViolation).toBeDefined();
        });

        it('should `validate` zero values (`proto3` cannot distinguish unset from zero)', () => {
            const withDefaults = create(MinValueSchema, {
                positiveId: 0,
                nonNegative: 0,
                price: 0
            });

            // `positive_id` violates `min=1`, price violates `min=0.01`, nonNegative is valid.
            const violations = validate(MinValueSchema, withDefaults);
            expect(violations.length).toBeGreaterThanOrEqual(2);

            const positiveIdViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'positive_id');
            expect(positiveIdViolation).toBeDefined();

            const priceViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'price');
            expect(priceViolation).toBeDefined();
        });
    });

    describe('Basic Max Constraint', () => {
        it('should pass when value meets maximum `(inclusive)`', () => {
            const valid = create(MaxValueSchema, {
                percentage: 100,
                altitude: 8848.86,
                year: 2100n
            });

            const violations = validate(MaxValueSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when value is below maximum', () => {
            const valid = create(MaxValueSchema, {
                percentage: 50,
                altitude: 1000.0,
                year: 2025n
            });

            const violations = validate(MaxValueSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when value exceeds maximum', () => {
            const invalid = create(MaxValueSchema, {
                percentage: 101,  // Violates max = 100. 
                altitude: 8000.0,
                year: 2050n
            });

            const violations = validate(MaxValueSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const percentageViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'percentage');
            expect(percentageViolation).toBeDefined();
            expect(percentageViolation?.message?.withPlaceholders).toContain('at most');
        });

        it('should fail when altitude exceeds maximum', () => {
            const invalid = create(MaxValueSchema, {
                percentage: 100,
                altitude: 9000.0,  // Violates max = 8848.86. 
                year: 2050n
            });

            const violations = validate(MaxValueSchema, invalid);
            const altitudeViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'altitude');
            expect(altitudeViolation).toBeDefined();
        });
    });

    describe('Combined Min and Max Constraints', () => {
        it('should pass when value is within `range`', () => {
            const valid = create(MinMaxRangeSchema, {
                age: 25,
                temperature: 20.5,
                percentage: 50
            });

            const violations = validate(MinMaxRangeSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass at boundary values', () => {
            const valid = create(MinMaxRangeSchema, {
                age: 0,       // min boundary. 
                temperature: -273.15,  // min boundary. 
                percentage: 100  // max boundary. 
            });

            const violations = validate(MinMaxRangeSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when value is below minimum', () => {
            const invalid = create(MinMaxRangeSchema, {
                age: -1,  // Violates min = 0. 
                temperature: 20.0,
                percentage: 50
            });

            const violations = validate(MinMaxRangeSchema, invalid);
            const ageViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'age');
            expect(ageViolation).toBeDefined();
        });

        it('should fail when value exceeds maximum', () => {
            const invalid = create(MinMaxRangeSchema, {
                age: 25,
                temperature: 1001.0,  // Violates max = 1000.0. 
                percentage: 50
            });

            const violations = validate(MinMaxRangeSchema, invalid);
            const tempViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'temperature');
            expect(tempViolation).toBeDefined();
        });

        it('should detect multiple violations', () => {
            const invalid = create(MinMaxRangeSchema, {
                age: 151,  // Violates max = 150. 
                temperature: -300.0,  // Violates min = -273.15. 
                percentage: 101  // Violates max = 100. 
            });

            const violations = validate(MinMaxRangeSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Exclusive Bounds', () => {
        it('should pass when value is strictly greater than exclusive minimum', () => {
            const valid = create(ExclusiveBoundsSchema, {
                positiveValue: 0.1,
                temperatureKelvin: 100.0,
                belowLimit: 50
            });

            const violations = validate(ExclusiveBoundsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when value equals exclusive minimum', () => {
            const invalid = create(ExclusiveBoundsSchema, {
                positiveValue: 0.0,  // Violates exclusive min = 0.0. 
                temperatureKelvin: 100.0,
                belowLimit: 50
            });

            const violations = validate(ExclusiveBoundsSchema, invalid);
            const positiveValueViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'positive_value');
            expect(positiveValueViolation).toBeDefined();
            expect(positiveValueViolation?.message?.withPlaceholders).toContain('greater than');
        });

        it('should fail when value equals exclusive maximum', () => {
            const invalid = create(ExclusiveBoundsSchema, {
                positiveValue: 0.1,
                temperatureKelvin: 100.0,
                belowLimit: 100  // Violates exclusive max = 100. 
            });

            const violations = validate(ExclusiveBoundsSchema, invalid);
            const belowLimitViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'below_limit');
            expect(belowLimitViolation).toBeDefined();
            expect(belowLimitViolation?.message?.withPlaceholders).toContain('less than');
        });

        it('should use custom error message for temperature', () => {
            const invalid = create(ExclusiveBoundsSchema, {
                positiveValue: 0.1,
                temperatureKelvin: 0.0,  // Violates exclusive min with custom message. 
                belowLimit: 50
            });

            const violations = validate(ExclusiveBoundsSchema, invalid);
            const tempViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'temperature_kelvin');
            expect(tempViolation).toBeDefined();
            expect(tempViolation?.message?.withPlaceholders).toContain('Temperature cannot reach');
            expect(tempViolation?.message?.placeholderValue?.['other']).toBe('0.0');
            expect(tempViolation?.message?.placeholderValue?.['value']).toBe('0');
        });
    });

    describe('Custom Error Messages', () => {
        it('should use custom error message for age minimum', () => {
            const invalid = create(CustomErrorMessagesSchema, {
                age: 17,  // Violates min = 18. 
                balance: 100.0
            });

            const violations = validate(CustomErrorMessagesSchema, invalid);
            const ageViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'age');
            expect(ageViolation).toBeDefined();
            expect(ageViolation?.message?.withPlaceholders).toContain('Must be at least');
            expect(ageViolation?.message?.withPlaceholders).toContain('years old');
            expect(ageViolation?.message?.placeholderValue?.['other']).toBe('18');
            expect(ageViolation?.message?.placeholderValue?.['value']).toBe('17');
        });

        it('should use custom error message for balance minimum', () => {
            const invalid = create(CustomErrorMessagesSchema, {
                age: 25,
                balance: 0.001  // Violates min = 0.01. 
            });

            const violations = validate(CustomErrorMessagesSchema, invalid);
            const balanceViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'balance');
            expect(balanceViolation).toBeDefined();
            expect(balanceViolation?.message?.withPlaceholders).toContain('Balance must be at least');
        });

        it('should use custom error message for balance maximum', () => {
            const invalid = create(CustomErrorMessagesSchema, {
                age: 25,
                balance: 1000001.0  // Violates max = 1000000.0. 
            });

            const violations = validate(CustomErrorMessagesSchema, invalid);
            const balanceViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'balance');
            expect(balanceViolation).toBeDefined();
            expect(balanceViolation?.message?.withPlaceholders).toContain('Balance cannot exceed');
        });
    });

    describe('Different Numeric Types', () => {
        it('should `validate` all numeric types correctly', () => {
            const valid = create(NumericTypesSchema, {
                int32Field: 100,
                int64Field: 1000n,
                uint32Field: 1000,
                uint64Field: 1n,
                floatField: 50.0,
                doubleField: 0.0
            });

            const violations = validate(NumericTypesSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect violations across different types', () => {
            const invalid = create(NumericTypesSchema, {
                int32Field: -1,  // Violates min = 0. 
                int64Field: -1n,  // Violates min = 0. 
                uint32Field: 5000000000,  // Violates max (too large). 
                uint64Field: 0n,  // Violates min = 1. 
                floatField: 101.0,  // Violates max = 100.0. 
                doubleField: 1001.0  // Violates max = 1000.0. 
            });

            const violations = validate(NumericTypesSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(4);
        });
    });

    describe('Repeated Fields', () => {
        it('should `validate` all elements in repeated field', () => {
            const valid = create(RepeatedMinMaxSchema, {
                scores: [0, 50, 100],
                prices: [0.01, 10.0, 99.99]
            });

            const violations = validate(RepeatedMinMaxSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect violation in one element of repeated field', () => {
            const invalid = create(RepeatedMinMaxSchema, {
                scores: [50, 101, 75],  // Second element violates max = 100. 
                prices: [10.0, 20.0]
            });

            const violations = validate(RepeatedMinMaxSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const scoreViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'scores' && v.fieldPath?.fieldName[1] === '1'
            );
            expect(scoreViolation).toBeDefined();
        });

        it('should detect multiple violations in repeated field', () => {
            const invalid = create(RepeatedMinMaxSchema, {
                scores: [-1, 50, 101],  // First and third violate constraints. 
                prices: [0.001, 10.0]  // First violates min = 0.01. 
            });

            const violations = validate(RepeatedMinMaxSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(3);
        });

        it('should not `validate` empty repeated fields', () => {
            const empty = create(RepeatedMinMaxSchema, {
                scores: [],
                prices: []
            });

            const violations = validate(RepeatedMinMaxSchema, empty);
            expect(violations).toHaveLength(0);
        });
    });

    describe('Combined with Required', () => {
        it('should pass when `required` field meets `min` constraint', () => {
            const valid = create(CombinedConstraintsSchema, {
                productId: 1,
                price: 0.01,
                stock: 100
            });

            const violations = validate(CombinedConstraintsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect `required` violation', () => {
            const invalid = create(CombinedConstraintsSchema, {
                productId: 0,  // Required but set to default. 
                price: 0,  // Required but set to default. 
                stock: 10
            });

            const violations = validate(CombinedConstraintsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            // Should have violations for required fields.
            const hasRequiredViolation = violations.some(v =>
                v.message?.withPlaceholders.includes('value must be set')
            );
            expect(hasRequiredViolation).toBe(true);
        });

        it('should detect `min` violation on `required` field', () => {
            const invalid = create(CombinedConstraintsSchema, {
                productId: 0,  // Violates min = 1 AND required. 
                price: 10.0,
                stock: 5
            });

            const violations = validate(CombinedConstraintsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
        });

        it('should use custom error message from `min` option', () => {
            const invalid = create(CombinedConstraintsSchema, {
                productId: 10,
                price: 0.001,  // Violates min = 0.01. 
                stock: 5
            });

            const violations = validate(CombinedConstraintsSchema, invalid);
            const priceViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'price');
            expect(priceViolation).toBeDefined();
            expect(priceViolation?.message?.withPlaceholders).toContain('Price must be at least');
            expect(priceViolation?.message?.placeholderValue?.['other']).toBe('0.01');
        });
    });

    describe('Optional Fields', () => {
        it('should `validate` even zero values in `proto3`', () => {
            const withDefaults = create(OptionalMinMaxSchema, {
                optionalCount: 0,  // Violates min = 1 (proto3 treats 0 as set). 
                optionalRating: 0  // Within max = 5.0, so valid. 
            });

            const violations = validate(OptionalMinMaxSchema, withDefaults);
            expect(violations.length).toBeGreaterThan(0);

            const countViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'optional_count');
            expect(countViolation).toBeDefined();
        });

        it('should `validate` when optional fields have non-default values', () => {
            const invalid = create(OptionalMinMaxSchema, {
                optionalCount: 2,  // Valid. 
                optionalRating: 5.5  // Violates max = 5.0. 
            });

            const violations = validate(OptionalMinMaxSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const ratingViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'optional_rating');
            expect(ratingViolation).toBeDefined();
        });
    });
});

