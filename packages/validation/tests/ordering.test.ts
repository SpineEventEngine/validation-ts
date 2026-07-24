/*
 * Copyright 2026, TeamDev. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { create } from "@bufbuild/protobuf";

import { validate } from "../src";
import { AccountSchema } from "./generated/integration-account_pb";

describe("deterministic validation orchestration", () => {
  it("runs message constraints first and then validators field by field", () => {
    const account = create(AccountSchema, {
      id: 0,
      email: "",
      username: "!",
      password: "",
      accountType: 0,
      age: 0,
    });

    const violations = validate(AccountSchema, account);

    expect(violations.map((violation) => violation.fieldPath?.fieldName)).toEqual([
      [],
      ["id"],
      ["email"],
      ["username"],
      ["password"],
      ["age"],
      ["age"],
      ["rating"],
    ]);
    expect(violations.every((violation) => violation.typeName === AccountSchema.typeName)).toBe(
      true,
    );
  });
});
