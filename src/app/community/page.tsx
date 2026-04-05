"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Bell, Heart, MessageSquare, Share2, MoreHorizontal, Plus, Image as ImageIcon, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Filter = "all" | "prayer" | "testimony";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "TOUT" },
  { id: "prayer", label: "PRIÈRES" },
  { id: "testimony", label: "TÉMOIGNAGES" },
];

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
}

const MOCK_POSTS: Post[] = [
  {
    id: "mock-1",
    author: "Grace Montgomery",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80",
    category: "TÉMOIGNAGE",
    time: "IL Y A 2H",
    quote: "\"Le silence matinal est là où je trouve les murmures les plus profonds de l'Esprit. Aujourd'hui, on me rappelle que la paix n'est pas l'absence de problèmes, mais la présence de Dieu.\"",
    content: "J'ai passé un peu de temps dans Jean 14 aujourd'hui. Si quelqu'un d'autre se sent submergé par le bruit de cette semaine, je recommande vivement de prendre juste cinq minutes de silence absolu.",
    amens: 0,
    hasAmen: false,
    comments: 12,
  },
  {
    id: "mock-2",
    author: "Samuel Chen",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&q=80",
    urgent: true,
    category: "PRIÈRE",
    time: "IL Y A 4H",
    content: "Je demande à la communauté de prier pour ma grand-mère, Elena. Elle subit une opération demain matin. Je prie pour les mains des chirurgiens et pour sa paix intérieure.",
    amens: 42,
    hasAmen: true,
    comments: 5,
    recentAmens: [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop&q=80",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&q=80"
    ],
    plusAmens: 39,
  },
  {
    id: "mock-3",
    author: "Lydia Vance",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80",
    image: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=600&h=400&fit=crop&q=80",
    imageBadge: "TÉMOIGNAGE",
    time: "IL Y A 6H",
    category: "TÉMOIGNAGE",
    content: "Après des mois de recherche, le Seigneur a débloqué notre situation de logement. Il est vraiment Jéhovah Jiré. Ne perdez pas espoir, les amis.",
    amens: 0,
    hasAmen: false,
  }
];

export default function CommunityPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [composer, setComposer] = useState(false);
  const [draft, setDraft] = useState("");
  const [composerCategory, setComposerCategory] = useState<"testimony" | "prayer">("testimony");
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
      
      void supabase
        .from("community_posts")
        .select("id, content, category, created_at, image_url, community_amens(user_id)")
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
          const mapped: Post[] = data.map((row) => {
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
              author: "Fidèle du chemin",
              avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80",
              category: row.category === "prayer" ? "PRIÈRE" : "TÉMOIGNAGE",
              time: created,
              content: String(row.content ?? ""),
              image: row.image_url ? String(row.image_url) : undefined,
              amens: amensList.length,
              hasAmen: hasLiked,
              comments: 0,
              urgent: false,
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
      
      if (res.ok) {
        setDraft("");
        removeImage();
        setComposer(false);
        // Optimistic UI update
        const newPost: Post = {
            id: Date.now().toString(),
            author: "Toi",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80",
            category: composerCategory === "prayer" ? "PRIÈRE" : "TÉMOIGNAGE",
            time: "À L'INSTANT",
            content: text,
            image: uploadedImageUrl || undefined,
            amens: 0,
            hasAmen: false,
            comments: 0,
            urgent: false,
        };
        setPosts([newPost, ...posts]);
      }
    } catch (err) {
      console.error("Submit error:", err);
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

  const visiblePosts = filter === "all"
    ? posts
    : posts.filter((p) =>
        filter === "prayer"
          ? p.category?.toUpperCase().includes("PRIÈRE")
          : filter === "testimony"
            ? p.category?.toUpperCase().includes("TÉMOIGNAGE")
            : true
      );

  return (
    <AppShell>
      <div className="relative min-h-screen bg-bg-primary pb-28 pt-8">
        
        {/* HEADER */}
        <header className="px-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            <div className="h-9 w-9 overflow-hidden rounded-full border border-separator ring-2 ring-transparent">
              <Image 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80" 
                alt="My Profile" 
                width={36} 
                height={36} 
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-accent">Communauté</h1>
          </div>
          <button type="button" className="text-accent" aria-label="Notifications">
            <Bell className="h-5 w-5 fill-accent" />
          </button>
        </header>
        
        <p className="mt-6 px-5 font-sans text-[10px] uppercase tracking-[0.2em] text-text-secondary">
          CONNEXIONS FIDÈLES DANS LA LUMIÈRE
        </p>

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
                      <div className="h-10 w-10 overflow-hidden rounded-full">
                        <Image
                          src={post.avatar}
                          alt={post.author}
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                        />
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
                    {!post.image && (
                       <button className="text-text-tertiary hover:text-text-primary transition-colors">
                         <MoreHorizontal className="h-5 w-5" />
                       </button>
                    )}
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
                      {/* Avatar Pile */}
                      {post.recentAmens && post.recentAmens.length > 0 && (
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {post.recentAmens.map((img, i) => (
                              <div key={i} className="h-6 w-6 overflow-hidden rounded-full border border-bg-secondary relative z-10">
                                <Image src={img} alt="User" width={24} height={24} className="object-cover" />
                              </div>
                            ))}
                          </div>
                          {post.plusAmens && (
                            <span className="-ml-1 flex h-6 min-w-6 items-center justify-center rounded-full border border-bg-secondary bg-text-tertiary/20 px-1 font-sans text-[9px] font-bold text-text-secondary z-0">
                              +{post.plusAmens}
                            </span>
                          )}
                        </div>
                      )}
                      
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="w-full max-w-[430px] rounded-3xl bg-bg-secondary p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <p className="ui-label font-bold text-text-tertiary uppercase tracking-widest">NOUVEAU POST</p>
                <div className="flex bg-bg-tertiary rounded-full p-1 gap-1">
                  <button 
                    type="button"
                    onClick={() => setComposerCategory("testimony")}
                    className={`px-3 py-1.5 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider transition-all ${composerCategory === 'testimony' ? 'bg-accent text-white shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
                  >
                    Témoignage
                  </button>
                  <button 
                    type="button"
                    onClick={() => setComposerCategory("prayer")}
                    className={`px-3 py-1.5 rounded-full font-sans text-[10px] font-bold uppercase tracking-wider transition-all ${composerCategory === 'prayer' ? 'bg-accent text-white shadow-sm' : 'text-text-tertiary hover:text-text-secondary'}`}
                  >
                    Prière
                  </button>
                </div>
              </div>

              <div className="relative mt-4">
                <textarea
                  className="w-full resize-none rounded-xl border border-separator bg-bg-tertiary p-4 font-sans text-[15px] leading-relaxed text-text-primary outline-none transition-colors focus:border-accent/40"
                  rows={imagePreview ? 3 : 5}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Partage de l'encouragement avec la communauté..."
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
                    Annuler
                  </button>
                  <button
                    type="button"
                    disabled={submitting || (!draft.trim() && !imageFile)}
                    onClick={() => void submit()}
                    className="rounded-full bg-accent px-6 py-2.5 font-sans text-[11px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
                  >
                    {submitting ? "..." : "Publier"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}

      </div>
    </AppShell>
  );
}
