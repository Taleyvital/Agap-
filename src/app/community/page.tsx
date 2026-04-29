"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Bell, Heart, MessageSquare, Share2, MoreHorizontal, Plus, Image as ImageIcon, X, User, Trash2, Repeat2, Send } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
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
  authorId?: string;
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
  isMine?: boolean;
  repostOf?: {
    id: string;
    author: string;
    content: string;
    category?: string;
  };
}

interface Comment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  time: string;
}

interface SupabasePostRow {
  id: string;
  user_id: string;
  content: string | null;
  category: string;
  created_at: string | null;
  image_url: string | null;
  anonymous_name: string | null;
  repost_of: string | null;
  community_amens: { user_id: string }[];
  community_comments: { id: string }[];
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
  const [avatarConsent, setAvatarConsent] = useState<"yes" | "no" | null>(null);
  const [showConsentSheet, setShowConsentSheet] = useState(false);
  const [showAvatarToggleSheet, setShowAvatarToggleSheet] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingFollowCount, setPendingFollowCount] = useState(0);

  // Delete menu state
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Report menu state
  const [reportMenuOpen, setReportMenuOpen] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportDone, setReportDone] = useState<string | null>(null);

  // Share feedback
  const [shareCopied, setShareCopied] = useState<string | null>(null);

  // Comments sheet
  const [commentsSheetPostId, setCommentsSheetPostId] = useState<string | null>(null);
  const [commentsData, setCommentsData] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Repost sheet
  const [repostSheetPost, setRepostSheetPost] = useState<Post | null>(null);
  const [repostDraft, setRepostDraft] = useState("");
  const [submittingRepost, setSubmittingRepost] = useState(false);

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
              setOwnAvatarUrl((data.avatar_url as string | null) ?? null);
            }
            const stored = localStorage.getItem("community-avatar-consent") as "yes" | "no" | null;
            if (stored) {
              setAvatarConsent(stored);
            } else {
              setShowConsentSheet(true);
            }
          });

        void supabase
          .from("verse_messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .is("read_at", null)
          .then(({ count }) => setUnreadMessages(count ?? 0));

        // Pending follow requests badge
        void Promise.all([
          supabase.from("follows").select("follower_id").eq("following_id", user.id),
          supabase.from("follows").select("following_id").eq("follower_id", user.id),
        ]).then(([{ data: followers }, { data: following }]) => {
          const iFollowSet = new Set((following ?? []).map((r) => r.following_id as string));
          const ignored = new Set(
            JSON.parse(localStorage.getItem("ignored-followers") ?? "[]") as string[]
          );
          const pending = (followers ?? []).filter(
            (r) => !iFollowSet.has(r.follower_id as string) && !ignored.has(r.follower_id as string)
          ).length;
          setPendingFollowCount(pending);
        });
      }
      
      void supabase
        .from("community_posts")
        .select("id, user_id, content, category, created_at, image_url, anonymous_name, repost_of, community_amens(user_id), community_comments(id)")
        .order("created_at", { ascending: false })
        .limit(20)
        .then(async ({ data, error }) => {
          if (error) {
            console.error("Erreur de récupération Supabase:", error);
            return;
          }
          if (!data || data.length === 0) {
            console.log("Aucun post réel trouvé dans Supabase.");
            return;
          }

          // Fetch original posts for reposts
          const allRepostIds = (data as SupabasePostRow[])
            .filter((r) => r.repost_of)
            .map((r) => r.repost_of as string);
          const repostIds = allRepostIds.filter((id, i) => allRepostIds.indexOf(id) === i);
          const repostMap: Record<string, { author: string; content: string; category: string }> = {};
          if (repostIds.length > 0) {
            const { data: originals } = await supabase
              .from("community_posts")
              .select("id, content, anonymous_name, category")
              .in("id", repostIds);
            if (originals) {
              for (const orig of originals as { id: string; content: string; anonymous_name: string | null; category: string }[]) {
                repostMap[orig.id] = {
                  author: orig.anonymous_name ?? t("community_default_author"),
                  content: orig.content ?? "",
                  category: orig.category,
                };
              }
            }
          }

          const mapped: Post[] = (data as SupabasePostRow[]).map((row) => {
            const created = row.created_at
              ? new Date(row.created_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";
            const uid = user?.id;
            const amensList = (row.community_amens || []) as { user_id: string }[];
            const hasLiked = uid ? amensList.some((a) => a.user_id === uid) : false;
            const commentCount = (row.community_comments || []).length;
            const originalPost = row.repost_of ? repostMap[row.repost_of] : undefined;

            return {
              id: String(row.id),
              author: row.anonymous_name ?? t("community_default_author"),
              avatar: "",
              authorId: row.user_id,
              category: row.category === "prayer" ? t("community_category_prayer") : t("community_category_testimony"),
              time: created,
              content: row.content ? String(row.content) : undefined,
              image: row.image_url ? String(row.image_url) : undefined,
              amens: amensList.length,
              hasAmen: hasLiked,
              comments: commentCount,
              urgent: false,
              isMine: uid === row.user_id,
              repostOf: row.repost_of && originalPost
                ? { id: row.repost_of, ...originalPost }
                : undefined,
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
            authorId: avatarConsent === "yes" ? (userId ?? undefined) : undefined,
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

  const reportPost = async (postId: string) => {
    setReporting(postId);
    try {
      await fetch("/api/community/posts/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      }).catch(() => null);
      setReportDone(postId);
      setTimeout(() => {
        setReportMenuOpen(null);
        setReportDone(null);
      }, 1500);
    } finally {
      setReporting(null);
    }
  };

  const sharePost = async (post: Post) => {
    const text = post.content || post.quote || "";
    const shareText = `${post.author} — ${text}\n\nPartagé depuis AGAPE`;
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // User cancelled — ignore
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setShareCopied(post.id);
      setTimeout(() => setShareCopied(null), 2000);
    }
  };

  const openComments = async (postId: string) => {
    setCommentsSheetPostId(postId);
    setCommentsData([]);
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/community/posts/comments?postId=${postId}`);
      if (res.ok) {
        const data = (await res.json()) as {
          comments: { id: string; content: string; created_at: string; anonymous_name: string | null; user_id: string }[];
        };
        setCommentsData(
          (data.comments ?? []).map((c) => ({
            id: c.id,
            author: c.anonymous_name ?? t("community_default_author"),
            authorId: c.user_id,
            content: c.content,
            time: new Date(c.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          }))
        );
      }
    } catch (err) {
      console.error("Erreur chargement commentaires:", err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const submitComment = async () => {
    const text = commentDraft.trim();
    if (!text || !commentsSheetPostId || submittingComment) return;
    setSubmittingComment(true);
    try {
      const res = await fetch("/api/community/posts/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: commentsSheetPostId, content: text }),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          comment: { id: string; content: string; created_at: string; anonymous_name: string | null; user_id: string };
        };
        setCommentsData((prev) => [
          ...prev,
          {
            id: data.comment.id,
            author: data.comment.anonymous_name ?? "Moi",
            authorId: data.comment.user_id,
            content: data.comment.content,
            time: "maintenant",
          },
        ]);
        setCommentDraft("");
        setPosts((prev) =>
          prev.map((p) =>
            p.id === commentsSheetPostId ? { ...p, comments: (p.comments ?? 0) + 1 } : p
          )
        );
      }
    } catch (err) {
      console.error("Erreur soumission commentaire:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const openRepost = (post: Post) => {
    setRepostSheetPost(post);
    setRepostDraft("");
  };

  const submitRepost = async () => {
    if (!repostSheetPost || submittingRepost) return;
    setSubmittingRepost(true);
    try {
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: repostDraft.trim(),
          category: repostSheetPost.category?.toLowerCase().includes("prière") ? "prayer" : "testimony",
          repostOf: repostSheetPost.id,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string; xp?: XPResult };
        if (data.xp) showXPToast(data.xp);
        const newPost: Post = {
          id: data.id ?? Date.now().toString(),
          author: "Toi",
          avatar: "",
          authorId: userId ?? undefined,
          category: repostSheetPost.category,
          time: "maintenant",
          content: repostDraft.trim() || undefined,
          amens: 0,
          hasAmen: false,
          comments: 0,
          urgent: false,
          isMine: true,
          repostOf: {
            id: repostSheetPost.id,
            author: repostSheetPost.author,
            content: repostSheetPost.content ?? "",
            category: repostSheetPost.category,
          },
        };
        setPosts((prev) => [newPost, ...prev]);
        setRepostSheetPost(null);
        setRepostDraft("");
      } else {
        const errorData = (await res.json().catch(() => ({ error: "Erreur" }))) as { error: string };
        alert("Erreur: " + errorData.error);
      }
    } catch (err) {
      console.error("Erreur republication:", err);
    } finally {
      setSubmittingRepost(false);
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
              onClick={() => setShowAvatarToggleSheet(true)}
              className="relative h-9 w-9 rounded-full overflow-hidden border border-separator shrink-0"
              aria-label="Mon avatar"
            >
              {userId ? (
                <UserAvatar userId={userId} size={36} />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-bg-tertiary font-serif text-sm italic text-text-primary">
                  <User className="h-4 w-4" />
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
              {(unreadMessages + pendingFollowCount) > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 font-sans text-[9px] font-bold text-white align-middle">
                  {(unreadMessages + pendingFollowCount) > 9 ? "9+" : (unreadMessages + pendingFollowCount)}
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
                      <div className="rounded-full overflow-hidden shrink-0 border border-separator" style={{ width: 40, height: 40 }}>
                        {post.authorId && (!post.isMine || avatarConsent === "yes") ? (
                          <UserAvatar userId={post.authorId} size={40} fallbackInitial={post.author} />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center bg-bg-tertiary font-sans text-sm font-semibold text-text-primary">
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
                        <>
                          <button
                            onClick={() => setReportMenuOpen(reportMenuOpen === post.id ? null : post.id)}
                            className="rounded-full p-2 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                          >
                            <MoreHorizontal className="h-5 w-5" />
                          </button>

                          <AnimatePresence>
                            {reportMenuOpen === post.id && (
                              <>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-separator bg-bg-secondary shadow-lg"
                                >
                                  {reportDone === post.id ? (
                                    <div className="flex items-center gap-2 px-4 py-3 font-sans text-sm text-text-secondary">
                                      <span>✓</span> Signalement envoyé
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => void reportPost(post.id)}
                                      disabled={reporting === post.id}
                                      className="flex w-full items-center gap-3 px-4 py-3 font-sans text-sm text-danger transition-colors hover:bg-danger/10"
                                    >
                                      {reporting === post.id ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-danger border-t-transparent" />
                                      ) : (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 3l18 18M10.5 10.5A3 3 0 0015 6H6l4.5 4.5z"/><path d="M6 6l-3 15 9-4.5"/></svg>
                                      )}
                                      Signaler
                                    </button>
                                  )}
                                </motion.div>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={() => setReportMenuOpen(null)}
                                />
                              </>
                            )}
                          </AnimatePresence>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Repost original quoted block */}
                  {post.repostOf && (
                    <div className="mt-4 rounded-xl border border-separator bg-bg-tertiary p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Repeat2 className="h-3 w-3 text-text-tertiary" />
                        <p className="font-sans text-[9px] uppercase tracking-wider text-text-tertiary">
                          {post.repostOf.category ?? "Publication"} — {post.repostOf.author}
                        </p>
                      </div>
                      <p className="font-sans text-[13px] leading-relaxed text-text-secondary line-clamp-4">
                        {post.repostOf.content}
                      </p>
                    </div>
                  )}

                  {/* Post Content */}
                  <div className={`flex flex-col gap-3 ${post.repostOf ? "mt-3" : "mt-4"}`}>
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
                    <div className="flex items-center gap-5">
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
                      <button
                        type="button"
                        onClick={() => void openComments(post.id)}
                        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors group"
                        aria-label="Commenter"
                      >
                        <MessageSquare className="h-5 w-5 group-hover:text-accent transition-colors" />
                        {(post.comments ?? 0) > 0 && (
                          <span className="font-sans text-[11px] font-bold tracking-widest uppercase text-text-secondary">
                            {post.comments}
                          </span>
                        )}
                      </button>

                      {/* Repost Button */}
                      {!post.isMine && (
                        <button
                          type="button"
                          onClick={() => openRepost(post)}
                          className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
                          aria-label="Republier"
                        >
                          <Repeat2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    {/* Share */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => void sharePost(post)}
                        className="relative flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors"
                        aria-label="Partager"
                      >
                        <Share2 className="h-5 w-5" />
                        <AnimatePresence>
                          {shareCopied === post.id && (
                            <motion.span
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                              className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-bg-tertiary px-2 py-0.5 font-sans text-[10px] text-text-primary shadow"
                            >
                              Copié !
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
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

      {/* ── COMMENTS SHEET ── */}
      <AnimatePresence>
        {commentsSheetPostId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setCommentsSheetPostId(null); setCommentDraft(""); }}
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-[90] mx-auto max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary shadow-2xl flex flex-col"
              style={{ maxHeight: "78vh" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-4 pb-3 shrink-0">
                <div className="h-1 w-10 rounded-full bg-separator" />
              </div>
              {/* Header */}
              <div className="px-5 pb-3 border-b border-separator shrink-0">
                <p className="font-sans text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                  Commentaires{commentsData.length > 0 ? ` (${commentsData.length})` : ""}
                </p>
              </div>
              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 min-h-0">
                {commentsLoading ? (
                  <div className="flex justify-center py-10">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  </div>
                ) : commentsData.length === 0 ? (
                  <p className="text-center font-sans text-sm text-text-tertiary py-10">
                    Soyez le premier à commenter…
                  </p>
                ) : (
                  commentsData.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-bg-tertiary border border-separator flex items-center justify-center shrink-0">
                        <span className="font-sans text-xs font-semibold text-text-primary">
                          {comment.author.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-serif text-sm text-text-primary">{comment.author}</span>
                          <span className="font-sans text-[9px] text-text-tertiary">{comment.time}</span>
                        </div>
                        <p className="font-sans text-[13px] leading-relaxed text-text-secondary">
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Input */}
              <div
                className="px-5 py-4 border-t border-separator shrink-0"
                style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
              >
                <div className="flex gap-3 items-end">
                  <textarea
                    className="flex-1 resize-none rounded-xl border border-separator bg-bg-tertiary px-4 py-3 font-sans text-[14px] text-text-primary outline-none transition-colors focus:border-accent/40"
                    rows={2}
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder="Écrire un commentaire…"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void submitComment();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!commentDraft.trim() || submittingComment}
                    onClick={() => void submitComment()}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40 shrink-0 transition-opacity"
                  >
                    {submittingComment ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── REPOST SHEET ── */}
      <AnimatePresence>
        {repostSheetPost && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setRepostSheetPost(null); setRepostDraft(""); }}
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed inset-x-0 bottom-0 z-[90] mx-auto max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary p-5 shadow-2xl"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
            >
              <div className="flex justify-center mb-4">
                <div className="h-1 w-10 rounded-full bg-separator" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Repeat2 className="h-4 w-4 text-accent" />
                <p className="font-sans text-[11px] font-bold uppercase tracking-widest text-text-tertiary">
                  Republier
                </p>
              </div>
              {/* Original post quoted */}
              <div className="rounded-xl border border-separator bg-bg-tertiary p-4 mb-4">
                <p className="font-sans text-[9px] uppercase tracking-wider text-text-tertiary mb-2">
                  {repostSheetPost.category ?? "Publication"} — {repostSheetPost.author}
                </p>
                <p className="font-sans text-[13px] leading-relaxed text-text-secondary line-clamp-4">
                  {repostSheetPost.content}
                </p>
              </div>
              {/* Reposter comment */}
              <textarea
                className="w-full resize-none rounded-xl border border-separator bg-bg-tertiary p-4 font-sans text-[15px] leading-relaxed text-text-primary outline-none transition-colors focus:border-accent/40"
                rows={3}
                value={repostDraft}
                onChange={(e) => setRepostDraft(e.target.value)}
                placeholder="Ajouter un commentaire… (optionnel)"
                autoFocus
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setRepostSheetPost(null); setRepostDraft(""); }}
                  className="rounded-full px-5 py-2.5 font-sans text-[11px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={submittingRepost}
                  onClick={() => void submitRepost()}
                  className="flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 font-sans text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
                >
                  {submittingRepost ? (
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Repeat2 className="h-3.5 w-3.5" />
                  )}
                  Republier
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                <div className="rounded-full overflow-hidden border-2 border-separator" style={{ width: 64, height: 64 }}>
                  {userId && <UserAvatar userId={userId} size={64} />}
                </div>
              </div>

              <h2 className="text-center font-serif text-xl italic text-text-primary mb-1">
                Profil dans la communauté
              </h2>
              <p className="text-center font-sans text-xs text-text-tertiary mb-6">
                {avatarConsent === "yes"
                  ? "Votre avatar est visible sur vos publications."
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
                    <User className="h-4 w-4" />
                    Afficher mon profil
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
                <div className="rounded-full overflow-hidden border-2 border-accent shadow-lg shadow-accent/20" style={{ width: 80, height: 80 }}>
                  {userId && <UserAvatar userId={userId} size={80} />}
                </div>
              </div>

              <h2 className="text-center font-serif text-xl italic text-text-primary mb-2">
                Afficher votre profil ?
              </h2>
              <p className="text-center font-sans text-sm text-text-secondary leading-relaxed mb-7">
                Voulez-vous afficher votre avatar sur vos publications dans la communauté ?
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
                  <User className="h-4 w-4" />
                  Oui, afficher mon profil
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
