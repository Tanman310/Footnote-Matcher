/*
 * Footnote Matcher
 * Copyright (C) 2026 Marcus Miller
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

/**
 * Reads a version's release notes from CHANGELOG.md for the Release
 * workflow (.github/workflows/release.yml). Uses only Node's built-in
 * modules.
 *
 * Command line:
 *   node .github/scripts/release-notes.js <tag> <changelog> <notes-file>
 * Writes the notes to <notes-file>, and `prerelease=true` or
 * `prerelease=false` to the step outputs file named by GITHUB_OUTPUT (or to
 * standard output when it isn't set). On a problem, prints a GitHub Actions
 * error and exits with status 1.
 */

'use strict';

const fs = require('node:fs');

// Semantic Versioning 2.0.0 (https://semver.org/), with a leading "v".
const TAG_PATTERN = new RegExp(
  '^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)' +
  '(?:-((?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)' +
  '(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?' +
  '(?:\\+([0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?$'
);

/**
 * Checks a tag and returns its version.
 * @param {string} tag A git tag, for example `v1.0.0` or `v1.1.0-beta.1`.
 * @return {{version: string, prerelease: boolean}} The version without the
 *     leading "v", and whether it has a pre-release suffix.
 * @throws {Error} If the tag isn't SemVer with a leading "v".
 */
function parseTag(tag) {
  const match = TAG_PATTERN.exec(tag);
  if (!match) {
    throw new Error(
      `Tag "${tag}" is not a valid version tag. Use "v" followed by a ` +
      'Semantic Versioning version, for example v1.0.0 or v1.1.0-beta.1.'
    );
  }
  return { version: tag.slice(1), prerelease: match[4] !== undefined };
}

/**
 * Returns the body of a version's section in a Keep a Changelog file:
 * everything after its `## [X.Y.Z]` heading, up to the next `## [` heading
 * or the link definitions at the bottom. Leading and trailing blank lines
 * are removed.
 * @param {string} changelog The contents of CHANGELOG.md.
 * @param {string} version The version, without the leading "v".
 * @return {string} The section body, ending with a newline.
 * @throws {Error} If there is no heading for the version or the section is empty.
 */
function extractNotes(changelog, version) {
  const lines = changelog.split(/\r?\n/);
  const heading = `## [${version}]`;
  const start = lines.findIndex(
    (line) => line === heading || line.startsWith(`${heading} `)
  );
  if (start === -1) {
    throw new Error(
      `CHANGELOG.md has no "${heading}" heading. Add a section for ` +
      `${version} before tagging the release.`
    );
  }

  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## [') || /^\[[^\]]+\]:\s/.test(line)) break;
    body.push(line);
  }
  while (body.length && body[0].trim() === '') body.shift();
  while (body.length && body[body.length - 1].trim() === '') body.pop();

  if (body.length === 0) {
    throw new Error(`The "${heading}" section of CHANGELOG.md is empty.`);
  }
  return `${body.join('\n')}\n`;
}

/**
 * Runs from the command line; see the file comment.
 * @param {string[]} args The tag, the changelog path and the notes file path.
 */
function main(args) {
  if (args.length !== 3) {
    console.error('Usage: node release-notes.js <tag> <changelog> <notes-file>');
    process.exit(2);
  }
  const [tag, changelogPath, notesPath] = args;
  try {
    const { version, prerelease } = parseTag(tag);
    const notes = extractNotes(fs.readFileSync(changelogPath, 'utf8'), version);
    fs.writeFileSync(notesPath, notes);
    const output = `prerelease=${prerelease}\n`;
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, output);
    } else {
      process.stdout.write(output);
    }
  } catch (err) {
    console.log(`::error::${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { parseTag, extractNotes };
