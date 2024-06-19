/**
 * Whether or not the string is null, empty or only contains whitespaces.
 *
 * @export
 * @param {string? | null} str
 * @return {boolean}
 */
export function isNullOrWhiteSpaces(
    str?: string | null,
): str is null | undefined | "" {
    return str === null || str === undefined || str.match(/^ *$/) !== null;
}
