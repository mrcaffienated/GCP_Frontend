import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Plus, UserCheck, Eye, EyeOff, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { employeesApi } from "../services/api";
import { useSwipeToDismiss } from "../hooks/useSwipeToDismiss";

export default function EmployeeManagerModal({ onClose, onPendingCountChange, initialTab = "list" }) {
  const { dragHandleProps, sheetProps } = useSwipeToDismiss(onClose);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
  const [tab, setTab]               = useState(initialTab);
  const [employees, setEmployees]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  // Add-employee form
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [showPwd, setShowPwd]       = useState(false);

  // ── Load employees ─────────────────────────────────────────────
  async function load() {
    try {
      setLoading(true);
      const res = await employeesApi.list();
      const list = res.data ?? [];
      setEmployees(list);
      const pending = list.filter(e => e.is_active && e.pwd_change_request?.status === "pending").length;
      onPendingCountChange?.(pending);
    } catch (e) {
      setError("Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const active   = employees.filter(e => e.is_active !== false);
  const inactive = employees.filter(e => e.is_active === false);
  const pending  = employees.filter(e => e.is_active && e.pwd_change_request?.status === "pending");
  const approved = employees.filter(e => e.is_active && e.pwd_change_request?.status === "approved");

  // ── Add employee ───────────────────────────────────────────────
  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await employeesApi.create({
        name: form.name,
        username: form.username.toUpperCase(),
        password: form.password,
      });
      setEmployees(prev => [...prev, res.data]);
      setForm({ name: "", username: "", password: "" });
      setSuccess(`Employee ${res.data.username} created!`);
      setTab("list");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create employee.");
    } finally {
      setSaving(false);
    }
  }

  // ── Deactivate ─────────────────────────────────────────────────
  async function handleDeactivate(emp) {
    try {
      const res = await employeesApi.deactivate(emp.id);
      setEmployees(prev => prev.map(e => e.id === emp.id ? res.data : e));
      setDeactivateTarget(null);
      const updatedList = employees.map(e => e.id === emp.id ? res.data : e);
      const pendingCount = updatedList.filter(e => e.is_active && e.pwd_change_request?.status === "pending").length;
      onPendingCountChange?.(pendingCount);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to deactivate.");
    }
  }

  // ── Password change actions ────────────────────────────────────
  async function handleApprove(emp) {
    try {
      const res = await employeesApi.approvePassword(emp.id);
      const updated = employees.map(e => e.id === emp.id ? res.data : e);
      setEmployees(updated);
      const pendingCount = updated.filter(e => e.is_active && e.pwd_change_request?.status === "pending").length;
      onPendingCountChange?.(pendingCount);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to approve.");
    }
  }

  async function handleDeny(emp) {
    try {
      const res = await employeesApi.denyPassword(emp.id);
      const updated = employees.map(e => e.id === emp.id ? res.data : e);
      setEmployees(updated);
      const pendingCount = updated.filter(e => e.is_active && e.pwd_change_request?.status === "pending").length;
      onPendingCountChange?.(pendingCount);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to deny.");
    }
  }

  const inputCls = "w-full bg-neutral-800 border border-neutral-700 text-slate-100 placeholder-neutral-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40";
  const labelCls = "block text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1.5";

  const TABS = [
    { key: "list",     label: "Employees" },
    { key: "requests", label: `Requests${pending.length ? ` (${pending.length})` : ""}` },
    { key: "add",      label: "+ Add New" },
  ];

  return (
    <>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-neutral-900 border border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md sm:mx-4 overflow-hidden max-h-[95vh] sm:max-h-[88vh] flex flex-col"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={e => e.stopPropagation()}
          {...sheetProps}
        >
          {/* Header */}
          <div className="bg-neutral-900 border-b border-neutral-800 px-5 sm:px-6 pt-4 sm:pt-6 pb-4 shrink-0">
            <div className="flex justify-center pt-0 pb-2 sm:hidden touch-none cursor-grab active:cursor-grabbing" {...dragHandleProps}>
              <div className="w-10 h-1 rounded-full bg-neutral-700" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-400 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Employee Management</h2>
                <p className="text-xs text-slate-400 mt-0.5">{active.length} active · {inactive.length} inactive</p>
              </div>
              <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              {TABS.map(t => (
                <button key={t.key} onClick={() => { setTab(t.key); setError(""); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                    tab === t.key
                      ? "bg-amber-500 text-slate-900"
                      : "text-slate-400 hover:text-white hover:bg-neutral-800"
                  }`}>
                  {t.label}
                  {t.key === "requests" && pending.length > 0 && tab !== "requests" && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4">

            {/* Success / Error banners */}
            <AnimatePresence>
              {success && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 mb-4">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
                </motion.div>
              )}
              {error && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mb-4">
                  <XCircle className="w-4 h-4 shrink-0" /> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── EMPLOYEES LIST ──────────────────────────────── */}
            {tab === "list" && (
              <div className="space-y-2">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                  </div>
                ) : active.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-10">No employees yet. Add one using the tab above.</p>
                ) : (
                  active.map(emp => (
                    <motion.div key={emp.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between px-4 py-3 rounded-2xl border border-neutral-800 hover:bg-neutral-800/60 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-700 flex items-center justify-center text-sm font-bold text-amber-400">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{emp.name}</p>
                          <p className="text-xs text-neutral-500 font-mono">{emp.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {emp.pwd_change_request?.status === "pending" && (
                          <span className="text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3" /> PWD REQ
                          </span>
                        )}
                        {emp.pwd_change_request?.status === "approved" && (
                          <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> APPROVED
                          </span>
                        )}
                        <button onClick={() => setDeactivateTarget(emp)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl text-neutral-600 hover:bg-red-500/10 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}

                {inactive.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-neutral-800">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-2">Inactive</p>
                    {inactive.map(emp => (
                      <div key={emp.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl opacity-40">
                        <div className="w-8 h-8 rounded-xl bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm text-neutral-400 line-through">{emp.name}</p>
                          <p className="text-xs text-neutral-600 font-mono">{emp.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PASSWORD REQUESTS ───────────────────────────── */}
            {tab === "requests" && (
              <div className="space-y-3">
                {pending.length === 0 && approved.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-10">No password change requests.</p>
                ) : null}

                {pending.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-widest">Pending Approval</p>
                    {pending.map(emp => (
                      <motion.div key={emp.id}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between bg-amber-500/5 border border-amber-500/20 rounded-2xl px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{emp.name}</p>
                          <p className="text-xs text-neutral-500 font-mono">{emp.username}</p>
                          {emp.pwd_change_request?.requested_at && (
                            <p className="text-xs text-neutral-600 mt-0.5">
                              {new Date(emp.pwd_change_request.requested_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleDeny(emp)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Deny">
                            <XCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleApprove(emp)}
                            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors" title="Approve">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}

                {approved.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-widest mt-4">Approved — Awaiting Reset</p>
                    {approved.map(emp => (
                      <div key={emp.id}
                        className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{emp.name}</p>
                          <p className="text-xs text-neutral-500 font-mono">{emp.username}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-emerald-400 font-medium">Approved</span>
                          <button onClick={() => handleDeny(emp)}
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Revoke">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── ADD EMPLOYEE ────────────────────────────────── */}
            {tab === "add" && (
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <input type="text" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required className={inputCls} placeholder="e.g. Ramesh Kumar" />
                </div>
                <div>
                  <label className={labelCls}>Username</label>
                  <input type="text" value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                    required className={`${inputCls} font-mono tracking-widest`} placeholder="e.g. EMP002" />
                  <p className="text-xs text-neutral-600 mt-1">Letters and numbers only, auto-uppercased.</p>
                </div>
                <div>
                  <label className={labelCls}>Password</label>
                  <div className="relative">
                    <input type={showPwd ? "text" : "password"} value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required minLength={4}
                      className={`${inputCls} pr-11`} placeholder="Min. 4 characters" />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-xl py-2.5 text-sm font-bold hover:from-amber-400 hover:to-amber-300 disabled:opacity-60 transition-all shadow-lg shadow-amber-500/20">
                  {saving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    : <><Plus className="w-4 h-4" /> Create Employee</>
                  }
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Deactivate confirm */}
      <AnimatePresence>
        {deactivateTarget && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 60 }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeactivateTarget(null)}
          >
            <motion.div
              className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-xs mx-4 p-6 text-center"
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Deactivate Employee</h3>
              <p className="text-sm text-neutral-400 mb-5">
                Deactivate <span className="font-semibold text-slate-200">{deactivateTarget.name}</span>?
                They will lose login access immediately.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeactivateTarget(null)}
                  className="flex-1 border border-neutral-700 text-neutral-400 rounded-xl py-2.5 text-sm font-medium hover:bg-neutral-800 transition-colors">
                  Cancel
                </button>
                <button onClick={() => handleDeactivate(deactivateTarget)}
                  className="flex-1 bg-red-500 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-600 transition-colors">
                  Deactivate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
