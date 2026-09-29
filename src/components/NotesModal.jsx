import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, NotebookPen, Plus, Trash2, Calendar, Loader2, Check, Pencil } from "lucide-react";
import { notesApi } from "../services/api";

function useLockBodyScroll() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateHeader(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

function NoteCard({ note, onDelete, onSave, isEditing, onStartEdit, onCancelEdit }) {
  const [editContent, setEditContent] = useState(note.content);
  const [editDate, setEditDate] = useState(note.note_date);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      setEditContent(note.content);
      setEditDate(note.note_date);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const len = textareaRef.current.value.length;
          textareaRef.current.setSelectionRange(len, len);
        }
      }, 50);
    }
  }, [isEditing, note.content, note.note_date]);

  async function handleSave() {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      await onSave(note.id, { content: editContent.trim(), note_date: editDate });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(note.id); } finally { setDeleting(false); }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
    if (e.key === "Escape") onCancelEdit();
  }

  // First line as "title", rest as body
  const lines = note.content.split("\n").filter(Boolean);
  const title = lines[0] || "";
  const body = lines.slice(1).join(" ") || "";

  if (isEditing) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="col-span-1 sm:col-span-2 bg-[#1e1b10] border border-amber-500/30 rounded-2xl p-4 space-y-3"
      >
        <input
          type="date"
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
          className="w-full bg-neutral-900 border border-neutral-700 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
        />
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={Math.max(4, editContent.split("\n").length + 1)}
          className="w-full bg-neutral-900 border border-neutral-700 text-slate-100 placeholder-neutral-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all resize-none leading-relaxed"
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancelEdit}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 border border-neutral-700 hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!editContent.trim() || saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Save
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="group relative bg-[#1a1810] border border-[#2e2a1a] hover:border-amber-500/30 rounded-2xl p-4 flex flex-col gap-2 cursor-pointer min-h-[120px] transition-colors"
      onClick={onStartEdit}
    >
      {/* Title */}
      <p className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2">
        {title}
      </p>
      {/* Body preview */}
      {body && (
        <p className="text-xs text-neutral-500 leading-relaxed line-clamp-3 flex-1">
          {body}
        </p>
      )}
      {/* Date at bottom */}
      <p className="text-[10px] text-neutral-600 mt-auto pt-1 font-medium">
        {fmtDate(note.note_date)}
      </p>

      {/* Action buttons on hover */}
      <div
        className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onStartEdit}
          className="p-1.5 rounded-lg text-neutral-600 hover:text-amber-400 hover:bg-amber-500/10 transition-all"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin text-red-400" /> : <Trash2 className="w-3 h-3" />}
        </button>
      </div>
    </motion.div>
  );
}

export default function NotesModal({ onClose }) {
  useLockBodyScroll();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [content, setContent] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    notesApi.list().then((res) => {
      setNotes(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showForm && textareaRef.current) textareaRef.current.focus();
  }, [showForm]);

  function sortNotes(arr) {
    return [...arr].sort((a, b) =>
      b.note_date !== a.note_date
        ? b.note_date > a.note_date ? 1 : -1
        : b.created_at > a.created_at ? 1 : -1
    );
  }

  async function handleAdd() {
    if (!content.trim() || !date) return;
    setSaving(true);
    try {
      const res = await notesApi.create({ note_date: date, content: content.trim() });
      setNotes((prev) => sortNotes([res.data, ...prev]));
      setContent("");
      setDate(new Date().toISOString().split("T")[0]);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave(id, { content: newContent, note_date: newDate }) {
    const res = await notesApi.update(id, { content: newContent, note_date: newDate });
    setNotes((prev) => sortNotes(prev.map((n) => (n.id === id ? res.data : n))));
    setEditingId(null);
  }

  async function handleDelete(id) {
    await notesApi.delete(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function handleAddKeyDown(e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAdd();
    if (e.key === "Escape") { setShowForm(false); setContent(""); }
  }

  const grouped = notes.reduce((acc, n) => {
    if (!acc[n.note_date]) acc[n.note_date] = [];
    acc[n.note_date].push(n);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => (b > a ? 1 : -1));

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-[#111008] border border-[#2a2516] rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl sm:mx-4 max-h-[95vh] sm:max-h-[88vh] flex flex-col"
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-neutral-700" />
        </div>
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-7 pt-4 sm:pt-6 pb-4 sm:pb-5 border-b border-[#2a2516] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <NotebookPen className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Notepad</h2>
              <p className="text-xs text-neutral-500 mt-0.5">{notes.length} {notes.length === 1 ? "note" : "notes"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => { setShowForm((v) => !v); setEditingId(null); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-900 text-xs font-bold hover:bg-amber-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Note
            </motion.button>
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors ml-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Add Note Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden shrink-0"
            >
              <div className="px-5 sm:px-7 py-4 border-b border-[#2a2516] space-y-3 bg-[#161309]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-amber-500/50 shrink-0" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-[#1a1810] border border-[#2e2a1a] text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all"
                  />
                </div>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="Start writing… (Cmd+Enter to save)"
                  rows={4}
                  className="w-full bg-[#1a1810] border border-[#2e2a1a] text-slate-100 placeholder-neutral-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all resize-none leading-relaxed"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowForm(false); setContent(""); }}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold text-neutral-500 hover:text-white bg-neutral-800/60 border border-neutral-700 hover:bg-neutral-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!content.trim() || saving}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes Grid */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 sm:py-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-16">
              <NotebookPen className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">No notes yet.</p>
              <p className="text-xs text-neutral-700 mt-1">Click "Add Note" to write your first one.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {sortedDates.map((dateKey) => (
                <div key={dateKey}>
                  {/* Date section header */}
                  <p className="text-[11px] font-bold text-amber-500/60 uppercase tracking-widest mb-3 px-1">
                    {fmtDateHeader(dateKey)}
                  </p>
                  {/* 2-col grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AnimatePresence mode="popLayout">
                      {grouped[dateKey].map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          isEditing={editingId === note.id}
                          onStartEdit={() => { setEditingId(note.id); setShowForm(false); }}
                          onCancelEdit={() => setEditingId(null)}
                          onDelete={handleDelete}
                          onSave={handleSave}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
