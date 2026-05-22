# Country Ranker

This is a static version of the country comparison tool. It keeps the same ELO-style comparison flow underneath, including:

- choosing one country gives that country a normal ELO win against the other country
- `Hard to choose` gives both countries a small `+4` ELO boost
- `Skip pair` simply moves to another matchup and does not change ratings

The current data was generated from `countries_with_summaries_v2.xlsx`.

## Online Passcodes

Progress is saved online through a Cloudflare Pages Function backed by Cloudflare KV. Partner mode uses one shared six-digit passcode with separate named rankings, loved countries, comments, and donation-link preferences for each person.

The browser no longer uses localStorage or cookies as the save system. If the Cloudflare API is not deployed yet, the app can load visually but passcodes cannot create, save, or restore sessions.

Passcodes are six digits only, such as `482913`.

## Cloudflare Pages Setup

This app has no build step. To publish it on Cloudflare Pages, upload or connect this folder with `index.html` at the root.

1. Create a Cloudflare Pages project from this folder.
2. Create a KV namespace in Cloudflare named something like `country-ranker-sessions`.
3. In the Pages project settings, add a KV binding named `KV_BINDING`, `SESSIONS`, or `KV` and connect it to that namespace. The included `wrangler.jsonc` already declares `KV_BINDING`.
4. Deploy the Pages project. The file `functions/api/sessions/[[path]].js` becomes the online save API at `/api/sessions`.
5. Open the deployed site, create a ranking, copy the six-digit passcode, then load that same passcode from another browser/device.

For local Cloudflare testing, install Wrangler and run `npx wrangler pages dev .`. Opening the plain `index.html` file directly will not have the Cloudflare KV API.

## Country Data Format

The permanent place to update content is `js/country-data.js`:

```json
[
  {
    "id": "japan",
    "name": "Japan",
    "summary": "Your country summary here.",
    "photos": [
      "https://example.com/photo-1.jpg",
      "https://example.com/photo-2.jpg",
      "https://example.com/photo-3.jpg",
      "https://example.com/photo-4.jpg",
      "https://example.com/photo-5.jpg"
    ]
  },
  {
    "id": "italy",
    "name": "Italy",
    "summary": "Your country summary here.",
    "photos": [
      "https://example.com/photo-1.jpg",
      "https://example.com/photo-2.jpg",
      "https://example.com/photo-3.jpg",
      "https://example.com/photo-4.jpg",
      "https://example.com/photo-5.jpg"
    ]
  }
]
```

`id` is optional. `name`, `summary`, and `photos` are the main fields. You can include up to 20 photos per country. The app shows the first four and adds a `More photos` button when there are extra images.

Spreadsheet-style columns named `photo1`, `photo2`, `photo3`, and so on through `photo20` also work. If you only have one image, the older `photo` field still works and the app will repeat it into the four-photo preview.
