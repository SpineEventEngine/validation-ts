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
 * Unit tests for `(range)` validation option.
 *
 * Tests numeric range validation using bracket notation.
 */

import { create } from '@bufbuild/protobuf';
import { validate } from '../src';

import {
    ClosedRangeSchema,
    OpenRangeSchema,
    HalfOpenRangeSchema,
    NumericTypeRangesSchema,
    RepeatedRangeSchema,
    CombinedConstraintsSchema as RangeCombinedConstraintsSchema,
    PaymentCardSchema,
    RGBColorSchema,
    PaginationRequestSchema,
    OptionalRangeSchema,
    EdgeCaseRangesSchema
} from './generated/test-range_pb';

describe('Range Validation', () => {
    describe('Closed (Inclusive) Ranges', () => {
        it('should pass when value is within closed `range`', () => {
            const valid = create(ClosedRangeSchema, {
                percentage: 50,
                rgbValue: 128,
                temperatureC: 25.0
            });

            const violations = validate(ClosedRangeSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass at boundary values `(inclusive)`', () => {
            const valid = create(ClosedRangeSchema, {
                percentage: 0,      // Min boundary. 
                rgbValue: 255,      // Max boundary. 
                temperatureC: -273.15  // Min boundary. 
            });

            const violations = validate(ClosedRangeSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when value is below minimum', () => {
            const invalid = create(ClosedRangeSchema, {
                percentage: -1,  // Violates [0..100]. 
                rgbValue: 128,
                temperatureC: 25.0
            });

            const violations = validate(ClosedRangeSchema, invalid);
            const percentageViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'percentage');
            expect(percentageViolation).toBeDefined();
            expect(percentageViolation?.message?.withPlaceholders).toContain('[0..100]');
        });

        it('should fail when value exceeds maximum', () => {
            const invalid = create(ClosedRangeSchema, {
                percentage: 50,
                rgbValue: 256,  // Violates [0..255]. 
                temperatureC: 25.0
            });

            const violations = validate(ClosedRangeSchema, invalid);
            const rgbViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'rgb_value');
            expect(rgbViolation).toBeDefined();
            expect(rgbViolation?.message?.withPlaceholders).toContain('[0..255]');
        });
    });

    describe('Open (Exclusive) Ranges', () => {
        it('should pass when value is within exclusive `range`', () => {
            const valid = create(OpenRangeSchema, {
                positiveValue: 50.0,
                exclusiveCount: 5
            });

            const violations = validate(OpenRangeSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail at boundary values `(exclusive)`', () => {
            const invalidMin = create(OpenRangeSchema, {
                positiveValue: 0.0,  // Violates (0.0..100.0) - must be > 0. 
                exclusiveCount: 5
            });

            const violationsMin = validate(OpenRangeSchema, invalidMin);
            const minViolation = violationsMin.find(v => v.fieldPath?.fieldName[0] === 'positive_value');
            expect(minViolation).toBeDefined();

            const invalidMax = create(OpenRangeSchema, {
                positiveValue: 50.0,
                exclusiveCount: 10  // Violates (0..10) - must be < 10. 
            });

            const violationsMax = validate(OpenRangeSchema, invalidMax);
            const maxViolation = violationsMax.find(v => v.fieldPath?.fieldName[0] === 'exclusive_count');
            expect(maxViolation).toBeDefined();
        });
    });

    describe('Half-Open Ranges', () => {
        it('should pass when value is within half-open `range`', () => {
            const valid = create(HalfOpenRangeSchema, {
                hour: 12,      // [0..24). 
                minute: 30,    // [0..60). 
                degree: 180.0, // [0.0..360.0). 
                angle: 90.0    // (0.0..180.0]. 
            });

            const violations = validate(HalfOpenRangeSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass at inclusive boundary and fail at exclusive boundary', () => {
            // Test [0..24) - 0 is valid, 24 is not.
            const validHour = create(HalfOpenRangeSchema, {
                hour: 0,  // Min is inclusive. 
                minute: 0,
                degree: 0.0,
                angle: 90.0
            });

            const violations1 = validate(HalfOpenRangeSchema, validHour);
            expect(violations1).toHaveLength(0);

            const invalidHour = create(HalfOpenRangeSchema, {
                hour: 24,  // Violates [0..24) - max is exclusive. 
                minute: 0,
                degree: 0.0,
                angle: 90.0
            });

            const violations2 = validate(HalfOpenRangeSchema, invalidHour);
            const hourViolation = violations2.find(v => v.fieldPath?.fieldName[0] === 'hour');
            expect(hourViolation).toBeDefined();
        });

        it('should handle (`min`..`max`] correctly', () => {
            // Test (0.0..180.0] - 0 is not valid, 180 is valid.
            const invalidAngle = create(HalfOpenRangeSchema, {
                hour: 12,
                minute: 30,
                degree: 180.0,
                angle: 0.0  // Violates (0.0..180.0] - min is exclusive. 
            });

            const violations1 = validate(HalfOpenRangeSchema, invalidAngle);
            const angleViolation = violations1.find(v => v.fieldPath?.fieldName[0] === 'angle');
            expect(angleViolation).toBeDefined();

            const validAngle = create(HalfOpenRangeSchema, {
                hour: 12,
                minute: 30,
                degree: 180.0,
                angle: 180.0  // Max is inclusive. 
            });

            const violations2 = validate(HalfOpenRangeSchema, validAngle);
            expect(violations2).toHaveLength(0);
        });
    });

    describe('Different Numeric Types', () => {
        it('should `validate` ranges for all numeric types', () => {
            const valid = create(NumericTypeRangesSchema, {
                int32Field: 50,
                int64Field: 500000n,
                uint32Field: 30000,
                uint64Field: 1000000n,
                floatField: 0.5,
                doubleField: 250.0
            });

            const violations = validate(NumericTypeRangesSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when any numeric type violates its `range`', () => {
            const invalid = create(NumericTypeRangesSchema, {
                int32Field: 101,  // Violates [1..100]. 
                int64Field: 500000n,
                uint32Field: 30000,
                uint64Field: 1000000n,
                floatField: 1.5,  // Violates [0.0..1.0]. 
                doubleField: 250.0
            });

            const violations = validate(NumericTypeRangesSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(2);

            const int32Violation = violations.find(v => v.fieldPath?.fieldName[0] === 'int32_field');
            expect(int32Violation).toBeDefined();

            const floatViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'float_field');
            expect(floatViolation).toBeDefined();
        });
    });

    describe('Repeated Fields with Range', () => {
        it('should pass when all repeated elements are within `range`', () => {
            const valid = create(RepeatedRangeSchema, {
                scores: [85, 92, 78, 100, 0],
                percentages: [25.5, 50.0, 75.3, 100.0]
            });

            const violations = validate(RepeatedRangeSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when any repeated element violates `range`', () => {
            const invalid = create(RepeatedRangeSchema, {
                scores: [85, 92, 105, 78],  // 105 violates [0..100]. 
                percentages: [25.5, 50.0]
            });

            const violations = validate(RepeatedRangeSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const scoreViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'scores' && v.fieldPath?.fieldName[1] === '2'
            );
            expect(scoreViolation).toBeDefined();
            expect(scoreViolation?.message?.placeholderValue?.['value']).toBe('105');
        });

        it('should report violations for multiple invalid elements', () => {
            const invalid = create(RepeatedRangeSchema, {
                scores: [85, 101, 92, 102],  // 101 and 102 both violate [0..100]. 
                percentages: [25.5, 50.0]
            });

            const violations = validate(RepeatedRangeSchema, invalid);
            const scoreViolations = violations.filter(v => v.fieldPath?.fieldName[0] === 'scores');
            expect(scoreViolations.length).toBe(2);
        });
    });

    describe('Combined Constraints (Required + Range)', () => {
        it('should pass when all constraints are satisfied', () => {
            const valid = create(RangeCombinedConstraintsSchema, {
                productId: 12345,
                quantity: 50,
                discount: 0.15
            });

            const violations = validate(RangeCombinedConstraintsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail `range` validation even when `required` is satisfied', () => {
            const invalid = create(RangeCombinedConstraintsSchema, {
                productId: 12345,
                quantity: 1001,  // Violates [1..1000]. 
                discount: 0.15
            });

            const violations = validate(RangeCombinedConstraintsSchema, invalid);
            const quantityViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'quantity');
            expect(quantityViolation).toBeDefined();
            expect(quantityViolation?.message?.withPlaceholders).toContain('[1..1000]');
        });

        it('should detect both `required` and `range` violations', () => {
            const invalid = create(RangeCombinedConstraintsSchema, {
                productId: 0,  // Violates both (required) and range [1..999999]. 
                quantity: 1001,  // Violates range [1..1000]. 
                discount: 0.15
            });

            const violations = validate(RangeCombinedConstraintsSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Real-World Scenarios', () => {
        it('should `validate` payment card expiry dates', () => {
            const valid = create(PaymentCardSchema, {
                expiryMonth: 12,
                expiryYear: 2026,
                cvv: 123
            });

            const violations = validate(PaymentCardSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should reject invalid expiry month', () => {
            const invalid = create(PaymentCardSchema, {
                expiryMonth: 13,  // Violates [1..12]. 
                expiryYear: 2026,
                cvv: 123
            });

            const violations = validate(PaymentCardSchema, invalid);
            const monthViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'expiry_month');
            expect(monthViolation).toBeDefined();
        });

        it('should `validate` RGB color values', () => {
            const valid = create(RGBColorSchema, {
                red: 255,
                green: 128,
                blue: 0,
                alpha: 0.8
            });

            const violations = validate(RGBColorSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should reject invalid RGB values', () => {
            const invalid = create(RGBColorSchema, {
                red: 256,  // Violates [0..255]. 
                green: 128,
                blue: 0,
                alpha: 1.5  // Violates [0.0..1.0]. 
            });

            const violations = validate(RGBColorSchema, invalid);
            expect(violations.length).toBe(2);

            const redViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'red');
            expect(redViolation).toBeDefined();

            const alphaViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'alpha');
            expect(alphaViolation).toBeDefined();
        });

        it('should `validate` pagination parameters', () => {
            const valid = create(PaginationRequestSchema, {
                page: 5,
                pageSize: 25
            });

            const violations = validate(PaginationRequestSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should reject invalid pagination', () => {
            const invalid = create(PaginationRequestSchema, {
                page: 0,  // Violates [1..10000]. 
                pageSize: 150  // Violates [1..100]. 
            });

            const violations = validate(PaginationRequestSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Optional Fields with Range', () => {
        it('should `validate` zero values in `proto3`', () => {
            const withDefaults = create(OptionalRangeSchema, {
                optionalScore: 0,  // Violates [1..100] (proto3 treats 0 as set). 
                optionalRating: 0  // Violates [1.0..5.0]. 
            });

            const violations = validate(OptionalRangeSchema, withDefaults);
            expect(violations.length).toBeGreaterThanOrEqual(2);

            const scoreViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'optional_score');
            expect(scoreViolation).toBeDefined();

            const ratingViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'optional_rating');
            expect(ratingViolation).toBeDefined();
        });

        it('should `validate` when optional fields have non-default values', () => {
            const valid = create(OptionalRangeSchema, {
                optionalScore: 75,
                optionalRating: 4.5
            });

            const violations = validate(OptionalRangeSchema, valid);
            expect(violations).toHaveLength(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle single-value ranges (exact value)', () => {
            const valid = create(EdgeCaseRangesSchema, {
                exactValue: 42,  // Must be exactly 42. 
                piApprox: 3.14
            });

            const violations = validate(EdgeCaseRangesSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should reject values outside single-value `range`', () => {
            const invalid = create(EdgeCaseRangesSchema, {
                exactValue: 43,  // Violates [42..42]. 
                piApprox: 3.14
            });

            const violations = validate(EdgeCaseRangesSchema, invalid);
            const exactViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'exact_value');
            expect(exactViolation).toBeDefined();
        });

        it('should handle narrow ranges for doubles', () => {
            const valid = create(EdgeCaseRangesSchema, {
                exactValue: 42,
                piApprox: 3.1415  // Within [3.14..3.15]. 
            });

            const violations = validate(EdgeCaseRangesSchema, valid);
            expect(violations).toHaveLength(0);
        });
    });
});

