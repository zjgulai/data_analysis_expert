const workstationHomeRoots = [
  /[A-Za-z]:[\\/]+[Uu][Ss][Ee][Rr][Ss][\\/]+/.source,
  /\\+[Uu][Ss][Ee][Rr][Ss][\\/]+/.source,
  /\/Users[\\/]+/.source,
  /\/home[\\/]+/.source
];
const workstationHomeRootSource = workstationHomeRoots.join("|");
const wrapperPairs = new Map([
  ["\"", "\""],
  ["'", "'"],
  ["`", "`"],
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
  ["<", ">"]
]);
const terminalPunctuation = new Set([
  "\"", "'", "`", ")", "]", "}", ">", ",", ";", ".", ":", "!", "?",
  "，", "。", "；", "：", "！", "？", "、", "）", "】", "》", "」", "』"
]);
const localFileAuthorities = new Set(["localhost", "127.0.0.1", "[::1]"]);

export const workstationHomeRedaction = "<workstation-home>";

function freshWorkstationHomeRootPattern() {
  return new RegExp(workstationHomeRootSource, "g");
}

function freshUriPattern() {
  return /[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s"'`<>{}()]+/g;
}

function isEscaped(text, index) {
  let backslashes = 0;
  for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor -= 1) backslashes += 1;
  return backslashes % 2 === 1;
}

function isDelimiterBoundary(value) {
  return value === undefined || /\s/.test(value) || terminalPunctuation.has(value);
}

function findWrapperClose(text, contextStart, profileStart, searchLimit) {
  const closer = wrapperPairs.get(text[contextStart - 1]);
  if (!closer) return null;
  for (let index = profileStart; index < searchLimit; index += 1) {
    const value = text[index];
    if (value === "\n" || value === "\r") return null;
    if (value === closer && !isEscaped(text, index) && isDelimiterBoundary(text[index + 1])) return index;
  }
  return null;
}

function locateUriSpans(text) {
  return Array.from(text.matchAll(freshUriPattern()), (match) => {
    const start = match.index;
    const value = match[0];
    return {
      start,
      end: start + value.length,
      scheme: value.slice(0, value.indexOf(":")).toLowerCase()
    };
  });
}

function containingUriSpan(uriSpans, index) {
  return uriSpans.find((span) => index >= span.start && index < span.end);
}

function followsRedactedHome(text, start) {
  const markerStart = text.lastIndexOf(workstationHomeRedaction, start);
  if (markerStart === -1) return false;
  const between = text.slice(markerStart + workstationHomeRedaction.length, start);
  return /^[\\/]*$/.test(between);
}

function hasIndependentLeftBoundary(text, start) {
  if (start === 0) return true;
  return !/[A-Za-z0-9._~%+\\/-]/.test(text[start - 1]);
}

function ordinaryCandidate(text, match, uriSpans) {
  const rootStart = match.index;
  if (rootStart === undefined || containingUriSpan(uriSpans, rootStart)) return null;

  let start = rootStart;
  if (text[rootStart] === "/" && text[rootStart - 1] === "\\" && hasIndependentLeftBoundary(text, rootStart - 1)) {
    start = rootStart - 1;
  }
  if (!hasIndependentLeftBoundary(text, start) || followsRedactedHome(text, start)) return null;
  return {
    start,
    contextStart: start,
    profileStart: rootStart + match[0].length,
    tokenLimit: null
  };
}

function localFileCandidate(text, span) {
  const authorityStart = span.start + "file://".length;
  let pathStart = authorityStart;
  if (text[pathStart] !== "/") {
    const slash = text.indexOf("/", pathStart);
    if (slash === -1 || slash >= span.end) return null;
    const authority = text.slice(pathStart, slash).toLowerCase();
    if (!localFileAuthorities.has(authority)) return null;
    pathStart = slash;
  }

  const pathText = text.slice(pathStart, span.end);
  for (const match of pathText.matchAll(freshWorkstationHomeRootPattern())) {
    const relativeStart = match.index;
    if (relativeStart === undefined || !/^[\\/]*$/.test(pathText.slice(0, relativeStart))) continue;
    const rootStart = pathStart + relativeStart;
    return {
      start: rootStart,
      contextStart: span.start,
      profileStart: rootStart + match[0].length,
      tokenLimit: span.end
    };
  }
  return null;
}

function locateCandidates(text) {
  const uriSpans = locateUriSpans(text);
  const candidates = [];
  for (const match of text.matchAll(freshWorkstationHomeRootPattern())) {
    const candidate = ordinaryCandidate(text, match, uriSpans);
    if (candidate) candidates.push(candidate);
  }
  for (const span of uriSpans) {
    if (span.scheme !== "file") continue;
    const candidate = localFileCandidate(text, span);
    if (candidate && !followsRedactedHome(text, candidate.start)) candidates.push(candidate);
  }
  candidates.sort((left, right) => left.start - right.start || left.profileStart - right.profileStart);
  return candidates.filter((candidate, index) => {
    const previous = candidates[index - 1];
    return !previous || candidate.start !== previous.start || candidate.profileStart !== previous.profileStart;
  });
}

function findFirstSeparator(text, start, limit) {
  for (let index = start; index < limit; index += 1) {
    if (text[index] === "/" || text[index] === "\\") return index;
  }
  return null;
}

function findFirstTokenBoundary(text, start, limit) {
  for (let index = start; index < limit; index += 1) {
    const value = text[index];
    if (/\s/.test(value)) return index;
    if (terminalPunctuation.has(value) && isDelimiterBoundary(text[index + 1])) return index;
  }
  return null;
}

function trimTerminalPunctuation(text, start, end) {
  let cursor = end;
  while (cursor > start && /\s/.test(text[cursor - 1])) cursor -= 1;
  while (cursor > start && terminalPunctuation.has(text[cursor - 1])) cursor -= 1;
  return cursor;
}

function isPlausibleSpacedProfile(value) {
  if (value !== value.trim()) return false;
  const parts = value.split(/\s+/);
  return parts.length <= 3 && parts.every((part) => /^[\p{L}\p{N}._'’-]+$/u.test(part));
}

function isWholeLineValue(text, contextStart, hardLimit, lineLimit) {
  const lineStart = Math.max(text.lastIndexOf("\n", contextStart - 1), text.lastIndexOf("\r", contextStart - 1)) + 1;
  return text.slice(lineStart, contextStart).trim() === "" && text.slice(hardLimit, lineLimit).trim() === "";
}

function findHomeEnd(text, candidate, nextCandidate) {
  const lineBreak = text.slice(candidate.profileStart).search(/[\r\n]/);
  const lineLimit = lineBreak === -1 ? text.length : candidate.profileStart + lineBreak;
  const nextLimit = nextCandidate?.start ?? text.length;
  const tokenLimit = candidate.tokenLimit ?? text.length;
  const wrapperSearchLimit = Math.min(lineLimit, nextLimit, tokenLimit);
  const wrapperClose = findWrapperClose(
    text,
    candidate.contextStart,
    candidate.profileStart,
    wrapperSearchLimit
  );
  const hardLimit = Math.min(lineLimit, nextLimit, tokenLimit, wrapperClose ?? text.length);
  if (hardLimit <= candidate.profileStart) return null;

  const separator = findFirstSeparator(text, candidate.profileStart, hardLimit);
  const tokenBoundary = findFirstTokenBoundary(text, candidate.profileStart, hardLimit);
  const wholeLineValue = isWholeLineValue(text, candidate.contextStart, hardLimit, lineLimit);
  if (separator !== null) {
    const profile = text.slice(candidate.profileStart, separator);
    const separatorBeforeBoundary = tokenBoundary === null || separator < tokenBoundary;
    if (separatorBeforeBoundary || wrapperClose !== null || wholeLineValue || isPlausibleSpacedProfile(profile)) {
      return profile.trim() ? separator : null;
    }
  }

  const end = wrapperClose !== null || wholeLineValue
    ? trimTerminalPunctuation(text, candidate.profileStart, hardLimit)
    : trimTerminalPunctuation(text, candidate.profileStart, tokenBoundary ?? hardLimit);
  return end > candidate.profileStart && text.slice(candidate.profileStart, end).trim() ? end : null;
}

function locateWorkstationHomes(value) {
  const text = String(value);
  const candidates = locateCandidates(text);
  const ranges = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const end = findHomeEnd(text, candidate, candidates[index + 1]);
    if (end === null) continue;
    const previous = ranges[ranges.length - 1];
    if (previous && candidate.start < previous.end) continue;
    ranges.push({ start: candidate.start, end });
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
    redacted += `${text.slice(cursor, start)}${workstationHomeRedaction}`;
    cursor = end;
  }
  return `${redacted}${text.slice(cursor)}`;
}
