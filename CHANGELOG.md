# Changelog

All notable changes to Footnote Matcher are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Each release is tagged in git (for example `v1.0.0`) and corresponds to one Apps Script deployment version. How to make a release is described in [`docs/RELEASING.md`](docs/RELEASING.md).

Pull requests that change anything users or contributors would notice add a line under **Unreleased**.

## [Unreleased]

### Added

- A website at <https://footnote-matcher.miller310.com> with a home page, privacy policy, terms of service and support page, published from `site/` by GitHub Pages (`.github/workflows/pages.yml`).
- The Google Workspace Marketplace listing text, icons and card banner in `docs/marketplace/`.

## [1.0.0] - 2026-11-26

First release.

### Added

- **Match all footnotes to selection** copies the formatting where the cursor is in a footnote to every footnote in the document, in every tab: font, size, text color, highlight, underline, strikethrough, link color and underline, line spacing, space before and after, alignment, and indents. Italics, bold and link addresses inside footnotes are kept, and nested lists keep their nesting.
- **Reapply footnote style** applies the last match again, for footnotes added since then.
- **Save selection as saved style** and **Apply saved style**: a per-document saved style kept separate from the last match, so a document can return to a known style after experimenting. ([#12](https://github.com/Tanman310/Footnote-Matcher/pull/12))
- **Reapply to selected footnote** and **Apply saved style to selected footnote** change only the footnote at the cursor, or the footnotes whose numbers are in the selected body text. ([#4](https://github.com/Tanman310/Footnote-Matcher/issues/4))
- **Settings** dialog, saved per document, for turning each group of formatting on or off. **Bold** and **Italic** are off by default, so emphasis such as italicized titles survives a match. Link settings never change the link itself. ([#20](https://github.com/Tanman310/Footnote-Matcher/issues/20))
- **Allow matching from body text** setting, off by default, so a cursor left in body text by mistake doesn't restyle every footnote. ([#11](https://github.com/Tanman310/Footnote-Matcher/pull/11))
- Matching from a footnote with no font size or spacing of its own resets the other footnotes to Google Docs' default footnote size and spacing. ([#10](https://github.com/Tanman310/Footnote-Matcher/pull/10))
- Formatting is read correctly in documents imported from Word. ([#9](https://github.com/Tanman310/Footnote-Matcher/pull/9))
- A **Footnotes already match** message when nothing needed changing. ([#17](https://github.com/Tanman310/Footnote-Matcher/issues/17))
- Short, friendly alerts instead of errors, for example when there are no footnotes or nothing is stored yet.
- For contributors: automated tests run on every pull request ([#13](https://github.com/Tanman310/Footnote-Matcher/pull/13)), this changelog, release steps in `docs/RELEASING.md`, and a **Release** workflow that drafts a GitHub Release from the changelog when a version tag is pushed ([#22](https://github.com/Tanman310/Footnote-Matcher/pull/22)).

[Unreleased]: https://github.com/Tanman310/Footnote-Matcher/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Tanman310/Footnote-Matcher/releases/tag/v1.0.0
