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
 * Unit tests for `(goes)` validation option.
 *
 * Tests field dependency validation (field can only be set if another field is set).
 */

import { create } from '@bufbuild/protobuf';
import { validate } from '../src';

import {
    ScheduledEventSchema,
    ShippingDetailsSchema,
    ColorSettingsSchema,
    PaymentInfoSchema,
    ProfileSettingsSchema,
    DocumentMetadataSchema,
    TimestampSchema,
    SecureAccountSchema,
    SimpleConfigSchema,
    FeatureFlagsSchema,
    FeatureLevel,
    ReportGenerationSchema,
    OptionalSettingsSchema,
    AdvancedConfigSchema
} from './generated/test-goes_pb';

describe('Field Dependency Validation (goes)', () => {
    describe('Basic Goes Constraint', () => {
        it('should pass when dependent field is not set', () => {
            const valid = create(ScheduledEventSchema, {
                eventName: 'Team Meeting',
                date: ''
                // time not set - valid because time is only required when date is set.
            });

            const violations = validate(ScheduledEventSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when both fields are set', () => {
            const valid = create(ScheduledEventSchema, {
                eventName: 'Team Meeting',
                date: '2024-12-25',
                time: '14:30'
            });

            const violations = validate(ScheduledEventSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when dependent field is set but `required` field is not', () => {
            const invalid = create(ScheduledEventSchema, {
                eventName: 'Team Meeting',
                date: '',  // Not set. 
                time: '14:30'  // Set - violates (goes).with = "date". 
            });

            const violations = validate(ScheduledEventSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const goesViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'time'
            );
            expect(goesViolation).toBeDefined();
            expect(goesViolation?.message?.withPlaceholders).toContain('date');
        });

        it('should pass when both fields are unset', () => {
            const valid = create(ScheduledEventSchema, {
                eventName: 'Team Meeting'
                // Both date and time are unset - valid.
            });

            const violations = validate(ScheduledEventSchema, valid);
            expect(violations).toHaveLength(0);
        });
    });

    describe('Custom Error Messages', () => {
        it('should use custom error message from (`goes`).error_msg', () => {
            const invalid = create(ShippingDetailsSchema, {
                address: '',  // Not set. 
                trackingNumber: 'TRACK123'  // Set - violates goes constraint. 
            });

            const violations = validate(ShippingDetailsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const goesViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'tracking_number'
            );
            expect(goesViolation).toBeDefined();
            expect(goesViolation?.message?.withPlaceholders).toBe(
                'Tracking number requires a shipping address: {value}.'
            );
        });

        it('should pass when both fields are set', () => {
            const valid = create(ShippingDetailsSchema, {
                address: '123 Main St',
                trackingNumber: 'TRACK123'
            });

            const violations = validate(ShippingDetailsSchema, valid);
            expect(violations).toHaveLength(0);
        });
    });

    describe('Mutual Dependencies (Bidirectional)', () => {
        it('should pass when both fields are set', () => {
            const valid = create(ColorSettingsSchema, {
                textColor: '#000000',
                highlightColor: '#FFFF00'
            });

            const violations = validate(ColorSettingsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when both fields are unset', () => {
            const valid = create(ColorSettingsSchema, {
                // Both unset.
            });

            const violations = validate(ColorSettingsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when only text_color is set', () => {
            const invalid = create(ColorSettingsSchema, {
                textColor: '#000000',
                highlightColor: ''  // Not set. 
            });

            const violations = validate(ColorSettingsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const textColorViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'text_color'
            );
            expect(textColorViolation).toBeDefined();
        });

        it('should fail when only highlight_color is set', () => {
            const invalid = create(ColorSettingsSchema, {
                textColor: '',  // Not set. 
                highlightColor: '#FFFF00'
            });

            const violations = validate(ColorSettingsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const highlightViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'highlight_color'
            );
            expect(highlightViolation).toBeDefined();
        });
    });

    describe('Multiple Independent Goes Constraints', () => {
        it('should pass when all fields are set', () => {
            const valid = create(PaymentInfoSchema, {
                cardholderName: 'John Doe',
                cardNumber: '4111111111111111',
                cvv: '123',
                expiryMonth: 12
            });

            const violations = validate(PaymentInfoSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when card_number is set but cardholder_name is not', () => {
            const invalid = create(PaymentInfoSchema, {
                cardholderName: '',  // Not set. 
                cardNumber: '4111111111111111',  // Violates goes constraint. 
                cvv: '',
                expiryMonth: 0
            });

            const violations = validate(PaymentInfoSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const cardNumberViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'card_number'
            );
            expect(cardNumberViolation).toBeDefined();
        });

        it('should fail when cvv is set but card_number is not', () => {
            const invalid = create(PaymentInfoSchema, {
                cardholderName: 'John Doe',
                cardNumber: '',  // Not set. 
                cvv: '123',  // Violates goes constraint. 
                expiryMonth: 0
            });

            const violations = validate(PaymentInfoSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const cvvViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'cvv'
            );
            expect(cvvViolation).toBeDefined();
        });

        it('should detect multiple `goes` violations', () => {
            const invalid = create(PaymentInfoSchema, {
                cardholderName: '',  // Not set. 
                cardNumber: '4111111111111111',  // Violates (cardholder_name missing). 
                cvv: '123',  // Violates (card_number dependency). 
                expiryMonth: 12  // Violates (card_number dependency). 
            });

            const violations = validate(PaymentInfoSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const cardNumberViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'card_number'
            );
            expect(cardNumberViolation).toBeDefined();

            // Note: cvv and `expiry_month` don't violate because `card_number` IS set.
            // Only `card_number` violates because `cardholder_name` is NOT set.
        });
    });

    describe('Different Field Types', () => {
        it('should `validate` `goes` constraint on int32 field', () => {
            const invalid = create(ProfileSettingsSchema, {
                username: '',  // Not set. 
                displayId: 12345  // Set - violates goes constraint. 
            });

            const violations = validate(ProfileSettingsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const displayIdViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'display_id'
            );
            expect(displayIdViolation).toBeDefined();
        });

        it('should `validate` `goes` constraint on bool field', () => {
            const invalid = create(ProfileSettingsSchema, {
                username: '',  // Not set. 
                isVerified: true  // Set - violates goes constraint. 
            });

            const violations = validate(ProfileSettingsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const verifiedViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'is_verified'
            );
            expect(verifiedViolation).toBeDefined();
        });

        it('should `validate` `goes` constraint on double field', () => {
            const invalid = create(ProfileSettingsSchema, {
                username: '',  // Not set. 
                rating: 4.5  // Set - violates goes constraint. 
            });

            const violations = validate(ProfileSettingsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const ratingViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'rating'
            );
            expect(ratingViolation).toBeDefined();
        });

        it('should `validate` `goes` constraint on message field', () => {
            const invalid = create(DocumentMetadataSchema, {
                title: '',  // Not set. 
                createdAt: create(TimestampSchema, {
                    seconds: BigInt(1234567890),
                    nanos: 0
                })  // Set - violates goes constraint. 
            });

            const violations = validate(DocumentMetadataSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const createdAtViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'created_at'
            );
            expect(createdAtViolation).toBeDefined();
        });
    });

    describe('Without Goes Constraint (Control Group)', () => {
        it('should allow independent fields without `goes` constraint', () => {
            const valid = create(SimpleConfigSchema, {
                primaryOption: '',
                secondaryOption: 'some value'  // Can be set independently. 
            });

            const violations = validate(SimpleConfigSchema, valid);
            expect(violations).toHaveLength(0);
        });
    });

    describe('Goes with Enum Fields', () => {
        it('should pass when both enum and dependent field are set', () => {
            const valid = create(FeatureFlagsSchema, {
                level: FeatureLevel.PREMIUM,
                customConfig: 'advanced-settings'
            });

            const violations = validate(FeatureFlagsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when dependent field is set but enum is unspecified', () => {
            const invalid = create(FeatureFlagsSchema, {
                level: FeatureLevel.UNSPECIFIED,  // Default/unset. 
                customConfig: 'advanced-settings'  // Violates goes constraint. 
            });

            const violations = validate(FeatureFlagsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const configViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'custom_config'
            );
            expect(configViolation).toBeDefined();
        });
    });

    describe('Chain Dependencies', () => {
        it('should `validate` independent chain dependencies', () => {
            const valid = create(ReportGenerationSchema, {
                reportType: 'monthly',
                outputFormat: 'pdf',
                emailRecipient: 'admin@example.com',
                schedule: 'daily'
            });

            const violations = validate(ReportGenerationSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when output_format is set but report_type is not', () => {
            const invalid = create(ReportGenerationSchema, {
                reportType: '',  // Not set. 
                outputFormat: 'pdf',  // Violates goes constraint. 
                emailRecipient: '',
                schedule: ''
            });

            const violations = validate(ReportGenerationSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const formatViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'output_format'
            );
            expect(formatViolation).toBeDefined();
        });

        it('should fail when schedule is set but output_format is not', () => {
            const invalid = create(ReportGenerationSchema, {
                reportType: 'monthly',
                outputFormat: '',  // Not set. 
                emailRecipient: '',
                schedule: 'daily'  // Violates goes constraint (depends on output_format). 
            });

            const violations = validate(ReportGenerationSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const scheduleViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'schedule'
            );
            expect(scheduleViolation).toBeDefined();
        });
    });

    describe('Optional Fields with Goes', () => {
        it('should pass when base field and dependent fields are all set', () => {
            const valid = create(OptionalSettingsSchema, {
                baseUrl: 'https://api.example.com',  
                port: 8080,
                path: '/v1/api'
            });

            const violations = validate(OptionalSettingsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when all fields are unset', () => {
            const valid = create(OptionalSettingsSchema, {
                // All unset.
            });

            const violations = validate(OptionalSettingsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when port is set without base_url', () => {
            const invalid = create(OptionalSettingsSchema, {
                baseUrl: '',  // Not set. 
                port: 8080,  // Violates goes constraint. 
                path: ''
            });

            const violations = validate(OptionalSettingsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const portViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'port'
            );
            expect(portViolation).toBeDefined();
        });
    });

    describe('Combined Constraints (Goes + Other Options)', () => {
        it('should pass when all constraints are satisfied', () => {
            const valid = create(SecureAccountSchema, {
                username: 'john_doe',
                password: 'securepass123',
                recoveryEmail: 'john@example.com',
                recoveryPhone: '+1234567890'
            });

            const violations = validate(SecureAccountSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect `goes` violation when recovery_phone is set without recovery_email', () => {
            const invalid = create(SecureAccountSchema, {
                username: 'john_doe',
                password: 'securepass123',
                recoveryEmail: '',  // Not set. 
                recoveryPhone: '+1234567890'  // Violates goes constraint. 
            });

            const violations = validate(SecureAccountSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const phoneViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'recovery_phone'
            );
            expect(phoneViolation).toBeDefined();
        });

        it('should detect both `pattern` and `goes` violations', () => {
            const invalid = create(SecureAccountSchema, {
                username: 'ab',  // Too short - violates pattern. 
                password: 'short',  // Too short - violates pattern. 
                recoveryEmail: 'invalid',  // Invalid format - violates pattern (but is "set" for goes purposes). 
                recoveryPhone: '+1234567890'  // Does NOT violate goes because recovery_email IS set (even though invalid). 
            });

            const violations = validate(SecureAccountSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            // Should have pattern violations for username, password, and `recovery_email`.
            const usernameViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'username'
            );
            expect(usernameViolation).toBeDefined();

            const passwordViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'password'
            );
            expect(passwordViolation).toBeDefined();

            const emailViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'recovery_email'
            );
            expect(emailViolation).toBeDefined();

            // Note: `recovery_phone` does NOT violate goes constraint because `recovery_email` IS set.
            // (goes checks if field is set, not if it's valid).
        });

        it('should `validate` `goes` combined with `range` constraint', () => {
            const valid = create(AdvancedConfigSchema, {
                configName: 'production',
                maxConnections: 500,  // Within range [1..1000]. 
                timeoutSeconds: 30.0  // Above min 0.1. 
            });

            const violations = validate(AdvancedConfigSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect `range` violation even when `goes` constraint is satisfied', () => {
            const invalid = create(AdvancedConfigSchema, {
                configName: 'production',
                maxConnections: 2000,  // Exceeds range [1..1000]. 
                timeoutSeconds: 30.0
            });

            const violations = validate(AdvancedConfigSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const rangeViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'max_connections'
            );
            expect(rangeViolation).toBeDefined();
            expect(rangeViolation?.message?.withPlaceholders).toContain('[1..1000]');
        });

        it('should detect `goes` violation when max_connections is set without config_name', () => {
            const invalid = create(AdvancedConfigSchema, {
                configName: '',  // Not set. 
                maxConnections: 500,  // Violates goes constraint. 
                timeoutSeconds: 0
            });

            const violations = validate(AdvancedConfigSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const goesViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'max_connections'
            );
            expect(goesViolation).toBeDefined();
        });
    });
});

