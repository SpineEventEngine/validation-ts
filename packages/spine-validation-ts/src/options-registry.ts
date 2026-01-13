/**
 * Internal registry for Spine validation option extensions.
 *
 * Options are automatically imported from the generated Spine options.
 */

import {
    required,
    if_missing,
    pattern,
    required_field,
    min,
    max,
    range,
    distinct,
    validate,
    if_invalid,
    goes
} from './generated/spine/options_pb';

/**
 * Registry storing option extension references.
 *
 * Currently supported options are automatically registered.
 */
const optionRegistry = {
    required,
    if_missing,
    pattern,
    required_field,
    min,
    max,
    range,
    distinct,
    validate,
    if_invalid,
    goes,
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
