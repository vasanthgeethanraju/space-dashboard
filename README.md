# Space Missions Dashboard

An interactive dashboard for exploring 4,600+ historical space launches from 1957 to 2022, plus a Python module exposing the eight required analysis functions for programmatic grading.

**Live demo:** _add Vercel URL after deploying_

---

## Stack

- **Dashboard:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Recharts · PapaParse
- **Analysis functions:** Python 3 (standard library only — no pandas dependency)

The dashboard is a fully client-side single page that fetches `public/space_missions.csv` and computes everything in the browser. This keeps the Vercel deploy zero-config and the repository self-contained.

---

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Run the Python functions:

```bash
python3 space_missions.py
```

This executes the built-in self-test and prints the result of each of the eight required functions.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **New Project** → import the repo.
3. Framework preset auto-detects as **Next.js**. No env vars, no build overrides — just deploy.

The `public/space_missions.csv` file ships with the build, so the dashboard works immediately on the deployed URL.

---

## Required functions

All eight functions live in [`space_missions.py`](./space_missions.py) with the **exact camelCase signatures** specified in the case study and floats rounded to **2 decimal places** as specified.

| Function | Description |
|---|---|
| `getMissionCountByCompany(companyName: str) -> int` | Total missions for a company |
| `getSuccessRate(companyName: str) -> float` | Success rate as percentage (0–100), 2 dp |
| `getMissionsByDateRange(startDate: str, endDate: str) -> list` | Mission names in a date range, chronological |
| `getTopCompaniesByMissionCount(n: int) -> list` | Top N companies as `(name, count)` tuples |
| `getMissionStatusCount() -> dict` | Counts by mission status |
| `getMissionsByYear(year: int) -> int` | Total missions in a given year |
| `getMostUsedRocket() -> str` | Most-used rocket (alphabetical tie-break) |
| `getAverageMissionsPerYear(startYear, endYear) -> float` | Avg missions/year over a range, 2 dp |

Edge cases handled:

- Empty / non-string company names return `0` or `0.0`
- Invalid date strings or `start > end` return empty list / `0.0`
- Companies with no missions return `0.0` from `getSuccessRate`
- Non-int `year` / `n` arguments return safe defaults
- Rocket-name tie-breaking is deterministic (alphabetical)
- CSV is loaded once and cached, so calling functions in sequence is fast

---

## Why these visualizations

The case study asks for at least three. I included four because each answers a question the others can't.

**1. Launches Per Year (line chart)** — Two overlaid lines: total launches and successful launches per year. A line chart is the right choice for time-series with continuous evolution; you can see the Cold War cadence, the post-Soviet dip, the SpaceX-era resurgence, and the gap between attempts and successes all at once.

**2. Top 10 Companies (horizontal bar)** — Horizontal orientation because company names are long and would overlap badly on a vertical x-axis. Sorted descending so the eye lands on the leader first. This is the canonical "who launched the most" question.

**3. Mission Outcomes (donut chart)** — A part-to-whole comparison across only 4 categories with one dominant slice (Success). Donut over pie because the inner ring leaves room for clearer legends and feels less chart-junky. With more than ~6 categories I'd switch to a bar.

**4. Top Launch Regions (vertical bar)** — Aggregated by the last comma-separated segment of the `Location` field, which is usually the country/region. Vertical bars work here because there are only 8 of them and the labels are short. This shows geographic concentration at a glance.

All four respect the active filters, so the user can drill down (e.g., "show me only SpaceX" or "only failures since 2010") and watch every chart update in sync.

---

## Dashboard features

- **Summary tiles:** total missions, success rate, distinct companies, distinct rocket models — all reactive to filters
- **Filters:** company dropdown, status dropdown, dual year sliders (min and max), free-text search across mission/rocket/site
- **Sortable, paginated data table** (25 rows/page) with click-to-sort headers and a status pill column
- **Dark mission-control aesthetic:** Fraunces serif for editorial headings, JetBrains Mono for telemetry-feel labels, cyan/amber/emerald accents on a near-black canvas with a subtle starfield
- **Dark / Light theme toggle:** a persistent sun/moon button in the header switches between a near-black dark mode and a light indigo-tinted mode; the choice is saved to `localStorage` so it survives page reloads

---

## Project structure

```
.
├── app/
│   ├── globals.css      # Tailwind + starfield background
│   ├── layout.tsx       # Fonts (Fraunces, JetBrains Mono) + metadata
│   └── page.tsx         # Dashboard (single client component)
├── public/
│   └── space_missions.csv
├── space_missions.py    # 8 required analysis functions
├── space_missions.csv   # Same file as public/, for the Python script
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── next.config.js
```

---

## AI assistance disclosure

I used AI assistance (Claude) for the initial scaffold of this project — project setup, component structure, and chart wiring. The analysis logic, visualisation choices, and feature decisions are my own.

