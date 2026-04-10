"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface ReadingPathway {
  id: string;
  tag: string;
  tagColor: string;
  duration: string;
  title: string;
  description: string;
  imageUrl: string;
}

const thematicPathways: ReadingPathway[] = [
  {
    id: "1",
    tag: "Fondation",
    tagColor: "#7B6FD4",
    duration: "12 Jours",
    title: "Les Fondements de la Foi",
    description: "Redécouvrez les piliers de l&apos;Évangile à travers une lecture chronologique.",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  },
  {
    id: "2",
    tag: "Sagesse",
    tagColor: "#f0c051",
    duration: "30 Jours",
    title: "Sagesse des Proverbes",
    description: "L&apos;art de vivre selon la volonté divine dans le quotidien moderne.",
    imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80",
  },
  {
    id: "3",
    tag: "Dévotion",
    tagColor: "#ff6b6b",
    duration: "5 Jours",
    title: "Prière Silencieuse",
    description: "Cultiver l&apos;écoute active de l&apos;Esprit dans le tumulte urbain.",
    imageUrl: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80",
  },
];

export default function ReadingPlanPage() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/onboarding");
        }
      } catch (error) {
        console.error("Error checking auth:", error);
      }
    };

    checkAuth();
  }, [router]);

  return (
    <AppShell>
      <div className="min-h-screen bg-bg-primary pb-28 transition-colors duration-300">
        {/* Header Section */}
        <div className="px-6 pt-6 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-serif text-[22px] italic text-text-primary mb-1">
              Parcours de lecture
            </h1>
            <p className="font-sans text-[15px] text-text-secondary">
              Chemins vers la Parole
            </p>
          </motion.div>

          {/* Personalized Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-6"
          >
            <div className="inline-flex items-center gap-3 bg-[#7B6FD4]/10 border border-[#7B6FD4]/20 rounded-full px-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-[#7B6FD4] animate-pulse" />
              <span className="font-sans text-[12px] uppercase tracking-widest text-[#7B6FD4] font-medium">
                Parcours personnalisé disponible pour toi
              </span>
            </div>
          </motion.div>
        </div>

        {/* AI Generated Section */}
        <div className="px-6 mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] text-text-tertiary font-bold">
                Généré par l&apos;IA • Pour toi
              </h3>
            </div>

            {/* AI Card */}
            <div
              onClick={() => router.push("/reading-plan/ai-personalized")}
              className="relative overflow-hidden rounded-[16px] bg-bg-secondary border border-accent/20 p-6 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
            >
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 mb-4">
                  <Sparkles className="w-3 h-3 text-[#7B6FD4]" />
                  <span className="font-sans text-[10px] uppercase tracking-[0.15em] text-[#7B6FD4]">
                    Basé sur ton profil spirituel
                  </span>
                </div>

                <h4 className="font-serif text-2xl text-text-primary mb-2 leading-tight">
                  La Sérénité dans{" "}
                  <span className="italic">la Tempête du Monde</span>
                </h4>

                <p className="text-text-secondary font-sans text-sm mb-6 leading-relaxed">
                  Un itinéraire de 7 jours explorant les psaumes de réconfort et les enseignements du Christ sur la paix intérieure.
                </p>

                <button className="inline-flex items-center gap-2 font-sans text-sm uppercase tracking-widest text-[#7B6FD4] hover:text-[#9B8FF4] transition-colors group">
                  Commencer
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Background glow effects */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#7B6FD4]/10 rounded-full blur-[60px]" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#7B6FD4]/5 rounded-full blur-[40px]" />
            </div>
          </motion.div>
        </div>

        {/* Thematic Pathways Section */}
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] text-text-tertiary font-bold">
                Parcours thématiques
              </h3>
              <button className="font-sans text-[10px] uppercase tracking-widest text-text-tertiary hover:text-text-primary transition-colors">
                Voir tout
              </button>
            </div>

            <div className="space-y-4">
              {thematicPathways.map((pathway, index) => (
                <motion.div
                  key={pathway.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  onClick={() => router.push(`/reading-plan/${pathway.id}`)}
                  className="group relative flex flex-col bg-bg-secondary rounded-[16px] overflow-hidden border border-separator hover:bg-bg-tertiary transition-all duration-300 cursor-pointer active:scale-[0.98] shadow-sm"
                >
                  {/* Image Container */}
                  <div className="h-40 w-full overflow-hidden relative">
                    <div
                      className="w-full h-full bg-cover bg-center opacity-60 group-hover:scale-105 transition-transform duration-700"
                      style={{ backgroundImage: `url(${pathway.imageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1c] to-transparent" />

                    {/* Tag */}
                    <div className="absolute top-4 left-4">
                      <span
                        className="text-[10px] px-2 py-1 rounded font-bold tracking-tighter uppercase"
                        style={{
                          backgroundColor: `${pathway.tagColor}20`,
                          color: pathway.tagColor,
                        }}
                      >
                        {pathway.tag}
                      </span>
                    </div>

                    {/* Duration */}
                    <div className="absolute top-4 right-4">
                      <span className="text-white/80 text-[10px] font-medium tracking-widest uppercase">
                        {pathway.duration}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h5 className="font-serif text-xl text-text-primary mb-2 italic">
                      {pathway.title}
                    </h5>
                    <p className="text-text-secondary text-sm font-sans line-clamp-2">
                      {pathway.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

      </div>
    </AppShell>
  );
}
