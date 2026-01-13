/**
 * Example demonstrating the spine-validation-ts package.
 *
 * This example shows how to validate Protobuf messages with Spine validation constraints.
 */

import { create } from '@bufbuild/protobuf';
import { UserSchema, Role } from './generated/user_pb.js';
import { validate, formatViolations } from '@spine-event-engine/validation-ts';

console.log('=== Spine Validation Example ===\n');

// Example 1: Valid user - all required fields provided
console.log('Example 1: Valid User');
console.log('---------------------');
const validUser = create(UserSchema, {
  id: 1,
  name: 'John Doe',
  email: 'john.doe@example.com',
  role: Role.ADMIN,
  tags: ['developer', 'typescript']
});

const validUserViolations = validate(UserSchema, validUser);
console.log('Violations:', validUserViolations.length);
console.log(formatViolations(validUserViolations));
console.log();

// Example 2: Invalid user - missing required email
console.log('Example 2: Missing Required Email');
console.log('----------------------------------');
const invalidUser1 = create(UserSchema, {
  id: 2,
  name: 'Jane Smith',
  email: '',  // Required but empty
  role: Role.USER,
  tags: []
});

const violations1 = validate(UserSchema, invalidUser1);
console.log('Violations:', violations1.length);
console.log(formatViolations(violations1));
console.log();

// Example 3: Invalid user - missing required name
console.log('Example 3: Missing Required Name');
console.log('---------------------------------');
const invalidUser2 = create(UserSchema, {
  id: 3,
  name: '',  // Required but empty
  email: 'alice@example.com',
  role: Role.USER,
  tags: []
});

const violations2 = validate(UserSchema, invalidUser2);
console.log('Violations:', violations2.length);
console.log(formatViolations(violations2));
console.log();

// Example 4: Multiple violations
console.log('Example 4: Multiple Violations');
console.log('-------------------------------');
const invalidUser3 = create(UserSchema, {
  id: 4,
  name: '',      // Required but empty
  email: '',     // Required but empty
  role: 0,       // ROLE_UNSPECIFIED
  tags: []
});

const violations3 = validate(UserSchema, invalidUser3);
console.log('Violations:', violations3.length);
console.log(formatViolations(violations3));
console.log();

// Example 5: Pattern validation - invalid name format
console.log('Example 5: Pattern Validation (Invalid Name)');
console.log('----------------------------------------------');
const invalidPattern1 = create(UserSchema, {
  id: 5,
  name: '123Invalid',  // Starts with number, violates pattern
  email: 'valid@example.com',
  role: Role.USER,
  tags: []
});

const violations4 = validate(UserSchema, invalidPattern1);
console.log('Violations:', violations4.length);
console.log(formatViolations(violations4));
console.log();

// Example 6: Pattern validation - invalid email format
console.log('Example 6: Pattern Validation (Invalid Email)');
console.log('-----------------------------------------------');
const invalidPattern2 = create(UserSchema, {
  id: 6,
  name: 'Bob Wilson',
  email: 'notanemail',  // Invalid email format
  role: Role.USER,
  tags: []
});

const violations5 = validate(UserSchema, invalidPattern2);
console.log('Violations:', violations5.length);
console.log(formatViolations(violations5));
console.log();

// Example 7: Multiple validation types
console.log('Example 7: Multiple Validation Types');
console.log('-------------------------------------');
const multipleInvalid = create(UserSchema, {
  id: 7,
  name: '',           // Required violation
  email: 'bad@',      // Pattern violation
  role: 0,
  tags: []
});

const violations6 = validate(UserSchema, multipleInvalid);
console.log('Violations:', violations6.length);
violations6.forEach((v, i) => {
  const fieldPath = v.fieldPath?.fieldName.join('.') || 'unknown';
  const message = v.message?.withPlaceholders || 'No message';
  console.log(`${i + 1}. Field "${fieldPath}": ${message}`);
});
console.log();

console.log('=== Example Complete ===');
