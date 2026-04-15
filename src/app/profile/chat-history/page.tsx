"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, MessageCircle, Trash2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export default function ChatHistoryPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load chat history:", error);
      } else {
        setMessages(data || []);
        setFilteredMessages(data || []);
      }

      setLoading(false);
    })();
  }, [router]);

  // Filter messages based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredMessages(messages);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = messages.filter(msg =>
        msg.content.toLowerCase().includes(query)
      );
      setFilteredMessages(filtered);
    }
  }, [searchQuery, messages]);

  const deleteMessage = async (id: string) => {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", id);

    if (!error) {
      setMessages(prev => prev.filter(m => m.id !== id));
      setFilteredMessages(prev => prev.filter(m => m.id !== id));
    }
  };

  const clearAll = async () => {
    if (!confirm("Voulez-vous vraiment supprimer tout l'historique de chat ?")) return;

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("user_id", user.id);

    if (!error) {
      setMessages([]);
      setFilteredMessages([]);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
    }
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-32">
        {/* Header */}
        <header className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-primary"
            aria-label="Retour"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="font-serif text-xl text-text-primary">Historique AGAPE Chat</h1>
        </header>

        {/* Search bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Rechercher dans les messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-separator bg-bg-secondary pl-10 pr-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            aria-label="Rechercher"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
              aria-label="Effacer la recherche"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-bg-secondary animate-pulse" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <MessageCircle className="h-12 w-12 text-text-tertiary mb-4" />
            <p className="font-serif text-lg text-text-secondary">Aucune conversation</p>
            <p className="mt-2 font-sans text-sm text-text-tertiary">
              Commencez une conversation avec AGAPE Chat
            </p>
            <button
              type="button"
              onClick={() => router.push("/chat")}
              className="mt-6 rounded-full bg-accent px-6 py-3 font-sans text-xs uppercase tracking-wider text-white"
            >
              Ouvrir AGAPE Chat
            </button>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Search className="h-12 w-12 text-text-tertiary mb-4" />
            <p className="font-serif text-lg text-text-secondary">Aucun résultat</p>
            <p className="mt-2 font-sans text-sm text-text-tertiary">
              Aucun message ne correspond à votre recherche
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-6 rounded-full border border-separator bg-bg-secondary px-6 py-3 font-sans text-xs uppercase tracking-wider text-text-primary"
            >
              Effacer la recherche
            </button>
          </div>
        ) : (
          <>
            {/* Results count */}
            {searchQuery && (
              <p className="mb-4 font-sans text-xs text-text-tertiary">
                {filteredMessages.length} résultat{filteredMessages.length > 1 ? "s" : ""}
              </p>
            )}

            {/* Clear all button */}
            {!searchQuery && messages.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="mb-4 flex items-center gap-2 text-xs text-danger hover:text-danger/80 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Tout effacer
              </button>
            )}

            {/* Messages list */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`rounded-xl p-4 ${
                      message.role === "user"
                        ? "bg-accent/10 border-l-4 border-accent"
                        : "bg-bg-secondary border-l-4 border-text-tertiary"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary">
                            {message.role === "user" ? "Vous" : "AGAPE"}
                          </span>
                          <span className="text-[10px] text-text-tertiary">
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                        <p className="font-sans text-sm text-text-primary leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteMessage(message.id)}
                        className="shrink-0 p-1 text-text-tertiary hover:text-danger transition-colors"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
