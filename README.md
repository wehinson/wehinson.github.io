# Country Duel (Double-Click Run)

You can run this prototype with **no terminal**.

## Double-click option
1. Open this project folder.
2. Double-click `index.html`.
3. The app opens in your browser.

## If the browser blocks local scripts
Some browsers are strict with local files. If you see a blank page:
- Right-click `index.html` and choose **Open With** → **Chrome** or **Edge**.
- If it still fails, use a local server as fallback.

## Fallback (terminal)
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.
