/*
 * Footnote Matcher
 * Copyright (C) 2026 Marcus Miller
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * Licensed under the GNU Affero General Public License v3.0 or later.
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

/**
 * Loads src/Code.js into a node:vm context with small stand-ins for the Apps
 * Script globals it uses, so its plain-logic helpers can be tested without
 * Google Docs. Nothing under src/ depends on this file.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const CODE_PATH = path.join(__dirname, '..', '..', 'src', 'Code.js');
const CODE = fs.readFileSync(CODE_PATH, 'utf8');

/** Element types used by Code.js, as plain strings. */
const ElementType = {
  TEXT: 'TEXT',
  PARAGRAPH: 'PARAGRAPH',
  LIST_ITEM: 'LIST_ITEM',
  TABLE: 'TABLE',
  TABLE_ROW: 'TABLE_ROW',
  TABLE_CELL: 'TABLE_CELL',
  FOOTNOTE: 'FOOTNOTE',
  FOOTNOTE_SECTION: 'FOOTNOTE_SECTION',
  BODY_SECTION: 'BODY_SECTION',
  HEADER_SECTION: 'HEADER_SECTION',
  FOOTER_SECTION: 'FOOTER_SECTION',
};

/** DocumentApp.Attribute stand-in: each attribute maps to its own name. */
const Attribute = new Proxy({}, { get: (target, name) => name });

/**
 * Creates a fresh context with Code.js loaded.
 * @param {Object=} options
 * @param {Object=} options.properties Initial document properties (key → string).
 * @param {Object=} options.namedStyle What Body.getHeadingAttributes returns.
 * @return {{ctx: Object, run: function(string): *, properties: Object, alerts: Array, menu: Array}}
 *     The context (Code.js functions are its properties), a function that
 *     evaluates code in it (for constants such as SETTING_GROUPS, which are not
 *     properties of the context), the document properties store, the alerts
 *     shown, and the menu items added by onOpen.
 */
function loadCode(options = {}) {
  const properties = Object.assign({}, options.properties);
  const namedStyle = options.namedStyle || {};
  const alerts = [];
  const menu = [];

  const ui = {
    ButtonSet: { OK: 'OK' },
    alert: (title, message) => alerts.push({ title, message }),
    createAddonMenu() {
      const builder = {
        addItem: (label, fn) => (menu.push({ label, fn }), builder),
        addSeparator: () => (menu.push('---'), builder),
        addToUi: () => {},
      };
      return builder;
    },
  };

  const ctx = {
    console: { log() {}, error() {} },
    DocumentApp: {
      ElementType,
      Attribute,
      ParagraphHeading: { NORMAL: 'NORMAL' },
      HorizontalAlignment: { LEFT: 'LEFT', CENTER: 'CENTER', RIGHT: 'RIGHT', JUSTIFY: 'JUSTIFY' },
      TabType: { DOCUMENT_TAB: 'DOCUMENT_TAB' },
      getUi: () => ui,
      getActiveDocument: () => ({
        getBody: () => ({ getHeadingAttributes: () => Object.assign({}, namedStyle) }),
      }),
    },
    PropertiesService: {
      getDocumentProperties: () => ({
        getProperty: (key) => (key in properties ? properties[key] : null),
        setProperty: (key, value) => {
          properties[key] = String(value);
        },
      }),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: CODE_PATH });
  const run = (code) => vm.runInContext(code, ctx);
  return { ctx, run, properties, alerts, menu };
}

/**
 * Copies a value made inside the vm context into a plain value of this
 * context, so assert.deepStrictEqual can compare it with ordinary objects.
 * @param {*} value A JSON-safe value.
 * @return {*} The copy.
 */
function plain(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

module.exports = { loadCode, plain, ElementType };
