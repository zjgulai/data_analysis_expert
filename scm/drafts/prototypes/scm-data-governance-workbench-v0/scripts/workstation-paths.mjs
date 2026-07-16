const workstationHomeBoundary = /(?<![A-Za-z0-9._~%+-])/.source;
const workstationHomeRoots = [
  /[A-Za-z]:[\\/]+[Uu][Ss][Ee][Rr][Ss][\\/]+/.source,
  /\\+[Uu][Ss][Ee][Rr][Ss][\\/]+/.source,
  /\/Users[\\/]+/.source,
  /\/home[\\/]+/.source
];
const workstationHomePrefixSource = workstationHomeRoots
  .map((root) => `${workstationHomeBoundary}(?:${root})`)
  .join("|");
const wrapperPairs = new Map([
  ["\"", "\""],
  ["'", "'"],
  ["`", "`"],
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
  ["<", ">"]
]);
const terminalPunctuation = new Set([")", "]", "}", ">", ",", ";", ".", ":"]);

export const workstationHomeRedaction = "<workstation-home>";

function freshWorkstationHomePrefixPattern() {
  return new RegExp(workstationHomePrefixSource, "g");
}

function isDelimiterBoundary(value) {
  return value === undefined || /\s|[.,;:!?)}\]>]/.test(value);
}

function findWrapperClose(text, candidateStart, profileStart, searchLimit) {
  const closer = wrapperPairs.get(text[candidateStart - 1]);
  if (!closer) return null;
  for (let index = profileStart; index < searchLimit; index += 1) {
    const value = text[index];
    if (value === "\n" || value === "\r") return null;
    if (value === closer && isDelimiterBoundary(text[index + 1])) return index;
  }
  return null;
}

function findHomeEnd(text, candidateStart, profileStart, nextCandidateStart) {
  const lineBreak = text.slice(profileStart).search(/[\r\n]/);
  const lineLimit = lineBreak === -1 ? text.length : profileStart + lineBreak;
  const candidateLimit = nextCandidateStart ?? text.length;
  const wrapperClose = findWrapperClose(text, candidateStart, profileStart, Math.min(lineLimit, candidateLimit));
  const searchLimit = Math.min(wrapperClose ?? text.length, lineLimit, candidateLimit);

  for (let index = profileStart; index < searchLimit; index += 1) {
    if (text[index] === "/" || text[index] === "\\") {
      return index > profileStart && text.slice(profileStart, index).trim() ? index : null;
    }
  }

  let end = searchLimit;
  while (end > profileStart && /\s/.test(text[end - 1])) end -= 1;
  if (wrapperClose === null) {
    while (end > profileStart && terminalPunctuation.has(text[end - 1])) end -= 1;
  }
  return end > profileStart && text.slice(profileStart, end).trim() ? end : null;
}

function locateWorkstationHomes(value) {
  const text = String(value);
  const candidates = Array.from(text.matchAll(freshWorkstationHomePrefixPattern()));
  const ranges = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const start = candidate.index;
    if (start === undefined) continue;
    const profileStart = start + candidate[0].length;
    const nextCandidateStart = candidates[index + 1]?.index;
    const end = findHomeEnd(text, start, profileStart, nextCandidateStart);
    if (end === null) continue;
    ranges.push({ start, end });
  }
  return { text, ranges };
}

export function countWorkstationHomePaths(value) {
  return locateWorkstationHomes(value).ranges.length;
}

export function redactWorkstationPaths(value) {
  const { text, ranges } = locateWorkstationHomes(value);
  if (!ranges.length) return text;
  let cursor = 0;
  let redacted = "";
  for (const { start, end } of ranges) {
    if (start < cursor) continue;
    redacted += `${text.slice(cursor, start)}${workstationHomeRedaction}`;
    cursor = end;
  }
  return `${redacted}${text.slice(cursor)}`;
}
