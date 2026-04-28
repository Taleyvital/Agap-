"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Search, X, Send, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getFlameColorHex } from "@/lib/flames";
import { getBooks, getChapter } from "@/lib/bible";
import type { BibleBook, BibleVerseRow } from "@/lib/types";
import { useXPToast } from "@/components/providers/XPToastProvider";

interface VerseMessage {
  id: string;
  kind: "verse";
  senderId: string;
  verseRef: string;
  verseText: string;
  message: string | null;
  readAt: string | null;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  kind: "chat";
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

type ThreadItem = VerseMessage | ChatMessage;

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
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary"
        style={{ maxHeight: "82vh" }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-bg-tertiary" />
        </div>

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

          {step === "compose" && selectedBook && selectedVerse && (
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl px-4 py-3" style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}>
                <p className="font-sans text-[10px] uppercase tracking-wider mb-1" style={{ color: "#7B6FD4" }}>
                  {selectedBook.name} {chapter}:{selectedVerse.verse}
                </p>
                <p className="font-serif text-sm italic leading-relaxed" style={{ color: "#E8E8E8" }}>
                  {selectedVerse.text}
                </p>
              </div>

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
  const [otherAvatarUrl, setOtherAvatarUrl] = useState<string | null>(null);
  const [streakCount, setStreakCount] = useState(0);
  const [thread, setThread] = useState<ThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };
    vv.addEventListener("resize", handler);
    vv.addEventListener("scroll", handler);
    return () => {
      vv.removeEventListener("resize", handler);
      vv.removeEventListener("scroll", handler);
    };
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      if (mounted) setCurrentUserId(user.id);

      const [profileRes, avatarRes, streakRes, verseMsgsRes, chatMsgsRes] = await Promise.all([
        supabase
          .from("user_profiles_public")
          .select("first_name")
          .eq("user_id", otherId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", otherId)
          .maybeSingle(),
        supabase
          .from("verse_streaks")
          .select("streak_count")
          .or(`and(user_a.eq.${user.id},user_b.eq.${otherId}),and(user_a.eq.${otherId},user_b.eq.${user.id})`)
          .maybeSingle(),
        supabase
          .from("verse_messages")
          .select("id, sender_id, verse_ref, verse_text, message, read_at, created_at")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),` +
            `and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`,
          )
          .order("created_at", { ascending: true }),
        supabase
          .from("chat_messages")
          .select("id, sender_id, content, read_at, created_at")
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),` +
            `and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`,
          )
          .order("created_at", { ascending: true }),
      ]);

      if (!mounted) return;

      if (profileRes.data) setOtherName(profileRes.data.first_name as string);
      if (avatarRes.data) setOtherAvatarUrl((avatarRes.data.avatar_url as string | null) ?? null);
      setStreakCount((streakRes.data?.streak_count as number) ?? 0);

      const verseItems: VerseMessage[] = (verseMsgsRes.data ?? []).map((m) => ({
        id: m.id as string,
        kind: "verse",
        senderId: m.sender_id as string,
        verseRef: m.verse_ref as string,
        verseText: m.verse_text as string,
        message: m.message as string | null,
        readAt: m.read_at as string | null,
        createdAt: m.created_at as string,
      }));

      const chatItems: ChatMessage[] = (chatMsgsRes.data ?? []).map((m) => ({
        id: m.id as string,
        kind: "chat",
        senderId: m.sender_id as string,
        content: m.content as string,
        readAt: m.read_at as string | null,
        createdAt: m.created_at as string,
      }));

      const merged = [...verseItems, ...chatItems].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setThread(merged);

      // Mark received messages as read
      await Promise.all([
        supabase
          .from("verse_messages")
          .update({ read_at: new Date().toISOString() })
          .eq("sender_id", otherId)
          .eq("receiver_id", user.id)
          .is("read_at", null),
        supabase
          .from("chat_messages")
          .update({ read_at: new Date().toISOString() })
          .eq("sender_id", otherId)
          .eq("receiver_id", user.id)
          .is("read_at", null),
      ]);

      setLoading(false);

      // Realtime: listen for new chat messages from the other user
      supabase
        .channel(`chat-${user.id}-${otherId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `sender_id=eq.${otherId}`,
          },
          (payload) => {
            const row = payload.new as { id: string; sender_id: string; content: string; read_at: string | null; created_at: string; receiver_id: string };
            if (row.receiver_id !== user.id) return;
            const newMsg: ChatMessage = {
              id: row.id,
              kind: "chat",
              senderId: row.sender_id,
              content: row.content,
              readAt: null,
              createdAt: row.created_at,
            };
            setThread((prev) => [...prev, newMsg]);
            // Mark as read immediately
            void supabase
              .from("chat_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", row.id);
          },
        )
        .subscribe();
    })();

    return () => { mounted = false; };
  }, [router, otherId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!loading) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [thread, loading]);

  const handleSendVerse = useCallback(async (verseRef: string, verseText: string, message: string) => {
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

      setThread((prev) => [
        ...prev,
        {
          id: data.messageId,
          kind: "verse",
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

  const handleSendChat = useCallback(async () => {
    const content = chatInput.trim();
    if (!content || !currentUserId || sendingChat) return;
    setSendingChat(true);
    setChatInput("");

    // Affichage optimiste immédiat
    const tempId = `temp-${Date.now()}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      kind: "chat",
      senderId: currentUserId,
      content,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setThread((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: otherId, content }),
      });
      const data = await res.json() as { ok: boolean; messageId: string; createdAt: string };

      if (data.ok) {
        // Remplacer le message temporaire par l'ID réel
        setThread((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? { ...tempMsg, id: data.messageId, createdAt: data.createdAt ?? tempMsg.createdAt }
              : m,
          ),
        );
      } else {
        // Échec : retirer le message optimiste
        setThread((prev) => prev.filter((m) => m.id !== tempId));
        setChatInput(content);
      }
    } catch {
      setThread((prev) => prev.filter((m) => m.id !== tempId));
      setChatInput(content);
    } finally {
      setSendingChat(false);
    }
  }, [chatInput, currentUserId, otherId, sendingChat]);

  // Group thread items by date
  const grouped: { date: string; items: ThreadItem[] }[] = [];
  for (const item of thread) {
    const d = formatDate(item.createdAt);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) last.items.push(item);
    else grouped.push({ date: d, items: [item] });
  }

  return (
    <div className="bg-[#141414]">
      <div className="relative mx-auto max-w-[430px] flex flex-col bg-bg-primary" style={{ height: "100dvh", paddingBottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined }}>

        {/* Header */}
        <header className="shrink-0 flex items-center gap-3 border-b border-separator bg-bg-primary/95 backdrop-blur-sm px-4 pb-3" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
          <button type="button" onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-secondary shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="relative h-8 w-8 rounded-full overflow-hidden bg-bg-secondary border border-separator shrink-0">
            {otherAvatarUrl ? (
              <Image src={otherAvatarUrl} alt={otherName} fill className="object-cover" sizes="32px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-serif text-xs italic text-text-secondary">
                {otherName.charAt(0).toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="font-sans text-sm text-text-primary font-medium">{otherName || "…"}</p>
          </div>
          {streakCount > 0 && (
            <div className="flex items-center gap-1">
              <FlameIcon streak={streakCount} />
              <span className="font-sans text-sm font-semibold" style={{ color: getFlameColorHex(streakCount) }}>
                {streakCount}
              </span>
            </div>
          )}
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-4" style={{ overscrollBehavior: "contain" }}>
          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && thread.length === 0 && (
            <div className="flex flex-col items-center gap-3 pt-16 text-center">
              <span className="text-4xl">🕊️</span>
              <p className="font-serif italic text-text-secondary text-lg">
                Commencez l&apos;échange
              </p>
              <p className="font-sans text-xs text-text-tertiary max-w-[220px]">
                Envoyez un message ou un verset pour allumer votre flamme ensemble.
              </p>
            </div>
          )}

          {!loading && grouped.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-separator" />
                <span className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary">{group.date}</span>
                <div className="flex-1 h-px bg-separator" />
              </div>

              {group.items.map((item) => {
                const isMine = item.senderId === currentUserId;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex mb-3 ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    {item.kind === "verse" ? (
                      <div
                        className="max-w-[80%] rounded-2xl px-4 py-3"
                        style={{
                          background: isMine ? "#1a1830" : "#1c1c1c",
                          border: isMine ? "1px solid rgba(123,111,212,0.35)" : "1px solid #2a2a2a",
                        }}
                      >
                        <p className="font-sans text-[11px] uppercase tracking-wider mb-1" style={{ color: "#7B6FD4" }}>
                          {item.verseRef}
                        </p>
                        <p className="font-serif text-sm italic leading-relaxed" style={{ color: "#E8E8E8" }}>
                          {item.verseText}
                        </p>
                        {item.message && (
                          <p className="font-sans text-[13px] mt-2 leading-snug" style={{ color: "#aaaaaa" }}>
                            {item.message}
                          </p>
                        )}
                        <p className="font-sans text-[11px] mt-1.5 text-right" style={{ color: "#666666" }}>
                          {formatTime(item.createdAt)}
                        </p>
                      </div>
                    ) : (
                      <div
                        className="max-w-[75%] rounded-2xl px-3.5 py-2.5"
                        style={{
                          background: isMine ? "#7B6FD4" : "#1c1c1c",
                          border: isMine ? "none" : "1px solid #2a2a2a",
                        }}
                      >
                        <p className="font-sans text-sm leading-relaxed" style={{ color: isMine ? "#ffffff" : "#E8E8E8" }}>
                          {item.content}
                        </p>
                        <p className="font-sans text-[11px] mt-1 text-right" style={{ color: isMine ? "rgba(255,255,255,0.6)" : "#666666" }}>
                          {formatTime(item.createdAt)}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Bottom bar: chat input + verse button */}
        <div className="shrink-0 border-t border-separator bg-bg-primary/95 backdrop-blur-sm px-3 py-2.5" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}>
          <div className="flex items-end gap-2">
            {/* Flame/verse button */}
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-separator bg-bg-secondary text-accent shrink-0 active:bg-bg-tertiary transition-colors"
              title="Envoyer un verset"
            >
              <Flame className="h-4 w-4" />
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value.slice(0, 500))}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSendChat(); } }}
                placeholder="Message…"
                className="w-full rounded-2xl border border-separator bg-bg-secondary px-4 py-2.5 font-sans text-[16px] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent pr-10"
              />
            </div>

            {/* Send button */}
            <button
              type="button"
              onClick={() => void handleSendChat()}
              disabled={!chatInput.trim() || sendingChat}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shrink-0 disabled:opacity-40 active:opacity-80 transition-opacity"
            >
              {sendingChat ? (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showPicker && (
          <VersePicker
            onClose={() => setShowPicker(false)}
            onSend={handleSendVerse}
            sending={sending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
