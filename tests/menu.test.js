/*
 * Footnote Matcher
 * Copyright (C) 2026 Marcus Miller
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

/**
 * Tests for the menu and the menu actions. Finding the source and changing
 * footnotes are replaced with stand-ins, so these check which style is
 * stored and applied, and which alerts are shown.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCode, plain } = require('./helpers/load-code');
const { footnoteSection, bodySection, paragraph } = require('./helpers/fakes');

/**
 * Loads Code.js with stand-ins for finding the source, reading it and
 * changing footnotes.
 * @param {Object=} options
 * @param {Object=} options.properties Initial document properties.
 * @param {number=} options.footnotes How many footnotes the document has.
 * @param {number=} options.changed How many paragraphs the apply changes
 *     (defaults to one per footnote).
 * @param {number=} options.failed How many paragraphs fail to update.
 * @param {number=} options.suggested How many footnotes are skipped as suggestions.
 * @return {Object} loadCode()'s result, plus `applied` (the styles applied),
 *     `appliedTargets` (the targets passed with each, or null for every
 *     footnote), `setSource(style, inFootnote)`, `setNoSource()` and
 *     `setSelected(sections, suggested)`.
 */
function setUp(options = {}) {
  const loaded = loadCode({ properties: options.properties });
  const { ctx } = loaded;
  const applied = [];
  const appliedTargets = [];
  let selected = { sections: [], suggested: 0 };
  ctx.selectedFootnoteTargets_ = () => selected;
  let source = null;
  let sourceStyle = null;
  ctx.findSource_ = () => source;
  ctx.readStyle_ = () => Object.assign({}, sourceStyle);
  ctx.applyStyleToFootnotes_ = (doc, style, targets) => {
    applied.push(plain(style));
    appliedTargets.push(targets || null);
    const footnotes = options.footnotes === undefined ? 3 : options.footnotes;
    return {
      footnotes,
      changed: options.changed === undefined ? footnotes : options.changed,
      failed: options.failed || 0,
      suggested: options.suggested || 0,
    };
  };
  return Object.assign(loaded, {
    applied,
    appliedTargets,
    setSelected(sections, suggested = 0) {
      selected = { sections, suggested };
    },
    setSource(style, inFootnote = true) {
      source = { paragraph: paragraph({ parent: inFootnote ? footnoteSection() : bodySection() }) };
      sourceStyle = style;
    },
    setNoSource() {
      source = null;
    },
  });
}

test('onOpen builds the menu in two sections with Settings below a separator', () => {
  const { ctx, menu } = setUp();
  ctx.onOpen({});
  assert.deepEqual(
    menu.map((item) => (item === '---' ? item : item.label)),
    [
      'Match all footnotes to selection',
      'Reapply footnote style',
      'Reapply to selected footnotes',
      '---',
      'Save selection as saved style',
      'Apply saved style',
      'Apply saved style to selected footnotes',
      '---',
      'Settings',
    ]
  );
  for (const item of menu) {
    if (item !== '---') assert.equal(typeof ctx[item.fn], 'function', item.fn);
  }
});

test('Match stores the last match and applies it', () => {
  const t = setUp();
  t.setSource({ FONT_SIZE: 9 });
  t.ctx.matchFootnotesToSelection();
  assert.deepEqual(JSON.parse(t.properties.footnoteStyle), { FONT_SIZE: 9 });
  assert.deepEqual(t.applied, [{ FONT_SIZE: 9 }]);
  assert.deepEqual(t.alerts, []);
});

test('Match from body text is refused while the setting is off', () => {
  const t = setUp();
  t.setSource({ FONT_SIZE: 12 }, false);
  t.ctx.matchFootnotesToSelection();
  assert.equal(t.alerts.length, 1);
  assert.match(t.alerts[0].message, /Allow matching from body text/);
  assert.equal(t.properties.footnoteStyle, undefined);
  assert.deepEqual(t.applied, []);
});

test('Match from body text works while the setting is on', () => {
  const t = setUp({ properties: { footnoteSettings: '{"allowBodyText":true}' } });
  t.setSource({ FONT_SIZE: 12 }, false);
  t.ctx.matchFootnotesToSelection();
  assert.deepEqual(t.applied, [{ FONT_SIZE: 12 }]);
});

test('Match with no source shows an alert and changes nothing', () => {
  const t = setUp();
  t.setNoSource();
  t.ctx.matchFootnotesToSelection();
  assert.equal(t.alerts[0].title, 'Nothing to match');
  assert.equal(t.properties.footnoteStyle, undefined);
  assert.deepEqual(t.applied, []);
});

test('Match in a document with no footnotes still stores the last match', () => {
  const t = setUp({ footnotes: 0 });
  t.setSource({ FONT_SIZE: 9 });
  t.ctx.matchFootnotesToSelection();
  assert.equal(t.alerts[0].title, 'No footnotes found');
  assert.deepEqual(JSON.parse(t.properties.footnoteStyle), { FONT_SIZE: 9 });
});

test('Match that changes nothing says the footnotes already match, and still stores the last match', () => {
  const t = setUp({ changed: 0 });
  t.setSource({ FONT_SIZE: 9 });
  t.ctx.matchFootnotesToSelection();
  assert.deepEqual(t.alerts.map((alert) => alert.title), ['Footnotes already match']);
  assert.deepEqual(JSON.parse(t.properties.footnoteStyle), { FONT_SIZE: 9 });
});

test('Reapply and Apply saved style that change nothing say the footnotes already match', () => {
  const style = '{"FONT_SIZE":9}';
  const t = setUp({ changed: 0, properties: { footnoteStyle: style, footnoteSavedStyle: style } });
  t.ctx.reapplyFootnoteStyle();
  t.ctx.applySavedStyle();
  assert.deepEqual(t.alerts.map((alert) => alert.title), ['Footnotes already match', 'Footnotes already match']);
});

test('"already match" mentions suggested footnotes that were skipped', () => {
  const t = setUp({ changed: 0, suggested: 2 });
  t.setSource({ FONT_SIZE: 9 });
  t.ctx.matchFootnotesToSelection();
  assert.equal(t.alerts.length, 1);
  assert.equal(t.alerts[0].title, 'Footnotes already match');
  assert.match(t.alerts[0].message, /^The other footnotes .* 2 suggested footnote\(s\) were skipped/);
});

test('failed paragraphs are reported instead of "already match"', () => {
  const t = setUp({ changed: 0, failed: 2 });
  t.setSource({ FONT_SIZE: 9 });
  t.ctx.matchFootnotesToSelection();
  assert.deepEqual(t.alerts.map((alert) => alert.title), ['Some footnotes were skipped']);
});

test('Match applies only the groups whose settings are on', () => {
  const t = setUp({ properties: { footnoteSettings: '{"size":false}' } });
  t.setSource({ FONT_SIZE: 9, FONT_FAMILY: 'Georgia' });
  t.ctx.matchFootnotesToSelection();
  assert.deepEqual(t.applied, [{ FONT_FAMILY: 'Georgia' }]);
  // The stored style keeps every attribute.
  assert.deepEqual(JSON.parse(t.properties.footnoteStyle), { FONT_SIZE: 9, FONT_FAMILY: 'Georgia' });
});

test('every group off shows an alert and applies nothing', () => {
  const { run } = loadCode();
  const allOff = {};
  for (const group of run('SETTING_GROUPS')) allOff[group.key] = false;
  allOff.allowBodyText = true; // not an attribute group
  const t = setUp({ properties: { footnoteSettings: JSON.stringify(allOff), footnoteStyle: '{"FONT_SIZE":9}' } });
  t.ctx.reapplyFootnoteStyle();
  assert.equal(t.alerts[0].title, 'All settings are turned off');
  assert.deepEqual(t.applied, []);
});

test('Reapply with no last match shows an alert', () => {
  const t = setUp();
  t.ctx.reapplyFootnoteStyle();
  assert.equal(t.alerts[0].title, 'No footnote style saved yet');
  assert.deepEqual(t.applied, []);
});

test('Apply saved style with nothing saved shows an alert', () => {
  const t = setUp({ properties: { footnoteStyle: '{"FONT_SIZE":9}' } });
  t.ctx.applySavedStyle();
  assert.equal(t.alerts[0].title, 'No saved style yet');
  assert.deepEqual(t.applied, []);
});

test('Save selection as saved style stores it without changing footnotes or the last match', () => {
  const t = setUp({ properties: { footnoteStyle: '{"FONT_SIZE":9}' } });
  t.setSource({ FONT_SIZE: 12 });
  t.ctx.saveSelectionAsSavedStyle();
  assert.deepEqual(JSON.parse(t.properties.footnoteSavedStyle), { FONT_SIZE: 12 });
  assert.deepEqual(JSON.parse(t.properties.footnoteStyle), { FONT_SIZE: 9 });
  assert.deepEqual(t.applied, []);
  assert.equal(t.alerts[0].title, 'Style saved');
});

test('Save selection as saved style from body text is refused while the setting is off', () => {
  const t = setUp();
  t.setSource({ FONT_SIZE: 12 }, false);
  t.ctx.saveSelectionAsSavedStyle();
  assert.match(t.alerts[0].message, /Allow matching from body text/);
  assert.equal(t.properties.footnoteSavedStyle, undefined);
});

test('Apply saved style leaves the last match for Reapply', () => {
  const t = setUp();
  t.setSource({ FONT_SIZE: 12 });
  t.ctx.saveSelectionAsSavedStyle();
  t.setSource({ FONT_SIZE: 9 });
  t.ctx.matchFootnotesToSelection();
  t.ctx.applySavedStyle();
  t.ctx.reapplyFootnoteStyle();
  assert.deepEqual(t.applied, [{ FONT_SIZE: 9 }, { FONT_SIZE: 12 }, { FONT_SIZE: 9 }]);
  assert.deepEqual(JSON.parse(t.properties.footnoteStyle), { FONT_SIZE: 9 });
});

test('a failing menu action shows a friendly alert instead of throwing', () => {
  const t = setUp();
  t.ctx.findSource_ = () => {
    throw new Error('boom');
  };
  assert.doesNotThrow(() => t.ctx.matchFootnotesToSelection());
  assert.equal(t.alerts[0].title, 'Footnote Matcher ran into a problem');
  assert.match(t.alerts[0].message, /boom/);
});

test('Reapply to selected footnotes applies the last match to the selected footnotes only', () => {
  const t = setUp({ properties: { footnoteStyle: '{"FONT_SIZE":9}' } });
  t.setSelected(['footnote 3', 'footnote 4']);
  t.ctx.reapplyToSelectedFootnotes();
  assert.deepEqual(t.applied, [{ FONT_SIZE: 9 }]);
  assert.deepEqual(plain(t.appliedTargets[0].sections), ['footnote 3', 'footnote 4']);
  assert.deepEqual(t.alerts, []);
});

test('Apply saved style to selected footnotes uses the saved style', () => {
  const t = setUp({ properties: { footnoteStyle: '{"FONT_SIZE":9}', footnoteSavedStyle: '{"FONT_SIZE":12}' } });
  t.setSelected(['footnote 1']);
  t.ctx.applySavedStyleToSelectedFootnotes();
  assert.deepEqual(t.applied, [{ FONT_SIZE: 12 }]);
  assert.deepEqual(plain(t.appliedTargets[0].sections), ['footnote 1']);
});

test('the "to selected footnotes" items with no footnote selected show an alert and change nothing', () => {
  const t = setUp({ properties: { footnoteStyle: '{"FONT_SIZE":9}', footnoteSavedStyle: '{"FONT_SIZE":12}' } });
  t.ctx.reapplyToSelectedFootnotes();
  t.ctx.applySavedStyleToSelectedFootnotes();
  assert.deepEqual(t.alerts.map((alert) => alert.title), ['No footnotes selected', 'No footnotes selected']);
  assert.deepEqual(t.applied, []);
});

test('the "to selected footnotes" items with nothing stored ask for a style first', () => {
  const t = setUp();
  t.setSelected(['footnote 1']);
  t.ctx.reapplyToSelectedFootnotes();
  t.ctx.applySavedStyleToSelectedFootnotes();
  assert.deepEqual(t.alerts.map((alert) => alert.title), ['No footnote style saved yet', 'No saved style yet']);
  assert.deepEqual(t.applied, []);
});

test('"already match" for selected footnotes names the selected footnotes', () => {
  const t = setUp({ changed: 0, properties: { footnoteStyle: '{"FONT_SIZE":9}' } });
  t.setSelected(['footnote 1']);
  t.ctx.reapplyToSelectedFootnotes();
  assert.equal(t.alerts[0].title, 'Footnotes already match');
  assert.match(t.alerts[0].message, /^The selected footnotes already have this formatting/);
});
