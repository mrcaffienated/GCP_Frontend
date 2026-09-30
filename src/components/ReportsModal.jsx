import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, TrendingUp, TrendingDown, IndianRupee,
  BarChart2, ChevronDown, Hash, Calendar, CheckCircle2,
} from "lucide-react";
import { useSwipeToDismiss } from "../hooks/useSwipeToDismiss";

// ── Date helpers ──────────────────────────────────────────────────────────────
function toDisplay(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function parseDateInput(raw, isBackspace = false) {
  let digits = raw.replace(/\D/g, "");
  if (!isBackspace) {
    if (digits.length >= 1 && parseInt(digits[0]) > 3) digits = "0" + digits;
    if (digits.length >= 3 && parseInt(digits[2]) > 1) digits = digits.slice(0, 2) + "0" + digits.slice(2);
  }
  digits = digits.slice(0, 8);
  let display;
  if (digits.length <= 2) display = digits;
  else if (digits.length <= 4) display = digits.slice(0, 2) + "/" + digits.slice(2);
  else display = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
  if (!isBackspace && digits.length === 2) display += "/";
  if (!isBackspace && digits.length === 4) display += "/";
  let iso = "";
  if (digits.length === 8) {
    const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8);
    iso = `${y}-${m}-${d}`;
  } else if (!isBackspace && digits.length === 6) {
    const d = digits.slice(0, 2), m = digits.slice(2, 4), yy = digits.slice(4, 6);
    const year = parseInt(yy) <= 50 ? "20" + yy : "19" + yy;
    iso = `${year}-${m}-${d}`;
    display = `${d}/${m}/${year}`;
  }
  return { display, iso };
}

function DateField({ label, value, onChange }) {
  const [display, setDisplay] = useState(() => toDisplay(value));
  const valid = !!value;
  function handleChange(e) {
    const isBackspace = e.target.value.length < display.length;
    const { display: d, iso } = parseDateInput(e.target.value, isBackspace);
    setDisplay(d);
    if (iso) onChange(iso);
    else if (d === "") onChange("");
  }
  return (
    <div>
      <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="text" inputMode="numeric" value={display} onChange={handleChange}
          placeholder="DD/MM/YY" maxLength={10}
          className={`w-full bg-neutral-800 border text-slate-200 rounded-xl px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 font-mono transition-all placeholder-neutral-600 ${
            valid
              ? "border-emerald-500/50 focus:ring-emerald-500/30"
              : "border-neutral-700 focus:ring-amber-500/30 focus:border-amber-500/40"
          }`}
        />
        <AnimatePresence>
          {valid && (
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
              className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function useLockBodyScroll() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);
}

const PERIODS = ["Today", "This Week", "This Month", "Last Month", "All Time", "Custom"];

function getRange(period, customStart, customEnd) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (period === "Today") return { start: todayStr, end: todayStr };
  if (period === "This Week") {
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return { start: mon.toISOString().split("T")[0], end: todayStr };
  }
  if (period === "This Month") {
    return { start: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, end: todayStr };
  }
  if (period === "Last Month") {
    const d = new Date(now.getFullYear(), now.getMonth(), 0);
    return {
      start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      end: d.toISOString().split("T")[0],
    };
  }
  if (period === "All Time") return { start: "0000-01-01", end: "9999-12-31" };
  if (period === "Custom") return { start: customStart, end: customEnd };
  return { start: todayStr, end: todayStr };
}

function inRange(dateStr, start, end) {
  if (!dateStr || !start || !end) return false;
  return dateStr >= start && dateStr <= end;
}

// Series S → serial range [(S-1)*100+1, S*100]  e.g. Series 43 = 4201–4300
function seriesToRange(s) {
  const n = parseInt(s, 10);
  if (!n || n < 1) return null;
  return { from: (n - 1) * 100 + 1, to: n * 100 };
}

// Which series group does a serial belong to? (upper-limit convention)
// Serial 4300 → ceil(4300/100) = 43
function serialToSeries(serial_no) {
  const n = parseInt(serial_no, 10);
  if (!n || n <= 0) return null;
  return Math.ceil(n / 100);
}

function effectiveMonths(entryDate, endDate) {
  const start = new Date(entryDate), end = new Date(endDate);
  const totalDays = Math.round((end - start) / 86400000);
  if (totalDays < 15) return 0.5;
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const check = new Date(start); check.setMonth(check.getMonth() + months);
  if (check > end) months--;
  months = Math.max(0, months);
  const after = new Date(start); after.setMonth(after.getMonth() + months);
  const remDays = Math.round((end - after) / 86400000);
  return months + (remDays <= 0 ? 0 : remDays < 15 ? 0.5 : 1);
}

function calcReleaseAmount(loanAmount, interestRate, entryDate, endDate) {
  const em = effectiveMonths(entryDate, endDate);
  const monthlyRate = parseFloat(interestRate) / 100;
  const annualRate = monthlyRate * 12;
  const fullYears = Math.floor(em / 12);
  const remMonths = em % 12;
  const afterYears = parseFloat(loanAmount) * Math.pow(1 + annualRate, fullYears);
  return afterYears * (1 + monthlyRate * remMonths);
}

// ── Metal filter helpers (gold / silver / all) ────────────────────────────────
// "Both" entries are split into their gold and silver portions.
function matchesMetal(p, metal) {
  if (metal === "gold")   return p.collateral_type === "gold"   || p.collateral_type === "both";
  if (metal === "silver") return p.collateral_type === "silver" || p.collateral_type === "both";
  return true;
}
// Loan principal attributable to the selected metal.
function loanFor(p, metal) {
  if (metal === "gold") {
    if (p.collateral_type === "gold") return parseFloat(p.loan_amount || 0);
    if (p.collateral_type === "both") return parseFloat(p.loan_amount_gold || 0);
    return 0;
  }
  if (metal === "silver") {
    if (p.collateral_type === "silver") return parseFloat(p.loan_amount || 0);
    if (p.collateral_type === "both") return parseFloat(p.loan_amount_silver || 0);
    return 0;
  }
  return parseFloat(p.loan_amount || 0);
}
// Interest rate for the selected metal (null → no interest contribution).
function rateFor(p, metal) {
  if (metal === "gold") {
    if (p.collateral_type === "gold") return p.interest_rate;
    if (p.collateral_type === "both") return p.interest_rate_gold;
    return null;
  }
  if (metal === "silver") {
    if (p.collateral_type === "silver") return p.interest_rate;
    if (p.collateral_type === "both") return p.interest_rate_silver;
    return null;
  }
  return p.interest_rate;
}

function fmtINR(n) {
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function fmtINRCompact(n) {
  if (n >= 1_00_000) return "₹" + (n / 1_00_000).toFixed(1) + "L";
  if (n >= 1000)     return "₹" + (n / 1000).toFixed(0) + "K";
  return "₹" + Math.round(n);
}

function SummaryCard({ label, value, sub, icon: Icon, accent, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl p-5 border ${accent}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 leading-tight">{label}</p>
        {Icon && <Icon className="w-4 h-4 opacity-40" />}
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="text-xs mt-1.5 opacity-50 truncate">{sub}</p>}
    </motion.div>
  );
}

// ── Series Line Chart ─────────────────────────────────────────────────────────
function SeriesLineChart({ data, onPointClick }) {
  const [hovered, setHovered] = useState(null);

  if (!data || data.length === 0)
    return <p className="text-sm text-neutral-600 text-center py-6">No series data available.</p>;

  const W = 560, H = 200;
  const PAD = { top: 16, right: 16, bottom: 32, left: 56 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top  - PAD.bottom;

  const maxAmt = Math.max(...data.map(d => d.amount), 1);

  // Scale helpers
  const xPos = (i) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const yPos = (amt) => PAD.top + plotH - (amt / maxAmt) * plotH;

  // Build smooth cubic bezier path
  function smoothPath(pts) {
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];
      const cpx = (p0.x + p1.x) / 2;
      d += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }

  const points = data.map((d, i) => ({ x: xPos(i), y: yPos(d.amount), ...d }));
  const linePath = smoothPath(points);

  // Area path (close along bottom)
  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${PAD.top + plotH}` +
    ` L ${points[0].x} ${PAD.top + plotH} Z`;

  // Y-axis grid lines
  const Y_TICKS = 4;
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => ({
    value: (maxAmt / Y_TICKS) * i,
    y: yPos((maxAmt / Y_TICKS) * i),
  }));

  return (
    <div className="relative select-none">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 220 }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#f59e0b" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
          </linearGradient>
          <filter id="dotGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines + Y labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={t.y} x2={PAD.left + plotW} y2={t.y}
              stroke="#262626" strokeWidth={1} />
            <text x={PAD.left - 6} y={t.y} textAnchor="end" dominantBaseline="middle"
              fontSize={9} fill="#525252" fontFamily="sans-serif">
              {fmtINRCompact(t.value)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#lineAreaGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />

        {/* X-axis labels + hover targets */}
        {points.map((pt, i) => {
          const showLabel = data.length <= 10 || i % Math.ceil(data.length / 10) === 0 || i === data.length - 1;
          return (
            <g key={pt.series}>
              {/* Invisible hover/click zone */}
              <rect
                x={pt.x - (plotW / data.length) / 2}
                y={PAD.top}
                width={plotW / data.length}
                height={plotH}
                fill="transparent"
                style={{ cursor: onPointClick ? "pointer" : "crosshair" }}
                onMouseEnter={() => setHovered(i)}
                onClick={() => onPointClick && onPointClick(pt.from, pt.to, pt.label)}
              />
              {/* Dot */}
              <circle cx={pt.x} cy={pt.y} r={hovered === i ? 5 : 3}
                fill={hovered === i ? "#fbbf24" : "#f59e0b"}
                stroke={hovered === i ? "#fef3c7" : "#1a1a1a"}
                strokeWidth={hovered === i ? 2 : 1.5}
                filter={hovered === i ? "url(#dotGlow)" : undefined}
                style={{ transition: "r 0.1s, fill 0.1s" }}
              />
              {/* X label */}
              {showLabel && (
                <text x={pt.x} y={PAD.top + plotH + 18} textAnchor="middle"
                  fontSize={9} fill={hovered === i ? "#fbbf24" : "#525252"}
                  fontFamily="monospace" fontWeight={hovered === i ? "700" : "400"}>
                  {pt.label}
                </text>
              )}
              {/* Vertical crosshair on hover */}
              {hovered === i && (
                <line x1={pt.x} y1={PAD.top} x2={pt.x} y2={PAD.top + plotH}
                  stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" opacity={0.4} />
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && points[hovered] && (() => {
        const leftPct = (points[hovered].x / W) * 100;
        const topPct  = (points[hovered].y / 220) * 100;
        // Horizontal: snap left near left edge, snap right near right edge
        const xShift = leftPct < 18 ? "4px" : leftPct > 82 ? "calc(-100% - 4px)" : "-50%";
        // Vertical: flip below point when point is in upper 35% of chart
        const yShift = topPct < 35 ? "12px" : "calc(-100% - 12px)";
        return (
          <div
            className="absolute pointer-events-none bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs shadow-xl z-10"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: `translate(${xShift}, ${yShift})`,
              whiteSpace: "nowrap",
            }}
          >
            <p className="font-mono font-bold text-amber-400">Series {points[hovered].label}</p>
            <p className="text-neutral-400">{points[hovered].from}–{points[hovered].to}</p>
            <p className="text-emerald-400 font-semibold mt-0.5">{fmtINR(points[hovered].amount)}</p>
            <p className="text-neutral-500">{points[hovered].count} entries</p>
            {onPointClick && <p className="text-amber-500/70 mt-1 text-[10px]">↗ Click to view entries</p>}
          </div>
        );
      })()}

      {/* Axis labels */}
      <div className="flex justify-between mt-1 px-14">
        <span className="text-[9px] text-neutral-600 uppercase tracking-widest">Series</span>
        <span className="text-[9px] text-neutral-600 uppercase tracking-widest">Amount →</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReportsModal({ pawns, loading = false, isBoss, bossStats, onClose, onSeriesClick }) {
  useLockBodyScroll();
  const { dragHandleProps, sheetProps } = useSwipeToDismiss(onClose);

  // Cancelled bills stay in record COUNTS (entries), but their loan amount and
  // interest are excluded from every ₹ total (interest is waived on cancellation).

  const [filterTab, setFilterTab]     = useState("date");
  const [metalFilter, setMetalFilter] = useState("all"); // all | gold | silver
  const [period, setPeriod]           = useState("This Month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [seriesInput, setSeriesInput] = useState("");
  const [showEntries, setShowEntries] = useState(false);
  const [showReleases, setShowReleases] = useState(false);
  const [showSeriesChart, setShowSeriesChart] = useState(false);

  const seriesRange = seriesInput ? seriesToRange(seriesInput) : null;

  function switchPeriod(p) {
    setPeriod(p);
    if (p !== "Custom") { setCustomStart(""); setCustomEnd(""); }
  }

  const { start, end } = getRange(period, customStart, customEnd);
  const dateReady = period !== "Custom" || (customStart && customEnd);

  // ── Date-tab stats ────────────────────────────────────────────────────────
  const dateStats = useMemo(() => {
    if (!dateReady) return null;
    const newEntries = pawns.filter(p => inRange(p.entry_date, start, end) && matchesMetal(p, metalFilter));
    const releases   = pawns.filter(p => p.is_released && !p.is_cancelled && inRange(p.released_date, start, end) && matchesMetal(p, metalFilter));
    const active     = newEntries.filter(p => !p.is_released && !p.is_sold && !p.is_cancelled);
    const loansGiven = newEntries.reduce((s, p) => s + (p.is_cancelled ? 0 : loanFor(p, metalFilter)), 0);
    const amountReleased = releases.reduce((s, p) => s + loanFor(p, metalFilter), 0);
    const interestCollected = releases.reduce((s, p) => {
      const rate = rateFor(p, metalFilter);
      if (!rate || !p.entry_date || !p.released_date) return s;
      const amt = loanFor(p, metalFilter);
      return s + (calcReleaseAmount(amt, rate, p.entry_date, p.released_date) - amt);
    }, 0);
    return { newEntries, releases, active, loansGiven, amountReleased, interestCollected };
  }, [pawns, start, end, dateReady, metalFilter]);

  // ── Series-tab stats ──────────────────────────────────────────────────────
  // All-series overview (for chart) — uses ALL time, no date filter
  const seriesChartData = useMemo(() => {
    const map = new Map();
    for (const p of pawns) {
      if (!matchesMetal(p, metalFilter)) continue;
      const s = serialToSeries(p.serial_no);
      if (s === null) continue;
      if (!map.has(s)) map.set(s, { amount: 0, count: 0 });
      const rec = map.get(s);
      // Cancelled bills are counted but their amount is not added.
      rec.amount += p.is_cancelled ? 0 : loanFor(p, metalFilter);
      rec.count  += 1;
    }
    return [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([s, rec]) => ({
        series: s,
        label: String(s),
        from: (s - 1) * 100 + 1,
        to:   s * 100,
        ...rec,
      }));
  }, [pawns, metalFilter]);

  // Specific series stats (when user typed a number)
  const specificSeriesStats = useMemo(() => {
    if (!seriesRange) return null;
    const entries = pawns.filter(p => {
      const n = parseInt(p.serial_no, 10);
      return n >= seriesRange.from && n <= seriesRange.to && matchesMetal(p, metalFilter);
    });
    const released = entries.filter(p => p.is_released && !p.is_cancelled);
    const active   = entries.filter(p => !p.is_released && !p.is_sold && !p.is_cancelled);
    const loansGiven = entries.reduce((s, p) => s + (p.is_cancelled ? 0 : loanFor(p, metalFilter)), 0);
    const amountReleased = released.reduce((s, p) => s + loanFor(p, metalFilter), 0);
    const interestCollected = released.reduce((s, p) => {
      const rate = rateFor(p, metalFilter);
      if (!rate || !p.entry_date || !p.released_date) return s;
      const amt = loanFor(p, metalFilter);
      return s + (calcReleaseAmount(amt, rate, p.entry_date, p.released_date) - amt);
    }, 0);
    return { entries, released, active, loansGiven, amountReleased, interestCollected };
  }, [pawns, seriesRange, metalFilter]);

  // Current-portfolio cards (Active Loans / Interest Earned), metal-aware.
  // For "all" with no metal split this matches the bossStats prop.
  const portfolioStats = useMemo(() => {
    const activeLoanTotal = pawns
      .filter(p => !p.is_released && !p.is_cancelled && matchesMetal(p, metalFilter))
      .reduce((s, p) => s + loanFor(p, metalFilter), 0);
    const interestEarned = pawns
      .filter(p => p.is_released && !p.is_cancelled && p.released_date && p.entry_date && matchesMetal(p, metalFilter))
      .reduce((s, p) => {
        const rate = rateFor(p, metalFilter);
        if (!rate) return s;
        const amt = loanFor(p, metalFilter);
        return s + (calcReleaseAmount(amt, rate, p.entry_date, p.released_date) - amt);
      }, 0);
    return { activeLoanTotal, interestEarned };
  }, [pawns, metalFilter]);

  // Combined view keeps the exact bossStats numbers; gold/silver use the computed split.
  const portfolio = metalFilter === "all" && bossStats ? bossStats : portfolioStats;

  const periodLabel = period === "Custom" && customStart && customEnd
    ? `${toDisplay(customStart)} → ${toDisplay(customEnd)}`
    : period;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-neutral-950 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-3xl sm:mx-4 max-h-[95vh] sm:max-h-[92vh] flex flex-col"
        initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={e => e.stopPropagation()}
        {...sheetProps}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0 touch-none cursor-grab active:cursor-grabbing" {...dragHandleProps}>
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 pt-4 sm:pt-6 pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Summary Report</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                {filterTab === "date" ? periodLabel : seriesRange ? `Series ${seriesInput} · Serials ${seriesRange.from}–${seriesRange.to}` : "Series Overview"}
                {metalFilter !== "all" && (
                  <span className={metalFilter === "gold" ? "text-amber-400" : "text-slate-300"}>
                    {" · "}{metalFilter === "gold" ? "Gold only" : "Silver only"}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Filter tabs ── */}
        <div className="px-5 sm:px-7 pt-4 pb-3 border-b border-neutral-800 shrink-0 space-y-3">
          <div className="flex gap-1 bg-neutral-800/60 rounded-xl p-1 w-fit">
            <button onClick={() => setFilterTab("date")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === "date" ? "bg-neutral-700 text-white shadow" : "text-neutral-500 hover:text-neutral-300"
              }`}>
              <Calendar className="w-3 h-3" /> Date
            </button>
            <button onClick={() => setFilterTab("series")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterTab === "series" ? "bg-neutral-700 text-white shadow" : "text-neutral-500 hover:text-neutral-300"
              }`}>
              <Hash className="w-3 h-3" /> Series
              {seriesRange && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />}
            </button>
          </div>

          {/* ── Metal filter (Gold / Silver / Combined) ── */}
          <div className="flex gap-1 bg-neutral-800/60 rounded-xl p-1 w-fit">
            {[
              { v: "all",    label: "Combined", dot: null },
              { v: "gold",   label: "Gold",     dot: "bg-amber-400" },
              { v: "silver", label: "Silver",   dot: "bg-slate-300" },
            ].map(opt => {
              const on = metalFilter === opt.v;
              const onCls = opt.v === "gold"
                ? "bg-amber-500/20 text-amber-300 shadow"
                : opt.v === "silver"
                ? "bg-slate-400/20 text-slate-100 shadow"
                : "bg-neutral-700 text-white shadow";
              return (
                <button key={opt.v} onClick={() => setMetalFilter(opt.v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    on ? onCls : "text-neutral-500 hover:text-neutral-300"
                  }`}>
                  {opt.dot && <span className={`w-2 h-2 rounded-full ${opt.dot}`} />}
                  {opt.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* ── Date filter controls ── */}
            {filterTab === "date" && (
              <motion.div key="date" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="space-y-3">
                <div className="flex gap-1.5 overflow-x-auto flex-nowrap pb-0.5 -mx-1 px-1 scrollbar-none">
                  {PERIODS.map(p => (
                    <button key={p} onClick={() => switchPeriod(p)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                        period === p
                          ? "bg-amber-500 border-amber-500 text-slate-900"
                          : "bg-neutral-800/60 border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500"
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
                <AnimatePresence>
                  {period === "Custom" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                      <div className="pt-1 grid grid-cols-2 gap-3">
                        <DateField label="From" value={customStart} onChange={setCustomStart} />
                        <DateField label="To"   value={customEnd}   onChange={setCustomEnd}   />
                      </div>
                      <AnimatePresence>
                        {customStart && customEnd ? (
                          <motion.div key="banner" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            className="mt-2.5 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-xs text-emerald-300 font-medium">{toDisplay(customStart)} → {toDisplay(customEnd)}</span>
                          </motion.div>
                        ) : (
                          <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="mt-2 text-[11px] text-neutral-600">
                            Type DD/MM/YY — 2-digit year auto-expands (e.g. 26 → 2026)
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Series filter controls ── */}
            {filterTab === "series" && (
              <motion.div key="series" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="space-y-3">
                <p className="text-xs text-neutral-500">
                  Type a series number to inspect that batch.
                  <span className="text-neutral-600"> e.g. "15" shows serials 1501–1600</span>
                </p>
                <div className="flex gap-3 items-end">
                  <div className="w-40">
                    <label className="block text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Series No.</label>
                    <input
                      type="number" min="1" max="999" value={seriesInput}
                      onChange={e => setSeriesInput(e.target.value)}
                      placeholder="e.g. 15"
                      className="w-full bg-neutral-800 border border-neutral-700 text-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 font-mono transition-colors placeholder-neutral-600"
                    />
                  </div>
                  <AnimatePresence>
                    {seriesRange && (
                      <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                        className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
                        <p className="text-[10px] text-amber-400/70 font-semibold uppercase tracking-widest mb-0.5">Serial Range</p>
                        <p className="text-sm font-bold text-amber-300 font-mono">
                          {seriesRange.from.toLocaleString("en-IN")} – {seriesRange.to.toLocaleString("en-IN")}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {seriesInput && (
                    <button onClick={() => setSeriesInput("")}
                      className="px-3 py-2.5 text-xs text-neutral-500 hover:text-white border border-neutral-700 rounded-xl transition-colors">
                      Clear
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto px-5 sm:px-7 py-4 sm:py-5 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-6 h-6 border-2 border-neutral-700 border-t-amber-400 rounded-full" />
              <span className="text-sm text-neutral-500">Loading full report…</span>
            </div>
          ) : (
          <AnimatePresence mode="wait">

            {/* ════ DATE TAB CONTENT ════ */}
            {filterTab === "date" && (
              <motion.div key="date-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-5">
                {!dateReady ? (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-sm text-neutral-500">Select a date range to view the report.</p>
                    <p className="text-xs text-neutral-600">Choose a period above, or set a custom From/To date.</p>
                  </div>
                ) : !dateStats ? null : (
                  <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <SummaryCard label="Total Active" value={dateStats.active.length} sub="still outstanding" icon={TrendingUp} accent="bg-neutral-800 border-neutral-700 text-white" delay={0} />
                      <SummaryCard label="Loans Given" value={fmtINR(dateStats.loansGiven)} sub={`across ${dateStats.newEntries.length} entries`} icon={TrendingUp} accent="bg-emerald-500/10 border-emerald-500/20 text-emerald-300" delay={0.05} />
                      <SummaryCard label="Amt Released" value={fmtINR(dateStats.amountReleased)} sub={`${dateStats.releases.length} loans closed`} icon={TrendingDown} accent="bg-neutral-800 border-neutral-700 text-white" delay={0.1} />
                      {isBoss && <SummaryCard label="Int. Collected" value={fmtINR(dateStats.interestCollected)} sub="from released loans" icon={IndianRupee} accent="bg-amber-500/10 border-amber-500/20 text-amber-300" delay={0.15} />}
                    </div>

                    {/* Current portfolio (All Time only) */}
                    {isBoss && period === "All Time" && (
                      <div>
                        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-3">Current Portfolio</p>
                        <div className="grid grid-cols-2 gap-3">
                          <SummaryCard label="Active Loans" value={fmtINR(portfolio.activeLoanTotal)} sub="outstanding principal" icon={TrendingUp} accent="bg-emerald-500/10 border-emerald-500/20 text-emerald-300" delay={0.2} />
                          <SummaryCard label="Interest Earned" value={fmtINR(portfolio.interestEarned)} sub="from all released loans" icon={IndianRupee} accent="bg-amber-500/10 border-amber-500/20 text-amber-300" delay={0.25} />
                        </div>
                      </div>
                    )}

                    {/* For All Time: series distribution chart instead of entry tables */}
                    {period === "All Time" ? (
                      <div>
                        <button onClick={() => setShowSeriesChart(v => !v)}
                          className="w-full flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Loans by Series</p>
                            <span className="text-xs bg-neutral-700 text-neutral-300 border border-neutral-600 px-1.5 py-0.5 rounded-md font-bold">
                              {seriesChartData.length} groups
                            </span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showSeriesChart ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {showSeriesChart && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                                <p className="text-[10px] text-neutral-600 font-semibold uppercase tracking-widest mb-3">Amount given per 100-serial group</p>
                                <SeriesLineChart data={seriesChartData} onPointClick={onSeriesClick} />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      /* For other periods: show expandable entry & release tables */
                      <>
                        {dateStats.newEntries.length > 0 && (
                          <div>
                            <button onClick={() => setShowEntries(v => !v)} className="w-full flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">New Entries</p>
                                <span className="text-xs bg-neutral-700 text-neutral-300 border border-neutral-600 px-1.5 py-0.5 rounded-md font-bold">{dateStats.newEntries.length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-500">{fmtINR(dateStats.loansGiven)} total</span>
                                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showEntries ? "rotate-180" : ""}`} />
                              </div>
                            </button>
                            <AnimatePresence>
                              {showEntries && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                  <EntryTable rows={dateStats.newEntries} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                        {dateStats.releases.length > 0 && (
                          <div>
                            <button onClick={() => setShowReleases(v => !v)} className="w-full flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Released Loans</p>
                                <span className="text-xs bg-neutral-700 text-neutral-300 border border-neutral-600 px-1.5 py-0.5 rounded-md font-bold">{dateStats.releases.length}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {isBoss && <span className="text-xs text-neutral-500">{fmtINR(dateStats.interestCollected)} interest</span>}
                                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showReleases ? "rotate-180" : ""}`} />
                              </div>
                            </button>
                            <AnimatePresence>
                              {showReleases && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                  <ReleaseTable rows={dateStats.releases} isBoss={isBoss} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                        {dateStats.newEntries.length === 0 && dateStats.releases.length === 0 && (
                          <div className="text-center py-12">
                            <p className="text-sm text-neutral-500">No activity found for this period.</p>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ════ SERIES TAB CONTENT ════ */}
            {filterTab === "series" && (
              <motion.div key="series-body" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-5">

                {/* No series typed → show overview chart */}
                {!seriesRange ? (
                  <div>
                    <button onClick={() => setShowSeriesChart(v => !v)}
                      className="w-full flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">All Series — Loans Given</p>
                        <span className="text-xs bg-neutral-700 text-neutral-300 border border-neutral-600 px-1.5 py-0.5 rounded-md font-bold">
                          {seriesChartData.length} groups
                        </span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showSeriesChart ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {showSeriesChart && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
                          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4">
                            <p className="text-[10px] text-neutral-600 font-semibold uppercase tracking-widest mb-3">Total amount given per 100-serial group · all time</p>
                            <SeriesLineChart data={seriesChartData} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!showSeriesChart && (
                      <p className="text-xs text-neutral-600 text-center">Type a series number above to see specific stats.</p>
                    )}
                  </div>
                ) : (
                  /* Specific series typed → show its stats */
                  !specificSeriesStats ? null : specificSeriesStats.entries.length === 0 ? (
                    <div className="text-center py-12 space-y-1">
                      <p className="text-sm text-neutral-500">No entries in series {seriesInput}.</p>
                      <p className="text-xs text-neutral-600">Serials {seriesRange.from}–{seriesRange.to} not found.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <SummaryCard label="Total Active" value={specificSeriesStats.active.length} sub="still outstanding" icon={TrendingUp} accent="bg-neutral-800 border-neutral-700 text-white" />
                        <SummaryCard label="Loans Given" value={fmtINR(specificSeriesStats.loansGiven)} sub={`across ${specificSeriesStats.entries.length} entries`} icon={TrendingUp} accent="bg-emerald-500/10 border-emerald-500/20 text-emerald-300" delay={0.05} />
                        <SummaryCard label="Amt Released" value={fmtINR(specificSeriesStats.amountReleased)} sub={`${specificSeriesStats.released.length} loans closed`} icon={TrendingDown} accent="bg-neutral-800 border-neutral-700 text-white" delay={0.1} />
                        {isBoss && <SummaryCard label="Int. Collected" value={fmtINR(specificSeriesStats.interestCollected)} sub="from released loans" icon={IndianRupee} accent="bg-amber-500/10 border-amber-500/20 text-amber-300" delay={0.15} />}
                      </div>

                      {/* Entry list */}
                      <div>
                        <button onClick={() => setShowEntries(v => !v)} className="w-full flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">All Entries</p>
                            <span className="text-xs bg-neutral-700 text-neutral-300 border border-neutral-600 px-1.5 py-0.5 rounded-md font-bold">{specificSeriesStats.entries.length}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showEntries ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {showEntries && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                              <EntryTable rows={specificSeriesStats.entries} />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </>
                  )
                )}
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Shared table components ───────────────────────────────────────────────────
function EntryTable({ rows }) {
  function fmtINR(n) {
    return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
  return (
    <div className="rounded-2xl border border-neutral-800 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800">
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest">#</th>
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest hidden sm:table-cell">Date</th>
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest">Borrower</th>
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest hidden sm:table-cell">Item</th>
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest">Amount</th>
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest">Type</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(p => (
            <tr key={p.id} className="border-b border-neutral-800/60 last:border-0 hover:bg-neutral-800/20 transition-colors">
              <td className="px-3 sm:px-4 py-3 font-mono text-neutral-500 text-xs">
                {p.series ? <><span className="text-amber-400 font-bold">{p.series}</span>{p.serial_no}</> : p.serial_no}
              </td>
              <td className="px-3 sm:px-4 py-3 text-neutral-400 text-xs tabular-nums hidden sm:table-cell">{p.entry_date}</td>
              <td className="px-3 sm:px-4 py-3 font-medium text-slate-200">{p.borrower_name}</td>
              <td className="px-3 sm:px-4 py-3 text-neutral-400 text-xs max-w-[120px] truncate hidden sm:table-cell">{p.item_description}</td>
              <td className="px-3 sm:px-4 py-3 font-semibold text-slate-100 tabular-nums">{fmtINR(p.loan_amount)}</td>
              <td className="px-3 sm:px-4 py-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${
                  p.collateral_type === "gold" ? "bg-amber-400/10 text-amber-400"
                  : p.collateral_type === "silver" ? "bg-slate-400/10 text-slate-300"
                  : "bg-purple-400/10 text-purple-300"
                }`}>
                  {p.collateral_type === "gold" ? "🥇" : p.collateral_type === "silver" ? "🥈" : "✨"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReleaseTable({ rows, isBoss }) {
  function fmtINR(n) {
    return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
  return (
    <div className="rounded-2xl border border-neutral-800 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800">
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest">#</th>
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest hidden sm:table-cell">Released On</th>
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest">Borrower</th>
            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest">Loan</th>
            {isBoss && <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-widest">Interest</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(p => {
            const interest = p.interest_rate && p.entry_date && p.released_date
              ? calcReleaseAmount(p.loan_amount, p.interest_rate, p.entry_date, p.released_date) - parseFloat(p.loan_amount)
              : 0;
            return (
              <tr key={p.id} className="border-b border-neutral-800/60 last:border-0 hover:bg-neutral-800/20 transition-colors">
                <td className="px-3 sm:px-4 py-3 font-mono text-neutral-500 text-xs">
                  {p.series ? <><span className="text-amber-400 font-bold">{p.series}</span>{p.serial_no}</> : p.serial_no}
                </td>
                <td className="px-3 sm:px-4 py-3 text-neutral-400 text-xs tabular-nums hidden sm:table-cell">{p.released_date}</td>
                <td className="px-3 sm:px-4 py-3 font-medium text-slate-200">{p.borrower_name}</td>
                <td className="px-3 sm:px-4 py-3 font-semibold text-slate-100 tabular-nums">{fmtINR(p.loan_amount)}</td>
                {isBoss && <td className="px-3 sm:px-4 py-3 font-semibold text-amber-400 tabular-nums">{fmtINR(interest)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
