"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Bell, Heart, MessageSquare, Share2, MoreHorizontal, Plus, Image as ImageIcon, X, User, Trash2, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useXPToast } from "@/components/providers/XPToastProvider";
import type { XPResult } from "@/lib/xp-shared";
import { useLanguage } from "@/lib/i18n";

type Filter = "all" | "prayer" | "testimony";

interface Post {
  id: string;
  author: string;
  avatar: string;
  category?: string;
  time: string;
  content?: string;
  quote?: string;
  amens: number;
  hasAmen: boolean;
  comments?: number;
  urgent?: boolean;
  image?: string;
  imageBadge?: string;
  recentAmens?: string[];
  plusAmens?: number;
  isMine?: boolean; // Whether this post belongs to the current user
}

interface SupabasePostRow {
  id: string;
  user_id: string;
  content: string | null;
  category: string;
  created_at: string | null;
  image_url: string | null;
  anonymous_name: string | null;
  community_amens: { user_id: string }[];
}

const MOCK_POSTS: Post[] = [];

export default function CommunityPage() {
  const router = useRouter();
  const { showXPToast } = useXPToast();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<Filter>("all");
  const [activeSection, setActiveSection] = useState<"posts" | "flames">("posts");

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: t("community_filter_all") },
    { id: "prayer", label: t("community_filter_prayer") },
    { id: "testimony", label: t("community_filter_testimony") },
  ];
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [composer, setComposer] = useState(false);
  const [draft, setDraft] = useState("");
  const [composerCategory, setComposerCategory] = useState<"testimony" | "prayer">("testimony");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [ownAvatarUrl, setOwnAvatarUrl] = useState<string | null>(null);
  const [ownInitial, setOwnInitial] = useState("");
  const [avatarConsent, setAvatarConsent] = useState<"yes" | "no" | null>(null);
  const [showConsentSheet, setShowConsentSheet] = useState(false);
  const [showAvatarToggleSheet, setShowAvatarToggleSheet] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Delete menu state
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);

        // Fetch own avatar + check consent
        void supabase
          .from("profiles")
          .select("avatar_url, first_name, anonymous_name")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              const url = (data.avatar_url as string | null) ?? null;
              const initial = ((data.first_name as string | null) ?? (data.anonymous_name as string | null) ?? "A").charAt(0).toUpperCase();
              setOwnAvatarUrl(url);
              setOwnInitial(initial);
              // Ask for consent only if user has an avatar and was never asked
              if (url) {
                const stored = localStorage.getItem("community-avatar-consent") as "yes" | "no" | null;
                if (stored) {
                  setAvatarConsent(stored);
                } else {
                  setShowConsentSheet(true);
                }
              }
            }
          });

        void supabase
          .from("verse_messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .is("read_at", null)
          .then(({ count }) => setUnreadMessages(count ?? 0));
      }
      
      void supabase
        .from("community_posts")
        .select("id, user_id, content, category, created_at, image_url, anonymous_name, community_amens(user_id)")
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data, error }) => {
          if (error) {
            console.error("Erreur de récupération Supabase:", error);
            return;
          }
          if (!data || data.length === 0) {
            console.log("Aucun post réel trouvé dans Supabase.");
            return;
          }
          console.log("Posts récupérés depuis Supabase:", data.length);
          const mapped: Post[] = data.map((row: SupabasePostRow) => {
            const created = row.created_at
              ? new Date(row.created_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            
            const amensList = (row.community_amens || []) as unknown as { user_id: string }[];
            const uid = user?.id;
            const hasLiked = uid ? amensList.some(a => a.user_id === uid) : false;

            return {
              id: String(row.id),
              author: row.anonymous_name || t("community_default_author"),
              avatar: "",
              category: row.category === "prayer" ? t("community_category_prayer") : t("community_category_testimony"),
              time: created,
              content: String(row.content ?? ""),
              image: row.image_url ? String(row.image_url) : undefined,
              amens: amensList.length,
              hasAmen: hasLiked,
              comments: 0,
              urgent: false,
              isMine: uid === row.user_id,
            };
          });
          
          setPosts([...mapped, ...MOCK_POSTS]);
        });
    });
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async () => {
    const text = draft.trim();
    if (!text && !imageFile) return;
    setSubmitting(true);
    
    let uploadedImageUrl = "";
    
    try {
      const supabase = createSupabaseBrowserClient();
      
      // 1. Upload image if exists
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('community_images')
          .upload(filePath, imageFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('community_images')
          .getPublicUrl(filePath);
          
        uploadedImageUrl = publicUrl;
      }

      // 2. Create post via API
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          category: composerCategory,
          imageUrl: uploadedImageUrl
        }),
      });
      
      console.log("API response status:", res.status);
      
      if (res.ok) {
        const data = (await res.json()) as { id?: string; xp?: XPResult };
        console.log("Post created:", data);
        if (data.xp) showXPToast(data.xp);
        setDraft("");
        removeImage();
        setComposer(false);
        // Optimistic UI update
        const newPost: Post = {
            id: data.id || Date.now().toString(),
            author: "Toi",
            avatar: "",
            category: composerCategory === "prayer" ? t("community_category_prayer") : t("community_category_testimony"),
            time: t("community_just_now"),
            content: text,
            image: uploadedImageUrl || undefined,
            amens: 0,
            hasAmen: false,
            comments: 0,
            urgent: false,
        };
        setPosts([newPost, ...posts]);
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to create post:", errorData);
        alert(t("community_post_error") + ": " + (errorData.error || t("common_error")));
      }
    } catch (err) {
      console.error("Submit error:", err);
      alert(t("community_post_error") + ": " + (err instanceof Error ? err.message : t("common_error")));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAmen = async (postId: string) => {
    const isMock = postId.startsWith("mock-");

    // 1. Mise à jour optimiste (visuelle) instantanée
    setPosts((prevPosts) =>
      prevPosts.map((p) => {
        if (p.id === postId) {
          const wasAmen = p.hasAmen;
          return {
            ...p,
            hasAmen: !wasAmen,
            amens: wasAmen ? Math.max(0, p.amens - 1) : p.amens + 1,
          };
        }
        return p;
      })
    );

    // 2. Synchronisation silencieuse avec Supabase via API (contourne RLS client)
    if (!isMock && userId) {
      const post = posts.find((p) => p.id === postId);
      const action = post?.hasAmen ? "remove" : "add"; // on utilise l'état AVANT le basculement local
      
      void fetch("/api/community/posts/amen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, action }),
      }).catch((err) => console.error("Erreur toggle amen:", err));
    }
  };

  const deletePost = async (postId: string) => {
    setDeleting(postId);
    try {
      const res = await fetch(`/api/community/posts?id=${postId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPosts(posts.filter((p) => p.id !== postId));
        setDeleteMenuOpen(null);
      } else {
        const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        alert(t("community_delete_error") + ": " + (errorData.error || t("common_error")));
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      alert(t("community_delete_error"));
    } finally {
      setDeleting(null);
    }
  };

  const visiblePosts = filter === "all"
    ? posts
    : posts.filter((p) =>
        filter === "prayer"
          ? p.category === t("community_category_prayer")
          : filter === "testimony"
            ? p.category === t("community_category_testimony")
            : true
      );

  return (
    <AppShell>
      <div className="relative min-h-screen bg-bg-primary pb-28 pt-8">
        
        {/* HEADER */}
        <header className="px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => ownAvatarUrl ? setShowAvatarToggleSheet(true) : null}
              className="relative h-9 w-9 rounded-full overflow-hidden bg-bg-tertiary border border-separator shrink-0 active:opacity-70 transition-opacity"
              aria-label="Visibilité de ma photo"
            >
              {ownAvatarUrl ? (
                <Image src={ownAvatarUrl} alt="" fill className="object-cover" sizes="36px" />
              ) : (
                <span className="flex h-full w-full items-center justify-center font-serif text-sm italic text-text-primary">
                  {ownInitial || <User className="h-4 w-4" />}
                </span>
              )}
              {/* Indicateur de statut */}
              {ownAvatarUrl && (
                <span
                  className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-bg-primary"
                  style={{ background: avatarConsent === "yes" ? "#7B6FD4" : "#666666" }}
                />
              )}
            </button>
          </div>
          <button type="button" className="text-accent" aria-label="Notifications">
            <Bell className="h-5 w-5 fill-accent" />
          </button>
        </header>

        {/* TABS — Communauté / Flammes */}
        <div className="mt-5 flex border-b border-separator px-5">
          <button
            type="button"
            onClick={() => setActiveSection("posts")}
            className="relative mr-6 pb-3 font-sans text-sm font-semibold uppercase tracking-widest transition-colors"
            style={{ color: activeSection === "posts" ? "#E8E8E8" : "#666666" }}
          >
            {t("community_title")}
            {activeSection === "posts" && (
              <motion.div
                layoutId="community-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => router.push("/messages")}
            className="relative mr-6 pb-3 font-sans text-sm font-semibold uppercase tracking-widest transition-colors"
            style={{ color: activeSection === "flames" ? "#E8E8E8" : "#666666" }}
          >
            <span>
              Flammes 🔥
              {unreadMessages > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 font-sans text-[9px] font-bold text-white align-middle">
                  {unreadMessages > 9 ? "9+" : unreadMessages}
                </span>
              )}
            </span>
            {activeSection === "flames" && (
              <motion.div
                layoutId="community-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent"
                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
          </button>
        </div>

        {/* FILTERS */}
        <div className="mt-5 px-5 flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`shrink-0 rounded-full px-5 py-2 font-sans text-[10px] font-medium uppercase tracking-widest transition-colors ${
                  active
                    ? "bg-text-tertiary/20 text-text-primary"
                    : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* FEED */}
        <div className="mt-4 px-4 flex flex-col gap-4">
          <AnimatePresence>
            {visiblePosts.map((post) => (
              <motion.article
                key={post.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl bg-bg-secondary"
              >
                {/* Image Post Variant */}
                {post.image && (
                  <div className="relative h-56 w-full">
                    <Image
                      src={post.image}
                      alt="Post attachment"
                      fill
                      className="object-cover"
                    />
                    {post.imageBadge && (
                      <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                        {post.imageBadge}
                      </span>
                    )}
                  </div>
                )}

                <div className="p-5">
                  {/* Post Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative h-10 w-10 rounded-full overflow-hidden bg-bg-tertiary shrink-0 border border-separator">
                        {post.isMine && avatarConsent === "yes" && ownAvatarUrl ? (
                          <Image src={ownAvatarUrl} alt="" fill className="object-cover" sizes="40px" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center font-sans text-sm font-semibold text-text-primary">
                            {post.author.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        {/* Title Row */}
                        <div className="flex items-center gap-2">
                          <p className="font-serif text-[17px] text-text-primary">
                            {post.author}
                          </p>
                          {post.urgent && (
                            <span className="rounded-sm bg-accent/20 px-1.5 py-0.5 font-sans text-[8px] font-bold uppercase tracking-wider text-accent-light">
                              URGENT
                            </span>
                          )}
                        </div>
                        {/* Meta Row */}
                        <p className="font-sans text-[9px] uppercase tracking-wider text-text-tertiary mt-0.5">
                          {post.category ? `${post.category} • ` : ""}{post.time}
                        </p>
                      </div>
                    </div>
                    {/* More button */}
                    <div className="relative">
                      {post.isMine ? (
                        <>
                          <button
                            onClick={() => setDeleteMenuOpen(deleteMenuOpen === post.id ? null : post.id)}
                            className="rounded-full p-2 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>
                          
                          <AnimatePresence>
                            {deleteMenuOpen === post.id && (
                              <>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-separator bg-bg-secondary shadow-lg"
                                >
                                  <button
                                    onClick={() => deletePost(post.id)}
                                    disabled={deleting === post.id}
                                    className="flex w-full items-center gap-3 px-4 py-3 font-sans text-sm text-danger transition-colors hover:bg-danger/10"
                                  >
                                    {deleting === post.id ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-danger border-t-transparent" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                                    {t("common_delete")}
                                  </button>
                                </motion.div>
                                {/* Backdrop to close menu */}
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setDeleteMenuOpen(null)}
                                />
                              </>
                            )}
                          </AnimatePresence>
                        </>
                      ) : (
                        <button className="rounded-full p-2 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mt-4 flex flex-col gap-3">
                    {post.quote && (
                      <p className="font-serif text-[17px] italic leading-relaxed text-text-primary">
                        {post.quote}
                      </p>
                    )}
                    {post.content && (
                      <p className="font-sans text-[14px] leading-relaxed text-text-secondary">
                        {post.content}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-6 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Amen Button */}
                      <button 
                        type="button"
                        onClick={() => toggleAmen(post.id)}
                        className="flex items-center gap-2 group"
                      >
                        <Heart 
                          className={`h-5 w-5 transition-colors ${post.hasAmen ? "fill-accent text-accent" : "text-text-primary group-hover:text-accent"}`} 
                        />
                        <span className={`font-sans text-[11px] font-bold tracking-widest uppercase ${post.hasAmen ? "text-accent" : "text-text-secondary"}`}>
                          {post.amens > 0 ? `${post.amens} AMEN${post.amens > 1 ? 'S' : ''}` : "AMEN"}
                        </span>
                      </button>
                      
                      {/* Comment Button */}
                      {(post.comments ?? 0) > 0 && (
                        <button className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors">
                          <MessageSquare className="h-5 w-5" />
                          <span className="font-sans text-[12px] font-medium">{post.comments}</span>
                        </button>
                      )}
                    </div>

                    {/* Right side stuff */}
                    <div className="flex items-center gap-3">
                      {/* Share Button (only if no image, or as per original design) */}
                      {!post.image && !post.urgent && (
                        <button className="text-text-secondary hover:text-text-primary transition-colors">
                          <Share2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>

        {/* FAB */}
        <button
          type="button"
          onClick={() => setComposer(true)}
          className="fixed bottom-[110px] right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent-light transition-colors"
          aria-label="Créer un Post"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>

        {/* COMPOSER MODAL */}
        {composer ? (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="w-full max-w-[430px] rounded-t-3xl bg-bg-secondary p-5 shadow-2xl"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
            >
              <div className="flex items-center justify-between">
                <p className="ui-label font-bold text-text-tertiary uppercase tracking-widest">{t("community_new_post")}</p>
                <div className="flex bg-bg-tertiary rounded-full p-1 gap-1">
                  <button 
                    type="button"
                    onClick={() => setComposerCategory("testimony")}
                    className={`px-3 py-1.5 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider transition-all ${composerCategory === 'testimony' ? 'bg-accent text-white shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
                  >
                    {t("community_tab_testimony")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setComposerCategory("prayer")}
                    className={`px-3 py-1.5 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider transition-all ${composerCategory === 'prayer' ? 'bg-accent text-white shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
                  >
                    {t("community_tab_prayer")}
                  </button>
                </div>
              </div>

              <div className="relative mt-4">
                <textarea
                  className="w-full resize-none rounded-xl border border-separator bg-bg-tertiary p-4 font-sans text-[15px] leading-relaxed text-text-primary outline-none transition-colors focus:border-accent/40"
                  rows={imagePreview ? 3 : 5}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("community_placeholder")}
                  autoFocus
                />
                
                {imagePreview && (
                  <div className="relative mt-2 h-40 w-full overflow-hidden rounded-xl border border-separator">
                    <Image 
                      src={imagePreview} 
                      alt="Preview" 
                      fill 
                      className="object-cover" 
                    />
                    <button
                      onClick={removeImage}
                      className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white backdrop-blur-sm hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-full bg-bg-tertiary px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <ImageIcon className="h-4 w-4 text-accent" />
                    <span className="font-sans text-[11px] font-bold uppercase tracking-wider">Image</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setComposer(false);
                      removeImage();
                    }}
                    className="rounded-full px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary"
                  >
                    {t("common_cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={submitting || (!draft.trim() && !imageFile)}
                    onClick={() => void submit()}
                    className="rounded-full bg-accent px-6 py-2.5 font-sans text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
                  >
                    {submitting ? "…" : t("common_publish")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}

      </div>

      {/* ── Toggle sheet : changer la visibilité de la photo ── */}
      <AnimatePresence>
        {showAvatarToggleSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAvatarToggleSheet(false)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary px-6 pb-10 pt-7 shadow-2xl"
            >
              <div className="mb-5 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-separator" />
              </div>

              {/* Avatar preview */}
              <div className="flex justify-center mb-5">
                <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-separator">
                  {ownAvatarUrl && (
                    <Image src={ownAvatarUrl} alt="" fill className="object-cover" sizes="64px" />
                  )}
                </div>
              </div>

              <h2 className="text-center font-serif text-xl italic text-text-primary mb-1">
                Photo dans la communauté
              </h2>
              <p className="text-center font-sans text-xs text-text-tertiary mb-6">
                {avatarConsent === "yes"
                  ? "Votre photo est visible sur vos publications."
                  : "Vous apparaissez de façon anonyme."}
              </p>

              <div className="flex flex-col gap-3">
                {avatarConsent !== "yes" ? (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("community-avatar-consent", "yes");
                      setAvatarConsent("yes");
                      setShowAvatarToggleSheet(false);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-sans text-sm font-semibold text-white"
                  >
                    <Camera className="h-4 w-4" />
                    Afficher ma photo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("community-avatar-consent", "no");
                      setAvatarConsent("no");
                      setShowAvatarToggleSheet(false);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-separator bg-bg-tertiary py-3.5 font-sans text-sm font-semibold text-text-primary"
                  >
                    <User className="h-4 w-4" />
                    Redevenir anonyme
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAvatarToggleSheet(false)}
                  className="w-full rounded-2xl py-3 font-sans text-xs text-text-tertiary"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Consent sheet : afficher sa photo en community ─── */}
      <AnimatePresence>
        {showConsentSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary px-6 pb-10 pt-7 shadow-2xl"
            >
              <div className="mb-5 flex justify-center">
                <div className="h-1 w-10 rounded-full bg-separator" />
              </div>

              {/* Avatar preview */}
              <div className="flex justify-center mb-5">
                <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-accent shadow-lg shadow-accent/20">
                  {ownAvatarUrl && (
                    <Image src={ownAvatarUrl} alt="" fill className="object-cover" sizes="80px" />
                  )}
                </div>
              </div>

              <h2 className="text-center font-serif text-xl italic text-text-primary mb-2">
                Afficher votre photo ?
              </h2>
              <p className="text-center font-sans text-sm text-text-secondary leading-relaxed mb-7">
                Voulez-vous afficher votre photo de profil sur vos publications dans la communauté ?
              </p>

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("community-avatar-consent", "yes");
                    setAvatarConsent("yes");
                    setShowConsentSheet(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-sans text-sm font-semibold text-white"
                >
                  <Camera className="h-4 w-4" />
                  Oui, afficher ma photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("community-avatar-consent", "no");
                    setAvatarConsent("no");
                    setShowConsentSheet(false);
                  }}
                  className="w-full rounded-2xl border border-separator bg-bg-tertiary py-3.5 font-sans text-sm text-text-secondary"
                >
                  Rester anonyme
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
