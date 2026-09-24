# Mockups

Static review screens backed by the root-level `/data/` JSON mirror.

## Screens

- `index.html` — mockup launcher
- `race-selector.html` — faction, body type, race, class availability, and racial review
- `talent-calculator.html` — class/spec browser and five-point talent calculator

## Running Locally

From the repository root:

```bash
npm run dev
```

No package installation is required. The dev command uses Node's built-in HTTP server.

The server defaults to:

```text
http://127.0.0.1:5173/
```

Opening the root URL redirects to `/mockup/`.

Environment overrides are supported:

```bash
PORT=8000 npm run dev
HOST=0.0.0.0 npm run dev
```

The mockups load their prototype data from the root-level `/data/` directory.
