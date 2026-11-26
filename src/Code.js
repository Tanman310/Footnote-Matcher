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

/**
 * Key under which the last match (the style used by Re-apply) is stored in
 * document properties.
 */
const STYLE_KEY = 'footnoteStyle';

/**
 * Key under which the saved style (stored by "Save selection as saved style"
 * and used by "Apply saved style") is stored in document properties.
 */
const SAVED_STYLE_KEY = 'footnoteSavedStyle';

/** Key under which the matching settings are stored in document properties. */
const SETTINGS_KEY = 'footnoteSettings';

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

/**
 * The Text getter that reads each text attribute. getAttributes() is not
 * used because in documents imported from Word it can return null for
 * formatting that is set (and shown in the toolbar); these getters don't.
 * LINK_URL is read only to tell whether the source character is a link.
 */
const TEXT_GETTERS = {
  FONT_FAMILY: 'getFontFamily',
  FONT_SIZE: 'getFontSize',
  FOREGROUND_COLOR: 'getForegroundColor',
  BACKGROUND_COLOR: 'getBackgroundColor',
  BOLD: 'isBold',
  ITALIC: 'isItalic',
  LINK_URL: 'getLinkUrl',
};

/** The Paragraph/ListItem getter that reads each paragraph attribute. */
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
 * Attributes that are cleared rather than filled in from the named style
 * when a footnote source leaves them unset. Google Docs displays footnotes at
 * its own default size and spacing, not Normal text's, and Normal text's
 * color is often an explicit black that the footnote doesn't have. The
 * unset value is saved as null, and applying the null clears the attribute,
 * so the footnotes go back to the default, like the source.
 */
const NOT_INHERITED_IN_FOOTNOTES = [
  'FONT_SIZE',
  'FOREGROUND_COLOR',
  'LINE_SPACING',
  'SPACING_BEFORE',
  'SPACING_AFTER',
];

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

/**
 * Settings that aren't attribute groups, shown in their own section of the
 * Settings dialog. They are stored in footnoteSettings with the groups.
 */
const OPTION_SETTINGS = [
  {
    key: 'allowBodyText',
    label: 'Allow matching from body text',
    defaultOn: false,
    note: 'When off, Match only copies formatting from inside a footnote.',
  },
];

/** Every setting stored in footnoteSettings: the attribute groups and the options. */
const ALL_SETTINGS = SETTING_GROUPS.concat(OPTION_SETTINGS);

/** Tells the user how to match footnotes; shown by Re-apply when there is no last match. */
const HOW_TO_SET_STYLE =
  'Format one footnote the way you like, click inside it, then choose ' +
  '"Match all footnotes to selection".';

/** Tells the user how to save a style; shown by Apply saved style when none is saved. */
const HOW_TO_SAVE_STYLE =
  'Format one footnote the way you like, click inside it, then choose ' +
  '"Save selection as saved style".';

/** Shown when Match is run from body text while matching from body text is off. */
const HOW_TO_MATCH_FROM_FOOTNOTE =
  'Footnote Matcher copies formatting from a footnote. Click inside the footnote you want to ' +
  'copy (or select some of its text), then try again.\n\nTo copy formatting from body text ' +
  'instead, turn on "Allow matching from body text" in Extensions → Footnote Matcher → Settings.';

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
    .addItem('Save selection as saved style', 'saveSelectionAsSavedStyle')
    .addItem('Apply saved style', 'applySavedStyle')
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
    template.options = OPTION_SETTINGS;
    template.settings = loadSettings_();
    const output = template.evaluate().setWidth(340).setHeight(620);
    DocumentApp.getUi().showModalDialog(output, 'Footnote Matcher settings');
  }, false);
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
  for (const group of ALL_SETTINGS) {
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
 * Menu item: reads the formatting at the cursor/selection, stores it as the
 * last match, and applies it to every footnote.
 */
function matchFootnotesToSelection() {
  runWithFriendlyErrors_(() => {
    const doc = DocumentApp.getActiveDocument();
    const style = readStyleAtSelection_(doc, 'Nothing to match');
    if (!style) return;
    PropertiesService.getDocumentProperties().setProperty(STYLE_KEY, JSON.stringify(style));
    applyAndReport_(doc, style, 'The style was saved, so you can use "Re-apply footnote style" once you add footnotes.');
  });
}

/**
 * Menu item: applies the last match again, for footnotes added since then.
 */
function reapplyFootnoteStyle() {
  runWithFriendlyErrors_(() => {
    applyStoredStyle_(STYLE_KEY, 'No footnote style saved yet', HOW_TO_SET_STYLE);
  });
}

/**
 * Menu item: reads the formatting at the cursor/selection and stores it as
 * the saved style. Changes no footnotes and leaves the last match alone.
 */
function saveSelectionAsSavedStyle() {
  runWithFriendlyErrors_(() => {
    const ui = DocumentApp.getUi();
    const style = readStyleAtSelection_(DocumentApp.getActiveDocument(), 'Nothing to save');
    if (!style) return;
    PropertiesService.getDocumentProperties().setProperty(SAVED_STYLE_KEY, JSON.stringify(style));
    ui.alert(
      'Style saved',
      'Choose "Apply saved style" to apply it to every footnote. No footnotes were changed.',
      ui.ButtonSet.OK
    );
  }, false);
}

/**
 * Menu item: applies the saved style to every footnote. Leaves the last
 * match alone, so Re-apply still uses it.
 */
function applySavedStyle() {
  runWithFriendlyErrors_(() => {
    applyStoredStyle_(SAVED_STYLE_KEY, 'No saved style yet', HOW_TO_SAVE_STYLE);
  });
}

/**
 * Reads the style at the cursor/selection for Match or Save, showing an alert
 * and returning null if there is no usable source or it is in body text while
 * matching from body text is off.
 * @param {DocumentApp.Document} doc The active document.
 * @param {string} nothingTitle Title of the alert shown when there is no source.
 * @return {?Object} The style, or null if an alert was shown instead.
 */
function readStyleAtSelection_(doc, nothingTitle) {
  const ui = DocumentApp.getUi();
  const source = findSource_(doc);
  if (!source) {
    ui.alert(
      nothingTitle,
      'Click inside the footnote you want to copy (or select some of its text), then try again. ' +
        'Images and other non-text items can\'t be used as the source.',
      ui.ButtonSet.OK
    );
    return null;
  }
  if (!isAllowedSource_(source, loadSettings_())) {
    ui.alert('Click inside a footnote', HOW_TO_MATCH_FROM_FOOTNOTE, ui.ButtonSet.OK);
    return null;
  }
  // Never empty: indents always count as 0 when unset.
  return readStyle_(source);
}

/**
 * Applies a style stored in document properties to every footnote, or shows
 * an alert if none is stored.
 * @param {string} key The property key (STYLE_KEY or SAVED_STYLE_KEY).
 * @param {string} missingTitle Title of the alert shown when nothing is stored.
 * @param {string} missingMessage Message of that alert, saying how to store one.
 */
function applyStoredStyle_(key, missingTitle, missingMessage) {
  const ui = DocumentApp.getUi();
  const style = loadStyle_(key);
  if (!style || Object.keys(style).length === 0) {
    ui.alert(missingTitle, missingMessage, ui.ButtonSet.OK);
    return;
  }
  applyAndReport_(DocumentApp.getActiveDocument(), style, '');
}

/**
 * Runs a menu action and shows a short alert instead of a stack trace if it fails.
 * @param {function(): void} action The work to do.
 * @param {boolean=} changesFootnotes Whether the action edits footnotes, so a
 *     failure may leave some of them changed. Defaults to true.
 */
function runWithFriendlyErrors_(action, changesFootnotes = true) {
  try {
    action();
  } catch (err) {
    console.error(err);
    const ui = DocumentApp.getUi();
    const advice = changesFootnotes
      ? 'Some footnotes may already have been updated. You can run the command again, or use Edit → Undo to revert.'
      : 'Please try again.';
    ui.alert(
      'Footnote Matcher ran into a problem',
      advice + '\n\nDetails: ' + (err && err.message ? err.message : err),
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
    // Like the Docs toolbar, read the character just before the cursor, but
    // skip spaces, whose formatting is invisible.
    const content = element.asText().getText();
    return sourceFromElement_(element, visibleIndexNear_(content, cursor.getOffset()));
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
 * Finds the visible (non-space) character closest to a cursor position:
 * the nearest one before it, otherwise the nearest one after it.
 * @param {string} content The text the cursor is in.
 * @param {number} cursorOffset The cursor position (0 = before the first character).
 * @return {?number} The character's index, or null if the text is all spaces.
 */
function visibleIndexNear_(content, cursorOffset) {
  for (let i = Math.min(cursorOffset, content.length) - 1; i >= 0; i--) {
    if (/\S/.test(content[i])) return i;
  }
  for (let i = Math.max(cursorOffset, 0); i < content.length; i++) {
    if (/\S/.test(content[i])) return i;
  }
  return null;
}

/**
 * Tells whether formatting may be read from a source: always from a
 * footnote, and from body text only when the allowBodyText setting is on.
 * Headers and footers are never used.
 * @param {{paragraph: DocumentApp.Element}} source The source found by findSource_.
 * @param {Object} settings Setting key → true (on) or false (off).
 * @return {boolean} True if the source may be used.
 */
function isAllowedSource_(source, settings) {
  if (isInFootnote_(source.paragraph)) return true;
  return Boolean(settings.allowBodyText) && isInBody_(source.paragraph);
}

/**
 * Tells whether an element is inside a footnote.
 * @param {DocumentApp.Element} element The element to check.
 * @return {boolean} True if one of its ancestors is a footnote section.
 */
function isInFootnote_(element) {
  return hasAncestorOfType_(element, DocumentApp.ElementType.FOOTNOTE_SECTION);
}

/**
 * Tells whether an element is in the document body (not a header, footer
 * or footnote).
 * @param {DocumentApp.Element} element The element to check.
 * @return {boolean} True if one of its ancestors is a body section.
 */
function isInBody_(element) {
  return hasAncestorOfType_(element, DocumentApp.ElementType.BODY_SECTION);
}

/**
 * Tells whether an element, or one of its ancestors, has a given type.
 * @param {DocumentApp.Element} element The element to check.
 * @param {DocumentApp.ElementType} type The type to look for.
 * @return {boolean} True if found.
 */
function hasAncestorOfType_(element, type) {
  let current = element;
  while (current) {
    if (current.getType() === type) return true;
    current = current.getParent();
  }
  return false;
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
 * paragraph's named style, except that for a footnote source the attributes
 * in NOT_INHERITED_IN_FOOTNOTES are saved as null (applying null clears
 * them). Anything still unknown is skipped, except indents, which count as 0.
 * The result is plain JSON-safe data.
 * @param {{paragraph: DocumentApp.Element, text: ?DocumentApp.Text, offset: ?number}} source
 *     Where to read from.
 * @return {Object} Attribute name → value, e.g. {FONT_SIZE: 9, HORIZONTAL_ALIGNMENT: 'JUSTIFY'}.
 */
function readStyle_(source) {
  const paragraphAttrs = readParagraphAttributes_(source.paragraph);

  let textAttrs = null;
  let fromCharacter = false;
  if (source.text) {
    const content = source.text.getText();
    if (content.length > 0) {
      textAttrs = readTextAttributes_(source.text, pickIndex_(content, source.offset));
      fromCharacter = true;
    }
  }
  if (!textAttrs) {
    // An empty paragraph has no character to read, so read whatever text
    // formatting the paragraph itself carries.
    try {
      textAttrs = readTextAttributes_(source.paragraph.editAsText(), null);
    } catch (err) {
      console.error(err);
      textAttrs = {};
    }
  }

  // A blank attribute means "inherited from the paragraph's named style"
  // (e.g. Normal text). Look up that inherited value so what you see is what
  // gets copied.
  const inherited = inheritedAttributes_(source.paragraph);
  const inFootnote = isInFootnote_(source.paragraph);
  const inheritedValue = (name) =>
    inFootnote && NOT_INHERITED_IN_FOOTNOTES.includes(name) ? null : inherited[name];
  const sourceIsLink = fromCharacter && Boolean(textAttrs.LINK_URL);
  const style = {};
  for (const name of TEXT_ATTRIBUTES) {
    // A link's color is link styling, not the footnote's text color.
    if (name === 'FOREGROUND_COLOR' && sourceIsLink) continue;
    let value = textAttrs[name];
    if (value === null || value === undefined) value = inheritedValue(name);
    if (value !== null && value !== undefined) style[name] = value;
  }
  // A single character with no highlight really means "no highlight" (it
  // can't be mixed), so save that explicitly; applying it clears highlights.
  if (fromCharacter && !('BACKGROUND_COLOR' in style)) style.BACKGROUND_COLOR = null;
  // Likewise, a character with no color set uses the default color; applying
  // it resets colored text (except links) to the default.
  if (fromCharacter && !sourceIsLink && !('FOREGROUND_COLOR' in style)) {
    style.FOREGROUND_COLOR = null;
  }
  // Likewise, a single character that isn't bold or italic is plain.
  if (fromCharacter && !('BOLD' in style)) style.BOLD = false;
  if (fromCharacter && !('ITALIC' in style)) style.ITALIC = false;
  // A footnote character with no size set shows the footnote default size;
  // saving null makes applying it clear sizes on the other footnotes.
  if (fromCharacter && inFootnote && !('FONT_SIZE' in style)) style.FONT_SIZE = null;
  for (const name of PARAGRAPH_ATTRIBUTES) {
    let value = paragraphAttrs[name];
    // Likewise, unset spacing on a footnote source is saved as null, so
    // applying it resets the other footnotes' spacing to the default.
    if ((value === null || value === undefined) && inFootnote && NOT_INHERITED_IN_FOOTNOTES.includes(name)) {
      style[name] = null;
      continue;
    }
    if (value === null || value === undefined) value = inheritedValue(name);
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
 * Reads the text attributes in TEXT_GETTERS with their specific getters.
 * @param {DocumentApp.Text} text The text to read.
 * @param {?number} index The character to read, or null to read the text as a
 *     whole (used for an empty paragraph).
 * @return {Object} Attribute name → value; null where the attribute is unset.
 */
function readTextAttributes_(text, index) {
  const attrs = {};
  for (const [name, getter] of Object.entries(TEXT_GETTERS)) {
    const value = index === null ? text[getter]() : text[getter](index);
    attrs[name] = value === undefined ? null : value;
  }
  return attrs;
}

/**
 * Reads the paragraph attributes in PARAGRAPH_GETTERS with their specific getters.
 * @param {DocumentApp.Paragraph|DocumentApp.ListItem} paragraph The paragraph to read.
 * @return {Object} Attribute name → value; null where the attribute is unset.
 */
function readParagraphAttributes_(paragraph) {
  const attrs = {};
  for (const [name, getter] of Object.entries(PARAGRAPH_GETTERS)) {
    const value = paragraph[getter]();
    attrs[name] = value === undefined ? null : value;
  }
  return attrs;
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
 * Like inheritedAttributes_, but looks each named style up only once.
 * @param {DocumentApp.Paragraph|DocumentApp.ListItem} paragraph The paragraph.
 * @param {Object} cache Named style → inherited attributes, filled in as needed.
 * @return {Object} Attribute name → value; empty if it can't be determined.
 */
function cachedInheritedAttributes_(paragraph, cache) {
  let heading;
  try {
    heading = String(paragraph.getHeading() || DocumentApp.ParagraphHeading.NORMAL);
  } catch (err) {
    heading = 'NORMAL';
  }
  if (!(heading in cache)) cache[heading] = inheritedAttributes_(paragraph);
  return cache[heading];
}

/**
 * Loads a stored style from document properties.
 * @param {string} key The property key (STYLE_KEY or SAVED_STYLE_KEY).
 * @return {?Object} The style, or null if none is stored or it can't be read.
 */
function loadStyle_(key) {
  const raw = PropertiesService.getDocumentProperties().getProperty(key);
  if (!raw) return null;
  try {
    const style = JSON.parse(raw);
    return style && typeof style === 'object' ? style : null;
  } catch (err) {
    return null;
  }
}

/**
 * Loads this document's settings, filling in each setting's default (on,
 * except Bold, Italic and Allow matching from body text) for any that were
 * never set.
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
  for (const group of ALL_SETTINGS) {
    const value = saved[group.key];
    settings[group.key] = typeof value === 'boolean' ? value : group.defaultOn !== false;
  }
  return settings;
}

/**
 * Returns a copy of a style without the attributes whose setting is off.
 * Removing the key (not setting it to null) means those attributes are
 * neither applied nor cleared, so footnotes keep their own values.
 * @param {Object} style The full stored style.
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
 * off, if the footnotes already matched, or if some footnotes could not be
 * changed.
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
    return;
  }
  if (result.changed === 0) {
    // Footnotes without contents can't be read or changed, so don't claim
    // they match. (Suggested footnotes are usually not returned at all.)
    const message =
      result.suggested > 0
        ? `The other footnotes already have this formatting, so nothing was changed. ${result.suggested} ` +
          'suggested footnote(s) were skipped; accept the suggestion to include them.'
        : 'Every footnote already has this formatting, so nothing was changed.';
    ui.alert('Footnotes already match', message, ui.ButtonSet.OK);
  }
}

/**
 * Applies a style to every paragraph (and list item) of every footnote.
 * Underline, strikethrough, links and headings are never touched; bold and
 * italic only when their settings are on.
 * @param {DocumentApp.Document} doc The active document.
 * @param {Object} style The style to apply.
 * @return {{footnotes: number, suggested: number, changed: number, failed: number}}
 *     How many footnotes were found, how many were skipped because they only
 *     exist as suggestions, how many paragraphs were changed, and how many
 *     could not be fully updated.
 */
function applyStyleToFootnotes_(doc, style) {
  const footnotes = allFootnotes_(doc);
  const inheritedCache = {};
  let suggested = 0;
  let changed = 0;
  let failed = 0;

  for (const footnote of footnotes) {
    const contents = footnote.getFootnoteContents();
    if (!contents) {
      suggested++; // e.g. a suggested footnote, if getFootnotes() returns one
      continue;
    }
    for (const paragraph of contents.getParagraphs()) {
      try {
        if (applyStyleToParagraph_(paragraph, style, inheritedCache)) changed++;
      } catch (err) {
        console.error(err);
        failed++;
      }
    }
  }
  return { footnotes: footnotes.length, suggested: suggested, changed: changed, failed: failed };
}

/**
 * Applies a style to one paragraph or list item using the specific setters,
 * so that nothing outside the style is changed. Each attribute is compared
 * with the paragraph's current value first, and only the ones that differ
 * are set.
 * @param {DocumentApp.Paragraph|DocumentApp.ListItem} paragraph The target.
 * @param {Object} style The style to apply.
 * @param {Object=} inheritedCache Named style → inherited attributes, shared
 *     between paragraphs so each named style is looked up once.
 * @return {boolean} True if anything was changed.
 */
function applyStyleToParagraph_(paragraph, style, inheritedCache = {}) {
  // A list item's start and first-line indents set its nesting level and
  // bullet position, so they are left as they are.
  const isListItem = paragraph.getType() === DocumentApp.ElementType.LIST_ITEM;
  const keepOnListItems = ['INDENT_START', 'INDENT_FIRST_LINE'];

  // Paragraph settings go in one call so the three indents are set together.
  // Only the keys listed here are touched; links, underline etc. are left alone.
  const paragraphAttrs = {};
  for (const name of PARAGRAPH_ATTRIBUTES) {
    if (isListItem && keepOnListItems.includes(name)) continue;
    const wanted = style[name];
    // A saved null (unset spacing on a footnote source) clears the spacing;
    // other nulls, and attributes not in the style, are skipped.
    if (wanted === undefined || (wanted === null && !NOT_INHERITED_IN_FOOTNOTES.includes(name))) continue;
    let current = paragraph[PARAGRAPH_GETTERS[name]]();
    // An unset indent shows the named style's indent, or none, as when
    // reading the source.
    if ((current === null || current === undefined) && name.startsWith('INDENT_')) {
      const inherited = cachedInheritedAttributes_(paragraph, inheritedCache)[name];
      current = inherited === null || inherited === undefined ? 0 : inherited;
    }
    if (sameValue_(current, wanted)) continue;
    if (wanted === null) {
      paragraphAttrs[DocumentApp.Attribute[name]] = null;
    } else if (name === 'HORIZONTAL_ALIGNMENT') {
      const alignment = DocumentApp.HorizontalAlignment[String(wanted).toUpperCase()];
      if (alignment) paragraphAttrs[DocumentApp.Attribute.HORIZONTAL_ALIGNMENT] = alignment;
    } else {
      paragraphAttrs[DocumentApp.Attribute[name]] = Number(wanted);
    }
  }
  let changed = false;
  if (Object.keys(paragraphAttrs).length > 0) {
    paragraph.setAttributes(paragraphAttrs);
    changed = true;
  }

  const text = paragraph.editAsText();
  if (text.getText().length === 0) return changed; // nothing to color or resize
  const runs = textRuns_(text);

  // How each text attribute is set on the whole paragraph text. A null
  // (unset on the source) clears FONT_SIZE, FOREGROUND_COLOR and
  // BACKGROUND_COLOR; other nulls are skipped. BOLD and ITALIC are present
  // only when their settings are on (off by default).
  const setters = {
    FONT_FAMILY: (value) => text.setFontFamily(String(value)),
    FONT_SIZE: (value) => text.setFontSize(value === null ? null : Number(value)),
    FOREGROUND_COLOR: null, // set run by run, see setColorExceptLinks_
    BACKGROUND_COLOR: (value) => text.setBackgroundColor(value === null ? null : String(value)),
    BOLD: (value) => text.setBold(Boolean(value)),
    ITALIC: (value) => text.setItalic(Boolean(value)),
  };
  const clearable = ['FONT_SIZE', 'FOREGROUND_COLOR', 'BACKGROUND_COLOR'];
  for (const [name, set] of Object.entries(setters)) {
    const wanted = style[name];
    if (wanted === undefined || (wanted === null && !clearable.includes(name))) continue;
    if (name === 'FOREGROUND_COLOR') {
      if (setColorExceptLinks_(text, runs, wanted === null ? null : String(wanted))) changed = true;
      continue;
    }
    const getter = TEXT_GETTERS[name];
    if (runs.every((run) => sameValue_(text[getter](run.start), wanted))) continue;
    set(wanted);
    changed = true;
  }
  return changed;
}

/**
 * Splits a text into runs whose characters all have the same formatting.
 * @param {DocumentApp.Text} text The text (must not be empty).
 * @return {Array<{start: number, end: number}>} Each run's first and last index.
 */
function textRuns_(text) {
  const length = text.getText().length;
  const starts = text.getTextAttributeIndices();
  const runs = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = (i + 1 < starts.length ? starts[i + 1] : length) - 1;
    if (end >= start) runs.push({ start: start, end: end });
  }
  return runs;
}

/**
 * Tells whether a current attribute value already equals the wanted one.
 * Numbers are compared with a small tolerance, text (colors, fonts,
 * alignment) ignoring case, and an unset bold or italic counts as false.
 * @param {*} current The value read from the document (null if unset).
 * @param {*} wanted The value to apply (null to clear).
 * @return {boolean} True if setting the wanted value would change nothing.
 */
function sameValue_(current, wanted) {
  if (current === undefined) current = null;
  if (typeof wanted === 'boolean') return Boolean(current) === wanted;
  if (current === null || wanted === null) return current === wanted;
  if (typeof wanted === 'number' || typeof current === 'number') {
    return Math.abs(Number(current) - Number(wanted)) < 1e-6;
  }
  return String(current).toUpperCase() === String(wanted).toUpperCase();
}

/**
 * Sets the text color of a paragraph's text, skipping linked text so links
 * keep their own color (usually blue), and runs that already have the color.
 * @param {DocumentApp.Text} text The paragraph's text.
 * @param {Array<{start: number, end: number}>} runs The text's runs, from textRuns_.
 * @param {?string} color The color, e.g. '#000000', or null for the default color.
 * @return {boolean} True if any run was changed.
 */
function setColorExceptLinks_(text, runs, color) {
  let changed = false;
  for (const run of runs) {
    if (text.getLinkUrl(run.start)) continue;
    if (sameValue_(text.getForegroundColor(run.start), color)) continue;
    text.setForegroundColor(run.start, run.end, color);
    changed = true;
  }
  return changed;
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
