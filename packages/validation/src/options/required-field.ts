/** Validation of the message-level `(require)` option. */

import { getExtension, getOption, hasExtension } from "@bufbuild/protobuf";
import type { DescField, DescOneof } from "@bufbuild/protobuf";
import type { GenMessage } from "@bufbuild/protobuf/codegenv2";

import type { ConstraintViolation } from "../generated/spine/validate/validation_error_pb";
import { default_message, RequireOptionSchema } from "../generated/spine/options_pb";
import type { RequireOption } from "../generated/spine/options_pb";
import { getRegisteredOption } from "../options-registry";
import { isOneofPresent, isPresent, supportsPresence } from "../presence";
import { createConstraintViolation, type ValidationContext } from "../validation-contract";
import { ValidationConfigurationError } from "../validation-configuration-error";

type Requirement = { readonly field?: DescField; readonly oneof?: DescOneof };

function requireDefaultMessage(): string | undefined {
  return getOption(RequireOptionSchema, default_message);
}

function invalidOption(schema: GenMessage<any>): never {
  throw new ValidationConfigurationError({
    code: "INVALID_OPTION_VALUE",
    option: "require",
    typeName: schema.typeName,
  });
}

/** Parses the documented OR-of-AND grammar, resolving every token eagerly. */
function parseRequirements(
  expression: string,
  schema: GenMessage<any>,
): readonly (readonly Requirement[])[] {
  if (!expression.trim() || /[()]/.test(expression)) invalidOption(schema);

  const groups = expression.split("|").map((group) => group.trim());
  if (groups.some((group) => !group)) invalidOption(schema);

  return groups.map((group) => {
    const tokens = group.split("&").map((token) => token.trim());
    if (tokens.some((token) => !token || /\s/.test(token))) invalidOption(schema);
    return tokens.map((token) => resolveRequirement(token, schema));
  });
}

function resolveRequirement(token: string, schema: GenMessage<any>): Requirement {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) invalidOption(schema);

  const field = schema.fields.find((candidate) => candidate.name === token);
  if (field !== undefined) {
    if (!supportsPresence(field)) {
      throw new ValidationConfigurationError({
        code: "INVALID_FIELD_REFERENCE",
        option: "require",
        typeName: schema.typeName,
        fieldPath: [field.name],
      });
    }
    return { field };
  }

  const oneof = schema.oneofs.find((candidate) => candidate.name === token);
  if (oneof !== undefined) return { oneof };

  throw new ValidationConfigurationError({
    code: "UNKNOWN_FIELD_REFERENCE",
    option: "require",
    typeName: schema.typeName,
    fieldPath: [token],
  });
}

function requirementIsPresent(requirement: Requirement, message: Record<string, unknown>): boolean {
  if (requirement.field !== undefined) {
    return isPresent(requirement.field, message[requirement.field.localName]);
  }
  return isOneofPresent(requirement.oneof as DescOneof, message);
}

/** Validates a `(require)` option once for the message validation entry. */
export function validateRequireOption(
  context: ValidationContext,
  schema: GenMessage<any>,
  message: Record<string, unknown>,
  violations: ConstraintViolation[],
): void {
  const requireOption = getRegisteredOption("requireFields");
  const options = schema.proto.options;
  if (!requireOption || !options || !hasExtension(options, requireOption)) return;

  const require = getExtension(options, requireOption) as RequireOption;
  const expression = require.fields;
  const groups = parseRequirements(expression, schema);
  if (
    groups.some((group) => group.every((requirement) => requirementIsPresent(requirement, message)))
  ) {
    return;
  }

  violations.push(
    createConstraintViolation(context, undefined, undefined, {
      customMessage: require.errorMsg,
      defaultMessage: requireDefaultMessage(),
      placeholders: { "require.fields": expression },
    }),
  );
}
