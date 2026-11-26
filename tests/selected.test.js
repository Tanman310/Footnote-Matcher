/*
 * Footnote Matcher
 * Copyright (C) 2026 Marcus Miller
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

/** Tests for finding the selected footnotes. */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadCode, plain, ElementType } = require('./helpers/load-code');

const { ctx } = loadCode();

/**
 * A footnote's contents (a footnote section).
 * @param {string} name A name to tell sections apart in assertions.
 * @return {Object} The fake section.
 */
function section(name) {
  const element = {
    name,
    getType: () => ElementType.FOOTNOTE_SECTION,
    getParent: () => null,
    asFootnoteSection: () => element,
    getParagraphs: () => [],
  };
  return element;
}

/**
 * A footnote reference in the body.
 * @param {?Object} contents Its section, or null for a footnote with no contents.
 * @return {Object} The fake footnote.
 */
function footnote(contents) {
  const element = {
    getType: () => ElementType.FOOTNOTE,
    getParent: () => null,
    asFootnote: () => element,
    getFootnoteContents: () => contents,
  };
  return element;
}

/**
 * A body element (paragraph, table, ...) holding footnote references.
 * @param {string} type Its ElementType.
 * @param {Array<Object>} footnotes The footnotes inside it, in order.
 * @return {Object} The fake container, with findElement like Apps Script's.
 */
function container(type, footnotes) {
  const results = footnotes.map((element) => ({ getElement: () => element }));
  const element = {
    getType: () => type,
    getParent: () => null,
    findElement: (searchType, from) => {
      assert.equal(searchType, ElementType.FOOTNOTE);
      const next = from ? results.indexOf(from) + 1 : 0;
      return next < results.length ? results[next] : null;
    },
  };
  for (const cast of ['asParagraph', 'asListItem', 'asTable', 'asTableRow', 'asTableCell', 'asBody']) {
    element[cast] = () => element;
  }
  return element;
}

/**
 * Text inside a footnote.
 * @param {Object} contents The footnote section the text is in.
 * @return {Object} The fake text.
 */
function textIn(contents) {
  const paragraph = { getType: () => ElementType.PARAGRAPH, getParent: () => contents };
  return { getType: () => ElementType.TEXT, getParent: () => paragraph };
}

/** Plain body text, with no footnote in it. */
function bodyText() {
  return { getType: () => ElementType.TEXT, getParent: () => ({ getType: () => ElementType.BODY_SECTION, getParent: () => null }) };
}

/**
 * A document with a selection (a list of elements) or a cursor.
 * @param {Object} options
 * @param {Array<Object>=} options.selected Elements of the selection.
 * @param {Object=} options.cursor The element at the cursor.
 * @return {Object} The fake document.
 */
function doc({ selected, cursor }) {
  return {
    getSelection: () =>
      selected ? { getRangeElements: () => selected.map((element) => ({ getElement: () => element })) } : null,
    getCursor: () => (cursor ? { getElement: () => cursor } : null),
  };
}

/**
 * The names of the selected sections.
 * @param {Object} targets The result of selectedFootnoteTargets_.
 * @return {Array<string>} Their names.
 */
function names(targets) {
  return plain(targets.sections.map((contents) => contents.name));
}

test('a cursor inside a footnote selects that footnote', () => {
  const contents = section('A');
  assert.deepEqual(names(ctx.selectedFootnoteTargets_(doc({ cursor: textIn(contents) }))), ['A']);
});

test('a selection inside a footnote selects that footnote once', () => {
  const contents = section('A');
  const targets = ctx.selectedFootnoteTargets_(doc({ selected: [textIn(contents), textIn(contents)] }));
  assert.deepEqual(names(targets), ['A']);
});

test('footnote references in a body selection are selected', () => {
  const a = section('A');
  const b = section('B');
  const targets = ctx.selectedFootnoteTargets_(doc({ selected: [bodyText(), footnote(a), bodyText(), footnote(b)] }));
  assert.deepEqual(names(targets), ['A', 'B']);
});

test('footnote references inside selected paragraphs and tables are selected', () => {
  const paragraph = container(ElementType.PARAGRAPH, [footnote(section('A')), footnote(section('B'))]);
  const table = container(ElementType.TABLE, [footnote(section('C'))]);
  const targets = ctx.selectedFootnoteTargets_(doc({ selected: [paragraph, table] }));
  assert.deepEqual(names(targets), ['A', 'B', 'C']);
});

test('a footnote with no contents is counted, not selected', () => {
  const targets = ctx.selectedFootnoteTargets_(doc({ selected: [footnote(null), footnote(section('A'))] }));
  assert.deepEqual(names(targets), ['A']);
  assert.equal(targets.suggested, 1);
});

test('body text without footnotes, or no cursor at all, selects nothing', () => {
  for (const options of [{ selected: [bodyText()] }, { cursor: bodyText() }, {}]) {
    const targets = ctx.selectedFootnoteTargets_(doc(options));
    assert.deepEqual(names(targets), []);
    assert.equal(targets.suggested, 0);
  }
});
