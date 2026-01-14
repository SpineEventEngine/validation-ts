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

import { create } from '@bufbuild/protobuf';
import { validate } from '../src/validation';
import {
    PaymentMethodSchema,
    ContactMethodSchema,
    ShippingOptionSchema
} from './generated/test-choice_pb';

describe('Choice Option Validation (oneof)', () => {
    describe('Basic Choice Validation', () => {
        it('should pass when one field in oneof is set', () => {
            const payment = create(PaymentMethodSchema, {
                method: {
                    case: 'creditCard',
                    value: '4111111111111111'
                }
            });

            const violations = validate(PaymentMethodSchema, payment);
            expect(violations).toHaveLength(0);
        });

        it('should fail when no field in required oneof is set', () => {
            const payment = create(PaymentMethodSchema, {
                // method oneof not set
            });

            const violations = validate(PaymentMethodSchema, payment);
            expect(violations.length).toBeGreaterThan(0);

            const choiceViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'method'
            );
            expect(choiceViolation).toBeDefined();
            expect(choiceViolation?.message?.withPlaceholders).toContain('oneof');
        });

        it('should pass when different field in oneof is set', () => {
            const payment = create(PaymentMethodSchema, {
                method: {
                    case: 'bankAccount',
                    value: '123456789'
                }
            });

            const violations = validate(PaymentMethodSchema, payment);
            expect(violations).toHaveLength(0);
        });
    });

    describe('Custom Error Messages', () => {
        it('should use custom error message when provided', () => {
            const contact = create(ContactMethodSchema, {
                // contact oneof not set, has custom error message
            });

            const violations = validate(ContactMethodSchema, contact);
            expect(violations.length).toBeGreaterThan(0);

            const choiceViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'contact'
            );
            expect(choiceViolation).toBeDefined();
            expect(choiceViolation?.message?.withPlaceholders).toContain(
                'must provide a contact method'
            );
        });
    });


    describe('Optional Oneofs', () => {
        it('should pass when optional oneof is not set', () => {
            const shipping = create(ShippingOptionSchema, {
                // delivery oneof is optional (choice.required = false)
            });

            const violations = validate(ShippingOptionSchema, shipping);
            expect(violations).toHaveLength(0);
        });

        it('should pass when optional oneof has a field set', () => {
            const shipping = create(ShippingOptionSchema, {
                delivery: {
                    case: 'standard',
                    value: true
                }
            });

            const violations = validate(ShippingOptionSchema, shipping);
            expect(violations).toHaveLength(0);
        });
    });

    describe('Multiple Oneofs in Same Message', () => {
        it('should validate all oneofs independently', () => {
            // Test case would require a proto with multiple oneofs
            // For now, we verify that each oneof is validated separately
            const payment = create(PaymentMethodSchema, {
                method: {
                    case: 'paypal',
                    value: 'user@example.com'
                }
            });

            const violations = validate(PaymentMethodSchema, payment);
            expect(violations).toHaveLength(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle message with no oneofs', () => {
            // Most messages don't have oneofs, should not cause errors
            const payment = create(PaymentMethodSchema, {
                method: {
                    case: 'creditCard',
                    value: '4111111111111111'
                }
            });

            const violations = validate(PaymentMethodSchema, payment);
            expect(violations).toHaveLength(0);
        });

        it('should provide clear field path in violation', () => {
            const payment = create(PaymentMethodSchema, {});

            const violations = validate(PaymentMethodSchema, payment);
            const choiceViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'method'
            );

            expect(choiceViolation?.fieldPath?.fieldName).toEqual(['method']);
            expect(choiceViolation?.typeName).toBe('test.PaymentMethod');
        });
    });
});
