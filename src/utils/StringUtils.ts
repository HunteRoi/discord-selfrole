/**
 * Whether or not the string is null, empty or only contains whitespaces.
 *
 * @export
 * @param {string} str
 * @return {boolean}
 */
export function isNullOrWhiteSpaces(str: string): boolean {
  return str === null || str === undefined || str.match(/^ *$/) !== null;
}
