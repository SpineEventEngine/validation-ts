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
 * Unit tests for `(required)` and `(if_missing)` validation options.
 *
 * Tests the `(required)` option for ensuring fields have non-default values.
 */

import { create } from '@bufbuild/protobuf';
import { validate } from '../src';

import {
    RequiredFieldsSchema,
    CustomErrorMessagesSchema as RequiredCustomErrorMessagesSchema,
    OptionalFieldsSchema,
    Status
} from './generated/test-required_pb';

describe('Required Field Validation', () => {
    describe('Basic Required Fields', () => {
        it('should validate message with all `required` fields present', () => {
            const valid = create(RequiredFieldsSchema, {
                name: 'John Doe',
                age: 30,
                address: { street: '123 Main St', city: 'Boston' },
                status: Status.ACTIVE,
                tags: ['tag1']
            });

            const violations = validate(RequiredFieldsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect missing `required` string field', () => {
            const invalid = create(RequiredFieldsSchema, {
                name: '',  // Required but empty. 
                age: 30,
                address: { street: '123 Main St', city: 'Boston' },
                status: Status.ACTIVE,
                tags: ['tag1']
            });

            const violations = validate(RequiredFieldsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const nameViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'name');
            expect(nameViolation).toBeDefined();
            expect(nameViolation?.message?.withPlaceholders).toBe('A value must be set.');
        });

        it('should detect missing `required` message field', () => {
            const invalid = create(RequiredFieldsSchema, {
                name: 'John Doe',
                age: 30,
                address: undefined,  // Required but missing. 
                status: Status.ACTIVE,
                tags: ['tag1']
            });

            const violations = validate(RequiredFieldsSchema, invalid);
            const addressViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'address');
            expect(addressViolation).toBeDefined();
        });

        it('should detect empty `required` repeated field', () => {
            const invalid = create(RequiredFieldsSchema, {
                name: 'John Doe',
                age: 30,
                address: { street: '123 Main St', city: 'Boston' },
                status: Status.ACTIVE,
                tags: []  // Required but empty. 
            });

            const violations = validate(RequiredFieldsSchema, invalid);
            const tagsViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'tags');
            expect(tagsViolation).toBeDefined();
        });

        it('should detect multiple missing `required` fields', () => {
            const invalid = create(RequiredFieldsSchema, {
                name: '',
                age: 0,
                address: undefined,
                status: 0,
                tags: []
            });

            const violations = validate(RequiredFieldsSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Custom Error Messages', () => {
        it('should use custom error message from (`if_missing`) option', () => {
            const invalid = create(RequiredCustomErrorMessagesSchema, {
                username: '',  // Required with custom message. 
                email: 'valid@example.com'
            });

            const violations = validate(RequiredCustomErrorMessagesSchema, invalid);
            const usernameViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'username');
            expect(usernameViolation).toBeDefined();
            expect(usernameViolation?.message?.withPlaceholders).toBe('Username is mandatory for account creation.');
        });

        it('should use custom error message for field with custom error message', () => {
            const invalid = create(RequiredCustomErrorMessagesSchema, {
                username: 'johndoe',
                email: ''  // Required with custom message. 
            });

            const violations = validate(RequiredCustomErrorMessagesSchema, invalid);
            const emailViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'email');
            expect(emailViolation).toBeDefined();
            expect(emailViolation?.message?.withPlaceholders).toBe('Email address must be provided.');
        });
    });

    describe('Optional Fields', () => {
        it('should not validate optional fields when empty', () => {
            const valid = create(OptionalFieldsSchema, {
                nickname: '',
                score: 0
            });

            const violations = validate(OptionalFieldsSchema, valid);
            expect(violations).toHaveLength(0);
        });
    });
});

