# Mockups

Static review screens backed by the root-level `/data/` JSON mirror.

## Screens

- `index.html` — mockup launcher
- `race-selector.html` — faction, body type, race, class availability, and racial review
- `talent-calculator.html` — class/spec browser and five-point talent calculator

## Running Locally

Serve the repository root with any static HTTP server, then open `/mockup/`.

For example:

```bash
python -m http.server 8000
```

Then browse to `http://localhost:8000/mockup/`.

The screens use `fetch()` to load JSON from `/data/`, so opening the HTML directly with the `file://` protocol may be blocked by the browser.
