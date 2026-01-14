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
 * Unit tests for `(required_field)` message-level validation option.
 *
 * Tests boolean logic for required field combinations.
 */

import { create } from '@bufbuild/protobuf';
import { validate } from '../src';

import {
    UserIdentifierSchema,
    ContactInfoSchema,
    PersonNameSchema,
    PaymentMethodSchema,
    ShippingAddressSchema,
    AccountCreationSchema,
    OptionalDataSchema
} from './generated/test-required-field_pb';

describe('Required Field Option Validation', () => {
    describe('Simple OR Logic', () => {
        it('should pass when first `required` field is provided', () => {
            const valid = create(UserIdentifierSchema, {
                id: 123,
                email: ''
            });

            const violations = validate(UserIdentifierSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when second `required` field is provided', () => {
            const valid = create(UserIdentifierSchema, {
                id: 0,
                email: 'user@example.com'
            });

            const violations = validate(UserIdentifierSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when both `required` fields are provided', () => {
            const valid = create(UserIdentifierSchema, {
                id: 123,
                email: 'user@example.com'
            });

            const violations = validate(UserIdentifierSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when neither `required` field is provided', () => {
            const invalid = create(UserIdentifierSchema, {
                id: 0,
                email: ''
            });

            const violations = validate(UserIdentifierSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message?.withPlaceholders).toContain('id | email');
        });
    });

    describe('Simple AND Logic', () => {
        it('should pass when both required fields are provided', () => {
            const valid = create(ContactInfoSchema, {
                phone: '555-1234',
                countryCode: '+1'
            });

            const violations = validate(ContactInfoSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when only first field is provided', () => {
            const invalid = create(ContactInfoSchema, {
                phone: '555-1234',
                countryCode: ''
            });

            const violations = validate(ContactInfoSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message?.withPlaceholders).toContain('phone & country_code');
        });

        it('should fail when only second field is provided', () => {
            const invalid = create(ContactInfoSchema, {
                phone: '',
                countryCode: '+1'
            });

            const violations = validate(ContactInfoSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
        });

        it('should fail when neither field is provided', () => {
            const invalid = create(ContactInfoSchema, {
                phone: '',
                countryCode: ''
            });

            const violations = validate(ContactInfoSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
        });
    });

    describe('Complex OR with AND Groups', () => {
        it('should pass when only given_name is provided', () => {
            const valid = create(PersonNameSchema, {
                givenName: 'John',
                honorificPrefix: '',
                familyName: '',
                middleName: '',
                honorificSuffix: ''
            });

            const violations = validate(PersonNameSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when honorific_prefix and family_name are both provided', () => {
            const valid = create(PersonNameSchema, {
                givenName: '',
                honorificPrefix: 'Dr.',
                familyName: 'Smith',
                middleName: '',
                honorificSuffix: ''
            });

            const violations = validate(PersonNameSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when all fields are provided', () => {
            const valid = create(PersonNameSchema, {
                givenName: 'John',
                honorificPrefix: 'Dr.',
                familyName: 'Smith',
                middleName: 'M.',
                honorificSuffix: 'Jr.'
            });

            const violations = validate(PersonNameSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when only honorific_prefix is provided (missing family_name)', () => {
            const invalid = create(PersonNameSchema, {
                givenName: '',
                honorificPrefix: 'Dr.',
                familyName: '',
                middleName: '',
                honorificSuffix: ''
            });

            const violations = validate(PersonNameSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message?.withPlaceholders).toContain('given_name | (honorific_prefix & family_name)');
        });

        it('should fail when only family_name is provided (missing honorific_prefix)', () => {
            const invalid = create(PersonNameSchema, {
                givenName: '',
                honorificPrefix: '',
                familyName: 'Smith',
                middleName: '',
                honorificSuffix: ''
            });

            const violations = validate(PersonNameSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
        });

        it('should fail when no `required` fields are provided', () => {
            const invalid = create(PersonNameSchema, {
                givenName: '',
                honorificPrefix: '',
                familyName: '',
                middleName: '',
                honorificSuffix: ''
            });

            const violations = validate(PersonNameSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
        });
    });

    describe('Multiple OR Alternatives', () => {
        it('should pass when credit_card is provided', () => {
            const valid = create(PaymentMethodSchema, {
                creditCard: '4111-1111-1111-1111',
                bankAccount: '',
                paypalEmail: ''
            });

            const violations = validate(PaymentMethodSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when bank_account is provided', () => {
            const valid = create(PaymentMethodSchema, {
                creditCard: '',
                bankAccount: 'ACC123456',
                paypalEmail: ''
            });

            const violations = validate(PaymentMethodSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when paypal_email is provided', () => {
            const valid = create(PaymentMethodSchema, {
                creditCard: '',
                bankAccount: '',
                paypalEmail: 'user@paypal.com'
            });

            const violations = validate(PaymentMethodSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when no payment method is provided', () => {
            const invalid = create(PaymentMethodSchema, {
                creditCard: '',
                bankAccount: '',
                paypalEmail: ''
            });

            const violations = validate(PaymentMethodSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message?.withPlaceholders).toContain('credit_card | bank_account | paypal_email');
        });
    });

    describe('Multiple AND Requirements', () => {
        it('should pass when all `required` fields are provided', () => {
            const valid = create(ShippingAddressSchema, {
                street: '123 Main St',
                city: 'Boston',
                postalCode: '02101',
                country: 'USA',
                state: ''
            });

            const violations = validate(ShippingAddressSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when street is missing', () => {
            const invalid = create(ShippingAddressSchema, {
                street: '',
                city: 'Boston',
                postalCode: '02101',
                country: 'USA',
                state: ''
            });

            const violations = validate(ShippingAddressSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message?.withPlaceholders).toContain('street & city & postal_code & country');
        });

        it('should fail when multiple fields are missing', () => {
            const invalid = create(ShippingAddressSchema, {
                street: '123 Main St',
                city: '',
                postalCode: '',
                country: 'USA',
                state: ''
            });

            const violations = validate(ShippingAddressSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
        });
    });

    describe('Nested AND/OR Logic', () => {
        it('should pass when username and password are both provided', () => {
            const valid = create(AccountCreationSchema, {
                username: 'johndoe',
                password: 'secret123',
                oauthToken: ''
            });

            const violations = validate(AccountCreationSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when oauth_token is provided', () => {
            const valid = create(AccountCreationSchema, {
                username: '',
                password: '',
                oauthToken: 'oauth_abc123'
            });

            const violations = validate(AccountCreationSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when all fields are provided', () => {
            const valid = create(AccountCreationSchema, {
                username: 'johndoe',
                password: 'secret123',
                oauthToken: 'oauth_abc123'
            });

            const violations = validate(AccountCreationSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when only username is provided (missing password)', () => {
            const invalid = create(AccountCreationSchema, {
                username: 'johndoe',
                password: '',
                oauthToken: ''
            });

            const violations = validate(AccountCreationSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
            expect(violations[0].message?.withPlaceholders).toContain('(username & password) | oauth_token');
        });

        it('should fail when only password is provided (missing username)', () => {
            const invalid = create(AccountCreationSchema, {
                username: '',
                password: 'secret123',
                oauthToken: ''
            });

            const violations = validate(AccountCreationSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
        });

        it('should fail when no fields are provided', () => {
            const invalid = create(AccountCreationSchema, {
                username: '',
                password: '',
                oauthToken: ''
            });

            const violations = validate(AccountCreationSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
        });
    });

    describe('Optional Fields (No required_field option)', () => {
        it('should pass when all fields are empty', () => {
            const valid = create(OptionalDataSchema, {
                field1: '',
                field2: '',
                field3: 0
            });

            const violations = validate(OptionalDataSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should pass when some fields are set', () => {
            const valid = create(OptionalDataSchema, {
                field1: 'test',
                field2: '',
                field3: 0
            });

            const violations = validate(OptionalDataSchema, valid);
            expect(violations).toHaveLength(0);
        });
    });
});

