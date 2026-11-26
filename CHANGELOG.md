# Changelog

All notable changes to Footnote Matcher are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Each release is tagged in git (for example `v1.0.0`) and corresponds to one Apps Script deployment version. How to make a release is described in [`docs/RELEASING.md`](docs/RELEASING.md).

Pull requests that change anything users or contributors would notice add a line under **Unreleased**.

## [Unreleased]

### Added

- **Save selection as saved style** and **Apply saved style** menu items: a per-document saved style kept separate from the last match, so a document can return to a known style after experimenting. Reapply always uses the last match. ([#12](https://github.com/Tanman310/Footnote-Matcher/pull/12))
- **Allow matching from body text** setting, off by default. ([#11](https://github.com/Tanman310/Footnote-Matcher/pull/11))
- Automated tests for the logic that doesn't need Google Docs, run on every pull request. ([#13](https://github.com/Tanman310/Footnote-Matcher/pull/13))
- This changelog and documented release steps.
- Match, Reapply and Apply saved style show **Footnotes already match** when no footnote needed changing, instead of finishing silently. Formatting a footnote already has is no longer rewritten. ([#17](https://github.com/Tanman310/Footnote-Matcher/issues/17))
- README and spec note that footnotes added in suggesting mode aren't formatted until the suggestion is accepted.

### Changed

- Match only reads formatting from inside a footnote unless **Allow matching from body text** is on, so a cursor left in body text by mistake no longer restyles every footnote. ([#11](https://github.com/Tanman310/Footnote-Matcher/pull/11))
- Matching from a footnote with no font size or spacing of its own resets the other footnotes to the default size and spacing, instead of leaving their own values. ([#10](https://github.com/Tanman310/Footnote-Matcher/pull/10))
- The contributor setup in `CONTRIBUTING.md` is now copy and paste into an Apps Script project in the browser; clasp is optional, and `.clasp.json.example` is removed.

### Fixed

- Match missed formatting such as font size in documents imported from Word. ([#9](https://github.com/Tanman310/Footnote-Matcher/pull/9))

[Unreleased]: https://github.com/Tanman310/Footnote-Matcher/commits/main
