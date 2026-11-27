/*
 * Footnote Matcher
 * Copyright (C) 2026 Marcus Miller
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

/**
 * Small stand-ins for Google Docs elements (Text, Paragraph, ListItem,
 * footnote sections), with only the methods Code.js calls. Setters record
 * their calls so tests can check what would have changed.
 */

'use strict';

const { ElementType } = require('./load-code');

/** The Text getter for each text attribute, as used by Code.js. */
const TEXT_GETTERS = {
  FONT_FAMILY: 'getFontFamily',
  FONT_SIZE: 'getFontSize',
  FOREGROUND_COLOR: 'getForegroundColor',
  BACKGROUND_COLOR: 'getBackgroundColor',
  BOLD: 'isBold',
  ITALIC: 'isItalic',
  UNDERLINE: 'isUnderline',
  STRIKETHROUGH: 'isStrikethrough',
  LINK_URL: 'getLinkUrl',
};

/** The Paragraph getter for each paragraph attribute, as used by Code.js. */
const PARAGRAPH_GETTERS = {
  LINE_SPACING: 'getLineSpacing',
  SPACING_BEFORE: 'getSpacingBefore',
  SPACING_AFTER: 'getSpacingAfter',
  HORIZONTAL_ALIGNMENT: 'getAlignment',
  INDENT_START: 'getIndentStart',
  INDENT_END: 'getIndentEnd',
  INDENT_FIRST_LINE: 'getIndentFirstLine',
};

/**
 * A footnote section, the ancestor that marks an element as being in a footnote.
 * @return {Object} The fake section.
 */
function footnoteSection() {
  return { getType: () => ElementType.FOOTNOTE_SECTION, getParent: () => null };
}

/**
 * A body section, the ancestor of body-text paragraphs.
 * @return {Object} The fake section.
 */
function bodySection() {
  return { getType: () => ElementType.BODY_SECTION, getParent: () => null };
}

/**
 * A Text element.
 * @param {string} content The text.
 * @param {Object=} options
 * @param {Object=} options.attrs Attribute name → value for every character.
 * @param {Object<number, Object>=} options.at Character index → attributes that
 *     override options.attrs at that index.
 * @param {Object=} options.whole Attributes returned by the getters called
 *     without an index (the text as a whole).
 * @param {Array<number>=} options.runs Start indices of attribute runs.
 * @return {Object} The fake Text, with a `calls` array of setter calls.
 */
function text(content, options = {}) {
  const attrs = options.attrs || {};
  const at = options.at || {};
  const whole = options.whole || {};
  const calls = [];
  const element = {
    calls,
    getType: () => ElementType.TEXT,
    getParent: () => element.parent || null,
    asText: () => element,
    getText: () => content,
    getAttributes: () => {
      throw new Error('getAttributes() should not be called');
    },
    getTextAttributeIndices: () => options.runs || [0],
    setFontFamily: (value) => calls.push(['setFontFamily', value]),
    setFontSize: (value) => calls.push(['setFontSize', value]),
    setBackgroundColor: (value) => calls.push(['setBackgroundColor', value]),
    setForegroundColor: (start, end, value) => calls.push(['setForegroundColor', start, end, value]),
    setBold: (value) => calls.push(['setBold', value]),
    setItalic: (value) => calls.push(['setItalic', value]),
    setStrikethrough: (value) => calls.push(['setStrikethrough', value]),
    setUnderline: (start, end, value) => calls.push(['setUnderline', start, end, value]),
  };
  for (const [name, getter] of Object.entries(TEXT_GETTERS)) {
    element[getter] = (index) => {
      const source = index === undefined ? whole : Object.assign({}, attrs, at[index]);
      return name in source ? source[name] : null;
    };
  }
  return element;
}

/**
 * A Paragraph or ListItem.
 * @param {Object=} options
 * @param {boolean=} options.listItem True for a list item.
 * @param {Object=} options.parent The parent element (e.g. footnoteSection()).
 * @param {Object=} options.attrs Paragraph attribute name → value.
 * @param {?string=} options.heading What getHeading returns.
 * @param {Object=} options.text The paragraph's Text (from text()).
 * @return {Object} The fake paragraph, with a `calls` array of setter calls.
 */
function paragraph(options = {}) {
  const attrs = options.attrs || {};
  const calls = [];
  const ownText = options.text || text('');
  const type = options.listItem ? ElementType.LIST_ITEM : ElementType.PARAGRAPH;
  const element = {
    calls,
    getType: () => type,
    getParent: () => options.parent || null,
    asParagraph: () => element,
    asListItem: () => element,
    getHeading: () => (options.heading === undefined ? null : options.heading),
    editAsText: () => ownText,
    getAttributes: () => {
      throw new Error('getAttributes() should not be called');
    },
    setAttributes: (value) => calls.push(['setAttributes', Object.assign({}, value)]),
  };
  for (const [name, getter] of Object.entries(PARAGRAPH_GETTERS)) {
    element[getter] = () => (name in attrs ? attrs[name] : null);
  }
  ownText.parent = element;
  return element;
}

/**
 * A header section, the ancestor of header paragraphs.
 * @return {Object} The fake section.
 */
function headerSection() {
  return { getType: () => ElementType.HEADER_SECTION, getParent: () => null };
}

module.exports = { footnoteSection, bodySection, headerSection, text, paragraph };
