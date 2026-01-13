/**
 * Spine Validation for TypeScript.
 *
 * A validation library for Protobuf messages with Spine validation options.
 *
 * @packageDocumentation
 */

export {
    validate,
    formatTemplateString,
    formatViolations
} from './validation';

export type {
    ConstraintViolation,
    ValidationError
} from './generated/spine/validate/validation_error_pb';

export type {
    TemplateString
} from './generated/spine/validate/error_message_pb';

export type {
    FieldPath
} from './generated/spine/base/field_path_pb';
