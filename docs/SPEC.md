# Footnote Matcher — Specification

## Purpose

A free, open-source Google Docs editor add-on that does one thing: **copy the formatting of one piece of text (usually a footnote you've already styled) and apply it to every footnote in the document.**

It replaces [Footnote Style](https://github.com/davidrthorn/footnote-style) by David Thorn, which is no longer available on the Google Workspace Marketplace. Footnote Matcher is a new implementation; Footnote Style's source is available in its own repository for comparison.

## User-facing behavior

The add-on adds one menu under **Extensions → Footnote Matcher**, in two sections with **Settings** below a separator:

| Section | Menu item | What it does |
|---|---|---|
| 1 | **Match all footnotes to selection** | Reads the formatting where the cursor is (or at the start of the selection), applies it to every footnote paragraph, and stores it as this document's **last match**. The cursor or selection must be inside a footnote unless **Allow matching from body text** is on (see [Settings](#settings)). |
| 1 | **Reapply footnote style** | Applies the last match again, for footnotes added since then. It always uses the last match, never the saved style. If there is no last match yet, shows a short alert explaining how to make one. |
| 1 | **Reapply to selected footnotes** | Like Reapply, but changes only the [selected footnotes](#selected-footnotes). |
| 2 | **Save selection as saved style** | Reads the formatting at the cursor or selection, with the same rules as Match, and stores it as this document's **saved style**. Changes no footnotes and leaves the last match alone. Shows a short alert confirming the style was saved, since nothing visible changes. |
| 2 | **Apply saved style** | Applies the saved style to every footnote paragraph. Leaves the last match alone, so Reapply still uses it. If no style is saved yet, shows a short alert explaining how to save one. |
| 2 | **Apply saved style to selected footnotes** | Like Apply saved style, but changes only the [selected footnotes](#selected-footnotes). |
| — | **Settings** | Opens a dialog for turning groups of attributes on or off for this document (see [Settings](#settings)). |

The saved style lets a document fall back to a known style after experimenting with Match.

### Selected footnotes

**Reapply to selected footnotes** and **Apply saved style to selected footnotes** use a style that is already stored (the last match or the saved style), because the selection picks which footnotes change rather than where formatting is read from. The selected footnotes are:

- the footnote that contains the cursor or selection, or
- every footnote whose reference number is inside the selection in the body, including inside selected paragraphs, list items and tables.

Each selected footnote is changed as a whole, even if only part of its text is selected. All other footnotes are left exactly as they are. If no footnote is selected (for example, the cursor is in body text, or the selected body text has no footnote numbers), a short alert explains how to select footnotes, and nothing changes. If no style is stored yet, the same alert as Reapply or Apply saved style is shown first. Settings, the "Footnotes already match" alert (which then refers to the selected footnotes) and the other alerts work as for every footnote.

### Typical use

1. Format one footnote the way you want it (font, size, spacing, and so on).
2. Put the cursor in that footnote, or select some of its text. Paragraph settings like alignment and indents are read from the paragraph the cursor or selection starts in.
3. Choose **Match all footnotes to selection**.
4. After adding more footnotes later, choose **Reapply footnote style**.
5. Optionally, to keep a style to return to, put the cursor in a footnote with that style and choose **Save selection as saved style**. Choose **Apply saved style** at any time to apply it again.

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

Each attribute is read with its own getter (`getFontSize`, `getFontFamily`, `getForegroundColor`, `getBackgroundColor`, `isBold`, `isItalic` and `getLinkUrl` on the text; `getLineSpacing`, `getSpacingBefore`, `getSpacingAfter`, `getAlignment`, `getIndentStart`, `getIndentEnd` and `getIndentFirstLine` on the paragraph), not with `getAttributes`. In documents imported from Word, `getAttributes` can return `null` for formatting that is set and shown in the toolbar; the specific getters return the value the toolbar shows.

An attribute that comes back `null` at the source (text or paragraph) is *inherited* (not set on the text or paragraph itself), so the value from the paragraph's named style (e.g. Normal text, via `Body.getHeadingAttributes`) is used instead. This matters for documents imported from Word, where the visible font often comes from Normal text, and for paragraph settings left at their defaults: a source with no indent still carries that to the other footnotes.

When the source is inside a footnote, `FONT_SIZE`, `FOREGROUND_COLOR`, `LINE_SPACING`, `SPACING_BEFORE` and `SPACING_AFTER` are **not** filled in from the named style. Google Docs shows footnotes at its own default size and spacing rather than Normal text's, and Apps Script has no footnote named style to read. Copying Normal text's values would resize or re-space every footnote, and would give every footnote an explicit color (often black) that the source doesn't have. When these attributes are unset on a footnote source, they are saved as `null` instead, and applying the style **clears** them on every footnote paragraph (`setFontSize(null)`, and `setAttributes` with `null` values for the spacing). A cleared footnote displays like one that was never formatted, so matching from an unformatted footnote resets the size and spacing of the others. Clearing never writes a specific number, so it doesn't depend on what Google's footnote default is. When the source is in body text, these attributes are filled in from the named style like the others.

Anything still `null` after that is skipped, not written as `null`, with these exceptions:
- An indent (`INDENT_START`, `INDENT_END`, `INDENT_FIRST_LINE`) that is set nowhere is saved as `0`, so matching from a footnote with no indent removes indents from the other footnotes. Because of this, a stored style is never empty.
- When the source character has no highlight, `BACKGROUND_COLOR` is saved as `null` and applying it removes highlights from the footnotes.
- When the source character has no text color set (and isn't a link), `FOREGROUND_COLOR` is saved as `null` and applying it resets the text color of the footnotes (except links) to the default.
- When the source is in a footnote and has no font size, line spacing, or space before or after set, those attributes are saved as `null`, and applying them clears them (see above). `FONT_SIZE` is read from a character, so a source in an empty paragraph leaves it out.
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
- Settings take effect when a style is applied, not when it is stored. They apply in the same way to Match, Reapply and Apply saved style, and to the "to selected footnotes" items. The last match and the saved style always hold every attribute, so turning a group back on and choosing **Reapply** (or **Apply saved style**) applies it without matching again.
- If every group is off, Match, Reapply and Apply saved style show a short alert and change nothing. Match still stores the last match.
- **Allow matching from body text** controls only where Match may read its formatting, not which footnotes are changed. While it is off (the default) and the cursor or selection isn't inside a footnote, Match and Save selection as saved style show a short alert explaining how to match from a footnote (and where to turn the option on), and change and store nothing. While it is on, they read formatting from body text as well. Headers and footers are never used as the source, whether the option is on or off. It doesn't count as a group for the "every group is off" alert.
- Settings are saved per document in `PropertiesService.getDocumentProperties()` as a single JSON string (key: `footnoteSettings`), e.g. `{"highlight": false}`. A missing key uses that group's default; unknown keys are ignored.

## Edge cases to handle

- **No cursor and no selection** → friendly alert, no changes.
- **Cursor or selection in body text** while **Allow matching from body text** is off → friendly alert, no changes, nothing saved.
- **Cursor or selection in a header or footer** → the same alert, whether **Allow matching from body text** is on or off; no changes, nothing saved.
- **Cursor in an empty paragraph** → the cursor's element is a `Paragraph`, not `Text`; read paragraph attributes and whatever text attributes are available without crashing.
- **Selection made of whole elements** (not partial) → use the first element; it may be a `Paragraph` or `ListItem` with no text child.
- **Document has no footnotes** → alert ("No footnotes found"), but Match still stores the last match. Save selection as saved style works as usual, since it changes no footnotes.
- **Footnotes already match** → Match, Reapply and Apply saved style compare each attribute with the footnote's current value and only set the ones that differ. When no footnote paragraph changes and none failed, they show a short alert ("Footnotes already match") so it's clear the command ran. When anything changes, no alert is shown. Match still stores the last match. For the comparison, numbers match within a tiny tolerance, colors, fonts and alignment ignoring case, an unset indent counts as the named style's indent (or 0 if that is unset too), and unset bold or italic counts as off. A text attribute counts as different if any run of differently formatted text in the paragraph differs.
- **Footnote paragraphs that are list items** → apply the same attributes, except `INDENT_START` and `INDENT_FIRST_LINE`, which set a list item's nesting level and bullet position and are left as they are.
- **Cursor right after a space** → the space's formatting is invisible, so read the nearest non-space character instead.
- **Suggested footnotes** (added in suggesting mode and not yet accepted) → not formatted. Apps Script's `getFootnotes()` doesn't return them, so the add-on can't see, count or mention them, and the "Footnotes already match" alert can appear while one is unformatted. Accepting the suggestion makes it an ordinary footnote that Match and Reapply format. If `getFootnoteContents()` ever returns `null` for a footnote that is returned, it is skipped and counted, and the "already match" alert says how many were skipped.
- **Document with multiple tabs** (including nested tabs) → footnotes in every tab are styled, not just the tab the cursor is in.

## Scope and permissions

- Only touches the open document: `@OnlyCurrentDoc` / `documents.currentonly` scope, plus `script.container.ui` for the menu and alerts.
- Stores everything per document in `PropertiesService.getDocumentProperties()`, each as a single JSON string: the last match (key: `footnoteStyle`), the saved style (key: `footnoteSavedStyle`), and the settings (key: `footnoteSettings`).
- The Settings dialog is built with `HtmlService` from `src/Settings.html` and needs no extra scopes.
- No network calls from the add-on's code and no analytics. The only outside resource is Google's add-on stylesheet (`ssl.gstatic.com`), which the Settings dialog loads.
- Errors are logged with `console.error`, and the manifest's `"exceptionLogging": "STACKDRIVER"` sends uncaught errors to the developer's Google Cloud logs. Error messages don't include document text.

## Out of scope (for now)

- Per-user default styles across documents (the original's "Use as default" / "Restore default").
- Styling the footnote reference numbers in the body text.
- Automatically reapplying when footnotes are added (Apps Script has no edit trigger for Docs).
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
- [ ] In a Google Doc converted from `test/footnote-matcher-test-100.docx`, note the font and size the toolbar shows for footnote 1 (Times New Roman 11pt in an unedited copy), place the cursor in it and run Match → every footnote shows that font and size.
- [ ] Italic words and links inside other footnotes are unchanged.
- [ ] Triple-click a footnote with justified alignment, run Match → all footnotes justified.
- [ ] Give one footnote a first-line indent, then run Match from a footnote with no indent → the indent is removed.
- [ ] Add a new footnote, run Reapply → it matches.
- [ ] In suggesting mode, add a footnote; switch back to editing and run Reapply → the suggested footnote is unchanged and no error appears. Accept the suggestion and run Reapply again → it matches.
- [ ] Right after a Match, run Match again from the same footnote → alert "Footnotes already match"; nothing changes. Run Reapply → the same alert.
- [ ] Change one footnote's size, run Reapply → that footnote matches again and no alert is shown.
- [ ] Run Reapply in a fresh doc with no last match → helpful alert.
- [ ] The menu shows Match, Reapply and Reapply to selected footnotes, then a separator, then Save selection as saved style, Apply saved style and Apply saved style to selected footnotes, then a separator, then Settings.
- [ ] Run Match. Change the size of footnotes 3, 4 and 9. Select body text containing the reference numbers 3 and 4 and run Reapply to selected footnotes → footnotes 3 and 4 match again; footnote 9 keeps its changed size.
- [ ] Click inside footnote 9 and run Reapply to selected footnotes → footnote 9 matches; no other footnote changes.
- [ ] Select only part of a footnote's text and run Reapply to selected footnotes → the whole footnote matches.
- [ ] Select a body paragraph and a table that contain footnote numbers and run Reapply to selected footnotes → only those footnotes change.
- [ ] Click in body text with no footnote numbers and run Reapply to selected footnotes → alert "No footnotes selected"; nothing changes.
- [ ] Save footnote A as the saved style, then Match from footnote B. Select body text containing two footnote numbers and run Apply saved style to selected footnotes → those two look like footnote A; the rest still look like footnote B.
- [ ] In a fresh doc, run each "to selected footnotes" item → the same alert as Reapply or Apply saved style with nothing stored.
- [ ] Run Apply saved style in a fresh doc with nothing saved → helpful alert explaining how to save one.
- [ ] Put the cursor in footnote A and run Save selection as saved style → a short confirmation; no footnotes change.
- [ ] Then run Match from a footnote B with different formatting, then Apply saved style → every footnote looks like footnote A. Run Reapply → every footnote looks like footnote B again.
- [ ] With **Allow matching from body text** off, place the cursor in body text and run Save selection as saved style → the same alert as Match, and Apply saved style still applies the earlier saved style.
- [ ] Run Match with nothing selected and the cursor outside the document body → helpful alert, no error.
- [ ] Run in a document with zero footnotes → helpful alert.
- [ ] In a document with two tabs that both have footnotes, run Match from one tab → footnotes in both tabs match.
- [ ] Works with 100+ footnotes in reasonable time (under ~30 seconds).
- [ ] **Settings** appears below a separator and opens with every box checked except Bold, Italic and Allow matching from body text in a document whose settings were never changed.
- [ ] Turn **Highlight** off, then run Match from a footnote with no highlight → highlights in other footnotes stay; everything else matches.
- [ ] Reopen Settings → the saved choices are shown.
- [ ] Turn **Highlight** back on and run Reapply (without matching again) → highlights are removed.
- [ ] Turn **Indents** off, then run Match from a footnote with no indent → indented footnotes keep their indents.
- [ ] Turn every setting off and run Reapply → helpful alert, no changes.
- [ ] With **Allow matching from body text** off (the default), place the cursor in body text and run Match → an alert says to click inside a footnote and names the setting; no footnote changes, and Reapply still applies the previous style.
- [ ] Turn **Allow matching from body text** on, place the cursor in body text and run Match → every footnote takes the body text's formatting.
- [ ] Change several boxes, click **Reset to defaults** → every box is checked except Bold, Italic and Allow matching from body text. Click **Cancel** and reopen → the earlier saved choices are still shown. Reset again and click **Save** → reopening shows the defaults.
- [ ] With **Bold** off (the default), bold a word in one footnote and run Match from plain text → the bold word stays bold.
- [ ] Turn **Bold** on and run Match from plain text → bold is removed from every footnote; italics are unchanged.
- [ ] Turn **Italic** on and run Match from plain text → italics are removed from every footnote, including italicized titles.
- [ ] In a new Google Doc (not imported), insert a few footnotes without formatting them, make one 8pt and give one 12pt space after, then run Match from an unformatted one → the 8pt footnote returns to the default size, the extra space is removed, and no footnote grows to Normal text's size.
- [ ] Repeat the previous check in a Google Doc converted from `test/footnote-matcher-test-100.docx`, after adding a new, unformatted footnote and matching from it → every footnote shows the same size in the toolbar as the new footnote, and none keeps extra space before or after.
- [ ] Turn **Size**, **Line spacing** and **Space before/after** off, then run Match from an unformatted footnote → sizes and spacing in other footnotes are unchanged.
- [ ] Color one footnote red, then run Match from a footnote in the default color → the red text returns to the default color; links stay blue.
- [ ] Run Match with the cursor right after a space following an italic or bold word → the formatting of the word before the space is read.
- [ ] Run Match in a document whose footnotes include a nested bulleted list → the list keeps its nesting and bullet positions; other attributes match.
