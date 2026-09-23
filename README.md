# Launchpad

A personal, one-click catalog of RONITERVO’s public GitHub Pages apps.

**Open:** https://ronitervo.github.io/Launchpad/

## How it stays current

- Every page visit and **Refresh apps** fetch all public repositories from GitHub, using `has_pages` to find published sites. Newly enabled sites appear automatically; disabled or deleted sites disappear.
- A GitHub Actions workflow rebuilds the saved catalog daily at 04:23 UTC, on every push, and on manual workflow dispatch. It checks site availability and follows redirects to custom domains.
- The browser shows the saved collection immediately and caches successful discovery locally. If GitHub is temporarily unavailable or rate limited, existing links remain usable.
- One card is shown per hosted repository. Mini-apps remain inside their parent site.
- Pages-enabled repositories with no available launch page are listed under **Also hosted**, with a repository link.
- The Launchpad repository itself is excluded to avoid a self-link.

The public site never receives a token. The scheduled workflow uses GitHub’s built-in repository-scoped token; no personal access token or separate service is needed. Only public repository metadata and public website metadata are published.

## Scope and limitations

Discovery covers public repositories owned by the configured account, including archived or forked repositories when Pages is enabled. Private repositories and organization-owned repositories are not enumerated. All existing Pages repositories on this account were public at setup.

Live browser discovery uses the stable `owner.github.io/repository/` address for new sites. GitHub handles custom-domain redirects. Saved custom-domain URLs and availability are refreshed by the scheduled job. “Checked” reflects repository discovery; the timestamp tooltip also shows when the saved links were checked.

GitHub schedules may be delayed, and GitHub can disable scheduled workflows in a public repository after 60 days without repository activity. Live discovery still runs when the catalog opens. To resume scheduled availability checks, enable the workflow under **Actions → Refresh and publish Launchpad**, or push a change. A failed discovery prevents deployment, preserving the existing published catalog.

## Develop

Requires Node.js 22 or newer. There are no third-party runtime or build dependencies.

```sh
npm run sync
npm test
npm start
```

Open the local URL printed by the server. Set `PORT` to use a specific port; the default chooses an available one.

The static website is in `site/`. Edit `site/config.json` to change the account or catalog repository. For another owner, also update the profile, source links and page metadata in `site/index.html`.

## Deploy

In repository **Settings → Pages**, select **GitHub Actions** as the build source. Push to `main` or manually run **Refresh and publish Launchpad**. Only `site/` is uploaded to Pages.

Relevant GitHub documentation:
- [Repository discovery API](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user)
- [Custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
