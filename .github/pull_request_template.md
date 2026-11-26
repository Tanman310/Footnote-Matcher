## What does this change?

<!-- A sentence or two. Link the issue it fixes, e.g. "Fixes #12". -->

## How did you test it?

<!-- Apps Script can't run locally, so describe your manual test in Google Docs. -->

- [ ] Pushed with clasp and ran it as a test deployment in a Google Doc
- [ ] Automated tests pass (`node --test`)
- [ ] Worked through the relevant items in the acceptance checklist in `docs/SPEC.md`
- [ ] Italics, bold, links, multi-paragraph footnotes, and list nesting were unchanged (e.g. using `test/footnote-matcher-test-100.docx`)

## Checklist

- [ ] The change is focused on one thing
- [ ] No new permissions/scopes in `src/appsscript.json`
- [ ] No new dependencies or build steps
- [ ] Updated `docs/SPEC.md` / `README.md` if behavior changed
- [ ] Added a line under **Unreleased** in `CHANGELOG.md` if users or contributors would notice the change
- [ ] No credentials (`.clasprc.json`) or personal script IDs (`.clasp.json`) committed
