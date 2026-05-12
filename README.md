# Country Ranker

This is a static version of the country comparison tool. It keeps the same ELO-style comparison flow underneath, including:

- choosing one country gives that country a normal ELO win against the other country
- `Hard to choose` gives both countries a small `+4` ELO boost
- `Skip pair` simply moves to another matchup and does not change ratings

Open `index.html` in a browser to use it. The current data was generated from `countries_with_summaries_v2.xlsx`.

## Local Passcodes

Progress is saved in this browser with a generated six-digit passcode. A passcode restores progress on the same computer/browser and same site address only for now. Partner mode uses one shared passcode with separate named rankings.

The saved session shape is intentionally ready for a later Cloudflare storage swap: the app stores profile ratings and rounds separately from the country data.

Passcodes are six digits only, such as `482913`.

## Cloudflare Pages

This app has no build step. To publish it on Cloudflare Pages, upload or connect this folder as a static site with `index.html` at the root.

Local saves will be tied to the Cloudflare Pages domain after upload. Cross-device passcodes will require a later Cloudflare Worker plus KV or D1 storage.

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
