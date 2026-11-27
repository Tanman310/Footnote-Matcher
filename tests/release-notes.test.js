/*
 * Footnote Matcher
 * Copyright (C) 2026 Marcus Miller
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

/** Tests for reading release notes from the changelog (Release workflow). */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { parseTag, extractNotes } = require('../.github/scripts/release-notes');

const SCRIPT = path.join(__dirname, '..', '.github', 'scripts', 'release-notes.js');

const CHANGELOG = `# Changelog

Intro text.

## [Unreleased]

### Added

- Something not released yet.

## [1.1.0-beta.1] - 2027-02-01

### Added

- A beta feature.

## [1.0.1] - 2027-01-20

## [1.0.0] - 2027-01-15

### Added

- First release.

### Fixed

- A bug.

[Unreleased]: https://github.com/Tanman310/Footnote-Matcher/compare/v1.1.0-beta.1...HEAD
[1.1.0-beta.1]: https://github.com/Tanman310/Footnote-Matcher/compare/v1.0.1...v1.1.0-beta.1
[1.0.0]: https://github.com/Tanman310/Footnote-Matcher/releases/tag/v1.0.0
`;

test('parseTag accepts a release version', () => {
  assert.deepEqual(parseTag('v1.0.0'), { version: '1.0.0', prerelease: false });
  assert.deepEqual(parseTag('v10.20.30'), { version: '10.20.30', prerelease: false });
});

test('parseTag marks a pre-release version', () => {
  assert.deepEqual(parseTag('v1.1.0-beta.1'), { version: '1.1.0-beta.1', prerelease: true });
  assert.deepEqual(parseTag('v2.0.0-rc.1+build.5'), { version: '2.0.0-rc.1+build.5', prerelease: true });
});

test('parseTag treats build metadata alone as a release', () => {
  assert.deepEqual(parseTag('v1.0.0+build.5'), { version: '1.0.0+build.5', prerelease: false });
});

test('parseTag rejects tags that are not SemVer with a leading v', () => {
  for (const tag of ['1.0.0', 'v1.0', 'v1.0.0.0', 'v01.0.0', 'v1.0.0-', 'v1.0.0-beta..1', 'version1.0.0', 'v1.0.0 ']) {
    assert.throws(() => parseTag(tag), /not a valid version tag/, tag);
  }
});

test('extractNotes returns a section between two headings', () => {
  assert.equal(extractNotes(CHANGELOG, '1.1.0-beta.1'), '### Added\n\n- A beta feature.\n');
});

test('extractNotes stops at the link definitions after the last section', () => {
  assert.equal(
    extractNotes(CHANGELOG, '1.0.0'),
    '### Added\n\n- First release.\n\n### Fixed\n\n- A bug.\n'
  );
});

test('extractNotes fails for a missing version', () => {
  assert.throws(() => extractNotes(CHANGELOG, '2.0.0'), /no "## \[2\.0\.0\]" heading/);
});

test('extractNotes does not match a version that only starts the same', () => {
  assert.throws(() => extractNotes(CHANGELOG, '1.0'), /no "## \[1\.0\]" heading/);
  assert.throws(() => extractNotes(CHANGELOG, '1.1.0'), /no "## \[1\.1\.0\]" heading/);
});

test('extractNotes fails for an empty section', () => {
  assert.throws(() => extractNotes(CHANGELOG, '1.0.1'), /section of CHANGELOG\.md is empty/);
});

test('extractNotes reads a changelog with Windows line endings', () => {
  assert.equal(
    extractNotes(CHANGELOG.replace(/\n/g, '\r\n'), '1.1.0-beta.1'),
    '### Added\n\n- A beta feature.\n'
  );
});

test('the command line writes the notes and the prerelease output', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'release-notes-'));
  const changelog = path.join(dir, 'CHANGELOG.md');
  const notes = path.join(dir, 'notes.md');
  const output = path.join(dir, 'output');
  fs.writeFileSync(changelog, CHANGELOG);
  fs.writeFileSync(output, '');

  execFileSync(process.execPath, [SCRIPT, 'v1.1.0-beta.1', changelog, notes], {
    env: { ...process.env, GITHUB_OUTPUT: output },
  });
  assert.equal(fs.readFileSync(notes, 'utf8'), '### Added\n\n- A beta feature.\n');
  assert.equal(fs.readFileSync(output, 'utf8'), 'prerelease=true\n');

  const failed = spawnSync(process.execPath, [SCRIPT, 'v3.0.0', changelog, notes], {
    env: { ...process.env, GITHUB_OUTPUT: output },
    encoding: 'utf8',
  });
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /^::error::CHANGELOG\.md has no "## \[3\.0\.0\]" heading/);
  fs.rmSync(dir, { recursive: true });
});
