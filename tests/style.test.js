/*
 * Footnote Matcher
 * Copyright (C) 2026 Marcus Miller
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

/** Tests for reading a style from a source and applying it to a paragraph. */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCode, plain } = require('./helpers/load-code');
const { footnoteSection, bodySection, text, paragraph } = require('./helpers/fakes');

/** Normal text's named-style values in these tests. */
const NAMED_STYLE = { FONT_FAMILY: 'Arial', FONT_SIZE: 11, LINE_SPACING: 1.15, SPACING_AFTER: 6 };

const { ctx } = loadCode({ namedStyle: NAMED_STYLE });

/**
 * Reads the style of the first visible character of a one-paragraph source.
 * @param {Object} options
 * @param {Object} options.parent footnoteSection() or bodySection().
 * @param {Object=} options.textAttrs Text attributes of every character.
 * @param {Object=} options.paragraphAttrs Paragraph attributes.
 * @param {string=} options.content The text.
 * @param {?number=} options.offset The character to read.
 * @return {Object} The style, as a plain object.
 */
function styleOf({ parent, textAttrs = {}, paragraphAttrs = {}, content = 'Sample', offset = null, at }) {
  const t = text(content, { attrs: textAttrs, at });
  const p = paragraph({ parent, attrs: paragraphAttrs, text: t });
  return plain(ctx.readStyle_({ paragraph: p, text: t, offset }));
}

test('readStyle_ reads values with the specific getters', () => {
  // The fakes throw if getAttributes() is called.
  const style = styleOf({
    parent: footnoteSection(),
    textAttrs: { FONT_FAMILY: 'Georgia', FONT_SIZE: 9, FOREGROUND_COLOR: '#c00000', BACKGROUND_COLOR: '#ffff00', BOLD: true, ITALIC: true },
    paragraphAttrs: {
      LINE_SPACING: 1,
      SPACING_BEFORE: 2,
      SPACING_AFTER: 3,
      HORIZONTAL_ALIGNMENT: 'Justify',
      INDENT_START: 10,
      INDENT_END: 20,
      INDENT_FIRST_LINE: 30,
    },
  });
  assert.deepEqual(style, {
    FONT_FAMILY: 'Georgia',
    FONT_SIZE: 9,
    FOREGROUND_COLOR: '#c00000',
    BACKGROUND_COLOR: '#ffff00',
    BOLD: true,
    ITALIC: true,
    LINE_SPACING: 1,
    SPACING_BEFORE: 2,
    SPACING_AFTER: 3,
    HORIZONTAL_ALIGNMENT: 'JUSTIFY',
    INDENT_START: 10,
    INDENT_END: 20,
    INDENT_FIRST_LINE: 30,
  });
});

test('readStyle_ reads the character at the offset, or the first visible one', () => {
  const at = { 3: { FONT_SIZE: 14 } };
  assert.equal(styleOf({ parent: footnoteSection(), content: '   abc', at }).FONT_SIZE, 14);
  assert.equal(styleOf({ parent: footnoteSection(), content: '   abc', at, offset: 4 }).FONT_SIZE, null);
});

test('readStyle_ fills unset attributes from the named style', () => {
  const style = styleOf({ parent: footnoteSection() });
  assert.equal(style.FONT_FAMILY, 'Arial');
});

test('readStyle_ saves unset size and spacing in a footnote as null, not the named style', () => {
  const style = styleOf({ parent: footnoteSection() });
  assert.equal(style.FONT_SIZE, null);
  assert.equal(style.LINE_SPACING, null);
  assert.equal(style.SPACING_BEFORE, null);
  assert.equal(style.SPACING_AFTER, null);
  for (const name of ['FONT_SIZE', 'LINE_SPACING', 'SPACING_BEFORE', 'SPACING_AFTER']) {
    assert.ok(name in style, name);
  }
});

test('readStyle_ fills unset size and spacing in body text from the named style', () => {
  const style = styleOf({ parent: bodySection() });
  assert.equal(style.FONT_SIZE, 11);
  assert.equal(style.LINE_SPACING, 1.15);
  assert.equal(style.SPACING_AFTER, 6);
  assert.equal('SPACING_BEFORE' in style, false); // set nowhere: skipped
});

test('readStyle_ saves unset indents as 0', () => {
  const style = styleOf({ parent: footnoteSection() });
  assert.equal(style.INDENT_START, 0);
  assert.equal(style.INDENT_END, 0);
  assert.equal(style.INDENT_FIRST_LINE, 0);
});

test('readStyle_ saves a plain character as no color, no highlight, not bold or italic', () => {
  const style = styleOf({ parent: footnoteSection() });
  assert.equal(style.FOREGROUND_COLOR, null);
  assert.equal(style.BACKGROUND_COLOR, null);
  assert.equal(style.BOLD, false);
  assert.equal(style.ITALIC, false);
  assert.ok('FOREGROUND_COLOR' in style);
  assert.ok('BACKGROUND_COLOR' in style);
});

test('readStyle_ clears an unset color in a footnote instead of copying the named style', () => {
  const { ctx: blackCtx } = loadCode({ namedStyle: Object.assign({}, NAMED_STYLE, { FOREGROUND_COLOR: '#000000' }) });
  const t = text('Sample');
  const inFootnote = plain(blackCtx.readStyle_({ paragraph: paragraph({ parent: footnoteSection(), text: t }), text: t, offset: null }));
  assert.equal(inFootnote.FOREGROUND_COLOR, null);
  assert.ok('FOREGROUND_COLOR' in inFootnote);
  const b = text('Sample');
  const inBody = plain(blackCtx.readStyle_({ paragraph: paragraph({ parent: bodySection(), text: b }), text: b, offset: null }));
  assert.equal(inBody.FOREGROUND_COLOR, '#000000');
});

test('readStyle_ skips the text color of a link', () => {
  const style = styleOf({
    parent: footnoteSection(),
    textAttrs: { LINK_URL: 'https://example.com', FOREGROUND_COLOR: '#1155cc' },
  });
  assert.equal('FOREGROUND_COLOR' in style, false);
  assert.equal('LINK_URL' in style, false);
});

test('readStyle_ in an empty footnote paragraph reads the paragraph text as a whole', () => {
  const t = text('', { whole: { FONT_FAMILY: 'Georgia' } });
  const p = paragraph({ parent: footnoteSection(), text: t });
  const style = plain(ctx.readStyle_({ paragraph: p, text: null, offset: null }));
  assert.equal(style.FONT_FAMILY, 'Georgia');
  // No character, so size, color, highlight, bold and italic aren't saved.
  for (const name of ['FONT_SIZE', 'FOREGROUND_COLOR', 'BACKGROUND_COLOR', 'BOLD', 'ITALIC']) {
    assert.equal(name in style, false, name);
  }
  assert.equal(style.LINE_SPACING, null);
});

test('readTextAttributes_ and readParagraphAttributes_ return null for unset values', () => {
  const attrs = plain(ctx.readTextAttributes_(text('a', { attrs: { FONT_SIZE: 9 } }), 0));
  assert.equal(attrs.FONT_SIZE, 9);
  assert.equal(attrs.FONT_FAMILY, null);
  const paragraphAttrs = plain(ctx.readParagraphAttributes_(paragraph({ attrs: { LINE_SPACING: 2 } })));
  assert.equal(paragraphAttrs.LINE_SPACING, 2);
  assert.equal(paragraphAttrs.INDENT_START, null);
});

test('applyStyleToParagraph_ sets every attribute in the style', () => {
  const t = text('Sample');
  const p = paragraph({ text: t });
  ctx.applyStyleToParagraph_(p, {
    FONT_FAMILY: 'Georgia',
    FONT_SIZE: 9,
    FOREGROUND_COLOR: '#c00000',
    BACKGROUND_COLOR: '#ffff00',
    BOLD: true,
    ITALIC: false,
    LINE_SPACING: 1,
    SPACING_BEFORE: 0,
    SPACING_AFTER: 0,
    HORIZONTAL_ALIGNMENT: 'JUSTIFY',
    INDENT_START: 0,
    INDENT_END: 0,
    INDENT_FIRST_LINE: 18,
  });
  assert.deepEqual(plain(p.calls), [
    [
      'setAttributes',
      {
        LINE_SPACING: 1,
        SPACING_BEFORE: 0,
        SPACING_AFTER: 0,
        HORIZONTAL_ALIGNMENT: 'JUSTIFY',
        INDENT_START: 0,
        INDENT_END: 0,
        INDENT_FIRST_LINE: 18,
      },
    ],
  ]);
  assert.deepEqual(plain(t.calls), [
    ['setFontFamily', 'Georgia'],
    ['setFontSize', 9],
    ['setForegroundColor', 0, 5, '#c00000'],
    ['setBackgroundColor', '#ffff00'],
    ['setBold', true],
    ['setItalic', false],
  ]);
});

test('applyStyleToParagraph_ clears size and spacing saved as null', () => {
  const t = text('Sample');
  const p = paragraph({ text: t });
  ctx.applyStyleToParagraph_(p, { FONT_SIZE: null, LINE_SPACING: null, SPACING_BEFORE: null, SPACING_AFTER: null });
  assert.deepEqual(plain(p.calls), [['setAttributes', { LINE_SPACING: null, SPACING_BEFORE: null, SPACING_AFTER: null }]]);
  assert.deepEqual(plain(t.calls), [['setFontSize', null]]);
});

test('applyStyleToParagraph_ leaves out attributes that are not in the style', () => {
  const t = text('Sample');
  const p = paragraph({ text: t });
  ctx.applyStyleToParagraph_(p, { FONT_FAMILY: 'Georgia' });
  assert.deepEqual(plain(p.calls), []);
  assert.deepEqual(plain(t.calls), [['setFontFamily', 'Georgia']]);
});

test('applyStyleToParagraph_ keeps the start and first-line indents of list items', () => {
  const p = paragraph({ listItem: true, text: text('Item') });
  ctx.applyStyleToParagraph_(p, { INDENT_START: 0, INDENT_END: 5, INDENT_FIRST_LINE: 0 });
  assert.deepEqual(plain(p.calls), [['setAttributes', { INDENT_END: 5 }]]);
});

test('applyStyleToParagraph_ skips text changes in an empty paragraph', () => {
  const t = text('');
  const p = paragraph({ text: t });
  ctx.applyStyleToParagraph_(p, { FONT_FAMILY: 'Georgia', SPACING_AFTER: 0 });
  assert.deepEqual(plain(p.calls), [['setAttributes', { SPACING_AFTER: 0 }]]);
  assert.deepEqual(plain(t.calls), []);
});

test('applyStyleToParagraph_ resets text color except on links', () => {
  // "plain link" with the link starting at index 6.
  const t = text('plain link', { runs: [0, 6], at: { 6: { LINK_URL: 'https://example.com' } } });
  const p = paragraph({ text: t });
  ctx.applyStyleToParagraph_(p, { FOREGROUND_COLOR: null });
  assert.deepEqual(plain(t.calls), [['setForegroundColor', 0, 5, null]]);
});

test('loadStyle_ reads the style stored under the given key', () => {
  const { ctx: loaded } = loadCode({
    properties: { footnoteStyle: '{"FONT_SIZE":9}', footnoteSavedStyle: '{"FONT_SIZE":12}', broken: '{' },
  });
  assert.deepEqual(plain(loaded.loadStyle_('footnoteStyle')), { FONT_SIZE: 9 });
  assert.deepEqual(plain(loaded.loadStyle_('footnoteSavedStyle')), { FONT_SIZE: 12 });
  assert.equal(loaded.loadStyle_('broken'), null);
  assert.equal(loaded.loadStyle_('missing'), null);
});
