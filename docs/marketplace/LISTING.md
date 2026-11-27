# Google Workspace Marketplace listing

The text and settings for Footnote Matcher's listing on the Google Workspace Marketplace, kept here so changes to the listing are reviewed like changes to the code. When the add-on's menu, Settings, or data handling changes, update this file, the [website](../../site/) and the listing together.

## Images

| File | Use | Size |
| --- | --- | --- |
| [`icon-32.png`](icon-32.png) | Application icon | 32 × 32 |
| [`icon-128.png`](icon-128.png) | Application icon | 128 × 128 |
| [`banner-220x140.png`](banner-220x140.png) | Application card banner | 220 × 140 |

The PNGs are made from [`icon.svg`](icon.svg) and [`banner.svg`](banner.svg), which are the files to edit. The banner's "Footnote Matcher" lettering is [Pinyon Script](https://fonts.google.com/specimen/Pinyon+Script) (SIL Open Font License 1.1), converted to outlines so the SVG looks the same without the font installed; the icon's numerals are DejaVu Serif Bold, also as outlines. The website uses the same icon ([`site/assets/icon.svg`](../../site/assets/icon.svg)). To make the PNGs again after editing an SVG:

```bash
rsvg-convert -w 32 -h 32 icon.svg -o icon-32.png
rsvg-convert -w 128 -h 128 icon.svg -o icon-128.png
rsvg-convert -w 220 -h 140 banner.svg -o banner-220x140.png
```

### Screenshots

The listing needs 1 to 10 screenshots, at least one showing the add-on in Google Docs. Take them at 1280 × 800 (640 × 400 and 2560 × 1600 are also accepted), with square corners and no padding, in a document with no personal information, such as one converted from [`test/footnote-matcher-test-100.docx`](../../test/footnote-matcher-test-100.docx):

1. The **Extensions → Footnote Matcher** menu open in a document.
2. Footnotes before matching, with mixed fonts, sizes and colors.
3. The same footnotes after **Match all footnotes to selection**.
4. The **Settings** dialog.

## App details

**Application name:** Footnote Matcher

This must match the app name on the OAuth consent screen.

**Short description** (200 characters or fewer):

> Make every footnote in a Google Doc look the same. Format one footnote, then apply its font, size, color, spacing and indents to all the others in one click. Free and open source.

**Detailed description** (must differ from the short description):

> Footnote Matcher makes every footnote in your document look the same. Format one footnote the way you want, click inside it, and choose Match all footnotes to selection. Its font, size, text color, highlight, underline, strikethrough, link styling, line spacing, space before and after, alignment and indents are applied to every footnote, in every tab. Italicized titles, bold text, links and lists inside footnotes are kept.
>
> When you add more footnotes later, choose Reapply footnote style to format them the same way.
>
> More ways to use it:
> • Reapply to selected footnote changes only the footnote you click in, or the footnotes whose numbers are in the text you select.
> • Save selection as saved style keeps a style you can return to with Apply saved style.
> • Settings let you choose which kinds of formatting to leave alone, so footnotes can keep their own fonts, indents or anything else. Settings are saved in each document.
>
> Privacy: Footnote Matcher only works on the document you have open. It doesn't send your data anywhere and doesn't collect analytics. It stores only your footnote style and settings, inside that document.
>
> Footnote Matcher is free and open source under the GNU Affero General Public License v3.0 or later, with no ads or paid features. Source code: https://github.com/Tanman310/Footnote-Matcher

**Category:** Productivity (or the closest writing or productivity category the Marketplace SDK offers)

**Pricing:** Free

## Links

| Field | URL |
| --- | --- |
| Terms of service | https://footnote-matcher.miller310.com/terms.html |
| Privacy policy | https://footnote-matcher.miller310.com/privacy.html |
| Support | https://footnote-matcher.miller310.com/support.html |
| Help (optional) | https://github.com/Tanman310/Footnote-Matcher#readme |
| Report issue (optional) | https://github.com/Tanman310/Footnote-Matcher/issues/new/choose |

The OAuth consent screen uses the same privacy policy and terms URLs, with https://footnote-matcher.miller310.com/ as the home page and `miller310.com` as the authorized domain.

## App configuration (Marketplace SDK)

| Setting | Value |
| --- | --- |
| App visibility | Public |
| Installation settings | Individual + admin install |
| App integration | Docs add-on (Editor add-on) |
| Script ID and version | The production Apps Script project's script ID and the version number of its add-on deployment |
| OAuth scopes | `https://www.googleapis.com/auth/documents.currentonly`<br>`https://www.googleapis.com/auth/script.container.ui` |

The scopes must match `src/appsscript.json` and the OAuth consent screen's data access list.
