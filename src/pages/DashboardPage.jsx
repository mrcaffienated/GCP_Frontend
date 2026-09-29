import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Download, Upload, FileJson, LogOut, Search, Store, Users, Crown, TrendingUp, Activity, Calendar, CalendarDays, Key, BarChart2, NotebookPen, ChevronDown, Bell, CheckCircle2, XCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}
import { useAuthStore } from "../store/authStore";
import { useSettingsStore } from "../store/settingsStore";
import { usePawnNavStore } from "../store/pawnNavStore";
import { pawnsApi, authApi } from "../services/api";
import EntryModal from "../components/EntryModal";
import EntryDetailCard from "../components/EntryDetailCard";
import PawnTable from "../components/PawnTable";
import PurchaseSection from "../components/PurchaseSection";
import EmployeeManagerModal from "../components/EmployeeManagerModal";
import ReportsModal from "../components/ReportsModal";
import NotesModal from "../components/NotesModal";

import * as XLSX from "xlsx";
import { encryptBackup, decryptBackup, isEncryptedBackup } from "../services/encryptedStorage";


function StatCard({ label, value, icon: Icon, accent, prefix = "", delay = 0 }) {
  const count = useCountUp(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`rounded-2xl p-4 sm:p-5 border cursor-default select-none ${accent}`}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 leading-tight">{label}</p>
        {Icon && <Icon className="w-4 h-4 opacity-40 shrink-0" />}
      </div>
      <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">
        {prefix}{prefix ? count.toLocaleString("en-IN", { maximumFractionDigits: 0 }) : count}
      </p>
    </motion.div>
  );
}

const RANGE_PRESETS = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "3 Months", days: 91 },
  { label: "Custom", days: null },
];

function InterestPopupCard({ interestEarned, monthlyProjected, delay = 0 }) {
  const [open, setOpen] = useState(false);
  const [rangePreset, setRangePreset] = useState("30 Days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const count = useCountUp(Math.round(interestEarned));
  const cardRef = useRef(null);
  const weekly = monthlyProjected / 4.33;
  const daily = monthlyProjected / 30;

  useEffect(() => {
    function handleClick(e) {
      if (cardRef.current && !cardRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function fmtINR(n) {
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }

  let rangeDays = 30;
  const selectedPreset = RANGE_PRESETS.find((p) => p.label === rangePreset);
  if (selectedPreset && selectedPreset.days !== null) {
    rangeDays = selectedPreset.days;
  } else if (rangePreset === "Custom" && customStart && customEnd) {
    const diff = Math.max(0, Math.round((new Date(customEnd) - new Date(customStart)) / (1000 * 60 * 60 * 24)));
    rangeDays = diff;
  }
  const rangeProjected = daily * rangeDays;

  return (
    <div className="relative" ref={cardRef}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        onClick={() => setOpen((v) => !v)}
        className="rounded-2xl p-4 sm:p-5 border cursor-pointer select-none bg-amber-500/10 border-amber-500/20 text-amber-300"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-60">Interest Earned</p>
          <TrendingUp className="w-4 h-4 opacity-40" />
        </div>
        <p className="text-3xl font-bold tabular-nums tracking-tight">
          ₹{count.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </p>
        <p className="text-xs text-amber-400/50 mt-1.5">Tap for breakdown</p>
      </motion.div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-full mt-2 z-30 bg-neutral-900 border border-amber-500/20 rounded-2xl shadow-2xl shadow-amber-500/10 p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest">PROJECTED (ACTIVE LOANS)</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Calendar className="w-3.5 h-3.5 text-amber-400/50" />
                Monthly
              </div>
              <span className="text-sm font-bold text-amber-300 tabular-nums">{fmtINR(monthlyProjected)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <CalendarDays className="w-3.5 h-3.5 text-amber-400/50" />
                Weekly
              </div>
              <span className="text-sm font-bold text-amber-300 tabular-nums">{fmtINR(weekly)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="w-3.5 h-3.5 flex items-center justify-center text-amber-400/50 font-bold text-xs">D</span>
                Daily
              </div>
              <span className="text-sm font-bold text-amber-300 tabular-nums">{fmtINR(daily)}</span>
            </div>

            <div className="border-t border-neutral-800 pt-3 space-y-2">
              <p className="text-xs font-semibold text-amber-400/60 uppercase tracking-widest">ANALYSE RANGE</p>
              <div className="flex gap-1.5 flex-wrap">
                {RANGE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setRangePreset(p.label)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      rangePreset === p.label
                        ? "bg-amber-500 text-slate-900"
                        : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {rangePreset === "Custom" && (
                <div className="flex gap-2 mt-1">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="flex-1 bg-neutral-800 border border-neutral-700 text-slate-300 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="flex-1 bg-neutral-800 border border-neutral-700 text-slate-300 rounded-xl px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                  />
                </div>
              )}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 mt-1">
                <p className="text-xs text-amber-400/70">Projected for period</p>
                <p className="text-base font-bold text-amber-300 tabular-nums mt-0.5">{fmtINR(rangeProjected)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChangePwdModal({ bossPassword, setBossPassword, onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; document.documentElement.style.overflow = ""; };
  }, []);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (currentPwd !== bossPassword) {
      setError("Current password is incorrect.");
      return;
    }
    if (newPwd.length < 4) {
      setError("New password must be at least 4 characters.");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("New passwords do not match.");
      return;
    }
    setBossPassword(newPwd);
    onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl w-full max-w-sm mx-4"
        initial={{ scale: 0.94, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white">Change Password</h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Current Password</label>
            <input
              type="password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
              required
              className="w-full border border-neutral-700 bg-neutral-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">New Password</label>
            <input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              required
              minLength={4}
              className="w-full border border-neutral-700 bg-neutral-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all"
              placeholder="Min. 4 characters"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Confirm New Password</label>
            <input
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              required
              className="w-full border border-neutral-700 bg-neutral-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-xl py-2 px-3">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-xl py-2.5 text-sm font-bold hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20"
          >
            Update Password
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Boss: Password Change Requests (now inside EmployeeManagerModal's Requests tab)
// This modal is kept as a thin wrapper that opens EmployeeManagerModal on the requests tab
function PwdRequestsModal({ onClose, onPendingCountChange }) {
  return <EmployeeManagerModal onClose={onClose} onPendingCountChange={onPendingCountChange} initialTab="requests" />;
}

// ── Employee: Change Password Modal ──────────────────────────────────────────
function EmpChangePwdModal({ onClose }) {
  useEffect(() => {
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; document.documentElement.style.overflow = ""; };
  }, []);
  const [status, setStatus]   = useState(null);  // null | "pending" | "approved"
  const [newPwd, setNewPwd]   = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError]     = useState("");
  const [done, setDone]       = useState(false);

  async function handleRequest() {
    try {
      await authApi.requestPwdChange();
      setStatus("pending");
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send request.");
    }
  }

  async function handleCancel() {
    try {
      await authApi.cancelPwdRequest();
      setStatus(null);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to cancel.");
    }
  }

  async function handleChange(e) {
    e.preventDefault();
    setError("");
    if (newPwd.length < 4) { setError("Password must be at least 4 characters."); return; }
    if (newPwd !== confirmPwd) { setError("Passwords do not match."); return; }
    try {
      await authApi.setNewPassword(newPwd);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update password.");
    }
  }

  const inputCls = "w-full border border-neutral-700 bg-neutral-800 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 placeholder-neutral-600";

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        initial={{ scale: 0.95, opacity: 0, y: 14 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 14 }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h2 className="text-base font-bold text-white">Change Password</h2>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-5">
          {done ? (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7 text-emerald-400" />
              </div>
              <p className="text-base font-bold text-white">Password Changed!</p>
              <p className="text-xs text-neutral-400">Your new password is active. Please log in again.</p>
              <button onClick={onClose}
                className="w-full bg-amber-500 text-slate-900 rounded-xl py-2.5 text-sm font-bold hover:bg-amber-400 transition-colors">Done</button>
            </div>
          ) : status === null ? (
            <div className="space-y-4">
              <div className="bg-neutral-800 rounded-2xl p-4 text-sm text-neutral-400 leading-relaxed">
                To change your password, you need <span className="text-amber-400 font-medium">boss approval</span>. Send a request and the boss can approve it from their employee panel.
              </div>
              {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl py-2 px-3">{error}</p>}
              <button onClick={handleRequest}
                className="w-full bg-amber-500 text-slate-900 rounded-xl py-2.5 text-sm font-bold hover:bg-amber-400 transition-colors">
                Send Request to Boss
              </button>
            </div>
          ) : status === "pending" ? (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-center">
                <p className="text-sm font-semibold text-amber-300">Request Sent</p>
                <p className="text-xs text-amber-400/70 mt-1">Waiting for boss approval…</p>
              </div>
              {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl py-2 px-3">{error}</p>}
              <button onClick={handleCancel}
                className="w-full border border-neutral-700 text-neutral-400 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors">
                Cancel Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleChange} className="space-y-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300 font-medium">Boss approved your request. Set your new password.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"} value={newPwd}
                    onChange={e => setNewPwd(e.target.value)} required minLength={4} autoFocus
                    className={`${inputCls} pr-11`} placeholder="Min. 4 characters" />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required
                  className={inputCls} placeholder="••••••••" />
              </div>
              {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl py-2 px-3">{error}</p>}
              <button type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-xl py-2.5 text-sm font-bold hover:from-amber-400 hover:to-amber-300 transition-all">
                Update Password
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Backup password modal ─────────────────────────────────────────────────────
function BackupPasswordModal({ onConfirm, onCancel }) {
  useEffect(() => {
    document.body.style.overflow = "hidden"; document.documentElement.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; document.documentElement.style.overflow = ""; };
  }, []);
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}>
      <motion.div className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4"
        initial={{ scale: 0.95, opacity: 0, y: 14 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 14 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <FileJson className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Backup Password</h2>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Set a password to <span className="text-amber-400 font-medium">encrypt</span> this backup. You will need it to restore. Leave blank to export unencrypted.
        </p>
        <div className="relative">
          <input type={show ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)}
            autoFocus placeholder="Backup password (optional)"
            className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 placeholder-neutral-500 rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40" />
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 border border-neutral-700 text-neutral-400 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(pwd || null)}
            className="flex-1 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-xl py-2.5 text-sm font-bold hover:from-amber-400 hover:to-amber-300 transition-all">
            {pwd ? "Export Encrypted" : "Export Plain"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Restore password modal ────────────────────────────────────────────────────
function RestorePasswordModal({ onConfirm, onCancel }) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(false);
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}>
      <motion.div className="bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4"
        initial={{ scale: 0.95, opacity: 0, y: 14 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 14 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-bold text-white">Encrypted Backup Detected</h2>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed">
          This backup file is encrypted. Enter the password used when it was exported.
        </p>
        <div className="relative">
          <input type={show ? "text" : "password"} value={pwd} onChange={(e) => setPwd(e.target.value)}
            autoFocus placeholder="Backup password" required
            className="w-full bg-neutral-800 border border-neutral-700 text-slate-100 placeholder-neutral-500 rounded-xl px-4 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40" />
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 border border-neutral-700 text-neutral-400 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors">
            Cancel
          </button>
          <button onClick={() => pwd && onConfirm(pwd)} disabled={!pwd}
            className="flex-1 bg-sky-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-sky-500 disabled:opacity-40 transition-colors">
            Decrypt & Restore
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function fmtShortDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y.slice(2)}`;
}

// Pill chip for active filter tags inside the button
function FilterChip({ label, color = "amber" }) {
  const colors = {
    amber:   "bg-amber-500/20 text-amber-300 border-amber-500/30",
    orange:  "bg-orange-500/20 text-orange-300 border-orange-500/30",
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    violet:  "bg-violet-500/20 text-violet-300 border-violet-500/30",
    gold:    "bg-amber-500/20 text-amber-300 border-amber-500/30",
    silver:  "bg-slate-400/20 text-slate-300 border-slate-400/30",
  };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${colors[color] || colors.amber}`}>
      {label}
    </span>
  );
}

function FiltersDropdown({
  statusFilter, onStatusChange,
  typeFilter, onTypeChange,
  dateMode, onDateModeChange,
  specificDate, onSpecificDateChange,
  dateFrom, onDateFromChange,
  dateTo, onDateToChange,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  function getWeekStart() {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split("T")[0];
  }
  function getMonthStart() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }
  function getLast(days) {
    return new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
  }

  const hasDate = dateMode !== "all";
  const hasFilters = statusFilter !== "all" || typeFilter !== "all" || hasDate;

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function clearAll() {
    onStatusChange("all");
    onTypeChange("all");
    onDateModeChange("all");
    onSpecificDateChange("");
    onDateFromChange("");
    onDateToChange("");
  }

  function getDateChipLabel() {
    if (dateMode === "specific" && specificDate) return fmtShortDate(specificDate);
    if (dateMode === "range") {
      if (dateFrom && dateTo) return `${fmtShortDate(dateFrom)}–${fmtShortDate(dateTo)}`;
      if (dateFrom) return `From ${fmtShortDate(dateFrom)}`;
      if (dateTo)   return `To ${fmtShortDate(dateTo)}`;
    }
    return null;
  }

  const STATUS_OPTS = [
    { value: "all",       label: "All",       dot: "bg-neutral-500" },
    { value: "active",    label: "Active",    dot: "bg-orange-400"  },
    { value: "released",  label: "Released",  dot: "bg-emerald-400" },
    { value: "sold",      label: "Sold",      dot: "bg-violet-400"  },
    { value: "cancelled", label: "Cancelled", dot: "bg-red-400"     },
  ];

  const TYPE_OPTS = [
    { value: "all",    label: "All Types", icon: "✦" },
    { value: "gold",   label: "Gold",      icon: "✦" },
    { value: "silver", label: "Silver",    icon: "◆" },
    { value: "both",   label: "Both",      icon: "✦◆" },
  ];

  const TYPE_COLORS = { gold: "text-amber-400", silver: "text-slate-300", both: "text-amber-300", all: "text-neutral-500" };

  const DATE_MODES = [
    { value: "all",      label: "Any" },
    { value: "specific", label: "Exact" },
    { value: "range",    label: "Range" },
  ];

  const RANGE_QUICK = [
    { label: "This Week",  from: getWeekStart(),  to: todayStr },
    { label: "This Month", from: getMonthStart(), to: todayStr },
    { label: "Last 30d",   from: getLast(30),     to: todayStr },
    { label: "Last 90d",   from: getLast(90),     to: todayStr },
  ];

  function SmartDatePicker({ value, onChange, placeholder = "DD/MM/YY" }) {
    const [display, setDisplay] = useState(() => {
      if (!value) return "";
      const [y, m, d] = value.split("-");
      return `${d}/${m}/${y}`;
    });

    useEffect(() => {
      if (!value) setDisplay("");
    }, [value]);

    function handleChange(e) {
      const isBackspace = e.target.value.length < display.length;
      let digits = e.target.value.replace(/\D/g, "");
      if (!isBackspace) {
        if (digits.length >= 1 && parseInt(digits[0]) > 3) digits = "0" + digits;
        if (digits.length >= 3 && parseInt(digits[2]) > 1) digits = digits.slice(0, 2) + "0" + digits.slice(2);
        if (digits.length >= 5 && digits.slice(4, 6) !== "20") digits = digits.slice(0, 4) + "20" + digits.slice(4);
      }
      digits = digits.slice(0, 8);
      let disp;
      if (digits.length <= 2) disp = digits;
      else if (digits.length <= 4) disp = digits.slice(0, 2) + "/" + digits.slice(2);
      else disp = digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
      if (!isBackspace && digits.length === 2) disp += "/";
      if (!isBackspace && digits.length === 4) disp += "/";
      setDisplay(disp);
      if (digits.length === 8) {
        const d = digits.slice(0, 2), m = digits.slice(2, 4), y = digits.slice(4, 8);
        onChange(`${y}-${m}-${d}`);
      } else if (!e.target.value) {
        onChange("");
      }
    }

    return (
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={10}
        className="w-full bg-neutral-800 border border-neutral-700 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 font-mono transition-colors placeholder-neutral-600"
      />
    );
  }

  const dateChipLabel = getDateChipLabel();

  return (
    <div className="relative shrink-0" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium border transition-all ${
          hasFilters
            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
            : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
        }`}
      >
        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="font-semibold">Filters</span>
        {statusFilter !== "all" && (
          <FilterChip
            label={statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            color={statusFilter === "active" ? "orange" : statusFilter === "released" ? "emerald" : "violet"}
          />
        )}
        {typeFilter !== "all" && (
          <FilterChip label={typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)} color={typeFilter} />
        )}
        {dateChipLabel && <FilterChip label={dateChipLabel} color="amber" />}
        {hasFilters && (
          <span
            onClick={(e) => { e.stopPropagation(); clearAll(); }}
            className="ml-0.5 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer text-xs font-bold"
            title="Clear all filters"
          >✕</span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ml-0.5 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 sm:left-0 sm:right-auto top-full mt-2 w-[min(320px,calc(100vw-2rem))] bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl z-40 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Filters</span>
              {hasFilters && (
                <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">
                  Clear all
                </button>
              )}
            </div>

            <div className="p-3 space-y-4">

              {/* STATUS */}
              <div>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 px-1">Status</p>
                <div className="grid grid-cols-4 gap-1">
                  {STATUS_OPTS.map(opt => {
                    const active = statusFilter === opt.value;
                    return (
                      <button key={opt.value} onClick={() => onStatusChange(opt.value)}
                        className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl text-xs font-medium transition-all border ${
                          active ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-neutral-800" />

              {/* TYPE */}
              <div>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2 px-1">Collateral Type</p>
                <div className="grid grid-cols-4 gap-1">
                  {TYPE_OPTS.map(opt => {
                    const active = typeFilter === opt.value;
                    return (
                      <button key={opt.value} onClick={() => onTypeChange(opt.value)}
                        className={`flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl text-xs font-medium transition-all border ${
                          active ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                        }`}>
                        <span className={`text-xs font-bold ${TYPE_COLORS[opt.value]}`}>{opt.icon}</span>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-neutral-800" />

              {/* DATE */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Date</p>
                  {/* Mode switcher */}
                  <div className="flex gap-0.5 bg-neutral-800 rounded-lg p-0.5">
                    {DATE_MODES.map(m => (
                      <button key={m.value}
                        onClick={() => {
                          onDateModeChange(m.value);
                          if (m.value === "all") { onSpecificDateChange(""); onDateFromChange(""); onDateToChange(""); }
                        }}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${
                          dateMode === m.value ? "bg-amber-500 text-slate-900" : "text-neutral-400 hover:text-neutral-200"
                        }`}>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ANY — show quick-pick chips */}
                {dateMode === "all" && (
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { label: "Today",      onClick: () => { onDateModeChange("specific"); onSpecificDateChange(todayStr); } },
                      { label: "Yesterday",  onClick: () => { onDateModeChange("specific"); onSpecificDateChange(yesterdayStr); } },
                      { label: "This Week",  onClick: () => { onDateModeChange("range"); onDateFromChange(getWeekStart()); onDateToChange(todayStr); } },
                      { label: "This Month", onClick: () => { onDateModeChange("range"); onDateFromChange(getMonthStart()); onDateToChange(todayStr); } },
                      { label: "Last 30d",   onClick: () => { onDateModeChange("range"); onDateFromChange(getLast(30)); onDateToChange(todayStr); } },
                    ].map(chip => (
                      <button key={chip.label} onClick={chip.onClick}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-neutral-800 border border-neutral-700 text-neutral-400 hover:bg-neutral-750 hover:border-amber-500/30 hover:text-amber-300 transition-all">
                        {chip.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* EXACT DATE */}
                {dateMode === "specific" && (
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      {[{ label: "Today", val: todayStr }, { label: "Yesterday", val: yesterdayStr }].map(p => (
                        <button key={p.label} onClick={() => onSpecificDateChange(p.val)}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                            specificDate === p.val
                              ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                              : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200"
                          }`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <SmartDatePicker value={specificDate} onChange={onSpecificDateChange} />
                    {specificDate && (
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-300 font-medium">Entries on {fmtShortDate(specificDate)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* DATE RANGE */}
                {dateMode === "range" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {RANGE_QUICK.map(q => {
                        const active = dateFrom === q.from && dateTo === q.to;
                        return (
                          <button key={q.label}
                            onClick={() => { onDateFromChange(q.from); onDateToChange(q.to); }}
                            className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-all border text-center ${
                              active
                                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                                : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-neutral-200"
                            }`}>
                            {q.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1 px-0.5">From</p>
                        <SmartDatePicker value={dateFrom} onChange={onDateFromChange} />
                      </div>
                      <div>
                        <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1 px-0.5">To</p>
                        <SmartDatePicker value={dateTo} onChange={onDateToChange} />
                      </div>
                    </div>
                    {(dateFrom || dateTo) && (
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
                        <CalendarDays className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-300 font-medium">
                          {dateFrom && dateTo
                            ? `${fmtShortDate(dateFrom)} — ${fmtShortDate(dateTo)}`
                            : dateFrom ? `From ${fmtShortDate(dateFrom)}` : `Until ${fmtShortDate(dateTo)}`}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ExportMenu({ onExportExcel, onBackupJSON, onRestoreClick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function pick(fn) {
    setOpen(false);
    fn();
  }

  return (
    <div className="relative" ref={ref}>
      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-xl px-4 py-2 text-sm font-medium hover:bg-neutral-700 hover:text-white transition-colors"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-full mt-2 w-52 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden z-40"
          >
            <button
              onClick={() => pick(onBackupJSON)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <FileJson className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-left">
                <p className="font-medium leading-none">Backup (JSON)</p>
                <p className="text-xs text-neutral-500 mt-0.5">Full data backup</p>
              </div>
            </button>
            <div className="border-t border-neutral-800" />
            <button
              onClick={() => pick(onExportExcel)}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-left">
                <p className="font-medium leading-none">Export Excel</p>
                <p className="text-xs text-neutral-500 mt-0.5">Spreadsheet (.xlsx)</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCards({ stats }) {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:max-w-sm">
        <StatCard label="Total Entries" value={stats.total} icon={Activity}
          accent="bg-neutral-800 border-neutral-700 text-white" delay={0} />
        <StatCard label="Active Loans" value={stats.active} icon={TrendingUp}
          accent="bg-neutral-900 border-neutral-700 text-white" delay={0.05} />
      </div>
    </div>
  );
}

const PER_PAGE = 30;          // rows per page (client-side pagination)
const FETCH_ALL = 1000000;    // effectively "no cap" — load every matching entry

export default function DashboardPage() {
  const logout = useAuthStore((s) => s.logout);
  const storeId = useAuthStore((s) => s.storeId);
  const role = useAuthStore((s) => s.role);
  const userName = useAuthStore((s) => s.name);
  const isBoss = role === "boss";
  const { bossPassword, setBossPassword } = useSettingsStore();
  const [pendingCount, setPendingCount] = useState(0);
  // Which register is on screen: "pawn" (loans) or "purchase" (old-gold NOC forms)
  const [section, setSection] = useState("pawn");
  const [showMobileMore, setShowMobileMore] = useState(false);
  const mobileMoreRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (mobileMoreRef.current && !mobileMoreRef.current.contains(e.target)) setShowMobileMore(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const [pawns, setPawns] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);
  const [showModal, setShowModal] = useState(false);
  const [nextSerial, setNextSerial] = useState(1);
  const adaptiveSerialRef = useRef(null); // tracks last-saved serial for adaptive suggestion
  const adaptiveDateRef  = useRef(null);  // tracks last-saved entry date for adaptive suggestion
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [serialRange, setSerialRange] = useState(null); // { from, to, label } or null
  const [showProfile, setShowProfile] = useState(false);
  const [showEmployees, setShowEmployees] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showReports, setShowReports] = useState(false);
  // Reports must reflect EVERY entry, not just the dashboard's loaded top-500.
  // We fetch the complete set when Reports opens so series/totals are accurate.
  const [reportsPawns, setReportsPawns] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showPwdRequests, setShowPwdRequests] = useState(false);
  const [showEmpChangePwd, setShowEmpChangePwd] = useState(false);
  const [dateMode, setDateMode] = useState("all");
  const [specificDate, setSpecificDate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Fetch next serial from server ────────────────────────────
  const fetchNextSerial = useCallback(async () => {
    try {
      const res = await pawnsApi.nextSerial();
      setNextSerial(res.data.next_serial);
    } catch (err) {
      console.error("Failed to fetch next serial:", err);
    }
  }, []);

  // Opens the modal: uses adaptive serial (last saved + 1) if available, else fetches from backend
  const openNewEntryModal = useCallback(async () => {
    if (adaptiveSerialRef.current !== null) {
      setNextSerial(adaptiveSerialRef.current);
    } else {
      await fetchNextSerial();
    }
    setShowModal(true);
  }, [fetchNextSerial]);

  // Opens Reports and loads the COMPLETE dataset (not the capped dashboard list)
  // so every series group and total is accurate regardless of entry count.
  const openReports = useCallback(async () => {
    setShowReports(true);
    setReportsLoading(true);
    try {
      const res = await pawnsApi.list({ per_page: FETCH_ALL });
      setReportsPawns(res.data.items ?? res.data);
    } catch (err) {
      console.error("Failed to load full reports data:", err);
      setReportsPawns(null); // fall back to the loaded list
    } finally {
      setReportsLoading(false);
    }
  }, []);

  // ── Fetch state ──────────────────────────────────────────────
  // Bumped on every mutation so an in-flight background refresh can't overwrite
  // optimistic state with a stale snapshot.
  const lastMutationRef = useRef(0);
  const lastFetchedAtRef = useRef(0);
  const FETCH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

  // Holds the current filter params — fetchPawns reads from this ref so it has
  // zero dependencies and never re-creates itself (stable across renders).
  const currentParamsRef = useRef({});
  // Monotonic request counter. Each fetch claims the next number; when its
  // response lands we only apply it if it's still the latest request. This
  // prevents a slow earlier query (e.g. search "420") from overwriting a newer
  // one (search "4203") whose response arrived first — the out-of-order race.
  const fetchSeqRef = useRef(0);

  const fetchPawns = useCallback(async (silent = false) => {
    const startedAt = Date.now();
    const seq = ++fetchSeqRef.current;
    try {
      if (!silent) setLoading(true);
      const res = await pawnsApi.list({ ...currentParamsRef.current, per_page: FETCH_ALL });
      // Discard if a newer fetch superseded this one, or a mutation happened.
      if (seq !== fetchSeqRef.current) return;
      if (lastMutationRef.current > startedAt) return;
      const data = res.data;
      const fresh = data.items ?? data;
      setPawns(fresh);
      if (data.total_all !== undefined) setTotalCount(data.total_all);
      if (data.active_count !== undefined) setActiveCount(data.active_count);
      lastFetchedAtRef.current = Date.now();
    } catch (err) {
      console.error("Failed to load pawns:", err);
    } finally {
      // Whichever fetch lands LAST clears the spinner — even a silent one.
      // (If a silent refresh supersedes the initial non-silent fetch, the
      // superseded fetch must not be the only one allowed to clear loading,
      // or the spinner sticks forever with data already on screen.)
      if (seq === fetchSeqRef.current) setLoading(false);
    }
  }, []);

  // Initial serial fetch (separate from pawns — doesn't need re-run on filter change)
  useEffect(() => { fetchNextSerial(); }, [fetchNextSerial]);

  // Sync filter params ref then re-fetch whenever any filter changes (including mount).
  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (statusFilter !== "all") params.status = statusFilter;
    if (typeFilter !== "all") params.collateral_type = typeFilter;
    if (dateMode === "specific" && specificDate) {
      params.date_from = specificDate;
      params.date_to = specificDate;
    } else if (dateMode === "range") {
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo)   params.date_to = dateTo;
    }
    // Serial-range ("series") filter is server-side too — otherwise it could only
    // match entries within the loaded top-500, hiding older serials in the range.
    if (serialRange) {
      params.serial_from = serialRange.from;
      params.serial_to = serialRange.to;
    }
    currentParamsRef.current = params;
    setPage(1);
    fetchPawns();
  }, [search, statusFilter, typeFilter, dateMode, specificDate, dateFrom, dateTo, serialRange, fetchPawns]);

  // Silently refetch on tab focus only when data is stale (>5 min).
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === "visible") {
        // Never fired before the initial load has completed once — otherwise a
        // focus event during page load spawns a silent fetch that supersedes
        // the initial one and races its loading state.
        if (lastFetchedAtRef.current === 0) return;
        const stale = Date.now() - lastFetchedAtRef.current > FETCH_COOLDOWN_MS;
        if (stale) fetchPawns(true);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchPawns]);

  // ── Spacebar shortcut: open New Entry when not in a text field ───────────────
  useEffect(() => {
    async function handleSpacebar(e) {
      if (e.code !== "Space") return;
      if (section !== "pawn") return;   // shortcut belongs to the pawn register
      const tag = document.activeElement?.tagName;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(tag)) return;
      if (showModal) return;
      e.preventDefault();
      await openNewEntryModal();
    }
    document.addEventListener("keydown", handleSpacebar);
    return () => document.removeEventListener("keydown", handleSpacebar);
  }, [showModal, openNewEntryModal, section]);

  // page resets are handled inside the filter-sync useEffect above

  const [selectedPawn, setSelectedPawn] = useState(null);


  // Backend handles search/status/type/date filtering; only serial-range is UI-only.
  // Backend already returns results sorted by serial_no desc.
  const filtered = useMemo(() => {
    if (!serialRange) return pawns;
    return pawns.filter(p => p.serial_no >= serialRange.from && p.serial_no <= serialRange.to);
  }, [pawns, serialRange]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Mutation responses don't resolve renewal-chain serials (that needs the full
  // list), so keep those display fields from the entry we already have.
  function mergePawn(old, next) {
    if (!old) return next;
    return {
      ...next,
      renewed_from_serial: next.renewed_from_serial ?? old.renewed_from_serial ?? null,
      renewed_from_series: next.renewed_from_series ?? old.renewed_from_series ?? null,
      renewed_to_serial:   next.renewed_to_serial   ?? old.renewed_to_serial   ?? null,
      renewed_to_series:   next.renewed_to_series   ?? old.renewed_to_series   ?? null,
    };
  }

  // After a mutation, apply the API response in place — no full refetch, so each
  // action is instant. The 15s poll / tab-focus refetch reconcile with the DB.
  function applyAndRefresh(id, updatedPawn) {
    lastMutationRef.current = Date.now();
    setPawns(prev => prev.map(p => p.id === id ? mergePawn(p, updatedPawn) : p));
    setSelectedPawn(prev => prev?.id === id ? mergePawn(prev, updatedPawn) : prev);
  }

  // The list is light (no sub-items); fetch the full entry when a card opens so its
  // dhafa / prepayments / interest history show.
  async function openPawn(p) {
    setSelectedPawn(p);
    try {
      const res = await pawnsApi.get(p.id);
      setSelectedPawn(prev => (prev && prev.id === p.id ? mergePawn(p, res.data) : prev));
    } catch (err) {
      console.error("Failed to load entry details:", err);
    }
  }

  // The chatbot (portal, outside this tree) asks us to open a bill's card by
  // number. Resolve the number to a pawn — first from the in-memory list (all
  // entries are loaded), then via the API as a fallback — and open its card.
  const billRequest = usePawnNavStore((s) => s.billRequest);
  const clearBillRequest = usePawnNavStore((s) => s.clearBillRequest);
  useEffect(() => {
    if (!billRequest) return;
    const parsed = String(billRequest.billNo).trim().match(/^([A-Za-z]{0,2})0*(\d+)$/);
    if (!parsed) { clearBillRequest(); return; }
    const series = parsed[1] ? parsed[1].toUpperCase() : null;
    const serial = parseInt(parsed[2], 10);
    const pick = (list) => {
      const same = list.filter(p => p.serial_no === serial);
      return same.find(p => (p.series || null) === series)
          || same.find(p => !p.series)
          || same[0]
          || null;
    };
    const hit = pick(pawns);
    if (hit) {
      openPawn(hit);
      clearBillRequest();
      return;
    }
    // Not in the loaded list — look it up.
    pawnsApi.list({ search: String(serial), per_page: 20 })
      .then(res => {
        const items = res.data.items ?? res.data ?? [];
        const h = pick(items) || items[0];
        if (h) openPawn(h);
      })
      .catch(() => {})
      .finally(() => clearBillRequest());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billRequest, pawns]);

  // Guards against a double-submit (button double-click + Cmd+Enter both firing).
  // Two concurrent creates of the same serial used to collide on the DB unique
  // index and block for 50-80s; this ensures only one create is ever in flight.
  const creatingRef = useRef(false);

  async function handleAddPawn(data) {
    if (creatingRef.current) return null;   // a create is already in flight
    creatingRef.current = true;
    try {
      const res = await pawnsApi.create(data);
      // Add to list instantly — no full refetch, just refresh the next serial.
      lastMutationRef.current = Date.now();
      setPawns(prev => [res.data, ...prev]);
      fetchNextSerial();
      return Number(data.serial_no);
    } catch (err) {
      console.error("Failed to create pawn:", err);
      alert(err.response?.data?.detail || "Failed to save entry.");
      return null;
    } finally {
      creatingRef.current = false;
    }
  }

  // Voids a bill number: creates the entry already Cancelled (backend sets the
  // flags). Re-throws so the modal can reset its state on failure.
  async function handleCancelBill(payload) {
    try {
      const res = await pawnsApi.create(payload);
      lastMutationRef.current = Date.now();
      setPawns(prev => [res.data, ...prev]);
      fetchNextSerial();
    } catch (err) {
      console.error("Failed to cancel bill:", err);
      alert(err.response?.data?.detail || "Failed to cancel bill.");
      throw err;
    }
  }

  async function handleRelease(id, date, actualAmount) {
    const releaseDate = date || new Date().toISOString().split("T")[0];
    try {
      const res = await pawnsApi.release(id, releaseDate, actualAmount);
      applyAndRefresh(id, res.data);
    } catch (err) {
      console.error("Failed to release pawn:", err);
    }
  }

  async function handleMarkActive(id) {
    try {
      const res = await pawnsApi.markActive(id);
      lastMutationRef.current = Date.now();
      setPawns(prev => prev.map(p => p.id === id ? mergePawn(p, res.data) : p));
      setSelectedPawn(null);
    } catch (err) {
      console.error("Failed to mark active:", err);
    }
  }

  async function handleMarkSold(id, date) {
    try {
      const res = await pawnsApi.markSold(id, date || null);
      applyAndRefresh(id, res.data);
    } catch (err) {
      console.error("Failed to mark sold:", err);
    }
  }

  async function handleAddAmount(id, additional) {
    // Optimistic: show the dhafa entry immediately, confirm with server in background
    const tempId = `opt-${Date.now()}`;
    setSelectedPawn(prev => prev?.id === id ? {
      ...prev,
      additional_amounts: [...(prev.additional_amounts || []),
        { id: tempId, amount: additional.amount, date: additional.date, interest_rate: additional.interest_rate, note: additional.note || "" }],
    } : prev);
    try {
      const res = await pawnsApi.addAdditionalAmt(id, additional);
      applyAndRefresh(id, res.data);
    } catch (err) {
      console.error("Failed to add amount:", err);
      setSelectedPawn(prev => prev?.id === id ? {
        ...prev, additional_amounts: (prev.additional_amounts || []).filter(a => a.id !== tempId),
      } : prev);
    }
  }

  async function handleAddPrepayment(id, prepayment) {
    const tempId = `opt-${Date.now()}`;
    setSelectedPawn(prev => prev?.id === id ? {
      ...prev,
      prepayments: [...(prev.prepayments || []),
        { id: tempId, amount: prepayment.amount, date: prepayment.date, note: prepayment.note || "" }],
    } : prev);
    try {
      const res = await pawnsApi.addPrepayment(id, prepayment);
      applyAndRefresh(id, res.data);
    } catch (err) {
      console.error("Failed to add prepayment:", err);
      setSelectedPawn(prev => prev?.id === id ? {
        ...prev, prepayments: (prev.prepayments || []).filter(a => a.id !== tempId),
      } : prev);
    }
  }

  async function handleAddInterestPayment(id, payment) {
    const tempId = `opt-${Date.now()}`;
    setSelectedPawn(prev => prev?.id === id ? {
      ...prev,
      interest_payments: [...(prev.interest_payments || []),
        { id: tempId, amount: payment.amount, date: payment.date, note: payment.note || "" }],
    } : prev);
    try {
      const res = await pawnsApi.addInterestPmt(id, payment);
      applyAndRefresh(id, res.data);
    } catch (err) {
      console.error("Failed to add interest payment:", err);
      setSelectedPawn(prev => prev?.id === id ? {
        ...prev, interest_payments: (prev.interest_payments || []).filter(a => a.id !== tempId),
      } : prev);
    }
  }

  async function handleDeleteDhafa(pawnId, itemId) {
    const snapshot = selectedPawn;
    setSelectedPawn(prev => prev?.id === pawnId ? {
      ...prev, additional_amounts: (prev.additional_amounts || []).filter(a => a.id !== itemId),
    } : prev);
    try {
      const res = await pawnsApi.deleteAdditionalAmt(itemId);
      applyAndRefresh(pawnId, res.data);
    } catch (err) {
      console.error("Failed to delete dhafa entry:", err);
      setSelectedPawn(snapshot);
    }
  }

  async function handleDeletePrepayment(pawnId, itemId) {
    const snapshot = selectedPawn;
    setSelectedPawn(prev => prev?.id === pawnId ? {
      ...prev, prepayments: (prev.prepayments || []).filter(a => a.id !== itemId),
    } : prev);
    try {
      const res = await pawnsApi.deletePrepayment(itemId);
      applyAndRefresh(pawnId, res.data);
    } catch (err) {
      console.error("Failed to delete prepayment:", err);
      setSelectedPawn(snapshot);
    }
  }

  async function handleCancelPawn(id) {
    try {
      const res = await pawnsApi.cancel(id);
      setPawns(prev => prev.map(p => p.id === id ? mergePawn(p, res.data) : p));
      setSelectedPawn(null);
    } catch (err) {
      console.error("Failed to cancel pawn:", err);
    }
  }

  async function handleRenewLoan(oldId, newLoanData) {
    try {
      await pawnsApi.renew(oldId, newLoanData);
      setSelectedPawn(null);
      await fetchPawns(true);
    } catch (err) {
      console.error("Failed to renew loan:", err);
      alert(err.response?.data?.detail || "Failed to renew loan.");
    }
  }

  async function handleLinkRenewal(currentId, oldSerialNo, oldSeries) {
    try {
      await pawnsApi.linkRenewal(currentId, { old_serial_no: oldSerialNo, old_series: oldSeries || null });
      setSelectedPawn(null);
      await fetchPawns(true);
    } catch (err) {
      console.error("Failed to link renewal:", err);
      alert(err.response?.data?.detail || "Serial number not found.");
    }
  }

  async function handleEditPawn(id, updatedFields, editEntry) {
    try {
      const res = await pawnsApi.update(id, { ...updatedFields, edit_entry: editEntry });
      applyAndRefresh(id, res.data);
    } catch (err) {
      console.error("Failed to edit pawn:", err);
      alert(err.response?.data?.detail || "Failed to save changes.");
    }
  }

  function handleExportExcel() {
    const rows = pawns.map((p) => ({
      "Entry No": p.serial_no,
      Date: p.entry_date,
      Borrower: p.borrower_name,
      "Father/Spouse": p.relative_name,
      Item: p.item_description,
      "Weight (g)": p.item_weight || "",
      Type: p.collateral_type.charAt(0).toUpperCase() + p.collateral_type.slice(1),
      "Loan Amount (₹)": parseFloat(p.loan_amount),
      "Interest Rate (% /mo)": p.interest_rate || "",
      Released: p.is_released ? "Yes" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pawns");
    XLSX.writeFile(wb, "gupthas_export.xlsx");
  }

  const [showBackupPwd, setShowBackupPwd] = useState(false);
  const [showRestorePwd, setShowRestorePwd] = useState(false);
  const [pendingRestoreText, setPendingRestoreText] = useState(null);
  const restoreInputRef = useRef(null);
  const [restoreStatus, setRestoreStatus] = useState(null);

  function handleBackupJSON(password) {
    const payload = JSON.stringify({ version: 1, exported_at: new Date().toISOString(), pawns });
    const content = password ? encryptBackup(payload, password) : payload;
    const ext = "json";
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gupthas_backup_${new Date().toISOString().split("T")[0]}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowBackupPwd(false);
  }

  function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const raw = ev.target.result;
      if (isEncryptedBackup(raw)) {
        setPendingRestoreText(raw);
        setShowRestorePwd(true);
      } else {
        applyRestore(raw);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function applyRestore(jsonText) {
    try {
      const parsed = JSON.parse(jsonText);
      const data = parsed.pawns ?? parsed;
      if (!Array.isArray(data)) throw new Error("Invalid format");
      setPawns(data);
      setRestoreStatus({ ok: true, count: data.length });
    } catch {
      setRestoreStatus({ ok: false, msg: "Invalid backup file" });
    }
    setTimeout(() => setRestoreStatus(null), 3500);
  }

  function handleRestoreWithPassword(password) {
    try {
      const decrypted = decryptBackup(pendingRestoreText, password);
      setShowRestorePwd(false);
      setPendingRestoreText(null);
      applyRestore(decrypted);
    } catch {
      setRestoreStatus({ ok: false, msg: "Wrong password — could not decrypt backup" });
      setShowRestorePwd(false);
      setPendingRestoreText(null);
      setTimeout(() => setRestoreStatus(null), 3500);
    }
  }

  // Use backend-supplied counts when available (accurate even with pagination).
  // Fall back to client-side computation on first render.
  const stats = {
    total: totalCount || pawns.length,
    active: activeCount || pawns.filter((p) => !p.is_released && !p.is_cancelled).length,
  };

  function calcCompound(loan, rate, entryDate, endDate) {
    const start = new Date(entryDate);
    const end = new Date(endDate);
    let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    const check = new Date(start);
    check.setMonth(check.getMonth() + months);
    if (check > end) months--;
    months = Math.max(0, months);
    const after = new Date(start);
    after.setMonth(after.getMonth() + months);
    const remDays = Math.round((end - after) / 86400000);
    const extra = remDays <= 0 ? 0 : remDays <= 15 ? 0.5 : 1;
    const em = months + extra;
    const r = parseFloat(rate) / 100;
    const fullYears = Math.floor(em / 12);
    const rem = em % 12;
    return parseFloat(loan) * Math.pow(1 + r * 12, fullYears) * (1 + r * rem);
  }

  const today = new Date().toISOString().split("T")[0];
  const bossStats = useMemo(() => {
    // Use the full reports dataset when loaded, else the dashboard list.
    const src = reportsPawns || pawns;
    const activeLoanTotal = src
      .filter((p) => !p.is_released)
      .reduce((sum, p) => sum + parseFloat(p.loan_amount || 0), 0);

    const interestEarned = src
      .filter((p) => p.is_released && !p.is_cancelled && p.released_date && p.entry_date && p.interest_rate)
      .reduce((sum, p) => {
        const due = calcCompound(p.loan_amount, p.interest_rate, p.entry_date, p.released_date);
        return sum + (due - parseFloat(p.loan_amount));
      }, 0);

    const monthlyProjected = src
      .filter((p) => !p.is_released && p.interest_rate)
      .reduce((sum, p) => sum + parseFloat(p.loan_amount || 0) * (parseFloat(p.interest_rate) / 100), 0);

    return { activeLoanTotal, interestEarned, monthlyProjected };
  }, [pawns, reportsPawns]);

  function getPageNumbers() {
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-neutral-50 dark:bg-neutral-950 transition-colors duration-200"
    >
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/60 dark:border-neutral-800/60 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 shadow-sm">
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile((v) => !v)}
            className="flex items-center gap-3 rounded-2xl px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            <div className="relative w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center">
              <span className="text-amber-400 text-xs font-bold">G</span>
              {isBoss && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </div>
            <div className="text-left">
              <h1 className="text-base font-semibold text-slate-900 dark:text-white leading-none">Guptha's</h1>
              <p className="text-xs text-slate-400 mt-0.5">{storeId}</p>
            </div>
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden z-40"
              >
                <div className="bg-slate-900 px-5 py-5 flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-slate-900 font-bold text-lg ${isBoss ? "bg-amber-400" : "bg-slate-300"}`}>
                    {(userName || storeId).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-white font-semibold text-sm leading-none">{userName || storeId}</p>
                      {isBoss && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <p className={`text-xs mt-1 font-medium ${isBoss ? "text-amber-400" : "text-slate-400"}`}>
                      {isBoss ? "Boss" : "Employee"}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-700">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide mb-2">
                    <Store className="w-3.5 h-3.5" /> Store Details
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Store ID</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 font-mono">{storeId}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-xs text-slate-400">Total Entries</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{pawns.length}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1.5">
                    <span className="text-xs text-slate-400">Active Loans</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{pawns.filter(p => !p.is_released).length}</span>
                  </div>
                </div>

                {isBoss ? (
                  <div className="px-3 pt-3 pb-1">
                    <button
                      onClick={() => { setShowProfile(false); setShowEmployees(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Manage Employees
                    </button>
                    <button
                      onClick={() => { setShowProfile(false); setShowPwdRequests(true); }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Password Requests
                      </span>
                      {pendingCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                      )}
                    </button>
                    <button
                      onClick={() => { setShowProfile(false); setShowChangePwd(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Key className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Change Password
                    </button>
                  </div>
                ) : (
                  <div className="px-3 pt-3 pb-1">
                    <button
                      onClick={() => { setShowProfile(false); setShowEmpChangePwd(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Key className="w-4 h-4 text-slate-500 dark:text-slate-400" /> Change Password
                    </button>
                  </div>
                )}

                <div className="px-3 py-3">
                  <button
                    onClick={() => { setShowProfile(false); setPawns([]); logout(); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-500 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Register switch: Pawn | Purchase */}
        <div className="flex items-center gap-1 bg-neutral-800/80 border border-neutral-700 rounded-xl p-1 shrink-0">
          {[["pawn", "Pawn"], ["purchase", "Purchase"]].map(([val, lab]) => (
            <button
              key={val}
              onClick={() => setSection(val)}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                section === val
                  ? "bg-amber-500 text-slate-900 shadow"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              {lab}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center shrink-0">
          {/* Desktop: show all buttons */}
          {isBoss && (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={openReports}
              className="hidden sm:flex items-center gap-2 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-xl px-3 lg:px-4 py-2 text-sm font-medium hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden md:inline">Reports</span>
            </motion.button>
          )}
          {isBoss && (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowNotes(true)}
              className="hidden sm:flex items-center gap-2 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-xl px-3 lg:px-4 py-2 text-sm font-medium hover:bg-neutral-700 hover:text-white transition-colors"
            >
              <NotebookPen className="w-4 h-4" />
              <span className="hidden md:inline">Notepad</span>
            </motion.button>
          )}
          {isBoss && section === "pawn" && (
            <div className="hidden sm:block">
              <ExportMenu
                onExportExcel={handleExportExcel}
                onBackupJSON={() => setShowBackupPwd(true)}
                onRestoreClick={() => restoreInputRef.current?.click()}
              />
            </div>
          )}

          {/* Mobile: ⋯ more menu for boss actions */}
          {isBoss && (
            <div className="relative sm:hidden" ref={mobileMoreRef}>
              <button
                onClick={() => setShowMobileMore(v => !v)}
                className="flex items-center justify-center w-9 h-9 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-xl hover:bg-neutral-700 hover:text-white transition-colors"
              >
                <span className="text-lg font-bold leading-none tracking-tighter">···</span>
              </button>
              <AnimatePresence>
                {showMobileMore && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden z-40"
                  >
                    <button onClick={() => { setShowMobileMore(false); openReports(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-neutral-800 hover:text-white transition-colors">
                      <BarChart2 className="w-4 h-4 text-amber-400 shrink-0" /> Reports
                    </button>
                    <div className="border-t border-neutral-800" />
                    <button onClick={() => { setShowMobileMore(false); setShowNotes(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-neutral-800 hover:text-white transition-colors">
                      <NotebookPen className="w-4 h-4 text-amber-400 shrink-0" /> Notepad
                    </button>
                    <div className="border-t border-neutral-800" />
                    <button onClick={() => { setShowMobileMore(false); setShowBackupPwd(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-neutral-800 hover:text-white transition-colors">
                      <FileJson className="w-4 h-4 text-amber-400 shrink-0" /> Backup (JSON)
                    </button>
                    <div className="border-t border-neutral-800" />
                    <button onClick={() => { setShowMobileMore(false); handleExportExcel(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-neutral-800 hover:text-white transition-colors">
                      <Download className="w-4 h-4 text-emerald-400 shrink-0" /> Export Excel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {section === "pawn" && (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={openNewEntryModal}
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-xl px-3 sm:px-4 py-2 text-sm font-bold hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </motion.button>
          )}
        </div>
      </div>

      {section === "purchase" ? (
        <PurchaseSection isBoss={isBoss} />
      ) : (
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <StatCards stats={stats} />

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
          <div className="relative flex-1 sm:max-w-md group flex items-center">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
              placeholder="Search by name, item, entry no or date…"
              className="w-full pl-4 pr-12 py-2.5 border border-neutral-800 rounded-xl text-sm bg-neutral-900 text-slate-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all"
            />
            <button
              onClick={() => setSearch(searchInput)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-amber-400 transition-colors p-0.5"
              tabIndex={-1}
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <FiltersDropdown
              statusFilter={statusFilter} onStatusChange={setStatusFilter}
              typeFilter={typeFilter}     onTypeChange={setTypeFilter}
              dateMode={dateMode}         onDateModeChange={setDateMode}
              specificDate={specificDate} onSpecificDateChange={setSpecificDate}
              dateFrom={dateFrom}         onDateFromChange={setDateFrom}
              dateTo={dateTo}             onDateToChange={setDateTo}
            />
            {/* Keyed remount replays the pop-in on count change. No AnimatePresence
                mode="wait" here — its exit could orphan a stale span at opacity 0,
                leaving the badge showing the wrong (or no) count. */}
            <motion.span
              key={filtered.length}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.15 }}
              className="text-xs font-semibold text-neutral-500 bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700 tabular-nums whitespace-nowrap"
            >
              {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            </motion.span>
          </div>
        </div>

        {/* Serial range filter chip */}
        {serialRange && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-[11px] text-neutral-500">Filtered by:</span>
            <span className="flex items-center gap-1.5 text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg">
              Series {serialRange.label} · {serialRange.from}–{serialRange.to}
              <button
                onClick={() => setSerialRange(null)}
                className="ml-0.5 text-amber-400 hover:text-white transition-colors leading-none"
                title="Clear series filter"
              >✕</button>
            </span>
          </div>
        )}

        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
          <PawnTable
            pawns={paginated}
            loading={loading}
            onRowClick={openPawn}
          />

          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-neutral-800 flex items-center justify-between gap-2">
              <span className="text-xs text-neutral-500 tabular-nums hidden sm:block">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} entries
              </span>
              <span className="text-xs text-neutral-500 tabular-nums sm:hidden">
                {page} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="First page"
                >«</button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Prev</span>
                  <span className="sm:hidden">‹</span>
                </button>
                {getPageNumbers().map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors hidden sm:flex items-center justify-center ${
                      n === page ? "bg-amber-500 text-slate-900" : "text-neutral-400 hover:bg-neutral-800"
                    }`}
                  >{n}</button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">›</span>
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Last page"
                >»</button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {showModal && (
        <EntryModal
          nextSerial={nextSerial}
          defaultDate={adaptiveDateRef.current || undefined}
          isBoss={isBoss}
          existingPawns={pawns}
          onClose={() => setShowModal(false)}
          onSaved={async (data) => {
            const savedSerial = await handleAddPawn(data);
            setShowModal(false);
            if (savedSerial != null) {
              adaptiveSerialRef.current = savedSerial + 1;
              adaptiveDateRef.current   = data.entry_date; // remember last saved date
            } else {
              adaptiveSerialRef.current = null;
              adaptiveDateRef.current   = null;
              fetchNextSerial();
            }
          }}
          onCancelBill={handleCancelBill}
        />
      )}

      {showEmployees && (
        <EmployeeManagerModal
          onClose={() => setShowEmployees(false)}
          onPendingCountChange={setPendingCount}
        />
      )}


      {selectedPawn && (
        <EntryDetailCard
          pawn={selectedPawn}
          onClose={() => setSelectedPawn(null)}
          onRelease={handleRelease}
          onMarkActive={handleMarkActive}
          onSold={handleMarkSold}
          userRole={role}
          isBoss={isBoss}
          onAddAmount={handleAddAmount}
          onAddPrepayment={handleAddPrepayment}
          onAddInterestPayment={handleAddInterestPayment}
          onDeleteDhafa={handleDeleteDhafa}
          onDeletePrepayment={handleDeletePrepayment}
          onCancel={handleCancelPawn}
          onRenewLoan={handleRenewLoan}
          onLinkRenewal={handleLinkRenewal}
          onEdit={handleEditPawn}
          editedBy={{ username: storeId, name: userName || storeId }}
          nextSerial={nextSerial}
          allPawns={pawns}
          onNavigateToPawn={openPawn}
        />
      )}

      <AnimatePresence>
        {showReports && (
          <ReportsModal
            pawns={reportsPawns || pawns}
            loading={reportsLoading}
            isBoss={isBoss}
            bossStats={bossStats}
            onClose={() => { setShowReports(false); setReportsPawns(null); }}
            onSeriesClick={(from, to, label) => {
              setSerialRange({ from, to, label });
              setShowReports(false);
              setReportsPawns(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNotes && (
          <NotesModal onClose={() => setShowNotes(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChangePwd && (
          <ChangePwdModal
            bossPassword={bossPassword}
            setBossPassword={setBossPassword}
            onClose={() => setShowChangePwd(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPwdRequests && <PwdRequestsModal onClose={() => setShowPwdRequests(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showEmpChangePwd && (
          <EmpChangePwdModal
            employeeUsername={storeId}
            onClose={() => setShowEmpChangePwd(false)}
          />
        )}
      </AnimatePresence>

      <input
        ref={restoreInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleRestoreFile}
      />

      {/* Backup password dialog */}
      <AnimatePresence>
        {showBackupPwd && <BackupPasswordModal onConfirm={handleBackupJSON} onCancel={() => setShowBackupPwd(false)} />}
      </AnimatePresence>

      {/* Restore password dialog */}
      <AnimatePresence>
        {showRestorePwd && <RestorePasswordModal onConfirm={handleRestoreWithPassword} onCancel={() => { setShowRestorePwd(false); setPendingRestoreText(null); }} />}
      </AnimatePresence>

      {/* Chatbot — rendered outside DashboardPage in App.jsx to avoid transform containment */}

      <AnimatePresence>
        {restoreStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium border ${
              restoreStatus.ok
                ? "bg-emerald-950 border-emerald-700 text-emerald-300"
                : "bg-red-950 border-red-700 text-red-300"
            }`}
          >
            {restoreStatus.ok ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                Restored {restoreStatus.count} entries successfully
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                {restoreStatus.msg || "Invalid backup file — restore failed"}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
