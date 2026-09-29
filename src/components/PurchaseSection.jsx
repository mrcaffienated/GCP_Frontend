import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Download, FileSignature, IndianRupee } from "lucide-react";
import * as XLSX from "xlsx";
import { purchasesApi } from "../services/api";
import PurchaseTable from "./PurchaseTable";
import PurchaseModal from "./PurchaseModal";
import PurchaseDetailCard from "./PurchaseDetailCard";

const PER_PAGE = 30;
const FETCH_ALL = 1000000;

function StatCard({ label, value, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="rounded-2xl p-4 sm:p-5 border cursor-default select-none bg-neutral-900 border-neutral-700 text-white"
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-60 leading-tight">{label}</p>
        {Icon && <Icon className="w-4 h-4 opacity-40 shrink-0" />}
      </div>
      <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight">{value}</p>
    </motion.div>
  );
}

export default function PurchaseSection({ isBoss }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAll, setTotalAll] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [selected, setSelected] = useState(null);
  const [nextSerial, setNextSerial] = useState(1);

  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const paramsRef = useRef({});
  const seqRef = useRef(0);

  const fetchPurchases = useCallback(async () => {
    const seq = ++seqRef.current;
    try {
      setLoading(true);
      const res = await purchasesApi.list({ ...paramsRef.current, per_page: FETCH_ALL });
      if (seq !== seqRef.current) return;
      const d = res.data;
      setPurchases(d.items ?? d);
      if (d.total_all !== undefined) setTotalAll(d.total_all);
      if (d.total_paid !== undefined) setTotalPaid(d.total_paid);
    } catch (err) {
      console.error("Failed to load purchases:", err);
    } finally {
      // Whichever fetch lands last clears the spinner.
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (typeFilter !== "all") params.metal_type = typeFilter;
    paramsRef.current = params;
    setPage(1);
    fetchPurchases();
  }, [search, typeFilter, fetchPurchases]);

  const fetchNextSerial = useCallback(async () => {
    try {
      const res = await purchasesApi.nextSerial();
      setNextSerial(res.data.next_serial);
    } catch (err) {
      console.error("Failed to fetch next form serial:", err);
    }
  }, []);

  async function openAdd() {
    await fetchNextSerial();
    setShowAdd(true);
  }

  // ── Mutations ────────────────────────────────────────────────
  const creatingRef = useRef(false);

  async function handleAdd(payload) {
    if (creatingRef.current) return;
    creatingRef.current = true;
    try {
      const res = await purchasesApi.create(payload);
      setPurchases((prev) => [res.data, ...prev]);
      setTotalAll((t) => t + 1);
      setTotalPaid((t) => t + parseFloat(res.data.amount_paid || 0));
    } finally {
      creatingRef.current = false;
    }
  }

  async function handleUpdate(payload) {
    const res = await purchasesApi.update(editTarget.id, payload);
    setPurchases((prev) => prev.map((p) => (p.id === editTarget.id ? res.data : p)));
    setSelected((prev) => (prev?.id === editTarget.id ? res.data : prev));
    fetchPurchases(); // silent reconcile of totals
  }

  async function handleDelete(id) {
    await purchasesApi.delete(id);
    setPurchases((prev) => prev.filter((p) => p.id !== id));
    setTotalAll((t) => Math.max(0, t - 1));
  }

  function handleExportExcel() {
    const rows = purchases.map((p) => ({
      "Form No": p.series ? `${p.series}${p.serial_no}` : p.serial_no,
      Date: p.purchase_date,
      Seller: p.seller_name,
      "Father/Spouse": (p.relative_name || "").replace(/^(Father|Spouse):\s*/i, ""),
      Phone: p.phone || "",
      Aadhar: p.aadhar || "",
      Address: p.address || "",
      Item: p.item_description,
      "Weight (g)": p.item_weight || "",
      Type: p.metal_type === "silver" ? "Silver" : "Gold",
      "Amount Paid (₹)": parseFloat(p.amount_paid || 0),
      Notes: p.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchases");
    XLSX.writeFile(wb, "gupthas_purchases.xlsx");
  }

  const totalPages = Math.ceil(purchases.length / PER_PAGE);
  const paginated = useMemo(
    () => purchases.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [purchases, page]
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* Stats */}
      <div className="mb-4 sm:mb-6">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:max-w-sm">
          <StatCard label="Total Forms" value={totalAll} icon={FileSignature} delay={0} />
          <StatCard
            label="Total Paid"
            value={`₹${Number(totalPaid).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
            icon={IndianRupee} delay={0.05}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-md group flex items-center">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSearch(searchInput); }}
            placeholder="Search by name, item, phone, aadhar or form no…"
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

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Type filter */}
          <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-xl p-1">
            {[["all", "All"], ["gold", "✦ Gold"], ["silver", "◆ Silver"]].map(([val, lab]) => (
              <button key={val} onClick={() => setTypeFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  typeFilter === val ? "bg-neutral-700 text-white" : "text-neutral-500 hover:text-neutral-300"
                }`}>{lab}</button>
            ))}
          </div>

          <motion.span
            key={purchases.length}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="text-xs font-semibold text-neutral-500 bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700 tabular-nums whitespace-nowrap"
          >
            {purchases.length} {purchases.length === 1 ? "form" : "forms"}
          </motion.span>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleExportExcel}
            className="flex items-center gap-2 border border-neutral-700 bg-neutral-800 text-slate-300 rounded-xl px-3 py-2 text-sm font-medium hover:bg-neutral-700 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Export</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={openAdd}
            className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 rounded-xl px-3 sm:px-4 py-2 text-sm font-bold hover:from-amber-400 hover:to-amber-300 transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Purchase
          </motion.button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden shadow-xl">
        <PurchaseTable purchases={paginated} loading={loading} onRowClick={setSelected} />

        {totalPages > 1 && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-neutral-800 flex items-center justify-between gap-2">
            <span className="text-xs text-neutral-500 tabular-nums hidden sm:block">
              Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, purchases.length)} of {purchases.length} forms
            </span>
            <span className="text-xs text-neutral-500 tabular-nums sm:hidden">{page} / {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">«</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <span className="hidden sm:inline">Prev</span><span className="sm:hidden">‹</span>
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <span className="hidden sm:inline">Next</span><span className="sm:hidden">›</span>
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">»</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <PurchaseModal
          nextSerial={nextSerial}
          existing={purchases}
          onClose={() => setShowAdd(false)}
          onSave={handleAdd}
        />
      )}
      {editTarget && (
        <PurchaseModal
          initial={editTarget}
          existing={purchases}
          onClose={() => setEditTarget(null)}
          onSave={handleUpdate}
        />
      )}
      {selected && !editTarget && (
        <PurchaseDetailCard
          purchase={selected}
          isBoss={isBoss}
          onClose={() => setSelected(null)}
          onEdit={(p) => setEditTarget(p)}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
