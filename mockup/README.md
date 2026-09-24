# Mockups

Static review screens backed by the root-level `/data/` JSON mirror.

## Screens

- `index.html` — mockup launcher
- `race-selector.html` — faction, body type, race, class availability, and racial review
- `talent-calculator.html` — class/spec browser and five-point talent calculator

## Development

From the repository root:

```bash
npm run dev
```

No package installation is required.

Every run performs a full local prototype reset:

1. tears down the previously recorded Warcraft dev server, if one is still running
2. deletes and rebuilds `/data/` directly from `/docs/`
3. regenerates the race and class prototype indexes
4. starts the static server
5. uses port 5173 when available, otherwise automatically selects the next available port

You do not need to find or kill ports manually. Running `npm run dev` again replaces the previous Warcraft dev instance.

The active URL is printed when startup completes, and the root URL redirects to `/mockup/`.

`HOST` and `PORT` can still be supplied when needed, but occupied ports are handled automatically.
