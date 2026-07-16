const workstationHomePattern = /[A-Za-z]:[\\/]+[Uu][Ss][Ee][Rr][Ss][\\/]+[^\\/\r\n"'`<>]+(?=[\\/])|(?<![A-Za-z0-9._~%+-])\\+[Uu][Ss][Ee][Rr][Ss][\\/]+[^\\/\r\n"'`<>]+(?=[\\/])|(?<![A-Za-z0-9._~%+-])\/Users[\\/]+[^\\/\r\n"'`<>]+(?=[\\/])|(?<![A-Za-z0-9._~%+-])\/home[\\/]+[^\\/\r\n"'`<>]+(?=[\\/])/g;

export const workstationHomeRedaction = "<workstation-home>";

function freshWorkstationHomePattern() {
  return new RegExp(workstationHomePattern.source, workstationHomePattern.flags);
}

export function countWorkstationHomePaths(value) {
  return Array.from(String(value).matchAll(freshWorkstationHomePattern())).length;
}

export function redactWorkstationPaths(value) {
  return String(value).replace(freshWorkstationHomePattern(), workstationHomeRedaction);
}
