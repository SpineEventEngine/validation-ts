#!/usr/bin/env node

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
 * Post-generation script to patch generated TypeScript files.
 *
 * Renames `require` export to `requireFields` to avoid JavaScript reserved word conflict.
 */

const fs = require('fs');
const path = require('path');

function patchFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    // Replace export const require with export const requireFields
    const patched = content.replace(
        /export const require: GenExtension<MessageOptions, RequireOption>/g,
        'export const requireFields: GenExtension<MessageOptions, RequireOption>'
    );

    if (content !== patched) {
        fs.writeFileSync(filePath, patched, 'utf8');
        console.log(`Patched: ${filePath}`);
    }
}

// Patch main generated file
const mainFile = path.join(__dirname, '../src/generated/spine/options_pb.ts');
if (fs.existsSync(mainFile)) {
    patchFile(mainFile);
}

// Patch test generated file
const testFile = path.join(__dirname, '../tests/generated/spine/options_pb.ts');
if (fs.existsSync(testFile)) {
    patchFile(testFile);
}

console.log('Patching complete');
