/*
 * Footnote Matcher
 * Copyright (C) 2026 Marcus Miller
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

/** Tests for loading, saving and applying the Settings choices. */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCode, plain } = require('./helpers/load-code');

const DEFAULTS = {
  font: true,
  size: true,
  textColor: true,
  highlight: true,
  bold: false,
  italic: false,
  underline: true,
  strikethrough: true,
  linkColor: true,
  linkUnderline: true,
  lineSpacing: true,
  paragraphSpacing: true,
  alignment: true,
  indents: true,
  allowBodyText: false,
};

const FULL_STYLE = {
  FONT_FAMILY: 'Georgia',
  FONT_SIZE: 9,
  FOREGROUND_COLOR: null,
  BACKGROUND_COLOR: null,
  BOLD: false,
  ITALIC: false,
  UNDERLINE: false,
  STRIKETHROUGH: false,
  LINK_COLOR: null,
  LINK_UNDERLINE: false,
  LINE_SPACING: 1,
  SPACING_BEFORE: 0,
  SPACING_AFTER: 0,
  HORIZONTAL_ALIGNMENT: 'JUSTIFY',
  INDENT_START: 0,
  INDENT_END: 0,
  INDENT_FIRST_LINE: 0,
};

test('loadSettings_ uses the defaults when nothing is saved', () => {
  const { ctx } = loadCode();
  assert.deepEqual(plain(ctx.loadSettings_()), DEFAULTS);
});

test('loadSettings_ falls back to the defaults for unreadable JSON', () => {
  const { ctx } = loadCode({ properties: { footnoteSettings: '{not json' } });
  assert.deepEqual(plain(ctx.loadSettings_()), DEFAULTS);
});

test('loadSettings_ keeps saved values, ignores unknown keys and non-booleans', () => {
  const saved = JSON.stringify({ highlight: false, bold: true, allowBodyText: true, bogus: true, size: 'no' });
  const { ctx } = loadCode({ properties: { footnoteSettings: saved } });
  assert.deepEqual(
    plain(ctx.loadSettings_()),
    Object.assign({}, DEFAULTS, { highlight: false, bold: true, allowBodyText: true })
  );
});

test('saveSettings stores known keys only', () => {
  const { ctx, properties } = loadCode();
  ctx.saveSettings({ highlight: false, allowBodyText: true, bogus: true });
  assert.deepEqual(JSON.parse(properties.footnoteSettings), { highlight: false, allowBodyText: true });
});

test('saveSettings rejects non-objects and non-boolean values', () => {
  const { ctx, properties } = loadCode();
  assert.throws(() => ctx.saveSettings(null), /could not be read/);
  assert.throws(() => ctx.saveSettings('highlight'), /could not be read/);
  assert.throws(() => ctx.saveSettings({ highlight: 'off' }), /could not be read/);
  assert.equal(properties.footnoteSettings, undefined);
});

test('every setting group lists attributes that are copied', () => {
  const { run } = loadCode();
  // Underline, strikethrough and link styling are read separately in readStyle_.
  const copied = run('TEXT_ATTRIBUTES.concat(PARAGRAPH_ATTRIBUTES)').concat([
    'UNDERLINE',
    'STRIKETHROUGH',
    'LINK_COLOR',
    'LINK_UNDERLINE',
  ]);
  for (const group of run('SETTING_GROUPS')) {
    assert.ok(group.attributes.length > 0, group.key);
    for (const name of group.attributes) assert.ok(copied.includes(name), `${group.key}: ${name}`);
  }
});

test('filterStyle_ with every group on keeps the whole style', () => {
  const { ctx } = loadCode();
  assert.deepEqual(plain(ctx.filterStyle_(FULL_STYLE, Object.assign({}, DEFAULTS, { bold: true, italic: true }))), FULL_STYLE);
});

test('filterStyle_ removes exactly the attributes of each group that is off', () => {
  const { ctx, run } = loadCode();
  const allOn = Object.assign({}, DEFAULTS, { bold: true, italic: true });
  for (const group of run('SETTING_GROUPS')) {
    const filtered = plain(ctx.filterStyle_(FULL_STYLE, Object.assign({}, allOn, { [group.key]: false })));
    const expected = Object.assign({}, FULL_STYLE);
    for (const name of group.attributes) delete expected[name];
    assert.deepEqual(filtered, expected, group.key);
  }
});

test('filterStyle_ removes keys rather than setting them to null', () => {
  const { ctx } = loadCode();
  const filtered = ctx.filterStyle_(FULL_STYLE, Object.assign({}, DEFAULTS, { highlight: false, size: false }));
  assert.equal('BACKGROUND_COLOR' in filtered, false);
  assert.equal('FONT_SIZE' in filtered, false);
});

test('filterStyle_ does not change the style it is given', () => {
  const { ctx } = loadCode();
  const style = Object.assign({}, FULL_STYLE);
  ctx.filterStyle_(style, {});
  assert.deepEqual(style, FULL_STYLE);
});

test('the body-text option is not an attribute group', () => {
  const { run } = loadCode();
  assert.equal(run("SETTING_GROUPS.some((g) => g.key === 'allowBodyText')"), false);
  assert.equal(run("ALL_SETTINGS.some((g) => g.key === 'allowBodyText')"), true);
});
