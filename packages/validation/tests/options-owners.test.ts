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

import { Choice } from "../src/options/choice.js";
import { Distinct } from "../src/options/distinct.js";
import { Goes } from "../src/options/goes.js";
import { MinMax } from "../src/options/min-max.js";
import { NumericValues } from "../src/options/numeric.js";
import { Pattern } from "../src/options/pattern.js";
import { Range } from "../src/options/range.js";
import { Require } from "../src/options/required-field.js";
import { Required } from "../src/options/required.js";
import { NestedValidation } from "../src/options/validate.js";
import { When } from "../src/options/when.js";

describe("option owners", () => {
  it("exposes each option implementation through its cohesive owner", () => {
    expect(NumericValues.parseLiteral).toBeTypeOf("function");
    expect(MinMax.validate).toBeTypeOf("function");
    expect(Range.validate).toBeTypeOf("function");
    expect(Required.validate).toBeTypeOf("function");
    expect(Goes.validate).toBeTypeOf("function");
    expect(Choice.validate).toBeTypeOf("function");
    expect(Require.validate).toBeTypeOf("function");
    expect(Distinct.validate).toBeTypeOf("function");
    expect(Pattern.validate).toBeTypeOf("function");
    expect(NestedValidation.validate).toBeTypeOf("function");
    expect(When.validate).toBeTypeOf("function");
  });
});
