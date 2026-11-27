# Releasing Footnote Matcher

Each release has a version number, an entry in [`CHANGELOG.md`](../CHANGELOG.md), a git tag, a GitHub Release, and one Apps Script deployment version. This makes it possible to tell which code on GitHub is running for users.

## Version numbers

Footnote Matcher uses [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`.

- **PATCH** (`1.0.1`): bug fixes that don't change how the add-on is used.
- **MINOR** (`1.1.0`): new features or settings; existing documents keep working as before.
- **MAJOR** (`2.0.0`): changes that make existing documents behave differently, for example a changed default, or stored styles or settings that are no longer read.

The first Marketplace release is `v1.0.0`.

## Release checklist

1. **Test.** In a test document (for example one converted from [`test/footnote-matcher-test-100.docx`](../test/footnote-matcher-test-100.docx)), work through the acceptance checklist in [`docs/SPEC.md`](SPEC.md) with the code on `main`.
2. **Check the automated tests.** The **Tests** workflow passes on `main`.
3. **Update the changelog.** In `CHANGELOG.md`, choose the version from the changes listed under **Unreleased**. Rename **Unreleased** to the version and date, for example `## [1.0.0] - 2027-01-15`, and add a new empty **Unreleased** section above it. Update the links at the bottom of the file:
   ```markdown
   [Unreleased]: https://github.com/Tanman310/Footnote-Matcher/compare/v1.0.0...HEAD
   [1.0.0]: https://github.com/Tanman310/Footnote-Matcher/releases/tag/v1.0.0
   ```
   Merge this change into `main` with a pull request.
4. **Tag the release.** On the merged commit:
   ```bash
   git switch main
   git pull
   git tag -a v1.0.0 -m "Footnote Matcher 1.0.0"
   git push origin v1.0.0
   ```
5. **Publish the GitHub Release.** Pushing the tag runs the **Release** workflow (`.github/workflows/release.yml`), which creates a draft release titled with the tag (`v1.0.0`), with the version's changelog entry as the description. Versions with a pre-release suffix, such as `v1.1.0-beta.1`, are marked as pre-releases. The workflow stops with an error, and creates nothing, if the tag isn't a version, the tagged commit isn't on `main`, the changelog has no entry for the version, or a release for the tag already exists. On the repository's **Releases** page, review the draft and choose **Publish release**.
6. **Deploy in Apps Script.** Copy the tagged files from `src/` into the add-on's Apps Script project. Choose **Deploy → Manage deployments**, edit the add-on's deployment, choose **New version**, and use the tag as the description (for example `v1.0.0`).

   The first time, there's no deployment to edit yet. The Apps Script project must first be linked to the add-on's Google Cloud project (**Project Settings → Google Cloud Platform (GCP) Project → Change project**, with the Cloud project's number), because the default, Apps Script-managed project can't be used to publish. Then choose **Deploy → New deployment**, select the **Add-on** type, use the tag as the description, and choose **Deploy**. Note the version number it creates: the Marketplace SDK needs it, together with the script ID from **Project Settings**.
7. **Update the Marketplace listing.** In the Google Workspace Marketplace SDK (Google Cloud console), set the app configuration's version to the new Apps Script version, and update the listing text and screenshots if the menu or Settings changed. The listing text and images are kept in [`docs/marketplace/`](marketplace/LISTING.md).
