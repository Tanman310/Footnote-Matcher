/** @OnlyCurrentDoc */

/*
 * Footnote Matcher
 * Copyright (C) 2026 Marcus Miller
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License
 * for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

/**
 * Footnote Matcher
 * Copies the formatting at the cursor/selection and applies it to every
 * footnote in the document. Behavior is defined in docs/SPEC.md.
 */

/** Key under which the saved style is stored in document properties. */
const STYLE_KEY = 'footnoteStyle';

/** Character-level attributes that are copied. */
const TEXT_ATTRIBUTES = [
  'FONT_FAMILY',
  'FONT_SIZE',
  'FOREGROUND_COLOR',
  'BACKGROUND_COLOR',
  'BOLD',
  'ITALIC',
];

/** Paragraph-level attributes that are copied. */
const PARAGRAPH_ATTRIBUTES = [
  'LINE_SPACING',
  'SPACING_BEFORE',
  'SPACING_AFTER',
  'HORIZONTAL_ALIGNMENT',
  'INDENT_START',
  'INDENT_END',
  'INDENT_FIRST_LINE',
];

/** Key under which the matching settings are stored in document properties. */
const SETTINGS_KEY = 'footnoteSettings';

/** Note shown below Bold and Italic in the Settings dialog. */
const EMPHASIS_NOTE =
  'Bold and Italic change the whole footnote, including italic titles.';

/**
 * The on/off settings shown in the Settings dialog, in display order. Each
 * one controls a group of attributes. Groups are on by default unless
 * defaultOn is false (Bold and Italic, so emphasis survives a match).
 */
const SETTING_GROUPS = [
  { key: 'font', label: 'Font', section: 'Text', attributes: ['FONT_FAMILY'] },
  { key: 'size', label: 'Size', section: 'Text', attributes: ['FONT_SIZE'] },
  { key: 'textColor', label: 'Text color', section: 'Text', attributes: ['FOREGROUND_COLOR'] },
  { key: 'highlight', label: 'Highlight', section: 'Text', attributes: ['BACKGROUND_COLOR'] },
  { key: 'bold', label: 'Bold', section: 'Text', attributes: ['BOLD'], defaultOn: false },
  {
    key: 'italic',
    label: 'Italic',
    section: 'Text',
    attributes: ['ITALIC'],
    defaultOn: false,
    note: EMPHASIS_NOTE,
  },
  { key: 'lineSpacing', label: 'Line spacing', section: 'Paragraph', attributes: ['LINE_SPACING'] },
  {
    key: 'paragraphSpacing',
    label: 'Space before/after',
    section: 'Paragraph',
    attributes: ['SPACING_BEFORE', 'SPACING_AFTER'],
  },
  { key: 'alignment', label: 'Alignment', section: 'Paragraph', attributes: ['HORIZONTAL_ALIGNMENT'] },
  {
    key: 'indents',
    label: 'Indents',
    section: 'Paragraph',
    attributes: ['INDENT_START', 'INDENT_END', 'INDENT_FIRST_LINE'],
  },
];

const HOW_TO_SET_STYLE =
  'Format one footnote the way you like, click inside it, then choose ' +
  '"Match all footnotes to selection".';

/**
 * Runs when the add-on is installed.
 * @param {Object} e The install event.
 */
function onInstall(e) {
  onOpen(e);
}

/**
 * Builds the add-on menu. May run in AuthMode.NONE, so it only builds the menu.
 * @param {Object} e The open event.
 */
function onOpen(e) {
  DocumentApp.getUi()
    .createAddonMenu()
    .addItem('Match all footnotes to selection', 'matchFootnotesToSelection')
    .addItem('Re-apply footnote style', 'reapplyFootnoteStyle')
    .addSeparator()
    .addItem('Settings', 'showSettings')
    .addToUi();
}

/**
 * Menu item: opens the Settings dialog, where each group of attributes can be
 * turned on or off for this document.
 */
function showSettings() {
  runWithFriendlyErrors_(() => {
    const template = HtmlService.createTemplateFromFile('Settings');
    template.groups = SETTING_GROUPS;
    template.settings = loadSettings_();
    const output = template.evaluate().setWidth(340).setHeight(540);
    DocumentApp.getUi().showModalDialog(output, 'Footnote Matcher settings');
  });
}

/**
 * Saves the settings chosen in the Settings dialog. Called from the dialog
 * with google.script.run, so it has no trailing underscore.
 * @param {Object} settings Setting key → true (on) or false (off).
 */
function saveSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new Error('The settings could not be read. Please try again.');
  }
  const clean = {};
  for (const group of SETTING_GROUPS) {
    const value = settings[group.key];
    if (value === undefined) continue;
    if (typeof value !== 'boolean') {
      throw new Error('The settings could not be read. Please try again.');
    }
    clean[group.key] = value;
  }
  PropertiesService.getDocumentProperties().setProperty(SETTINGS_KEY, JSON.stringify(clean));
}

/**
 * Menu item: reads the formatting at the cursor/selection, saves it as this
 * document's footnote style, and applies it to every footnote.
 */
function matchFootnotesToSelection() {
  runWithFriendlyErrors_(() => {
    const ui = DocumentApp.getUi();
    const doc = DocumentApp.getActiveDocument();

    const source = findSource_(doc);
    if (!source) {
      ui.alert(
        'Nothing to match',
        'Click inside the footnote you want to copy (or select some of its text), then try again. ' +
          'Images and other non-text items can\'t be used as the source.',
        ui.ButtonSet.OK
      );
      return;
    }

    const style = readStyle_(source);
    if (Object.keys(style).length === 0) {
      ui.alert(
        'No formatting found',
        'The text at your cursor only uses the document\'s default formatting, so there is ' +
          'nothing to copy. Set the font, size, or spacing on that footnote first, then try again.',
        ui.ButtonSet.OK
      );
      return;
    }

    PropertiesService.getDocumentProperties().setProperty(STYLE_KEY, JSON.stringify(style));
    applyAndReport_(doc, style, 'The style was saved, so you can use "Re-apply footnote style" once you add footnotes.');
  });
}

/**
 * Menu item: applies the saved footnote style again, for footnotes added
 * since the last match.
 */
function reapplyFootnoteStyle() {
  runWithFriendlyErrors_(() => {
    const ui = DocumentApp.getUi();
    const doc = DocumentApp.getActiveDocument();

    const style = loadStyle_();
    if (!style || Object.keys(style).length === 0) {
      ui.alert('No footnote style saved yet', HOW_TO_SET_STYLE, ui.ButtonSet.OK);
      return;
    }

    applyAndReport_(doc, style, '');
  });
}

/**
 * Runs a menu action and shows a short alert instead of a stack trace if it fails.
 * @param {function(): void} action The work to do.
 */
function runWithFriendlyErrors_(action) {
  try {
    action();
  } catch (err) {
    console.error(err);
    const ui = DocumentApp.getUi();
    ui.alert(
      'Footnote Matcher ran into a problem',
      'Some footnotes may already have been updated. You can run the command again, or use Edit → Undo to revert.\n\nDetails: ' + (err && err.message ? err.message : err),
      ui.ButtonSet.OK
    );
  }
}

/**
 * Finds where to read formatting from: the start of the selection if there is
 * one, otherwise the cursor.
 * @param {DocumentApp.Document} doc The active document.
 * @return {?{paragraph: DocumentApp.Element, text: ?DocumentApp.Text, offset: ?number}}
 *     The source paragraph, its text (if any) and the character offset, or
 *     null if there is no usable cursor or selection.
 */
function findSource_(doc) {
  const selection = doc.getSelection();
  const rangeElements = selection ? selection.getRangeElements() : [];
  if (rangeElements.length > 0) {
    // Use the first selected piece that holds text. Images, lines, etc. are
    // skipped, so selecting only an image counts as "nothing to match".
    for (const rangeElement of rangeElements) {
      const offset = rangeElement.isPartial() ? rangeElement.getStartOffset() : null;
      const source = sourceFromElement_(rangeElement.getElement(), offset);
      if (source) return source;
    }
    return null;
  }

  const cursor = doc.getCursor();
  if (!cursor) return null;
  const element = cursor.getElement();
  if (!element) return null;
  if (element.getType() === DocumentApp.ElementType.TEXT) {
    // Like the Docs toolbar, read the character just before the cursor.
    const offset = cursor.getOffset();
    return sourceFromElement_(element, offset > 0 ? offset - 1 : null);
  }
  // Cursor in an empty paragraph, or next to a non-text element.
  return sourceFromElement_(element, null);
}

/**
 * Builds a source from one element: a piece of text, a paragraph/list item,
 * or a container such as a table cell (its first paragraph is used).
 * @param {DocumentApp.Element} element The element.
 * @param {?number} offset Character to read, or null for "first visible character".
 * @return {?{paragraph: DocumentApp.Element, text: ?DocumentApp.Text, offset: ?number}}
 *     The source, or null if the element holds no text (e.g. an image).
 */
function sourceFromElement_(element, offset) {
  if (!element) return null;
  const type = element.getType();

  if (type === DocumentApp.ElementType.TEXT) {
    const paragraph = findParagraph_(element);
    return paragraph ? { paragraph: paragraph, text: element.asText(), offset: offset } : null;
  }

  let paragraph = null;
  if (isParagraphLike_(element)) {
    paragraph = findParagraph_(element);
  } else if (
    type === DocumentApp.ElementType.TABLE ||
    type === DocumentApp.ElementType.TABLE_ROW ||
    type === DocumentApp.ElementType.TABLE_CELL
  ) {
    const found =
      element.findElement(DocumentApp.ElementType.PARAGRAPH) ||
      element.findElement(DocumentApp.ElementType.LIST_ITEM);
    if (found) paragraph = findParagraph_(found.getElement());
  }
  if (!paragraph) return null; // an image, horizontal rule, etc.

  const text = paragraph.editAsText();
  return { paragraph: paragraph, text: text.getText().length > 0 ? text : null, offset: null };
}

/**
 * Picks which character to read formatting from. A given offset is used as
 * is; otherwise the first non-space character, since the formatting of
 * spaces is invisible and often left over from older edits or Word imports.
 * @param {string} content The text.
 * @param {?number} offset The requested character, or null.
 * @return {number} A valid index into content (content must not be empty).
 */
function pickIndex_(content, offset) {
  const last = content.length - 1;
  if (offset !== null && offset !== undefined) return Math.min(Math.max(offset, 0), last);
  const firstVisible = content.search(/\S/);
  return firstVisible === -1 ? 0 : firstVisible;
}

/**
 * Tells whether an element is a paragraph or a list item.
 * @param {DocumentApp.Element} element The element to check.
 * @return {boolean} True for paragraphs and list items.
 */
function isParagraphLike_(element) {
  const type = element.getType();
  return type === DocumentApp.ElementType.PARAGRAPH || type === DocumentApp.ElementType.LIST_ITEM;
}

/**
 * Walks up from an element to the paragraph or list item that contains it.
 * @param {DocumentApp.Element} element The starting element.
 * @return {?DocumentApp.Element} The paragraph/list item, or null if none.
 */
function findParagraph_(element) {
  let current = element;
  while (current) {
    if (isParagraphLike_(current)) {
      return current.getType() === DocumentApp.ElementType.LIST_ITEM
        ? current.asListItem()
        : current.asParagraph();
    }
    current = current.getParent();
  }
  return null;
}

/**
 * Reads the copyable attributes from the source. Unset values come from the
 * paragraph's named style; anything still unknown is skipped, except indents,
 * which count as 0. The result is plain JSON-safe data.
 * @param {{paragraph: DocumentApp.Element, text: ?DocumentApp.Text, offset: ?number}} source
 *     Where to read from.
 * @return {Object} Attribute name → value, e.g. {FONT_SIZE: 9, HORIZONTAL_ALIGNMENT: 'JUSTIFY'}.
 */
function readStyle_(source) {
  const paragraphAttrs = source.paragraph.getAttributes() || {};

  // An empty paragraph has no text, so fall back to the paragraph's own attributes.
  let textAttrs = paragraphAttrs;
  let fromCharacter = false;
  if (source.text) {
    const content = source.text.getText();
    if (content.length > 0) {
      textAttrs = source.text.getAttributes(pickIndex_(content, source.offset)) || {};
      fromCharacter = true;
    }
  }

  // A blank attribute means "inherited from the paragraph's named style"
  // (e.g. Normal text). Look up that inherited value so what you see is what
  // gets copied.
  const inherited = inheritedAttributes_(source.paragraph);
  const style = {};
  for (const name of TEXT_ATTRIBUTES) {
    // A link's color is link styling, not the footnote's text color.
    if (name === 'FOREGROUND_COLOR' && fromCharacter && textAttrs.LINK_URL) continue;
    let value = textAttrs[name];
    if (value === null || value === undefined) value = inherited[name];
    if (value !== null && value !== undefined) style[name] = value;
  }
  // A single character with no highlight really means "no highlight" (it
  // can't be mixed), so save that explicitly; applying it clears highlights.
  if (fromCharacter && !('BACKGROUND_COLOR' in style)) style.BACKGROUND_COLOR = null;
  // Likewise, a single character that isn't bold or italic is plain.
  if (fromCharacter && !('BOLD' in style)) style.BOLD = false;
  if (fromCharacter && !('ITALIC' in style)) style.ITALIC = false;
  for (const name of PARAGRAPH_ATTRIBUTES) {
    let value = paragraphAttrs[name];
    if (value === null || value === undefined) value = inherited[name];
    // An indent that is set nowhere is no indent, so copy it as 0. This lets
    // "no indent" on the source remove indents from the other footnotes.
    if ((value === null || value === undefined) && name.startsWith('INDENT_')) value = 0;
    if (value === null || value === undefined) continue;
    // The alignment is an enum; store its name so it survives JSON.
    style[name] = name === 'HORIZONTAL_ALIGNMENT' ? String(value).toUpperCase() : value;
  }
  return style;
}

/**
 * Returns the text and paragraph attributes a paragraph inherits from its
 * named style (Normal text, Heading 1, ...), as set in the document's styles.
 * @param {DocumentApp.Paragraph|DocumentApp.ListItem} paragraph The paragraph.
 * @return {Object} Attribute name → value; empty if it can't be determined.
 */
function inheritedAttributes_(paragraph) {
  try {
    const heading = paragraph.getHeading() || DocumentApp.ParagraphHeading.NORMAL;
    return DocumentApp.getActiveDocument().getBody().getHeadingAttributes(heading) || {};
  } catch (err) {
    console.error(err);
    return {};
  }
}

/**
 * Loads the saved style from document properties.
 * @return {?Object} The saved style, or null if none is saved or it can't be read.
 */
function loadStyle_() {
  const raw = PropertiesService.getDocumentProperties().getProperty(STYLE_KEY);
  if (!raw) return null;
  try {
    const style = JSON.parse(raw);
    return style && typeof style === 'object' ? style : null;
  } catch (err) {
    return null;
  }
}

/**
 * Loads this document's settings, filling in "on" for any that were never set.
 * @return {Object} Every setting key → true (on) or false (off).
 */
function loadSettings_() {
  let saved = {};
  const raw = PropertiesService.getDocumentProperties().getProperty(SETTINGS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') saved = parsed;
    } catch (err) {
      // Unreadable settings: fall back to the defaults.
    }
  }
  const settings = {};
  for (const group of SETTING_GROUPS) {
    const value = saved[group.key];
    settings[group.key] = typeof value === 'boolean' ? value : group.defaultOn !== false;
  }
  return settings;
}

/**
 * Returns a copy of a style without the attributes whose setting is off.
 * Removing the key (not setting it to null) means those attributes are
 * neither applied nor cleared, so footnotes keep their own values.
 * @param {Object} style The full saved style.
 * @param {Object} settings Setting key → true (on) or false (off).
 * @return {Object} The style to apply.
 */
function filterStyle_(style, settings) {
  const filtered = Object.assign({}, style);
  for (const group of SETTING_GROUPS) {
    if (settings[group.key]) continue;
    for (const name of group.attributes) delete filtered[name];
  }
  return filtered;
}

/**
 * Applies a style to every footnote, leaving out attributes whose setting is
 * off, and tells the user if there were no footnotes, if every setting is
 * off, or if some footnotes could not be changed.
 * @param {DocumentApp.Document} doc The active document.
 * @param {Object} style The style to apply.
 * @param {string} noFootnotesNote Extra sentence for the "no footnotes" alert.
 */
function applyAndReport_(doc, style, noFootnotesNote) {
  const ui = DocumentApp.getUi();
  const settings = loadSettings_();
  if (!SETTING_GROUPS.some((group) => settings[group.key])) {
    ui.alert(
      'All settings are turned off',
      'There is nothing to apply. Turn some on in Extensions → Footnote Matcher → Settings.',
      ui.ButtonSet.OK
    );
    return;
  }
  const result = applyStyleToFootnotes_(doc, filterStyle_(style, settings));

  if (result.footnotes === 0) {
    ui.alert(
      'No footnotes found',
      ('This document doesn\'t have any footnotes yet. ' + noFootnotesNote).trim(),
      ui.ButtonSet.OK
    );
    return;
  }
  if (result.failed > 0) {
    ui.alert(
      'Some footnotes were skipped',
      `${result.failed} footnote paragraph(s) could not be fully updated. The rest were changed.`,
      ui.ButtonSet.OK
    );
  }
}

/**
 * Applies a style to every paragraph (and list item) of every footnote.
 * Underline, strikethrough, links and headings are never touched; bold and
 * italic only when their settings are on.
 * @param {DocumentApp.Document} doc The active document.
 * @param {Object} style The style to apply.
 * @return {{footnotes: number, failed: number}} How many footnotes were found
 *     and how many paragraphs could not be fully updated.
 */
function applyStyleToFootnotes_(doc, style) {
  const footnotes = allFootnotes_(doc);
  let failed = 0;

  for (const footnote of footnotes) {
    const contents = footnote.getFootnoteContents();
    if (!contents) continue; // e.g. a footnote that only exists as a suggestion
    for (const paragraph of contents.getParagraphs()) {
      try {
        applyStyleToParagraph_(paragraph, style);
      } catch (err) {
        console.error(err);
        failed++;
      }
    }
  }
  return { footnotes: footnotes.length, failed: failed };
}

/**
 * Applies a style to one paragraph or list item using the specific setters,
 * so that nothing outside the style is changed.
 * @param {DocumentApp.Paragraph|DocumentApp.ListItem} paragraph The target.
 * @param {Object} style The style to apply.
 */
function applyStyleToParagraph_(paragraph, style) {
  const has = (name) => style[name] !== null && style[name] !== undefined;

  // Paragraph settings go in one call so the three indents are set together.
  // Only the keys listed here are touched; links, underline etc. are left alone.
  const paragraphAttrs = {};
  for (const name of PARAGRAPH_ATTRIBUTES) {
    if (!has(name)) continue;
    if (name === 'HORIZONTAL_ALIGNMENT') {
      const alignment = DocumentApp.HorizontalAlignment[String(style[name]).toUpperCase()];
      if (alignment) paragraphAttrs[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = alignment;
    } else {
      paragraphAttrs[DocumentApp.Attribute[name]] = Number(style[name]);
    }
  }
  if (Object.keys(paragraphAttrs).length > 0) paragraph.setAttributes(paragraphAttrs);

  const text = paragraph.editAsText();
  if (text.getText().length === 0) return; // nothing to color or resize
  if (has('FONT_FAMILY')) text.setFontFamily(String(style.FONT_FAMILY));
  if (has('FONT_SIZE')) text.setFontSize(Number(style.FONT_SIZE));
  if (has('FOREGROUND_COLOR')) setColorExceptLinks_(text, String(style.FOREGROUND_COLOR));
  if (has('BACKGROUND_COLOR')) {
    text.setBackgroundColor(String(style.BACKGROUND_COLOR));
  } else if ('BACKGROUND_COLOR' in style) {
    text.setBackgroundColor(null); // source had no highlight: remove highlights
  }
  // Present only when the Bold/Italic settings are on (off by default).
  if (has('BOLD')) text.setBold(Boolean(style.BOLD));
  if (has('ITALIC')) text.setItalic(Boolean(style.ITALIC));
}

/**
 * Sets the text color of a paragraph's text, skipping linked text so links
 * keep their own color (usually blue).
 * @param {DocumentApp.Text} text The paragraph's text.
 * @param {string} color The color, e.g. '#000000'.
 */
function setColorExceptLinks_(text, color) {
  const length = text.getText().length;
  const starts = text.getTextAttributeIndices();
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = (i + 1 < starts.length ? starts[i + 1] : length) - 1;
    if (end < start) continue;
    if (!text.getLinkUrl(start)) text.setForegroundColor(start, end, color);
  }
}

/**
 * Collects the footnotes from every tab of the document, including nested
 * tabs. Document.getFootnotes() alone only covers the tab you are in.
 * @param {DocumentApp.Document} doc The active document.
 * @return {DocumentApp.Footnote[]} All footnotes, tab by tab.
 */
function allFootnotes_(doc) {
  if (typeof doc.getTabs !== 'function') return doc.getFootnotes() || [];
  const footnotes = [];
  const visit = (tabs) => {
    for (const tab of tabs) {
      if (tab.getType() === DocumentApp.TabType.DOCUMENT_TAB) {
        footnotes.push(...(tab.asDocumentTab().getFootnotes() || []));
      }
      visit(tab.getChildTabs());
    }
  };
  visit(doc.getTabs());
  return footnotes;
}
