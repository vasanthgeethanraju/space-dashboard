"use client";

import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Mission = {
  Company: string;
  Location: string;
  Date: string;
  Time: string;
  Rocket: string;
  Mission: string;
  RocketStatus: string;
  Price: string;
  MissionStatus: string;
};

const STATUS_COLORS: Record<string, string> = {
  Success: "#22d3a5",
  Failure: "#f87171",
  "Partial Failure": "#fbbf24",
  "Prelaunch Failure": "#a78bfa",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [rows, setRows] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Filters
  const [company, setCompany] = useState<string>("All");
  const [status, setStatus] = useState<string>("All");
  const [yearStart, setYearStart] = useState<number>(1957);
  const [yearEnd, setYearEnd] = useState<number>(2022);
  const [search, setSearch] = useState<string>("");

  // Table sort
  const [sortKey, setSortKey] = useState<keyof Mission>("Date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  // Restore theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  // Apply theme class to <html> and persist
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const isDark = theme === "dark";

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  // Chart colors derived from active theme
  const chartColors = {
    axis: isDark ? "#ffffff60" : "#0f172a80",
    grid: isDark ? "#ffffff10" : "#0f172a12",
    tooltipBg: isDark ? "#0a0a0f" : "#ffffff",
    tooltipBorder: isDark ? "#ffffff20" : "#0f172a20",
    tooltipColor: isDark ? "#e7e7ea" : "#0f172a",
  };

  const tooltipStyle = {
    background: chartColors.tooltipBg,
    border: `1px solid ${chartColors.tooltipBorder}`,
    borderRadius: 6,
    fontSize: 12,
    color: chartColors.tooltipColor,
  };

  // Load CSV from /public
  useEffect(() => {
    Papa.parse<Mission>("/space_missions.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setRows(results.data.filter((r) => r.Date && r.Company));
        setLoading(false);
      },
      error: (err) => {
        setError(err.message);
        setLoading(false);
      },
    });
  }, []);

  // Year bounds derived from data
  const { minYear, maxYear, companies } = useMemo(() => {
    if (!rows.length) return { minYear: 1957, maxYear: 2022, companies: [] as string[] };
    let mn = 9999;
    let mx = 0;
    const set = new Set<string>();
    for (const r of rows) {
      const y = parseInt(r.Date.slice(0, 4), 10);
      if (!isNaN(y)) {
        if (y < mn) mn = y;
        if (y > mx) mx = y;
      }
      if (r.Company) set.add(r.Company);
    }
    return { minYear: mn, maxYear: mx, companies: Array.from(set).sort() };
  }, [rows]);

  // Sync slider bounds with data on first load
  useEffect(() => {
    if (rows.length) {
      setYearStart(minYear);
      setYearEnd(maxYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  // Apply filters
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (company !== "All" && r.Company !== company) return false;
      if (status !== "All" && r.MissionStatus !== status) return false;
      const y = parseInt(r.Date.slice(0, 4), 10);
      if (!isNaN(y) && (y < yearStart || y > yearEnd)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.Mission.toLowerCase().includes(q) &&
          !r.Company.toLowerCase().includes(q) &&
          !r.Rocket.toLowerCase().includes(q) &&
          !r.Location.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [rows, company, status, yearStart, yearEnd, search]);

  // Reset page when filters change
  useEffect(() => setPage(1), [company, status, yearStart, yearEnd, search]);

  // ---------- Summary stats ----------
  const stats = useMemo(() => {
    const total = filtered.length;
    const successes = filtered.filter((r) => r.MissionStatus === "Success").length;
    const successRate = total ? (successes / total) * 100 : 0;
    const companySet = new Set(filtered.map((r) => r.Company));
    const rocketSet = new Set(filtered.map((r) => r.Rocket));
    return {
      total,
      successRate,
      companies: companySet.size,
      rockets: rocketSet.size,
    };
  }, [filtered]);

  // ---------- Chart data ----------
  // 1. Missions per year (line)
  const perYear = useMemo(() => {
    const map = new Map<number, { year: number; total: number; success: number }>();
    for (const r of filtered) {
      const y = parseInt(r.Date.slice(0, 4), 10);
      if (isNaN(y)) continue;
      const entry = map.get(y) ?? { year: y, total: 0, success: 0 };
      entry.total += 1;
      if (r.MissionStatus === "Success") entry.success += 1;
      map.set(y, entry);
    }
    return Array.from(map.values()).sort((a, b) => a.year - b.year);
  }, [filtered]);

  // 2. Top 10 companies (bar)
  const topCompanies = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) map.set(r.Company, (map.get(r.Company) ?? 0) + 1);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // 3. Status breakdown (pie)
  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) map.set(r.MissionStatus, (map.get(r.MissionStatus) ?? 0) + 1);
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // 4. Top launch sites (bar)
  const topSites = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of filtered) {
      const parts = r.Location.split(",").map((p) => p.trim());
      const key = parts[parts.length - 1] || r.Location;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ---------- Table ----------
  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: keyof Mission) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <main className="relative z-10 min-h-screen p-8">
        <div className="text-red-400">Failed to load data: {error}</div>
      </main>
    );
  }

  return (
    <main className="relative z-10 min-h-screen px-6 py-10 md:px-12 lg:px-16">
      {/* Header */}
      <header className="mb-12 flex flex-col gap-3 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Insignia />
            <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">
              Mission Archive · 1957 — 2022
            </span>
          </div>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">
            Space Missions
            <span className="block text-cyan-300/90">Operations Dashboard</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 rounded border border-white/15 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-white/70 transition-colors hover:border-cyan-400 hover:text-cyan-300"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
            {isDark ? "Light" : "Dark"}
          </button>
          <div className="font-mono text-xs text-white/50">
            {loading ? "Synchronising telemetry…" : `${rows.length.toLocaleString()} records loaded`}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="font-mono text-sm text-white/60">Loading mission data…</div>
      ) : (
        <>
          {/* Summary tiles */}
          <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Total Missions" value={stats.total.toLocaleString()} accent="cyan" />
            <StatTile
              label="Success Rate"
              value={`${stats.successRate.toFixed(2)}%`}
              accent="emerald"
            />
            <StatTile label="Companies" value={stats.companies.toLocaleString()} accent="amber" />
            <StatTile label="Rocket Models" value={stats.rockets.toLocaleString()} accent="rose" />
          </section>

          {/* Filters */}
          <section className="mb-10 rounded-lg border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
                Filters
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <Field label="Company">
                <select
                  className="filter-input"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                >
                  <option>All</option>
                  {companies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <select
                  className="filter-input"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option>All</option>
                  <option>Success</option>
                  <option>Failure</option>
                  <option>Partial Failure</option>
                  <option>Prelaunch Failure</option>
                </select>
              </Field>

              <Field label={`Year ≥ ${yearStart}`}>
                <input
                  type="range"
                  min={minYear}
                  max={maxYear}
                  value={yearStart}
                  onChange={(e) =>
                    setYearStart(Math.min(parseInt(e.target.value, 10), yearEnd))
                  }
                  className="w-full accent-cyan-400"
                />
              </Field>

              <Field label={`Year ≤ ${yearEnd}`}>
                <input
                  type="range"
                  min={minYear}
                  max={maxYear}
                  value={yearEnd}
                  onChange={(e) =>
                    setYearEnd(Math.max(parseInt(e.target.value, 10), yearStart))
                  }
                  className="w-full accent-cyan-400"
                />
              </Field>

              <Field label="Search">
                <input
                  className="filter-input"
                  placeholder="Mission, rocket, site…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* Charts */}
          <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Launches Per Year" subtitle="Total vs successful">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={perYear} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="year"
                    stroke={chartColors.axis}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                  />
                  <YAxis
                    stroke={chartColors.axis}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#67e8f9"
                    strokeWidth={2}
                    dot={false}
                    name="Total"
                  />
                  <Line
                    type="monotone"
                    dataKey="success"
                    stroke="#22d3a5"
                    strokeWidth={2}
                    dot={false}
                    name="Success"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Top 10 Companies" subtitle="By mission count">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={topCompanies}
                  layout="vertical"
                  margin={{ top: 5, right: 20, bottom: 0, left: 60 }}
                >
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    stroke={chartColors.axis}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={chartColors.axis}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                    width={120}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#fbbf24" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Mission Outcomes" subtitle="Status distribution">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={55}
                    paddingAngle={2}
                  >
                    {statusBreakdown.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={STATUS_COLORS[entry.name] ?? "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<PieTooltip />}
                    position={{ x: 10, y: 10 }}
                    wrapperStyle={{ zIndex: 10 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, color: chartColors.tooltipColor }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Top Launch Regions" subtitle="By number of launches">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topSites} margin={{ top: 5, right: 20, bottom: 50, left: -10 }}>
                  <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke={chartColors.axis}
                    tick={{ fontSize: 10, fill: chartColors.axis }}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    stroke={chartColors.axis}
                    tick={{ fontSize: 11, fill: chartColors.axis }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" fill="#67e8f9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </section>

          {/* Data table */}
          <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
                    Mission Log
                  </h2>
                </div>
                <p className="text-sm text-white/50">
                  {sorted.length.toLocaleString()} matching records
                </p>
              </div>
              <div className="font-mono text-xs text-white/50">
                Page {page} / {totalPages}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left">
                    {(
                      [
                        ["Date", "Date"],
                        ["Company", "Company"],
                        ["Mission", "Mission"],
                        ["Rocket", "Rocket"],
                        ["Location", "Site"],
                        ["MissionStatus", "Status"],
                      ] as [keyof Mission, string][]
                    ).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className="cursor-pointer border-b border-white/10 px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-cyan-300"
                      >
                        {label}
                        {sortKey === key && (
                          <span className="ml-1 text-cyan-300">
                            {sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr key={i} className="hover:bg-white/[0.03]">
                      <td className="border-b border-white/5 px-3 py-2 font-mono text-xs text-white/80">
                        {r.Date}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2 text-white/90">{r.Company}</td>
                      <td className="border-b border-white/5 px-3 py-2 text-white/90">{r.Mission}</td>
                      <td className="border-b border-white/5 px-3 py-2 text-white/70">{r.Rocket}</td>
                      <td className="border-b border-white/5 px-3 py-2 text-xs text-white/60">
                        {r.Location}
                      </td>
                      <td className="border-b border-white/5 px-3 py-2">
                        <StatusPill status={r.MissionStatus} />
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-white/40">
                        No missions match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-white/15 px-3 py-1 font-mono text-xs uppercase tracking-wider text-white/70 hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded border border-white/15 px-3 py-1 font-mono text-xs uppercase tracking-wider text-white/70 hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </section>

          <footer className="mt-12 border-t border-white/10 pt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            Data: space_missions.csv · Built with Next.js + Recharts
          </footer>
        </>
      )}

      <style jsx>{`
        :global(.filter-input) {
          width: 100%;
          background: var(--bg-filter);
          border: 1px solid var(--border-filter);
          border-radius: 4px;
          padding: 0.5rem 0.65rem;
          color: var(--text);
          font-size: 0.85rem;
          outline: none;
          transition: border-color 0.15s;
        }
        :global(.filter-input:focus) {
          border-color: #67e8f9;
        }
        :global(option) {
          background: var(--bg);
          color: var(--text);
        }
      `}</style>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SunIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const color = STATUS_COLORS[name] ?? "#94a3b8";
  return (
    <div
      style={{
        background: "var(--tooltip-bg)",
        border: "1px solid var(--tooltip-border)",
        borderRadius: 6,
        padding: "8px 12px",
        fontSize: 12,
        color: "var(--text)",
      }}
    >
      <span style={{ color }}>{name}</span>
      <span style={{ marginLeft: 8 }}>{value.toLocaleString()}</span>
    </div>
  );
}

function Insignia() {
  return (
    <span
      aria-hidden
      className="relative inline-block h-7 w-7"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, transparent 5px, #67e8f9 5px, #67e8f9 6px, transparent 6px)," +
          "radial-gradient(circle at 50% 50%, transparent 9px, rgba(103,232,249,0.6) 9px, rgba(103,232,249,0.6) 10px, transparent 10px)," +
          "radial-gradient(circle at 50% 50%, transparent 13px, rgba(103,232,249,0.3) 13px, rgba(103,232,249,0.3) 14px, transparent 14px)",
      }}
    >
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-300/50" />
      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-cyan-300/50" />
    </span>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "cyan" | "emerald" | "amber" | "rose";
}) {
  const accentMap = {
    cyan: "text-cyan-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
  };
  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
        {label}
      </div>
      <div className={`mt-2 font-serif text-3xl ${accentMap[accent]}`}>{value}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-4">
        <h3 className="font-serif text-lg text-white/90">{title}</h3>
        {subtitle && (
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#94a3b8";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
      style={{ borderColor: `${color}40`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {status}
    </span>
  );
}
