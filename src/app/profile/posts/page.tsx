"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Heart, MessageSquare, MoreVertical, Trash2, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n";

interface Post {
  id: string;
  content: string | null;
  category: string;
  created_at: string | null;
  image_url: string | null;
  anonymous_name: string | null;
  amens: number;
}

interface CommunityAmen {
  user_id: string;
}

interface PostRow {
  id: string;
  content: string | null;
  category: string;
  created_at: string;
  image_url: string | null;
  anonymous_name: string | null;
  community_amens: CommunityAmen[];
}

interface PostsResponse {
  posts: PostRow[];
}

export default function MyPostsPage() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteMenuOpen, setDeleteMenuOpen] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/community/posts?user=me");
      if (res.ok) {
        const data: PostsResponse = await res.json();
        // Format posts
        const mapped: Post[] = data.posts.map((row) => ({
          id: row.id,
          content: row.content,
          category: row.category === "prayer" ? "PRIÈRE" : "TÉMOIGNAGE",
          created_at: new Date(row.created_at).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          image_url: row.image_url,
          anonymous_name: row.anonymous_name || "Fidèle",
          amens: row.community_amens?.length || 0,
        }));
        setPosts(mapped);
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    } finally {
      setLoading(false);
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
      } else {
        alert(t("posts_delete_error"));
      }
    } catch (err) {
      console.error("Error deleting post:", err);
      alert(t("posts_delete_error"));
    } finally {
      setDeleting(null);
      setDeleteMenuOpen(null);
    }
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-28">
        {/* Header */}
        <header className="flex items-center gap-4">
          <Link
            href="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-secondary text-text-secondary transition-colors hover:bg-bg-tertiary"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-serif text-xl italic text-text-primary">{t("posts_title")}</h1>
        </header>

        {/* Posts List */}
        <div className="mt-8 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-bg-secondary">
                <MessageSquare className="h-10 w-10 text-text-tertiary" />
              </div>
              <p className="mt-6 font-serif text-lg italic text-text-primary">
                {t("posts_empty_title")}
              </p>
              <p className="mt-2 px-8 font-sans text-sm text-text-secondary">
                {t("posts_empty_desc")}
              </p>
              <Link
                href="/community"
                className="mt-6 rounded-full bg-accent px-6 py-3 font-sans text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-accent-light"
              >
                {t("posts_empty_cta")}
              </Link>
            </div>
          ) : (
            <AnimatePresence>
              {posts.map((post) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="overflow-hidden rounded-2xl bg-bg-secondary"
                >
                  {/* Image */}
                  {post.image_url && (
                    <div className="relative h-48 w-full">
                      <Image
                        src={post.image_url}
                        alt="Post"
                        fill
                        className="object-cover"
                      />
                      <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-wider text-white">
                        {post.category}
                      </span>
                    </div>
                  )}

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-bg-tertiary">
                          <User className="h-5 w-5 text-text-secondary" />
                        </div>
                        <div>
                          <p className="font-serif text-[17px] text-text-primary">
                            {post.anonymous_name}
                          </p>
                          <p className="font-sans text-[9px] uppercase tracking-wider text-text-tertiary">
                            {post.category} • {post.created_at}
                          </p>
                        </div>
                      </div>

                      {/* Menu 3 points */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setDeleteMenuOpen(deleteMenuOpen === post.id ? null : post.id)
                          }
                          className="rounded-full p-2 text-text-tertiary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {/* Menu dropdown */}
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
                      </div>
                    </div>

                    {/* Content */}
                    <p className="mt-4 font-sans text-[14px] leading-relaxed text-text-secondary">
                      {post.content}
                    </p>

                    {/* Stats */}
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex items-center gap-2 text-text-tertiary">
                        <Heart className="h-4 w-4" />
                        <span className="font-sans text-xs">{post.amens} Amen</span>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </AppShell>
  );
}
