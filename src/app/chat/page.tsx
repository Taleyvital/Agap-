"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Plus, Send } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { ChatBubble } from "@/components/ui/ChatBubble";
import { VerseCard } from "@/components/ui/VerseCard";
import { parseAgapeReply } from "@/lib/chat-parse";
import type { ChatHistoryMessage } from "@/lib/groq";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  time: string;
}

const SUGGESTIONS = [
  "PRIER AVEC MOI",
  "UN VERSET SUR LA PAIX",
  "COMMENT LÂCHER PRISE",
];

function timeLabel() {
  const h = new Date().getHours();
  if (h < 12) return { line: "Commence ta journée.", tag: "MATIN" as const };
  if (h < 18) return { line: "Prends un moment.", tag: "JOURNÉE" as const };
  return { line: "Apaise ton esprit.", tag: "SOIR" as const };
}

export default function ChatPage() {
  const { line, tag } = timeLabel();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Je suis là avec toi. Parle-moi de ce qui occupe ton cœur aujourd’hui.",
      time: formatTime(new Date()),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, scrollToEnd]);

  const send = async (text: string) => {
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
          content:
            "Je n’ai pas pu répondre pour le moment. Réessaie dans un instant.",
          time: formatTime(new Date()),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="flex min-h-[calc(100vh-6rem)] flex-col px-4 pt-4">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-tertiary font-sans text-xs font-bold text-accent">
              A
            </div>
            <span className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-text-primary">
              AGAPE CHAT
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
          className="mt-6 text-center"
        >
          <p className="font-serif text-2xl italic leading-snug text-text-primary">
            {line}
          </p>
          <p className="ui-label mt-3 text-text-tertiary">
            RÉFLEXION DU {tag}
          </p>
        </motion.section>

        <div
          ref={scrollRef}
          className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto pb-4"
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
                    Toi • {m.time}
                  </p>
                </>
              )}
            </div>
          ))}
          {loading ? (
            <p className="text-center text-xs text-text-tertiary">
              AGAPE écrit…
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-0 -mx-1 flex gap-2 overflow-x-auto pb-2 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SUGGESTIONS.map((s) => (
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

        <div className="mt-2 flex items-center gap-2 rounded-2xl bg-bg-secondary px-3 py-2">
          <button
            type="button"
            className="p-2 text-text-tertiary"
            aria-label="Plus"
          >
            <Plus className="h-5 w-5" />
          </button>
          <input
            className="min-w-0 flex-1 bg-transparent font-sans text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            placeholder="Écris un message…"
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
    </AppShell>
  );
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
