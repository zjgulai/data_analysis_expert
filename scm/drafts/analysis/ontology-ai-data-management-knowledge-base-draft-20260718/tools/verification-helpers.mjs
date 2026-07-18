const PERSONAL_HOME_PATH_PATTERNS = [
  /(?:^|[^A-Za-z0-9])\/(?:Users|home)\/[^/\\\s"']+(?:[/\\]|$)/m,
  /(?:^|[^A-Za-z0-9])[A-Za-z]:[\\/]+Users[\\/]+[^\\/\r\n"']+(?:[\\/]|$)/im,
  /(?:^|[^A-Za-z0-9])(?:\$HOME|\$\{HOME\}|~)[\\/]+/m,
  /(?:^|[^A-Za-z0-9])(?:%USERPROFILE%|\$env:USERPROFILE)[\\/]+/im
];

export function containsPersonalAbsolutePath(content) {
  return PERSONAL_HOME_PATH_PATTERNS.some((pattern) => pattern.test(content));
}

export function artifactMatchesPage(artifact, page) {
  return artifact?.pdf_page === page;
}

export function artifactWithinPageRange(artifact, pageStart, pageEnd) {
  return artifact?.pdf_page >= pageStart && artifact?.pdf_page <= pageEnd;
}
