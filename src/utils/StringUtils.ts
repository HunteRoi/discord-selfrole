export function isNullOrWhiteSpaces(str: string) {
  return str === null || str === undefined || str.match(/^ *$/) !== null;
}
