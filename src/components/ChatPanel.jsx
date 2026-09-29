import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Send, Loader2, Sparkles, Bot, User, RotateCcw } from "lucide-react";
import { chatApi } from "../services/api";
import { usePawnNavStore } from "../store/pawnNavStore";

const SUGGESTIONS = [
  "How many bills does Vimala have?",
  "Total active loans in silver?",
  "Which bills were released this month?",
  "Show me today's entries",
];

const THINKING_MARK = "\x00THINKING:";
const RESET_MARK = "\x00RESET";

// Matches **bold** (markdown) or a bill reference like "#4632" / "#A123"
// (optional 2-char series + serial, kept in sync with how the backend formats
// bill numbers).
const TOKEN_RE = /\*\*([^*\n]+)\*\*|#([A-Za-z]{0,2}\d{1,6})\b/g;

// Turn assistant text into React nodes: render **bold** as bold, and every
// "#<bill>" as a link that opens that pawn's detail card. Bills are only
// interactive once the message has finished streaming, so a half-typed number
// can't be mis-clicked.
function renderRichText(text, onBill, interactive) {
  const nodes = [];
  let last = 0;
  let m;
  let i = 0;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={`b-${i++}`} className="font-semibold text-white">{m[1]}</strong>
      );
    } else {
      const billNo = m[2];
      nodes.push(
        interactive ? (
          <button
            key={`bill-${i++}`}
            onClick={() => onBill(billNo)}
            title={`Open bill #${billNo}`}
            className="text-amber-400 font-semibold underline decoration-dotted decoration-amber-500/50 underline-offset-2 hover:text-amber-300 hover:decoration-amber-400 transition-colors cursor-pointer"
          >
            #{billNo}
          </button>
        ) : (
          <span key={`bill-${i++}`} className="text-amber-400 font-semibold">#{billNo}</span>
        )
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// Animated "thinking" indicator — a smooth dot wave plus the current status.
function ThinkingDots({ label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-amber-400"
            style={{ animation: "gupthaDot 1.15s ease-in-out infinite", animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
      {label && <span className="text-xs text-neutral-400">{label}</span>}
    </span>
  );
}

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [thinking, setThinking] = useState("");

  const targetRef = useRef("");   // full text received so far (the stream target)
  const shownRef = useRef(0);     // chars currently revealed on screen
  const doneRef = useRef(false);  // stream signalled done
  const rafRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const threadRef = useRef(0);    // bumped on "new thread" to invalidate any in-flight stream

  const requestBill = usePawnNavStore((s) => s.requestBill);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy, thinking]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // Smooth typewriter: buffered text (targetRef) is revealed at a steady
  // characters-per-second pace, computed from the real elapsed time between
  // frames — so the speed is the SAME whether requestAnimationFrame runs at
  // 60fps (foreground) or is throttled to a few fps (background tab). A catch-up
  // term drains any large backlog quickly. This turns choppy network chunks into
  // smooth flowing text without ever stalling.
  const CPS = 260; // display speed in characters/second
  const pump = useCallback(() => {
    if (rafRef.current) return;
    let lastTs = performance.now();
    const step = (ts) => {
      const dt = Math.min(0.25, Math.max(0, (ts - lastTs) / 1000));
      lastTs = ts;
      const target = targetRef.current;
      if (shownRef.current < target.length) {
        const gap = target.length - shownRef.current;
        const add = Math.min(gap, Math.max(1, Math.ceil(CPS * dt), Math.ceil(gap / 8)));
        shownRef.current += add;
        const text = target.slice(0, shownRef.current);
        setMessages((prev) => {
          const msgs = [...prev];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant" && last.streaming) {
            msgs[msgs.length - 1] = { ...last, content: text };
          }
          return msgs;
        });
        rafRef.current = requestAnimationFrame(step);
      } else if (!doneRef.current) {
        rafRef.current = requestAnimationFrame(step); // caught up — wait for more
      } else {
        rafRef.current = null; // caught up AND done → finalize the bubble
        setMessages((prev) => {
          const msgs = [...prev];
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant" && last.streaming) {
            msgs[msgs.length - 1] = { ...last, content: targetRef.current, streaming: false };
          }
          return msgs;
        });
        setBusy(false);
        setThinking("");
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  const onBill = useCallback((billNo) => {
    requestBill(billNo);   // dashboard opens the detail card
    setOpen(false);        // close the chat so the card is visible in front
  }, [requestBill]);

  // Start a fresh thread: wipe the conversation and abort any in-flight stream
  // (the token bump makes its late callbacks no-ops so it can't bleed in).
  const newThread = useCallback(() => {
    threadRef.current += 1;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    targetRef.current = "";
    shownRef.current = 0;
    doneRef.current = false;
    setMessages([]);
    setInput("");
    setThinking("");
    setBusy(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const send = useCallback(async (text) => {
    const question = (text ?? input).trim();
    if (!question || busy) return;
    const myThread = threadRef.current;      // this stream belongs to the current thread
    const isCurrent = () => threadRef.current === myThread;
    setInput("");
    setBusy(true);
    setThinking("");

    // reset stream state
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    targetRef.current = "";
    shownRef.current = 0;
    doneRef.current = false;

    const history = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

    const failWith = (msg) => {
      doneRef.current = true;
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      setMessages((prev) => {
        const msgs = [...prev];
        const last = msgs[msgs.length - 1];
        if (last && last.role === "assistant" && last.streaming) {
          msgs[msgs.length - 1] = { ...last, content: `Sorry, ${msg}`, streaming: false, error: true };
        } else {
          msgs.push({ role: "assistant", content: `Sorry, ${msg}`, error: true });
        }
        return msgs;
      });
      setBusy(false);
      setThinking("");
    };

    try {
      await chatApi.askStream(question, history, {
        onChunk: (chunk) => {
          if (!isCurrent()) return; // thread was reset — drop this stream
          if (chunk === RESET_MARK) {
            // Tool-round preamble was streamed — clear it, keep waiting.
            targetRef.current = "";
            shownRef.current = 0;
            setMessages((prev) => {
              const msgs = [...prev];
              const last = msgs[msgs.length - 1];
              if (last && last.role === "assistant" && last.streaming) {
                msgs[msgs.length - 1] = { ...last, content: "" };
              }
              return msgs;
            });
            return;
          }
          if (chunk.startsWith(THINKING_MARK)) {
            setThinking(chunk.slice(THINKING_MARK.length));
            return;
          }
          setThinking("");
          targetRef.current += chunk;
          pump();
        },
        onDone: () => {
          if (!isCurrent()) return;
          doneRef.current = true;
          pump(); // finalize once the reveal catches up
        },
        onError: (errMsg) => { if (isCurrent()) failWith(errMsg || "something went wrong — please try again."); },
      });
      // safety net in case onDone was never delivered
      if (isCurrent()) {
        doneRef.current = true;
        pump();
      }
    } catch (err) {
      if (isCurrent()) failWith(err?.message || "something went wrong — check the connection and try again.");
    }
  }, [input, busy, messages, pump]);

  return createPortal(
    <>
      <style>{`
        @keyframes gupthaDot { 0%,80%,100%{transform:scale(0.55);opacity:0.35} 40%{transform:scale(1);opacity:1} }
        @keyframes gupthaCaret { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      {/* Floating chat button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title="Ask Guptha's AI"
        style={{ position: "fixed", bottom: "20px", right: "20px", zIndex: 9999 }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-400 text-slate-900 shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-amber-300 transition-all flex items-center justify-center hover:scale-105 active:scale-95"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "88px",
            right: "20px",
            zIndex: 9999,
            width: "min(400px, calc(100vw - 40px))",
            height: "min(580px, calc(100vh - 120px))",
          }}
          className="bg-neutral-900 border border-neutral-700 rounded-3xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-amber-400 shrink-0" />
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none">Ask Guptha's</p>
                <p className="text-[10px] text-neutral-500 mt-0.5">AI assistant · reads your register</p>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={newThread}
                disabled={messages.length === 0 && !busy}
                title="New chat"
                className="text-neutral-500 hover:text-amber-400 transition-colors p-1.5 rounded-lg hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-500 disabled:cursor-default"
              >
                <RotateCcw className="w-[18px] h-[18px]" />
              </button>
              <button onClick={() => setOpen(false)} title="Close" className="text-neutral-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-neutral-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="pt-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
                  <Bot className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Guptha's AI Assistant</p>
                  <p className="text-xs text-neutral-500 mt-1 px-4 leading-relaxed">
                    Ask anything about your bills, customers, or purchases. Tap any{" "}
                    <span className="text-amber-400 font-semibold">#bill</span> in a reply to open its card.
                  </p>
                </div>
                <div className="space-y-2 px-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="block w-full text-left text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2.5 hover:bg-amber-500/20 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-amber-500 text-slate-900 font-medium rounded-br-md"
                      : m.error
                        ? "bg-red-500/10 text-red-300 border border-red-500/20 rounded-bl-md"
                        : "bg-neutral-800 text-slate-200 border border-neutral-700/60 rounded-bl-md"
                  }`}
                >
                  {m.role === "assistant" && m.streaming && !m.content ? (
                    <ThinkingDots label={thinking} />
                  ) : (
                    <>
                      {m.role === "assistant" && !m.error ? renderRichText(m.content, onBill, !m.streaming) : m.content}
                      {m.streaming && m.content && (
                        <span
                          className="inline-block w-[2px] h-4 bg-amber-400 ml-0.5 align-text-bottom"
                          style={{ animation: "gupthaCaret 1s step-end infinite" }}
                        />
                      )}
                    </>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-lg bg-neutral-700 flex items-center justify-center shrink-0 ml-2 mt-1">
                    <User className="w-3 h-3 text-neutral-400" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-neutral-800 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) send(); }}
                placeholder="e.g. how much does Raghava owe?"
                className="flex-1 bg-neutral-800 border border-neutral-700 text-slate-100 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 placeholder-neutral-600 disabled:opacity-60"
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                className="w-10 h-10 rounded-xl bg-amber-500 text-slate-900 flex items-center justify-center hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 hover:scale-105 active:scale-95"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
