# Footnote Matcher — Specification

## Purpose

A free, open-source Google Docs editor add-on that does one thing: **copy the formatting of one piece of text (usually a footnote you've already styled) and apply it to every footnote in the document.**

It replaces [Footnote Style](https://github.com/davidrthorn/footnote-style) by David Thorn, which is no longer available on the Google Workspace Marketplace. Footnote Matcher is a new implementation; Footnote Style's source is available in its own repository for comparison.

## User-facing behavior

The add-on adds one menu under **Extensions → Footnote Matcher**:

| Menu item | What it does |
|---|---|
| **Match all footnotes to selection** | Reads the formatting where the cursor is (or at the start of the selection), applies it to every footnote paragraph, and saves it as this document's footnote style. The cursor or selection must be inside a footnote unless **Allow matching from body text** is on (see [Settings](#settings)). |
| **Re-apply footnote style** | Applies the saved style again, for footnotes added since the last match. If no style is saved yet, shows a short alert explaining how to set one. |
| **Settings** | Opens a dialog for turning groups of attributes on or off for this document (see [Settings](#settings)). Shown below a separator. |

### Typical use

1. Format one footnote the way you want it (font, size, spacing, and so on).
2. Put the cursor in that footnote, or select some of its text. Paragraph settings like alignment and indents are read from the paragraph the cursor or selection starts in.
3. Choose **Match all footnotes to selection**.
4. After adding more footnotes later, choose **Re-apply footnote style**.

## What gets copied

**Text attributes** (read at the start of the selection, or from the nearest non-space character before the cursor, or after it if there is none before):
- `FONT_FAMILY`
- `FONT_SIZE`
- `FOREGROUND_COLOR`
- `BACKGROUND_COLOR` (highlight)

**Paragraph attributes** (read from the containing paragraph):
- `LINE_SPACING`
- `SPACING_BEFORE`
- `SPACING_AFTER`
- `HORIZONTAL_ALIGNMENT`
- `INDENT_START`, `INDENT_END`, `INDENT_FIRST_LINE`

**Optional, off by default** (see [Settings](#settings)): `BOLD` and `ITALIC`. When turned on, the source character's bold or italic is applied to the whole of every footnote, which replaces emphasis such as italicized titles.

**Never copied or changed**, so emphasis inside footnotes (links in citations, underlining) survives:
- `UNDERLINE`, `STRIKETHROUGH`, `LINK_URL`, and `BOLD` / `ITALIC` while their settings are off
- The text color of linked text, so links keep their own color (usually blue). If the source character is itself a link, its color isn't copied.
- `HEADING`

An attribute that comes back `null` at the source (text or paragraph) is *inherited* (not set on the text or paragraph itself), so the value from the paragraph's named style (e.g. Normal text, via `Body.getHeadingAttributes`) is used instead. This matters for documents imported from Word, where the visible font often comes from Normal text, and for paragraph settings left at their defaults: a source with no indent still carries that to the other footnotes.

When the source is inside a footnote, `FONT_SIZE`, `LINE_SPACING`, `SPACING_BEFORE` and `SPACING_AFTER` are **not** filled in from the named style. Google Docs shows footnotes at its own default size (usually 10pt) and spacing rather than Normal text's (usually 11pt), and Apps Script has no footnote named style to read. Copying Normal text's values would resize or re-space every footnote. When these attributes are unset on a footnote source, they are skipped instead.

Anything still `null` after that is skipped, not written as `null`, with these exceptions:
- An indent (`INDENT_START`, `INDENT_END`, `INDENT_FIRST_LINE`) that is set nowhere is saved as `0`, so matching from a footnote with no indent removes indents from the other footnotes. Because of this, the saved style is never empty.
- When the source character has no highlight, `BACKGROUND_COLOR` is saved as `null` and applying it removes highlights from the footnotes.
- When the source character has no text color set (and isn't a link), `FOREGROUND_COLOR` is saved as `null` and applying it resets the text color of the footnotes (except links) to the default.
- When the source character isn't bold or italic, `BOLD` / `ITALIC` are saved as `false`, so with those settings on, applying them removes bold or italics from the footnotes.

## Settings

The **Settings** dialog has one checkbox per group of attributes, and a **Matching** section with one option. Every group except **Bold** and **Italic** is on by default, and the option is off by default, so a document whose settings were never changed behaves as described above. The dialog notes that Bold and Italic apply to the whole footnote. **Reset to defaults** returns every checkbox to its default; as with any other change in the dialog, nothing is saved until **Save** (and **Cancel** discards it).

| Setting | Attributes |
|---|---|
| **Text:** Font | `FONT_FAMILY` |
| **Text:** Size | `FONT_SIZE` |
| **Text:** Text color | `FOREGROUND_COLOR` |
| **Text:** Highlight | `BACKGROUND_COLOR` |
| **Text:** Bold (off by default) | `BOLD` |
| **Text:** Italic (off by default) | `ITALIC` |
| **Paragraph:** Line spacing | `LINE_SPACING` |
| **Paragraph:** Space before/after | `SPACING_BEFORE`, `SPACING_AFTER` |
| **Paragraph:** Alignment | `HORIZONTAL_ALIGNMENT` |
| **Paragraph:** Indents | `INDENT_START`, `INDENT_END`, `INDENT_FIRST_LINE` |
| **Matching:** Allow matching from body text (off by default) | Not an attribute group; see below. |

- A group that is off is neither applied nor cleared, so each footnote keeps its own value. For example, with **Highlight** off, highlights in footnotes are left as they are.
- Settings take effect when a style is applied, not when it is saved. The saved style always holds every attribute, so turning a group back on and choosing **Re-apply** applies it without matching again.
- If every group is off, Match and Re-apply show a short alert and change nothing. Match still saves the style.
- **Allow matching from body text** controls only where Match may read its formatting, not which footnotes are changed. While it is off (the default) and the cursor or selection isn't inside a footnote, Match shows a short alert explaining how to match from a footnote (and where to turn the option on), and changes and saves nothing. While it is on, Match reads formatting from body text as well. It doesn't count as a group for the "every group is off" alert.
- Settings are saved per document in `PropertiesService.getDocumentProperties()` as a single JSON string (key: `footnoteSettings`), e.g. `{"highlight": false}`. A missing key uses that group's default; unknown keys are ignored.

## Edge cases to handle

- **No cursor and no selection** → friendly alert, no changes.
- **Cursor or selection in body text** while **Allow matching from body text** is off → friendly alert, no changes, nothing saved.
- **Cursor in an empty paragraph** → the cursor's element is a `Paragraph`, not `Text`; read paragraph attributes and whatever text attributes are available without crashing.
- **Selection made of whole elements** (not partial) → use the first element; it may be a `Paragraph` or `ListItem` with no text child.
- **Document has no footnotes** → alert ("No footnotes found"), but still save the style.
- **Footnote paragraphs that are list items** → apply the same attributes, except `INDENT_START` and `INDENT_FIRST_LINE`, which set a list item's nesting level and bullet position and are left as they are.
- **Cursor right after a space** → the space's formatting is invisible, so read the nearest non-space character instead.
- **Document with multiple tabs** (including nested tabs) → footnotes in every tab are styled, not just the tab the cursor is in.

## Scope and permissions

- Only touches the open document: `@OnlyCurrentDoc` / `documents.currentonly` scope, plus `script.container.ui` for the menu and alerts.
- Stores the saved style in `PropertiesService.getDocumentProperties()` as a single JSON string (key: `footnoteStyle`), and the settings the same way (key: `footnoteSettings`).
- The Settings dialog is built with `HtmlService` from `src/Settings.html` and needs no extra scopes.
- No network calls from the add-on's code and no analytics. The only outside resource is Google's add-on stylesheet (`ssl.gstatic.com`), which the Settings dialog loads.
- Errors are logged with `console.error`, and the manifest's `"exceptionLogging": "STACKDRIVER"` sends uncaught errors to the developer's Google Cloud logs. Error messages don't include document text.

## Out of scope (for now)

- Per-user default styles across documents (the original's "Use as default" / "Restore default").
- Styling the footnote reference numbers in the body text.
- Automatically re-applying when footnotes are added (Apps Script has no edit trigger for Docs).
- A sidebar.

## Problems in Footnote Style that this implementation avoids

- `updateFootnotes()` reads document properties *before* copying in user defaults, so defaults don't apply until the second run.
- Uses `eval()` to build the alignment enum; use a lookup on `DocumentApp.HorizontalAlignment` instead.
- Iterates arrays with `for...in`.
- Crashes when there's no cursor or selection (`cursor.getElement()` on `null`).
- Crashes when the cursor is in an empty paragraph (`asText()` on a `Paragraph`).
- Stores each attribute as a separate string property with a `_fs` suffix; numbers come back as strings.

## Acceptance checklist (manual, in a test document)

- [ ] Menu appears under Extensions after the add-on is installed/test-deployed.
- [ ] Style a footnote (e.g., Georgia 9pt, 1.0 spacing, 0pt after), place cursor in it, run Match → all footnotes match.
- [ ] Italic words and links inside other footnotes are unchanged.
- [ ] Triple-click a footnote with justified alignment, run Match → all footnotes justified.
- [ ] Give one footnote a first-line indent, then run Match from a footnote with no indent → the indent is removed.
- [ ] Add a new footnote, run Re-apply → it matches.
- [ ] Run Re-apply in a fresh doc with no saved style → helpful alert.
- [ ] Run Match with nothing selected and the cursor outside the document body → helpful alert, no error.
- [ ] Run in a document with zero footnotes → helpful alert.
- [ ] In a document with two tabs that both have footnotes, run Match from one tab → footnotes in both tabs match.
- [ ] Works with 100+ footnotes in reasonable time (under ~30 seconds).
- [ ] **Settings** appears below a separator and opens with every box checked except Bold, Italic and Allow matching from body text in a document whose settings were never changed.
- [ ] Turn **Highlight** off, then run Match from a footnote with no highlight → highlights in other footnotes stay; everything else matches.
- [ ] Reopen Settings → the saved choices are shown.
- [ ] Turn **Highlight** back on and run Re-apply (without matching again) → highlights are removed.
- [ ] Turn **Indents** off, then run Match from a footnote with no indent → indented footnotes keep their indents.
- [ ] Turn every setting off and run Re-apply → helpful alert, no changes.
- [ ] With **Allow matching from body text** off (the default), place the cursor in body text and run Match → an alert says to click inside a footnote and names the setting; no footnote changes, and Re-apply still applies the previous style.
- [ ] Turn **Allow matching from body text** on, place the cursor in body text and run Match → every footnote takes the body text's formatting.
- [ ] Change several boxes, click **Reset to defaults** → every box is checked except Bold, Italic and Allow matching from body text. Click **Cancel** and reopen → the earlier saved choices are still shown. Reset again and click **Save** → reopening shows the defaults.
- [ ] With **Bold** off (the default), bold a word in one footnote and run Match from plain text → the bold word stays bold.
- [ ] Turn **Bold** on and run Match from plain text → bold is removed from every footnote; italics are unchanged.
- [ ] Turn **Italic** on and run Match from plain text → italics are removed from every footnote, including italicized titles.
- [ ] In a new Google Doc (not imported), insert a few footnotes without formatting them, make one 8pt, then run Match from an unformatted one → no footnote changes size (none grows to 11pt), and the 8pt footnote keeps its size.
- [ ] Color one footnote red, then run Match from a footnote in the default color → the red text returns to the default color; links stay blue.
- [ ] Run Match with the cursor right after a space following an italic or bold word → the formatting of the word before the space is read.
- [ ] Run Match in a document whose footnotes include a nested bulleted list → the list keeps its nesting and bullet positions; other attributes match.
