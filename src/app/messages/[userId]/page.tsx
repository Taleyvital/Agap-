"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Search, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getFlameColorHex } from "@/lib/flames";
import { getBooks, getChapter } from "@/lib/bible";
import type { BibleBook, BibleVerseRow } from "@/lib/types";
import { useXPToast } from "@/components/providers/XPToastProvider";

interface Message {
  id: string;
  senderId: string;
  verseRef: string;
  verseText: string;
  message: string | null;
  readAt: string | null;
  createdAt: string;
}

function FlameIcon({ streak }: { streak: number }) {
  const color = getFlameColorHex(streak);
  return (
    <motion.span
      animate={{ rotate: [0, -4, 4, -4, 0], scale: [1, 1.06, 1, 1.06, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ display: "inline-block", color, filter: streak >= 30 ? "drop-shadow(0 0 4px #ffffff88)" : "none" }}
    >
      🔥
    </motion.span>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

// ── Verse Picker Bottom Sheet ─────────────────────────────────────────────────
interface VersePickerProps {
  onClose: () => void;
  onSend: (verseRef: string, verseText: string, message: string) => Promise<void>;
  sending: boolean;
}

function VersePicker({ onClose, onSend, sending }: VersePickerProps) {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [chapter, setChapter] = useState(1);
  const [verses, setVerses] = useState<BibleVerseRow[]>([]);
  const [selectedVerse, setSelectedVerse] = useState<BibleVerseRow | null>(null);
  const [bookSearch, setBookSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [step, setStep] = useState<"book" | "chapter" | "verse" | "compose">("book");

  useEffect(() => {
    void getBooks("FRLSG").then(setBooks);
  }, []);

  const filteredBooks = books.filter((b) =>
    b.name.toLowerCase().includes(bookSearch.toLowerCase()),
  );

  const loadVerses = useCallback(async (book: BibleBook, ch: number) => {
    setLoadingVerses(true);
    try {
      const data = await getChapter("FRLSG", book.bookid, ch);
      setVerses(data);
    } finally {
      setLoadingVerses(false);
    }
  }, []);

  const selectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setChapter(1);
    setStep("chapter");
  };

  const selectChapter = (ch: number) => {
    setChapter(ch);
    setStep("verse");
    void loadVerses(selectedBook!, ch);
  };

  const selectVerse = (v: BibleVerseRow) => {
    setSelectedVerse(v);
    setStep("compose");
  };

  const handleSend = () => {
    if (!selectedBook || !selectedVerse) return;
    const ref = `${selectedBook.name} ${chapter}:${selectedVerse.verse}`;
    void onSend(ref, selectedVerse.text, message);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
      />
      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary"
        style={{ maxHeight: "82vh" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-bg-tertiary" />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-separator">
          <div className="flex items-center gap-2">
            {step !== "book" && (
              <button type="button" onClick={() => setStep(step === "compose" ? "verse" : step === "verse" ? "chapter" : "book")}
                className="text-text-tertiary text-xs font-sans">
                ← Retour
              </button>
            )}
            <h3 className="font-serif text-base italic text-text-primary">
              {step === "book" && "Choisir un livre"}
              {step === "chapter" && `${selectedBook?.name} — Chapitre`}
              {step === "verse" && `${selectedBook?.name} ${chapter} — Verset`}
              {step === "compose" && "Composer"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="text-text-tertiary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-3" style={{ maxHeight: "calc(82vh - 120px)" }}>

          {/* Step: book */}
          {step === "book" && (
            <>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
                <input
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="Rechercher un livre…"
                  className="w-full rounded-xl border border-separator bg-bg-tertiary pl-8 pr-3 py-2 font-sans text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {filteredBooks.map((b) => (
                  <button key={b.bookid} type="button" onClick={() => selectBook(b)}
                    className="rounded-xl border border-separator bg-bg-tertiary px-3 py-2.5 text-left font-sans text-xs text-text-primary active:bg-bg-primary transition-colors">
                    {b.name}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step: chapter */}
          {step === "chapter" && selectedBook && (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                <button key={ch} type="button" onClick={() => selectChapter(ch)}
                  className="rounded-xl border border-separator bg-bg-tertiary py-2.5 font-sans text-sm text-text-primary active:bg-bg-primary transition-colors">
                  {ch}
                </button>
              ))}
            </div>
          )}

          {/* Step: verse */}
          {step === "verse" && (
            <>
              {loadingVerses ? (
                <div className="flex justify-center py-8">
                  <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {verses.map((v) => (
                    <button key={v.verse} type="button" onClick={() => selectVerse(v)}
                      className="rounded-xl border border-separator bg-bg-tertiary px-3 py-2.5 text-left transition-colors active:bg-bg-primary">
                      <span className="font-sans text-[10px] text-accent uppercase tracking-wider">v.{v.verse}</span>
                      <p className="font-serif text-sm italic text-text-primary mt-0.5 leading-snug line-clamp-2">{v.text}</p>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Step: compose */}
          {step === "compose" && selectedBook && selectedVerse && (
            <div className="flex flex-col gap-4">
              {/* Verse preview */}
              <div className="rounded-2xl border border-separator bg-bg-tertiary px-4 py-3">
                <p className="font-sans text-[10px] text-accent uppercase tracking-wider mb-1">
                  {selectedBook.name} {chapter}:{selectedVerse.verse}
                </p>
                <p className="font-serif text-sm italic text-text-primary leading-relaxed">
                  {selectedVerse.text}
                </p>
              </div>

              {/* Message */}
              <div>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 140))}
                  placeholder="Ajouter un message court… (optionnel)"
                  rows={3}
                  className="w-full rounded-xl border border-separator bg-bg-tertiary px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-none"
                />
                <p className="text-right font-sans text-[10px] text-text-tertiary mt-1">{message.length}/140</p>
              </div>

              {/* Send button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="w-full rounded-2xl bg-accent py-3.5 font-sans text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {sending ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>Envoyer 🔥</>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const otherId = params.userId as string;
  const { showXPToast } = useXPToast();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("");
  const [streakCount, setStreakCount] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setCurrentUserId(user.id);

      // Load other user's profile
      const { data: profile } = await supabase
        .from("user_profiles_public")
        .select("first_name, avatar_level")
        .eq("user_id", otherId)
        .maybeSingle();
      if (profile) {
        setOtherName(profile.first_name as string);
      }

      // Load streak
      const { data: streak } = await supabase
        .from("verse_streaks")
        .select("streak_count")
        .or(`and(user_a.eq.${user.id},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${user.id})`)
        .maybeSingle();
      setStreakCount((streak?.streak_count as number) ?? 0);

      // Load messages
      const { data: msgs } = await supabase
        .from("verse_messages")
        .select("id, sender_id, verse_ref, verse_text, message, read_at, created_at")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),` +
          `and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true });

      setMessages(
        (msgs ?? []).map((m) => ({
          id: m.id as string,
          senderId: m.sender_id as string,
          verseRef: m.verse_ref as string,
          verseText: m.verse_text as string,
          message: m.message as string | null,
          readAt: m.read_at as string | null,
          createdAt: m.created_at as string,
        })),
      );

      // Mark unread messages as read
      await supabase
        .from("verse_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", otherId)
        .eq("receiver_id", user.id)
        .is("read_at", null);

      setLoading(false);
    })();
  }, [router, otherId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!loading) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [messages, loading]);

  const handleSend = useCallback(async (verseRef: string, verseText: string, message: string) => {
    if (!currentUserId) return;
    setSending(true);
    try {
      const res = await fetch("/api/flames/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: otherId, verseRef, verseText, message: message || null }),
      });
      const data = await res.json() as { ok: boolean; messageId: string; streakCount: number; xp?: { xpEarned: number; newTotal: number; levelUp: boolean; newLevel: number; newLevelName: string } };
      if (!data.ok) return;

      // Optimistic update
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          senderId: currentUserId,
          verseRef,
          verseText,
          message: message || null,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
      ]);
      setStreakCount(data.streakCount);
      setShowPicker(false);

      if (data.xp) {
        showXPToast({
          xpEarned: data.xp.xpEarned,
          newTotal: data.xp.newTotal,
          levelUp: data.xp.levelUp,
          newLevel: data.xp.newLevel,
          newLevelName: data.xp.newLevelName,
        });
      }
    } finally {
      setSending(false);
    }
  }, [currentUserId, otherId, showXPToast]);

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const d = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) last.msgs.push(msg);
    else grouped.push({ date: d, msgs: [msg] });
  }

  return (
    <AppShell showNav={false}>
      <div className="flex flex-col min-h-screen">

        {/* Fixed header */}
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-separator bg-bg-primary/95 backdrop-blur-sm px-4 py-3">
          <button type="button" onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-secondary shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <p className="font-sans text-sm text-text-primary font-medium">{otherName || "…"}</p>
          </div>
          {streakCount > 0 && (
            <div className="flex items-center gap-1">
              <FlameIcon streak={streakCount} />
              <span
                className="font-sans text-sm font-semibold"
                style={{ color: getFlameColorHex(streakCount) }}
              >
                {streakCount}
              </span>
            </div>
          )}
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 pt-16 text-center">
              <span className="text-4xl">🕊️</span>
              <p className="font-serif italic text-text-secondary text-lg">
                Commencez l&apos;échange
              </p>
              <p className="font-sans text-xs text-text-tertiary max-w-[220px]">
                Envoyez le premier verset pour allumer votre flamme ensemble.
              </p>
            </div>
          )}

          {!loading && grouped.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-separator" />
                <span className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary">{group.date}</span>
                <div className="flex-1 h-px bg-separator" />
              </div>

              {group.msgs.map((msg) => {
                const isMine = msg.senderId === currentUserId;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex mb-3 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[80%] rounded-2xl px-4 py-3"
                      style={{
                        background: isMine ? "#1a1830" : "#1c1c1c",
                        border: isMine ? "1px solid rgba(123,111,212,0.35)" : "1px solid #2a2a2a",
                        borderRadius: 16,
                      }}
                    >
                      <p className="font-sans text-[11px] uppercase tracking-wider mb-1" style={{ color: "#7B6FD4" }}>
                        {msg.verseRef}
                      </p>
                      <p className="font-serif text-sm italic text-text-primary leading-relaxed">
                        {msg.verseText}
                      </p>
                      {msg.message && (
                        <p className="font-sans text-[13px] text-text-secondary mt-2 leading-snug">
                          {msg.message}
                        </p>
                      )}
                      <p className="font-sans text-[11px] text-text-tertiary mt-1.5 text-right">
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Fixed bottom bar */}
        <div className="fixed bottom-0 inset-x-0 mx-auto max-w-[430px] border-t border-separator bg-bg-primary/95 backdrop-blur-sm px-4 py-3">
          <button
            type="button"
            onClick={() => setShowPicker(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-sans text-sm font-medium text-white"
          >
            <Send className="h-4 w-4" />
            Envoyer un verset
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showPicker && (
          <VersePicker
            onClose={() => setShowPicker(false)}
            onSend={handleSend}
            sending={sending}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
