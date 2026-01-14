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
 * Unit tests for `(validate)` and `(if_invalid)` validation options.
 *
 * Tests recursive validation of nested message fields.
 */

import { create } from '@bufbuild/protobuf';
import { validate } from '../src';

import {
    PersonWithAddressSchema,
    AddressSchema,
    OrderWithCustomErrorSchema,
    CustomerSchema,
    TeamWithMembersSchema,
    MemberSchema,
    CompanyStructureSchema,
    DepartmentSchema,
    ManagerSchema,
    ProfileWithOptionalDataSchema,
    OptionalDataSchema as ValidateOptionalDataSchema,
    PersonWithoutValidationSchema,
    ProductOrderSchema,
    ProductDetailsSchema,
    ReviewSchema,
    ShippingInfoSchema,
    ContainerWithEmptyMessageSchema,
    EmptyValidatedSchema,
    ProjectWithTasksSchema,
    TaskSchema
} from './generated/test-validate_pb';

describe('Nested Message Validation (validate)', () => {
    describe('Basic Nested Validation', () => {
        it('should pass when nested message is valid', () => {
            const valid = create(PersonWithAddressSchema, {
                name: 'John Doe',
                address: create(AddressSchema, {
                    street: '123 Main St',
                    city: 'Boston',
                    zipCode: '02101'
                })
            });

            const violations = validate(PersonWithAddressSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should fail when nested message violates constraints', () => {
            const invalid = create(PersonWithAddressSchema, {
                name: 'John Doe',
                address: create(AddressSchema, {
                    street: '',  // Required violation. 
                    city: 'Boston',
                    zipCode: '02101'
                })
            });

            const violations = validate(PersonWithAddressSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            // Should have violation for nested field.
            const nestedViolation = violations.find(v =>
                v.fieldPath?.fieldName.includes('address')
            );
            expect(nestedViolation).toBeDefined();
        });

        it('should report violations with correct nested field path', () => {
            const invalid = create(PersonWithAddressSchema, {
                name: 'John Doe',
                address: create(AddressSchema, {
                    street: '123 Main St',
                    city: '',  // Required violation. 
                    zipCode: '02101'
                })
            });

            const violations = validate(PersonWithAddressSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            // Check for nested field path: `address.city`.
            const cityViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'address' &&
                v.fieldPath?.fieldName[1] === 'city'
            );
            expect(cityViolation).toBeDefined();
        });

        it('should `validate` multiple constraints in nested message', () => {
            const invalid = create(PersonWithAddressSchema, {
                name: 'John Doe',
                address: create(AddressSchema, {
                    street: '123 Main St',
                    city: 'Boston',
                    zipCode: 'ABCDE'  // Pattern violation (should be 5 digits). 
                })
            });

            const violations = validate(PersonWithAddressSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const zipViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'address' &&
                v.fieldPath?.fieldName[1] === 'zip_code'
            );
            expect(zipViolation).toBeDefined();
        });
    });

    describe('Custom Error Messages (if_invalid)', () => {
        it('should use default error message when nested validation fails', () => {
            const invalid = create(OrderWithCustomErrorSchema, {
                orderId: 123,
                customer: create(CustomerSchema, {
                    email: 'invalid-email',  // Pattern violation.
                    age: 25
                })
            });

            const violations = validate(OrderWithCustomErrorSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            // Should have parent-level violation with default message.
            const parentViolation = violations.find(v =>
                v.fieldPath?.fieldName.length === 1 &&
                v.fieldPath?.fieldName[0] === 'customer' &&
                v.message?.withPlaceholders.includes('Nested message validation failed')
            );
            expect(parentViolation).toBeDefined();
        });

        it('should include both parent and nested violations', () => {
            const invalid = create(OrderWithCustomErrorSchema, {
                orderId: 123,
                customer: create(CustomerSchema, {
                    email: 'invalid-email',
                    age: 15  // Violates range [18..120]. 
                })
            });

            const violations = validate(OrderWithCustomErrorSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(3);  // Parent + 2 nested. 

            // Parent violation.
            const parentViolation = violations.find(v =>
                v.fieldPath?.fieldName.length === 1 &&
                v.fieldPath?.fieldName[0] === 'customer'
            );
            expect(parentViolation).toBeDefined();

            // Nested violations.
            const emailViolation = violations.find(v =>
                v.fieldPath?.fieldName[1] === 'email'
            );
            expect(emailViolation).toBeDefined();

            const ageViolation = violations.find(v =>
                v.fieldPath?.fieldName[1] === 'age'
            );
            expect(ageViolation).toBeDefined();
        });
    });

    describe('Repeated Message Fields', () => {
        it('should `validate` all elements in repeated message field', () => {
            const valid = create(TeamWithMembersSchema, {
                teamName: 'Engineering',
                members: [
                    create(MemberSchema, { name: 'Alice', email: 'alice@example.com' }),
                    create(MemberSchema, { name: 'Bob', email: 'bob@example.com' })
                ]
            });

            const violations = validate(TeamWithMembersSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect violation in one member', () => {
            const invalid = create(TeamWithMembersSchema, {
                teamName: 'Engineering',
                members: [
                    create(MemberSchema, { name: 'Alice', email: 'alice@example.com' }),
                    create(MemberSchema, { name: '', email: 'bob@example.com' })  // Name required. 
                ]
            });

            const violations = validate(TeamWithMembersSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            // Check for violation at `members[1].name`.
            const nameViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'members' &&
                v.fieldPath?.fieldName[1] === '1' &&
                v.fieldPath?.fieldName[2] === 'name'
            );
            expect(nameViolation).toBeDefined();
        });

        it('should detect violations in multiple members', () => {
            const invalid = create(TeamWithMembersSchema, {
                teamName: 'Engineering',
                members: [
                    create(MemberSchema, { name: '', email: 'alice@example.com' }),  // Name violation. 
                    create(MemberSchema, { name: 'Bob', email: 'invalid' })  // Email violation. 
                ]
            });

            const violations = validate(TeamWithMembersSchema, invalid);
            expect(violations.length).toBeGreaterThanOrEqual(4);  // 2 parent + 2 nested. 
        });
    });

    describe('Deeply Nested Validation', () => {
        it('should `validate` multiple levels of nesting', () => {
            const valid = create(CompanyStructureSchema, {
                companyName: 'Tech Corp',
                department: create(DepartmentSchema, {
                    deptName: 'Engineering',
                    manager: create(ManagerSchema, {
                        name: 'Jane Smith',
                        email: 'jane@techcorp.com'
                    })
                })
            });

            const violations = validate(CompanyStructureSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect violations in deeply nested messages', () => {
            const invalid = create(CompanyStructureSchema, {
                companyName: 'Tech Corp',
                department: create(DepartmentSchema, {
                    deptName: 'Engineering',
                    manager: create(ManagerSchema, {
                        name: '',  // Required violation. 
                        email: 'jane@techcorp.com'
                    })
                })
            });

            const violations = validate(CompanyStructureSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            // Check for nested path: `department.manager.name`.
            const deepViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'department' &&
                v.fieldPath?.fieldName[1] === 'manager' &&
                v.fieldPath?.fieldName[2] === 'name'
            );
            expect(deepViolation).toBeDefined();
        });
    });

    describe('Optional Nested Fields', () => {
        it('should pass when optional nested field is not set', () => {
            const valid = create(ProfileWithOptionalDataSchema, {
                username: 'johndoe'
                // `optional_data` not set.
            });

            const violations = validate(ProfileWithOptionalDataSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should `validate` when optional nested field is set', () => {
            const valid = create(ProfileWithOptionalDataSchema, {
                username: 'johndoe',
                optionalData: create(ValidateOptionalDataSchema, {
                    bio: 'Software engineer',
                    followers: 100
                })
            });

            const violations = validate(ProfileWithOptionalDataSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect violations in optional nested field when set', () => {
            const invalid = create(ProfileWithOptionalDataSchema, {
                username: 'johndoe',
                optionalData: create(ValidateOptionalDataSchema, {
                    bio: 'Software engineer',
                    followers: -5  // Violates min = 0. 
                })
            });

            const violations = validate(ProfileWithOptionalDataSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);
        });
    });

    describe('Without Validate Option (Control Group)', () => {
        it('should not `validate` nested message without (`validate`) = true', () => {
            const invalid = create(PersonWithoutValidationSchema, {
                name: 'John Doe',
                address: create(AddressSchema, {
                    street: '',  // Would violate required, but not validated. 
                    city: '',     // Would violate required, but not validated. 
                    zipCode: ''   // Would violate required, but not validated. 
                })
            });

            const violations = validate(PersonWithoutValidationSchema, invalid);
            expect(violations).toHaveLength(0);  // No violations because validate is not enabled. 
        });
    });

    describe('Complex Combined Validation', () => {
        it('should `validate` complex message with multiple nested fields', () => {
            const valid = create(ProductOrderSchema, {
                productId: 123,
                product: create(ProductDetailsSchema, {
                    name: 'Widget',
                    price: 19.99,
                    tags: ['electronics', 'gadget']
                }),
                reviews: [
                    create(ReviewSchema, { rating: 5, comment: 'Great!' }),
                    create(ReviewSchema, { rating: 4, comment: 'Good' })
                ],
                shipping: create(ShippingInfoSchema, {
                    address: create(AddressSchema, {
                        street: '123 Main St',
                        city: 'Boston',
                        zipCode: '02101'
                    }),
                    method: 'Express'
                })
            });

            const violations = validate(ProductOrderSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect `distinct` violation in nested product', () => {
            const invalid = create(ProductOrderSchema, {
                productId: 123,
                product: create(ProductDetailsSchema, {
                    name: 'Widget',
                    price: 19.99,
                    tags: ['electronics', 'gadget', 'electronics']  // Duplicate tag. 
                }),
                reviews: [],
                shipping: create(ShippingInfoSchema, {
                    address: create(AddressSchema, {
                        street: '123 Main St',
                        city: 'Boston',
                        zipCode: '02101'
                    }),
                    method: 'Express'
                })
            });

            const violations = validate(ProductOrderSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const tagsViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'product' &&
                v.fieldPath?.fieldName[1] === 'tags'
            );
            expect(tagsViolation).toBeDefined();
        });

        it('should detect violations in repeated reviews', () => {
            const invalid = create(ProductOrderSchema, {
                productId: 123,
                product: create(ProductDetailsSchema, {
                    name: 'Widget',
                    price: 19.99,
                    tags: ['electronics']
                }),
                reviews: [
                    create(ReviewSchema, { rating: 5, comment: 'Great!' }),
                    create(ReviewSchema, { rating: 6, comment: 'Good' })  // Rating out of range. 
                ],
                shipping: create(ShippingInfoSchema, {
                    address: create(AddressSchema, {
                        street: '123 Main St',
                        city: 'Boston',
                        zipCode: '02101'
                    }),
                    method: 'Express'
                })
            });

            const violations = validate(ProductOrderSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const ratingViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'reviews' &&
                v.fieldPath?.fieldName[1] === '1' &&
                v.fieldPath?.fieldName[2] === 'rating'
            );
            expect(ratingViolation).toBeDefined();
        });

        it('should detect violations in doubly-nested shipping address', () => {
            const invalid = create(ProductOrderSchema, {
                productId: 123,
                product: create(ProductDetailsSchema, {
                    name: 'Widget',
                    price: 19.99,
                    tags: ['electronics']
                }),
                reviews: [],
                shipping: create(ShippingInfoSchema, {
                    address: create(AddressSchema, {
                        street: '123 Main St',
                        city: 'Boston',
                        zipCode: 'INVALID'  // Pattern violation. 
                    }),
                    method: 'Express'
                })
            });

            const violations = validate(ProductOrderSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            // Path: `shipping.address.zip_code`.
            const zipViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'shipping' &&
                v.fieldPath?.fieldName[1] === 'address' &&
                v.fieldPath?.fieldName[2] === 'zip_code'
            );
            expect(zipViolation).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should pass when validating message with no constraints', () => {
            const valid = create(ContainerWithEmptyMessageSchema, {
                id: 'test-123',
                empty: create(EmptyValidatedSchema, {
                    note: 'Some note'
                })
            });

            const violations = validate(ContainerWithEmptyMessageSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should `validate` nested message with its own nested validation', () => {
            const valid = create(ProjectWithTasksSchema, {
                projectName: 'Project Alpha',
                tasks: [
                    create(TaskSchema, {
                        title: 'Task 1',
                        priority: 3,
                        assignees: ['alice', 'bob']
                    })
                ],
                tags: ['urgent', 'backend']
            });

            const violations = validate(ProjectWithTasksSchema, valid);
            expect(violations).toHaveLength(0);
        });

        it('should detect `distinct` violation in nested task assignees', () => {
            const invalid = create(ProjectWithTasksSchema, {
                projectName: 'Project Alpha',
                tasks: [
                    create(TaskSchema, {
                        title: 'Task 1',
                        priority: 3,
                        assignees: ['alice', 'bob', 'alice']  // Duplicate assignee. 
                    })
                ],
                tags: ['urgent', 'backend']
            });

            const violations = validate(ProjectWithTasksSchema, invalid);
            expect(violations.length).toBeGreaterThan(0);

            const assigneeViolation = violations.find(v =>
                v.fieldPath?.fieldName[0] === 'tasks' &&
                v.fieldPath?.fieldName[1] === '0' &&
                v.fieldPath?.fieldName[2] === 'assignees'
            );
            expect(assigneeViolation).toBeDefined();
        });
    });
});

