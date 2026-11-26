# Footnote Matcher

A free, open-source Google Docs add-on that makes all your footnotes look the same. Format one footnote the way you want it, then apply that formatting to every footnote in the document in one click.

## How it works

1. Add footnotes to your Google Doc as you work.
2. Format one footnote the way you want all footnotes to look.
3. Set your preferred options in the extension menu.
4. Select the formatted footnote, then run “Match all footnotes to selection.”
5. If you add more footnotes later, run “Reapply footnote style.”

If the footnote you match from has no font size or spacing of its own, the other footnotes go back to Google Docs' default footnote size and spacing too.

If every footnote already has the formatting, nothing changes and a short message says the footnotes already match.

Footnotes added in suggesting mode aren't formatted until the suggestion is accepted, because Google Docs doesn't let add-ons see suggested content. Accept the suggestion, then choose **Reapply footnote style**.

### Saved style

To keep a style you can go back to after experimenting, put the cursor in a footnote formatted that way and choose **Save selection as saved style**. Nothing changes yet. Later, choose **Apply saved style** to make every footnote match it. Saving and applying it doesn't affect **Reapply footnote style**, which always uses your last match.

### Settings

To leave some formatting alone, choose **Extensions → Footnote Matcher → Settings** and uncheck it. You can turn off font, size, text color, highlight, line spacing, space before/after, alignment, or indents, and footnotes will keep their own values for anything that's off. **Bold** and **Italic** start off; turn them on to make every footnote match the bold or italics of the one you match from (this also removes italicized titles). **Allow matching from body text** also starts off, so Match only copies formatting from inside a footnote; turn it on if you want to match footnotes to your body text. Settings are saved in each document and take effect the next time you match or reapply. **Reset to defaults** puts every checkbox back the way it started; click **Save** to keep it.

## Privacy

Footnote Matcher only works on the document you have open. It doesn't send your data anywhere and doesn't collect analytics. Your last match, your saved style, and your Settings choices are stored with that document (in its Apps Script document properties), not in your Google account. If an error occurs, only the error message, never your document's text, is logged for the developer.

## Credits

Inspired by [Footnote Style](https://github.com/davidrthorn/footnote-style) by David Thorn, which is no longer available on the Google Workspace Marketplace. Footnote Matcher is a new implementation and doesn't include Footnote Style's code.

## Contributing

Bug reports, testing, and pull requests are welcome. To get started:

- **Found a bug or have an idea?** [Open an issue](https://github.com/Tanman310/Footnote-Matcher/issues/new/choose).
- **Want to contribute code?** Read [CONTRIBUTING.md](CONTRIBUTING.md) for setup (copy the code into your own Google Apps Script project; nothing to install), testing, and scope. The behavior spec is in [`docs/SPEC.md`](docs/SPEC.md).
- **Found a security problem?** Report it privately as described in [SECURITY.md](SECURITY.md).

Everyone taking part is expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Footnote Matcher is licensed under the [GNU Affero General Public License v3.0 or later](LICENSE) (AGPL-3.0-or-later).

You're free to use, study, change, and share it. If you distribute a modified version, or run one that other people use over a network (for example, by publishing it as an add-on), you must release your changes under the same license and offer users the source code. That keeps every version of Footnote Matcher free and open.
