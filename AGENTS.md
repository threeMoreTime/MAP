# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a static HTML dashboard (全国城市地铁客流数据可视化大屏) for Chinese metro ridership data. It uses ECharts for visualization and has no backend services or databases.

### Services

| Service | Command | Purpose |
|---------|---------|---------|
| Static HTTP server | `python3 -m http.server 8000` | Serves `dashboard.html` at http://localhost:8000/dashboard.html |

### Testing

Run the full acceptance suite (data validation + syntax check + 16 browser tests):

```bash
CHROME_PATH=/usr/local/bin/google-chrome python3 scripts/run_acceptance.py
```

Or run individual steps:
- Data validation: `python3 scripts/validate_data.py`
- JS syntax check: `python3 scripts/check_dashboard_syntax.py`
- Browser tests only: `CHROME_PATH=/usr/local/bin/google-chrome node scripts/acceptance_dashboard.js`

### Important caveats

- **Chrome path**: The `CHROME_PATH` environment variable must be set to `/usr/local/bin/google-chrome` for Puppeteer browser acceptance tests. The test script also checks `PUPPETEER_EXECUTABLE_PATH`.
- **No lint tool**: There is no standalone ESLint or linter configured. The JS syntax check uses `node --check` via `scripts/check_dashboard_syntax.py` which extracts inline `<script>` blocks from `dashboard.html`.
- **No build step**: The dashboard is a single self-contained HTML file; there is no build/compile step.
- **Acceptance tests start their own server**: The browser acceptance script (`acceptance_dashboard.js`) starts its own static server on port 8199 internally—you do not need to start a separate server for it.
- **Data warnings are expected**: 8 cities have `daily_ridership_wan = 0` which generates warnings (not errors) during data validation. This is expected.
