# Contributing to Footnote Matcher

Thanks for your interest in helping. Footnote Matcher is a small, volunteer-maintained project. Bug reports, testing, documentation fixes, and code are all welcome.

By taking part, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Response times

Footnote Matcher is maintained by one volunteer in their spare time. Issues and pull requests usually get a first response within **two weeks**. If yours hasn't had a reply after that, feel free to add a comment to bump it. Security reports are handled faster; see [SECURITY.md](SECURITY.md).

New to open source? Issues labeled [`good first issue`](https://github.com/Tanman310/Footnote-Matcher/labels/good%20first%20issue) are small, well-described tasks that make a good starting point.

## Scope

Footnote Matcher does **one thing**: copy the formatting of one piece of text and apply it to every footnote in a Google Doc. The behavior is defined in [`docs/SPEC.md`](docs/SPEC.md).

The project stays small on purpose, so it's easy to trust, review, and maintain. Before you start work on a new feature, please open a **feature request** issue so we can agree it fits. Pull requests that add features without a prior discussion may be closed.

## Reporting bugs

Open an issue using the **Bug report** template. Include:

- what you did, what you expected, and what happened
- a link to a Google Doc that shows the problem (shared as "Anyone with the link can view"), or a description of the formatting involved
- your browser

Please don't put private or sensitive documents in issues. Make a copy with placeholder text instead.

**Security problems:** don't open a public issue. See [SECURITY.md](SECURITY.md).

## Development setup

Footnote Matcher is plain [Google Apps Script](https://developers.google.com/apps-script) (V8 runtime) in three files: `src/Code.js`, `src/Settings.html` and `src/appsscript.json`. There's no build step and nothing to install. You run your own copy by pasting these files into an Apps Script project in your browser.

You'll need a Google account. To open a pull request you'll also need a GitHub account (and git, unless you edit files on GitHub).

1. **Fork** this repository, and clone your fork if you work with git.
2. **Make a test document.** Upload [`test/footnote-matcher-test-100.docx`](test/footnote-matcher-test-100.docx) to Google Drive, open it, and choose **File → Save as Google Docs**. It has 100 footnotes with deliberately inconsistent formatting, plus italics, links, bold, multi-paragraph footnotes, and nested bulleted lists that must survive a match.
3. **Create an Apps Script project.** Go to <https://script.google.com> and choose **New project**. This makes a standalone project, not one attached to a document. Give it a name, for example "Footnote Matcher (dev)".
4. **Show the manifest.** Choose **Project Settings** (the gear icon) and check **Show "appsscript.json" manifest file in editor**.
5. **Paste in the code.** Back in the **Editor**:
   - Open `Code.gs`, replace everything in it with the contents of `src/Code.js`, and save. (Apps Script uses `.gs` for script files; the file name doesn't matter.)
   - Choose **+ → HTML**, name the file `Settings` (Apps Script adds `.html`), replace its contents with `src/Settings.html`, and save. The name must be exactly `Settings`, because the code opens the dialog by that name.
   - Open `appsscript.json`, replace its contents with `src/appsscript.json`, and save.
6. **Run it as an add-on.** Choose **Deploy → Test deployments**. Next to **Select type**, choose the gear icon and **Editor Add-on**, then **Create new test**. Select **Latest code**, **Installed and enabled**, and your test document, and choose **Save test**. Select the saved test and choose **Execute**: the test document opens with **Extensions → Footnote Matcher**. The first time you use a menu item, Google asks you to authorize it.
7. **After each change**, paste the changed file into the Apps Script project again and save, then reload the test document. If you edit in the Apps Script editor instead, copy your changes back into `src/` before committing; the files in `src/` are the ones that count.

Only `src/` is deployed. Don't add other files to the Apps Script project, and keep `src/appsscript.json` as it is unless your change is about the manifest.

If you already use [clasp](https://github.com/google/clasp), you can use it instead of copying and pasting, with `"rootDir": "src"`. Its `.clasp.json` (your script ID) and `.clasprc.json` (your Google login token) are listed in `.gitignore`; never commit them.

## Automated tests

The helpers in `src/Code.js` that don't need Google Docs (choosing which character to read, reading and applying a style with stand-in document elements, settings, the menu actions) have automated tests in `tests/`. They use only Node's built-in test runner and `node:vm`, so there is nothing to install. With Node.js 20 or later:

```bash
node --test
```

The tests load `src/Code.js` with small stand-ins for the Apps Script services (`tests/helpers/`). Nothing under `src/` depends on them, and they don't change what is deployed. GitHub Actions runs them on every pull request and on pushes to `main` (`.github/workflows/tests.yml`).

`tests/release-notes.test.js` covers `.github/scripts/release-notes.js`, which the Release workflow (`.github/workflows/release.yml`) uses to read a version's notes from `CHANGELOG.md`. It isn't part of the add-on.

Passing tests don't replace testing in Google Docs: they can't show how a footnote actually looks.

## Making a change

1. Create a branch from `main`, e.g. `fix/empty-paragraph-cursor`.
2. Keep the change focused. One fix or feature per pull request.
3. Follow the code conventions:
   - Plain Apps Script on the V8 runtime: `const`/`let`, `for...of`, no `eval`.
   - No npm dependencies, TypeScript, or bundlers without prior discussion.
   - Keep `/** @OnlyCurrentDoc */` and the minimal scopes in `src/appsscript.json`. Requests for broader permissions won't be accepted.
   - `onOpen` only builds the menu.
   - Menu actions show a friendly alert instead of an error.
   - Document properties hold the last match (`footnoteStyle`), the saved style (`footnoteSavedStyle`) and the Settings choices (`footnoteSettings`), each as one JSON string. The Settings dialog lives in `src/Settings.html`.
   - Add a short JSDoc comment to each function.
   - Keep the license header at the top of each source file, and add it to any new file.
4. **Run the automated tests** (see [Automated tests](#automated-tests)), and add or update tests when you change a helper they cover.
5. **Test by hand** with the acceptance checklist in [`docs/SPEC.md`](docs/SPEC.md). The automated tests only cover logic that doesn't need Google Docs, so manual testing in a real Google Doc is still required.
6. If you change behavior, update `docs/SPEC.md` and, where users would notice, `README.md`.
7. If users or contributors would notice the change, add a line under **Unreleased** in [`CHANGELOG.md`](CHANGELOG.md).
8. Open a pull request and fill in the template. Say how you tested.

Keep everything you write for the project (documentation, code comments, commit messages, and pull request descriptions) neutral and written for all readers. Describe the change itself. Don't include notes, reminders, or requests addressed to the maintainer. Questions for the maintainer belong in a pull request comment or an issue.

## Releases

Releases use [Semantic Versioning](https://semver.org/), and each one is listed in [`CHANGELOG.md`](CHANGELOG.md). The steps for making a release are in [`docs/RELEASING.md`](docs/RELEASING.md).

## License

By contributing, you agree that your contributions are licensed under the project's license, the [GNU Affero General Public License v3.0 or later](LICENSE) (AGPL-3.0-or-later).
