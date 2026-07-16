const workstationHomeBoundary = /(?<![A-Za-z0-9._~%+-])/.source;
const workstationProfile = /(?:[^\\/\r\n"'`<>]+(?=[\\/])|[^\\/\r\n"'`<>]+(?=["'`<>])|[^\\/\s\r\n"'`<>]+(?=$|\s|["'`<>)}\]]))/.source;
const workstationHomeRoots = [
  /[A-Za-z]:[\\/]+[Uu][Ss][Ee][Rr][Ss][\\/]+/.source,
  /\\+[Uu][Ss][Ee][Rr][Ss][\\/]+/.source,
  /\/Users[\\/]+/.source,
  /\/home[\\/]+/.source
];
const workstationHomePatternSource = workstationHomeRoots
  .map((root) => `${workstationHomeBoundary}(?:${root})${workstationProfile}`)
  .join("|");

export const workstationHomeRedaction = "<workstation-home>";

function freshWorkstationHomePattern() {
  return new RegExp(workstationHomePatternSource, "g");
}

export function countWorkstationHomePaths(value) {
  return Array.from(String(value).matchAll(freshWorkstationHomePattern())).length;
}

export function redactWorkstationPaths(value) {
  return String(value).replace(freshWorkstationHomePattern(), workstationHomeRedaction);
}
