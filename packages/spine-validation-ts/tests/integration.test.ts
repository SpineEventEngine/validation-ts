/**
 * Integration tests combining multiple validation options.
 *
 * Tests real-world scenarios with complex validation constraints.
 */

import { create } from '@bufbuild/protobuf';
import { validate, formatViolations } from '../src';

import { UserSchema, Role, GetUserResponseSchema } from './generated/integration-user_pb';
import { AccountSchema, AccountType } from './generated/integration-account_pb';
import { SecureAccountSchema, AdvancedConfigSchema, FeatureLevel, ColorSettingsSchema, ScheduledEventSchema } from './generated/test-goes_pb';

describe('Integration Tests', () => {
    it('should `validate` User message with multiple constraint types', () => {
        const validUser = create(UserSchema, {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: Role.ADMIN,
            tags: ['developer', 'typescript']
        });

        const violations = validate(UserSchema, validUser);
        expect(violations).toHaveLength(0);
    });

    it('should detect both `required` and `pattern` violations', () => {
        const invalidUser = create(UserSchema, {
            id: 1,
            name: '',           // Required violation. 
            email: 'bad@',      // Pattern violation. 
            role: Role.USER,
            tags: []
        });

        const violations = validate(UserSchema, invalidUser);
        expect(violations.length).toBeGreaterThanOrEqual(2);

        const fieldNames = violations.map(v => v.fieldPath?.fieldName[0]);
        expect(fieldNames).toContain('name');
        expect(fieldNames).toContain('email');
    });

    it('should format violations correctly', () => {
        const invalidUser = create(UserSchema, {
            id: 6,
            name: '',
            email: '',
            role: Role.USER,
            tags: []
        });

        const violations = validate(UserSchema, invalidUser);
        const formatted = formatViolations(violations);

        expect(formatted).toContain('spine.validation.testing.integration.User.name');
        expect(formatted).toContain('spine.validation.testing.integration.User.email');
        expect(formatted).toContain('A value must be set');
    });

    it('should `validate` User with `distinct` tags', () => {
        const validUser = create(UserSchema, {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: Role.ADMIN,
            tags: ['developer', 'typescript', 'nodejs', 'react']  // All distinct. 
        });

        const violations = validate(UserSchema, validUser);
        expect(violations).toHaveLength(0);
    });

    it('should detect duplicate tags in User', () => {
        const invalidUser = create(UserSchema, {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@example.com',
            role: Role.ADMIN,
            tags: ['developer', 'typescript', 'developer', 'nodejs']  // 'developer' duplicated. 
        });

        const violations = validate(UserSchema, invalidUser);
        expect(violations.length).toBeGreaterThan(0);

        const tagViolation = violations.find(v =>
            v.fieldPath?.fieldName[0] === 'tags' &&
            v.message?.withPlaceholders.includes('Duplicate')
        );
        expect(tagViolation).toBeDefined();
        expect(tagViolation?.message?.placeholderValue?.['value']).toBe('developer');
    });

    it('should detect multiple constraint violations including `distinct`', () => {
        const invalidUser = create(UserSchema, {
            id: 1,
            name: '1',  // Too short (pattern violation). 
            email: 'invalid',  // Pattern violation. 
            role: Role.USER,
            tags: ['tag1', 'tag2', 'tag1']  // Distinct violation. 
        });

        const violations = validate(UserSchema, invalidUser);
        expect(violations.length).toBeGreaterThanOrEqual(3);

        const fieldNames = violations.map(v => v.fieldPath?.fieldName[0]);
        expect(fieldNames).toContain('name');
        expect(fieldNames).toContain('email');
        expect(fieldNames).toContain('tags');
    });

    it('should `validate` Account with combined `required_field`, `required`, `pattern`, `min`/`max`, and `range` constraints', () => {
        // Valid account with `id` provided (satisfies `required_field`).
        const validAccount = create(AccountSchema, {
            id: 123,
            email: 'user@example.com',
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.PREMIUM,
            age: 25,  // Within range [13..120]. 
            balance: 5000.0,  // Within min/max [0.0..1000000.0]. 
            failedLoginAttempts: 0,  // Within range [0..5]. 
            rating: 4.5  // Within range [1.0..5.0]. 
        });

        const violations = validate(AccountSchema, validAccount);
        expect(violations).toHaveLength(0);
    });

    it('should `validate` Account with second field provided instead of first', () => {
        // Note: `id` has `(min).value="1"`, so we provide a valid ID even though.
        // the `required_field` "id | email" would be satisfied by email alone.
        // Proto3 doesn't allow truly "unset" numeric fields (they default to 0).
        const validAccount = create(AccountSchema, {
            id: 1,  // Provide valid ID (>= 1) to avoid min violation. 
            email: 'user@example.com',
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.FREE,
            age: 18,  // Within range. 
            balance: 100.0,
            failedLoginAttempts: 2,
            rating: 3.0
        });

        const violations = validate(AccountSchema, validAccount);
        expect(violations).toHaveLength(0);
    });

    it('should detect `required_field` violation when neither `required` field is provided', () => {
        const invalid = create(AccountSchema, {
            id: 0,
            email: '',  // Violates both (required_field) and (required). 
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.FREE
        });

        const violations = validate(AccountSchema, invalid);
        expect(violations.length).toBeGreaterThan(0);

        // Should have violations for `required_field`, required email, or both.
        const hasRequiredFieldViolation = violations.some(v =>
            v.message?.withPlaceholders.includes('id | email')
        );
        const hasRequiredEmailViolation = violations.some(v =>
            v.fieldPath?.fieldName[0] === 'email'
        );

        expect(hasRequiredFieldViolation || hasRequiredEmailViolation).toBe(true);
    });

    it('should detect `pattern` violation in username field', () => {
        const invalid = create(AccountSchema, {
            id: 123,
            email: 'user@example.com',
            username: 'ab',  // Too short, violates pattern. 
            password: 'secure_password_123',
            accountType: AccountType.FREE
        });

        const violations = validate(AccountSchema, invalid);
        expect(violations.length).toBeGreaterThan(0);

        const usernameViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'username');
        expect(usernameViolation).toBeDefined();
        expect(usernameViolation?.message?.withPlaceholders).toContain('3-20 characters');
    });

    it('should detect `pattern` violation in email field', () => {
        const invalid = create(AccountSchema, {
            id: 123,
            email: 'invalid-email',  // Invalid email format. 
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.FREE
        });

        const violations = validate(AccountSchema, invalid);
        expect(violations.length).toBeGreaterThan(0);

        const emailViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'email');
        expect(emailViolation).toBeDefined();
        expect(emailViolation?.message?.withPlaceholders).toContain('Invalid email format');
    });

    it('should detect multiple violations across different constraint types', () => {
        const invalid = create(AccountSchema, {
            id: 0,        // Doesn't satisfy required_field. 
            email: '',    // Empty (violates required) and doesn't satisfy required_field. 
            username: 'a',  // Too short (violates pattern). 
            password: 'short',  // Too short (violates pattern). 
            accountType: 0,  // UNSPECIFIED (violates required). 
            age: 10,  // Violates range [13..120]. 
            balance: -100.0,  // Violates min 0.0. 
            failedLoginAttempts: 10,  // Violates range [0..5]. 
            rating: 0.5  // Violates range [1.0..5.0]. 
        });

        const violations = validate(AccountSchema, invalid);
        expect(violations.length).toBeGreaterThanOrEqual(7);

        // Check for various types of violations.
        const fieldPaths = violations.map(v => v.fieldPath?.fieldName[0] || '');
        const hasMessageLevelViolation = violations.some(v =>
            v.fieldPath?.fieldName.length === 0
        );

        // Should have violations for username, password, `account_type`, age, balance, `failed_login_attempts`, rating.
        expect(fieldPaths.includes('username') || fieldPaths.includes('password')).toBe(true);
        expect(fieldPaths.includes('age')).toBe(true);
        expect(fieldPaths.includes('failed_login_attempts')).toBe(true);
    });

    it('should detect `range` violations while other fields are valid', () => {
        const invalid = create(AccountSchema, {
            id: 123,
            email: 'user@example.com',
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.FREE,
            age: 150,  // Violates range [13..120]. 
            balance: 50000.0,
            failedLoginAttempts: 6,  // Violates range [0..5]. 
            rating: 3.5
        });

        const violations = validate(AccountSchema, invalid);
        expect(violations.length).toBe(2);

        const ageViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'age');
        expect(ageViolation).toBeDefined();
        expect(ageViolation?.message?.withPlaceholders).toContain('[13..120]');

        const attemptsViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'failed_login_attempts');
        expect(attemptsViolation).toBeDefined();
        expect(attemptsViolation?.message?.withPlaceholders).toContain('[0..5]');
    });

    it('should detect both `required` and `range` violations on age field', () => {
        const invalid = create(AccountSchema, {
            id: 123,
            email: 'user@example.com',
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.FREE,
            age: 0,  // Violates both (required) and range [13..120]. 
            balance: 1000.0,
            failedLoginAttempts: 0,
            rating: 4.0
        });

        const violations = validate(AccountSchema, invalid);
        expect(violations.length).toBeGreaterThanOrEqual(1);

        // Age 0 should violate range constraint (and possibly required).
        const ageViolation = violations.find(v => v.fieldPath?.fieldName[0] === 'age');
        expect(ageViolation).toBeDefined();
    });

    it('should `validate` balance with `min`/`max` constraints', () => {
        const validBalance = create(AccountSchema, {
            id: 123,
            email: 'user@example.com',
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.PREMIUM,
            age: 30,
            balance: 999999.99,  // Just under max. 
            failedLoginAttempts: 0,
            rating: 5.0
        });

        const violations1 = validate(AccountSchema, validBalance);
        expect(violations1).toHaveLength(0);

        const invalidBalance = create(AccountSchema, {
            id: 123,
            email: 'user@example.com',
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.PREMIUM,
            age: 30,
            balance: 1000001.0,  // Violates max 1000000.0. 
            failedLoginAttempts: 0,
            rating: 5.0
        });

        const violations2 = validate(AccountSchema, invalidBalance);
        const balanceViolation = violations2.find(v => v.fieldPath?.fieldName[0] === 'balance');
        expect(balanceViolation).toBeDefined();
    });

    it('should `validate` rating `range` boundaries', () => {
        const validMin = create(AccountSchema, {
            id: 123,
            email: 'user@example.com',
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.FREE,
            age: 25,
            balance: 1000.0,
            failedLoginAttempts: 0,
            rating: 1.0  // Min boundary. 
        });

        const violations1 = validate(AccountSchema, validMin);
        expect(violations1).toHaveLength(0);

        const validMax = create(AccountSchema, {
            id: 123,
            email: 'user@example.com',
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.FREE,
            age: 25,
            balance: 1000.0,
            failedLoginAttempts: 0,
            rating: 5.0  // Max boundary. 
        });

        const violations2 = validate(AccountSchema, validMax);
        expect(violations2).toHaveLength(0);

        const invalidRating = create(AccountSchema, {
            id: 123,
            email: 'user@example.com',
            username: 'johndoe',
            password: 'secure_password_123',
            accountType: AccountType.FREE,
            age: 25,
            balance: 1000.0,
            failedLoginAttempts: 0,
            rating: 5.5  // Violates range [1.0..5.0]. 
        });

        const violations3 = validate(AccountSchema, invalidRating);
        const ratingViolation = violations3.find(v => v.fieldPath?.fieldName[0] === 'rating');
        expect(ratingViolation).toBeDefined();
        expect(ratingViolation?.message?.withPlaceholders).toContain('[1.0..5.0]');
    });

    describe('Nested Validation (validate) Integration', () => {
        it('should `validate` GetUserResponse with valid nested User', () => {
            const validResponse = create(GetUserResponseSchema, {
                user: create(UserSchema, {
                    id: 1,
                    name: 'Alice Smith',
                    email: 'alice@example.com',
                    role: Role.ADMIN,
                    tags: ['developer', 'typescript']
                }),
                found: true
            });

            const violations = validate(GetUserResponseSchema, validResponse);
            expect(violations).toHaveLength(0);
        });

        it('should detect nested User violations with custom error message', () => {
            const invalidResponse = create(GetUserResponseSchema, {
                user: create(UserSchema, {
                    id: 1,
                    name: '',  // Required violation. 
                    email: 'alice@example.com',
                    role: Role.USER,
                    tags: []
                }),
                found: true
            });

            const violations = validate(GetUserResponseSchema, invalidResponse);
            expect(violations.length).toBeGreaterThan(0);

            // Should have parent-level violation with custom message.
            const parentViolation = violations.find(v =>
                v.fieldPath?.fieldName.length === 1 &&
                v.fieldPath?.fieldName[0] === 'user'
            );
            expect(parentViolation).toBeDefined();
            expect(parentViolation?.message?.withPlaceholders).toBe('User data is invalid.');

            // Should also have nested violation for name field.
            const nameViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'user' &&
                v.fieldPath?.fieldName[1] === 'name'
            );
            expect(nameViolation).toBeDefined();
        });

        it('should detect multiple nested constraint violations (`required` + `pattern` + `distinct`)', () => {
            const invalidResponse = create(GetUserResponseSchema, {
                user: create(UserSchema, {
                    id: 0,  // Violates min constraint. 
                    name: '123',  // Violates pattern (must start with letter). 
                    email: 'not-an-email',  // Violates pattern. 
                    role: Role.USER,
                    tags: ['dev', 'dev', 'ops']  // Violates distinct. 
                }),
                found: true
            });

            const violations = validate(GetUserResponseSchema, invalidResponse);
            expect(violations.length).toBeGreaterThan(0);

            // Check for various nested violations.
            const idViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'user' &&
                v.fieldPath?.fieldName[1] === 'id'
            );
            expect(idViolation).toBeDefined();

            const nameViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'user' &&
                v.fieldPath?.fieldName[1] === 'name'
            );
            expect(nameViolation).toBeDefined();

            const emailViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'user' &&
                v.fieldPath?.fieldName[1] === 'email'
            );
            expect(emailViolation).toBeDefined();

            const tagsViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'user' &&
                v.fieldPath?.fieldName[1] === 'tags'
            );
            expect(tagsViolation).toBeDefined();
        });

        it('should detect `required_field` violation in nested User', () => {
            const invalidResponse = create(GetUserResponseSchema, {
                user: create(UserSchema, {
                    // Neither `id` nor `email` provided - violates `required_field` option.
                    name: 'Bob Jones',
                    role: Role.USER,
                    tags: []
                }),
                found: true
            });

            const violations = validate(GetUserResponseSchema, invalidResponse);
            expect(violations.length).toBeGreaterThan(0);

            // Should have `required_field` violation.
            const requiredFieldViolation = violations.find(v =>
                v.message?.withPlaceholders.includes('id | email')
            );
            expect(requiredFieldViolation).toBeDefined();
        });

        it('should format nested violations correctly', () => {
            const invalidResponse = create(GetUserResponseSchema, {
                user: create(UserSchema, {
                    id: 1,
                    name: '',  // Required. 
                    email: '',  // Required. 
                    role: Role.USER,
                    tags: []
                }),
                found: true
            });

            const violations = validate(GetUserResponseSchema, invalidResponse);
            const formatted = formatViolations(violations);

            // Should contain nested field paths.
            expect(formatted).toContain('user');
            expect(formatted).toContain('name');
            expect(formatted).toContain('email');
        });

        it('should pass when nested User is not set `(optional)`', () => {
            const responseWithoutUser = create(GetUserResponseSchema, {
                found: false
                // user field not set.
            });

            const violations = validate(GetUserResponseSchema, responseWithoutUser);
            expect(violations).toHaveLength(0);
        });
    });

    describe('Field Dependency (goes) Integration', () => {
        it('should `validate` `goes` with `required` and `pattern` constraints', () => {
            const valid = create(SecureAccountSchema, {
                username: 'alice_secure',
                password: 'strongpass123',
                recoveryEmail: 'alice@example.com',
                recoveryPhone: '+1234567890'
            });

            const violations = validate(SecureAccountSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect `goes` violation independently from `pattern` violations', () => {
            const invalid = create(SecureAccountSchema, {
                username: 'alice_secure',
                password: 'strongpass123',
                recoveryEmail: '',  // Not set. 
                recoveryPhone: '+1234567890'  // Violates goes constraint. 
            });

            const violations = validate(SecureAccountSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const goesViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'recovery_phone' &&
                v.message?.withPlaceholders.includes('recovery_email')
            );
            expect(goesViolation).toBeDefined();
        });

        it('should detect both `required` and `goes` violations together', () => {
            const invalid = create(SecureAccountSchema, {
                username: '',  // Required violation. 
                password: '',  // Required violation. 
                recoveryEmail: '',
                recoveryPhone: '+1234567890'  // Goes violation. 
            });

            const violations = validate(SecureAccountSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(3);

            const usernameViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'username'
            );
            expect(usernameViolation).toBeDefined();

            const passwordViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'password'
            );
            expect(passwordViolation).toBeDefined();

            const goesViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'recovery_phone'
            );
            expect(goesViolation).toBeDefined();
        });

        it('should `validate` `goes` with `range` and `min` constraints', () => {
            const valid = create(AdvancedConfigSchema, {
                configName: 'staging',
                maxConnections: 100,
                timeoutSeconds: 15.5
            });

            const violations = validate(AdvancedConfigSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect `goes` and `range` violations independently', () => {
            const invalid1 = create(AdvancedConfigSchema, {
                configName: 'production',
                maxConnections: 5000,  // Violates range [1..1000]. 
                timeoutSeconds: 10.0
            });

            const violations1 = validate(AdvancedConfigSchema, invalid1);
            const rangeViolation = violations1.find(v =>
                v.fieldPath?.fieldName[0] === 'max_connections'
            );
            expect(rangeViolation).toBeDefined();
            expect(rangeViolation?.message?.withPlaceholders).toContain('[1..1000]');

            const invalid2 = create(AdvancedConfigSchema, {
                configName: '',  // Not set. 
                maxConnections: 500,  // Violates goes constraint. 
                timeoutSeconds: 10.0
            });

            const violations2 = validate(AdvancedConfigSchema, invalid2);
            const goesViolation = violations2.find(v =>
                v.fieldPath?.fieldName[0] === 'max_connections'
            );
            expect(goesViolation).toBeDefined();
        });

        it('should handle mutual dependencies with multiple constraint types', () => {
            const valid = create(ColorSettingsSchema, {
                textColor: '#FF0000',
                highlightColor: '#00FF00'
            });

            const violations = validate(ColorSettingsSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect violations in mutual dependencies', () => {
            const invalid = create(ColorSettingsSchema, {
                textColor: '#FF0000',
                highlightColor: ''  // Not set - violates mutual dependency. 
            });

            const violations = validate(ColorSettingsSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const textColorViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'text_color'
            );
            expect(textColorViolation).toBeDefined();
            expect(textColorViolation?.message?.withPlaceholders).toContain('highlight_color');
        });

        it('should format `goes` violations correctly', () => {
            const invalid = create(ScheduledEventSchema, {
                eventName: 'Conference',
                date: '',
                time: '10:00 AM'
            });

            const violations = validate(ScheduledEventSchema, invalid);
            const formatted = formatViolations(violations);

            expect(formatted).toContain('time');
            expect(formatted).toContain('date');
        });
    });
});
