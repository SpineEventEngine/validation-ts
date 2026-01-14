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
 * Internal registry for Spine validation option extensions.
 *
 * Options are automatically imported from the generated Spine options.
 */

import {
    required,
    if_missing,
    pattern,
    min,
    max,
    range,
    distinct,
    validate,
    goes,
    if_has_duplicates,
    choice,
    requireFields
} from './generated/spine/options_pb';

/**
 * Registry storing option extension references.
 *
 * Currently supported options are automatically registered.
 *
 * Note: The following options are NOT SUPPORTED:
 * - `if_invalid` (73822) — Deprecated, not supported
 * - `set_once` (73824) — Requires state tracking across validations
 * - `if_set_again` (73827) — Companion to `set_once`
 * - `required_field` (73902) — Deprecated, replaced by `requireFields`
 * - `is_required` (73891) — Deprecated, replaced by `choice`
 */
const optionRegistry = {
    required,
    if_missing,
    pattern,
    min,
    max,
    range,
    distinct,
    validate,
    goes,
    if_has_duplicates,
    choice,
    requireFields,
} as const;

/**
 * Type representing the names of all registered options.
 */
type OptionName = keyof typeof optionRegistry;

/**
 * Gets a registered option extension by name.
 *
 * @param name The name of the option to retrieve.
 * @returns The option extension, or `undefined` if not found.
 * @internal
 */
export function getRegisteredOption(name: OptionName): any | undefined {
    return optionRegistry[name];
}
