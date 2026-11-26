/*
 * Footnote Matcher
 * Copyright (C) 2026 Marcus Miller
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

/** Tests for choosing where formatting is read from. */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCode } = require('./helpers/load-code');
const { footnoteSection, bodySection, headerSection, text, paragraph } = require('./helpers/fakes');

const { ctx } = loadCode();

test('pickIndex_ uses a given offset', () => {
  assert.equal(ctx.pickIndex_('abcdef', 3), 3);
  assert.equal(ctx.pickIndex_('abcdef', 0), 0);
});

test('pickIndex_ clamps out-of-range offsets', () => {
  assert.equal(ctx.pickIndex_('abc', 10), 2);
  assert.equal(ctx.pickIndex_('abc', -4), 0);
});

test('pickIndex_ without an offset skips leading spaces', () => {
  assert.equal(ctx.pickIndex_('   abc', null), 3);
  assert.equal(ctx.pickIndex_('\tabc', undefined), 1);
  assert.equal(ctx.pickIndex_('abc', null), 0);
});

test('pickIndex_ with all-space text returns 0', () => {
  assert.equal(ctx.pickIndex_('    ', null), 0);
});

test('visibleIndexNear_ reads the character before the cursor', () => {
  assert.equal(ctx.visibleIndexNear_('abc def', 3), 2);
  assert.equal(ctx.visibleIndexNear_('abc def', 7), 6);
});

test('visibleIndexNear_ skips spaces before the cursor', () => {
  // Cursor right after the space following "abc".
  assert.equal(ctx.visibleIndexNear_('abc def', 4), 2);
  assert.equal(ctx.visibleIndexNear_('abc   def', 6), 2);
});

test('visibleIndexNear_ at the start reads the character after the cursor', () => {
  assert.equal(ctx.visibleIndexNear_('abc', 0), 0);
  assert.equal(ctx.visibleIndexNear_('  abc', 1), 2);
});

test('visibleIndexNear_ handles a cursor past the end', () => {
  assert.equal(ctx.visibleIndexNear_('abc', 99), 2);
});

test('visibleIndexNear_ returns null for all-space text', () => {
  assert.equal(ctx.visibleIndexNear_('   ', 2), null);
  assert.equal(ctx.visibleIndexNear_('', 0), null);
});

test('isInFootnote_ looks for a footnote section among the ancestors', () => {
  assert.equal(ctx.isInFootnote_(paragraph({ parent: footnoteSection() })), true);
  assert.equal(ctx.isInFootnote_(paragraph({ parent: bodySection() })), false);
  const t = text('abc');
  paragraph({ parent: footnoteSection(), text: t });
  assert.equal(ctx.isInFootnote_(t), true);
});

test('findParagraph_ walks up to the paragraph or list item', () => {
  const p = paragraph({ parent: bodySection(), text: text('abc') });
  assert.equal(ctx.findParagraph_(p.editAsText()), p);
  const item = paragraph({ listItem: true, parent: bodySection() });
  assert.equal(ctx.findParagraph_(item), item);
  assert.equal(ctx.findParagraph_(bodySection()), null);
});

test('sourceFromElement_ uses the text and offset of a Text element', () => {
  const t = text('abc');
  const p = paragraph({ text: t });
  const source = ctx.sourceFromElement_(t, 1);
  assert.equal(source.paragraph, p);
  assert.equal(source.text, t);
  assert.equal(source.offset, 1);
});

test('sourceFromElement_ on an empty paragraph has no text', () => {
  const p = paragraph({ text: text('') });
  const source = ctx.sourceFromElement_(p, null);
  assert.equal(source.paragraph, p);
  assert.equal(source.text, null);
});

test('isAllowedSource_ allows footnotes always and body text only when the setting is on', () => {
  const inFootnote = { paragraph: paragraph({ parent: footnoteSection() }) };
  const inBody = { paragraph: paragraph({ parent: bodySection() }) };
  assert.equal(ctx.isAllowedSource_(inFootnote, { allowBodyText: false }), true);
  assert.equal(ctx.isAllowedSource_(inBody, { allowBodyText: false }), false);
  assert.equal(ctx.isAllowedSource_(inBody, { allowBodyText: true }), true);
});

test('isAllowedSource_ never allows a header or footer', () => {
  const inHeader = { paragraph: paragraph({ parent: headerSection() }) };
  assert.equal(ctx.isAllowedSource_(inHeader, { allowBodyText: false }), false);
  assert.equal(ctx.isAllowedSource_(inHeader, { allowBodyText: true }), false);
});
