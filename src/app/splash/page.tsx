"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

// Phrases inspirantes qui changent à chaque ouverture
const inspirationalPhrases = [
  "Préparez votre cœur...",
  "La paix soit avec vous",
  "Un moment de grâce...",
  "Que l'amour vous guide",
  "Bienvenue dans le calme",
  "Lumière et paix",
  "Un souffle d'éternité...",
];

export default function SplashPage() {
  const [mounted, setMounted] = useState(false);
  const [currentPhrase, setCurrentPhrase] = useState(0);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    setCurrentPhrase(Math.floor(Math.random() * inspirationalPhrases.length));

    // Vérifier la session Supabase et rediriger
    const checkSessionAndRedirect = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      // Attendre 2.5s pour laisser l'animation jouer
      setTimeout(() => {
        if (session) {
          router.push("/home");
        } else {
          router.push("/onboarding");
        }
      }, 2500);
    };

    checkSessionAndRedirect();
  }, [router]);

  if (!mounted) return null;

  return (
    <main className="fixed inset-0 z-50 overflow-hidden">
      {/* Fond radial dégradé Sacred Modernist */}
      <div 
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, #5340C4 0%, #3b22ac 40%, #1a0f3d 100%)"
        }}
      />

      {/* Contenu principal */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
        {/* Logo avec animation breathe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            opacity: { duration: 1.2, ease: "easeOut" },
            scale: { 
              duration: 4, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }
          }}
          className="relative w-32 h-32"
        >
          {/* Glow subtil derrière le logo */}
          <motion.div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{ background: "rgba(255,255,255,0.15)" }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Logo SVG */}
          <div className="relative w-32 h-32">
            <Image
              src="/icons/kudob01.svg"
              alt="AGAPE"
              fill
              className="object-contain"
              priority
            />
          </div>
        </motion.div>

        {/* Nom AGAPE */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
          className="mt-6 text-2xl font-bold tracking-[0.3em] text-white uppercase"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          AGAPE
        </motion.h1>

        {/* Phrase inspirante discrète en bas */}
        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.8, ease: "easeOut" }}
          className="absolute bottom-16 left-6 right-6 text-center text-sm text-white/50 font-light tracking-wide italic"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {inspirationalPhrases[currentPhrase]}
        </motion.p>
      </div>
    </main>
  );
}
