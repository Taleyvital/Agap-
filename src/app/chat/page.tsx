"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, Plus, Send } from "lucide-react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/ui/BottomNav";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { VerseCard } from "@/components/ui/VerseCard";
import { parseAgapeReply } from "@/lib/chat-parse";
import type { ChatHistoryMessage } from "@/lib/groq";
import { useLanguage } from "@/lib/i18n";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

function timeLabel(t: (key: import("@/lib/i18n").TranslationKey) => string) {
  const h = new Date().getHours();
  if (h < 12) return { line: t("chat_morning_line"), tag: t("chat_morning_tag") };
  if (h < 18) return { line: t("chat_afternoon_line"), tag: t("chat_afternoon_tag") };
  return { line: t("chat_evening_line"), tag: t("chat_evening_tag") };
}

export default function ChatPageWrapper() {
  const { t } = useLanguage();
  return (
    <Suspense fallback={
      <div className="bg-[#141414]">
        <div className="relative mx-auto max-w-[430px] flex items-center justify-center bg-bg-primary" style={{ height: "100dvh" }}>
          <p className="text-text-tertiary">{t("common_loading")}</p>
        </div>
      </div>
    }>
      <ChatPage />
    </Suspense>
  );
}

function ChatPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const verseParam = searchParams.get("verse");
  const textParam = searchParams.get("text");
  const refParam = searchParams.get("ref");

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("chat_welcome"),
      time: formatTime(new Date()),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSentInitialVerse = useRef<string | null>(null);
  const { line, tag } = timeLabel(t);

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

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      time: formatTime(new Date()),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    const history: ChatHistoryMessage[] = messages
      .filter((x) => x.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur");
      }
      const reply = data.reply ?? "";
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: reply,
          time: formatTime(new Date()),
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: t("chat_error_reply"),
          time: formatTime(new Date()),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  // Auto-send verse message when coming from Bible
  useEffect(() => {
    if (!verseParam || !textParam || !refParam) return;
    
    const messageKey = `${verseParam}-${textParam}-${refParam}`;
    if (hasSentInitialVerse.current === messageKey) return;
    
    hasSentInitialVerse.current = messageKey;
    
    const verseText = decodeURIComponent(textParam);
    const verseRef = decodeURIComponent(refParam);
    const verseNumber = verseParam.split("-")[2];
    const message = `Peux-tu m'expliquer ce verset : "${verseText}" (${verseRef} ${verseNumber})`;
    
    void send(message);
  }, [verseParam, textParam, refParam, send]);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  return (
    <div className="bg-[#141414]">
      <div className="relative mx-auto max-w-[430px] flex flex-col bg-bg-primary" style={{ height: "100dvh", paddingBottom: `calc(${keyboardOffset}px + env(safe-area-inset-bottom, 0px) + 68px)` }}>
        <header className="shrink-0 flex items-center justify-between gap-2 px-4 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-tertiary font-sans text-xs font-bold text-accent">
              A
            </div>
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-text-primary">
              {t("chat_label")}
            </span>
          </div>
          <Link href="/home" className="sr-only">
            Accueil
          </Link>
          <button
            type="button"
            className="rounded-full p-2 text-text-secondary"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
        </header>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center px-4"
        >
          <p className="font-serif text-2xl italic leading-snug text-text-primary">
            {line}
          </p>
          <p className="ui-label mt-3 text-text-tertiary">
            {t("chat_reflection")} {tag}
          </p>
        </motion.section>

        <div
          ref={scrollRef}
          className="mt-4 flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4"
          style={{ overscrollBehavior: "contain" }}
        >
          {messages.map((m) => (
            <div key={m.id} className="flex flex-col gap-2">
              {m.role === "assistant" ? (
                <>
                  {(() => {
                    const parsed = parseAgapeReply(m.content);
                    return (
                      <>
                        <ChatBubble variant="agape">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">
                            {parsed.body}
                          </p>
                        </ChatBubble>
                        {parsed.verseText ? (
                          <VerseCard
                            text={parsed.verseText}
                            reference={parsed.verseRef ?? undefined}
                          />
                        ) : null}
                      </>
                    );
                  })()}
                  <p className="text-[10px] text-text-tertiary">
                    AGAPE • {m.time}
                  </p>

                </>
              ) : (
                <>
                  <div className="flex justify-end">
                    <ChatBubble variant="user">
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    </ChatBubble>
                  </div>
                  <p className="text-right text-[10px] text-text-tertiary">
                    {t("chat_you")} • {m.time}
                  </p>
                </>
              )}
            </div>
          ))}
          {loading ? (
            <p className="text-center text-xs text-text-tertiary">
              {t("chat_typing")}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 px-4 flex gap-2 overflow-x-auto pb-2 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[t("chat_suggest_pray"), t("chat_suggest_peace"), t("chat_suggest_release")].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="shrink-0 rounded-full border border-separator bg-bg-secondary px-4 py-2 font-sans text-xs uppercase tracking-wider text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="shrink-0 px-4 pb-2">
        <div className="flex items-center gap-2 rounded-2xl bg-bg-secondary px-3 py-2">
          <button
            type="button"
            className="p-2 text-text-tertiary"
            aria-label="Plus"
          >
            <Plus className="h-5 w-5" />
          </button>
          <input
            className="min-w-0 flex-1 bg-transparent font-sans text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            placeholder={t("chat_placeholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send(input);
            }}
          />
          <button
            type="button"
            onClick={() => void send(input)}
            disabled={loading}
            className="rounded-xl bg-accent p-2.5 text-white transition-opacity disabled:opacity-40"
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        </div>
        <BottomNav />
      </div>
    </div>
  );
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
