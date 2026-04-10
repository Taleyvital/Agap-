"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Star } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface Day {
  id: number;
  number: number;
  title: string;
  status: "completed" | "current" | "future";
}

interface ReadingPlan {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  category: string;
  isAIGenerated: boolean;
  quote: {
    text: string;
    reference: string;
  };
  days: Day[];
}

// Mock data for the reading plan
const mockPlan: ReadingPlan = {
  id: "1",
  title: "La quête de la sagesse : De la connaissance à l'illumination",
  subtitle: "De la connaissance à l'illumination",
  description: "Un parcours de 14 jours pour explorer la sagesse biblique et son application dans la vie quotidienne.",
  duration: "14 Jours",
  category: "Théologie",
  isAIGenerated: true,
  quote: {
    text: "Car celui qui me trouve a trouvé la vie, Et il obtient la faveur de l'Éternel.",
    reference: "Proverbes 8:35",
  },
  days: [
    { id: 1, number: 1, title: "L'Appel", status: "completed" },
    { id: 2, number: 2, title: "La Traversée", status: "current" },
    { id: 3, number: 3, title: "Le Silence", status: "future" },
    { id: 4, number: 4, title: "L'Ancre", status: "future" },
    { id: 5, number: 5, title: "La Promesse", status: "future" },
    { id: 6, number: 6, title: "La Foi", status: "future" },
    { id: 7, number: 7, title: "L'Espoir", status: "future" },
    { id: 8, number: 8, title: "La Charité", status: "future" },
    { id: 9, number: 9, title: "La Patience", status: "future" },
    { id: 10, number: 10, title: "L'Humilité", status: "future" },
    { id: 11, number: 11, title: "La Gratitude", status: "future" },
    { id: 12, number: 12, title: "Le Pardon", status: "future" },
    { id: 13, number: 13, title: "La Joie", status: "future" },
    { id: 14, number: 14, title: "L'Illumination", status: "future" },
  ],
};

export default function ReadingPlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const currentDayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkAuthAndLoadPlan = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/onboarding");
          return;
        }

        // In a real app, fetch the plan from API using params.id
        // For now, use mock data
        setPlan(mockPlan);
        setLoading(false);
      } catch (error) {
        console.error("Error loading plan:", error);
        setLoading(false);
      }
    };

    checkAuthAndLoadPlan();
  }, [router, params.id]);

  // Scroll to current day when plan loads
  useEffect(() => {
    if (plan && currentDayRef.current) {
      setTimeout(() => {
        currentDayRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);
    }
  }, [plan]);

  const getCurrentDayNumber = () => {
    if (!plan) return 1;
    const currentDay = plan.days.find((d) => d.status === "current");
    return currentDay?.number || 1;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7B6FD4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center px-6">
        <p className="text-[#666666] font-sans text-center">
          Parcours non trouvé
        </p>
        <button
          onClick={() => router.push("/reading-plan")}
          className="mt-4 text-[#7B6FD4] font-sans text-sm"
        >
          Retour aux parcours
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] pb-40">
      {/* Header with back button */}
      <header className="fixed top-0 w-full z-50 bg-[#141414]/80 backdrop-blur-xl h-16 flex items-center px-6">
        <button
          onClick={() => router.push("/reading-plan")}
          className="flex items-center gap-2 text-[#7B6FD4] font-medium text-sm transition-opacity active:opacity-70"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-sans tracking-wide uppercase text-[11px]">
            ← Parcours
          </span>
        </button>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative bg-[#2a2040] rounded-2xl p-8 mb-8 overflow-hidden"
        >
          {/* Decorative Greek Letter Phi */}
          <div className="absolute -right-4 -bottom-8 text-[180px] font-serif text-white/5 pointer-events-none select-none leading-none">
            φ
          </div>

          <div className="relative z-10">
            {/* Metadata Chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 rounded-full bg-[#1c1c1c]/50 backdrop-blur-sm text-[10px] font-sans tracking-[0.15em] uppercase text-[#666666]">
                {plan.duration}
              </span>
              <span className="px-3 py-1 rounded-full bg-[#1c1c1c]/50 backdrop-blur-sm text-[10px] font-sans tracking-[0.15em] uppercase text-[#666666]">
                {plan.category}
              </span>
              {plan.isAIGenerated && (
                <span className="px-3 py-1 rounded-full bg-[#7B6FD4]/20 backdrop-blur-sm text-[10px] font-sans tracking-[0.15em] uppercase text-[#7B6FD4] border border-[#7B6FD4]/20">
                  IA Personnalisé
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif italic text-2xl mb-6 text-[#E8E8E8] leading-tight">
              {plan.title}
            </h1>

            {/* Quote */}
            <blockquote className="font-serif italic text-lg text-[#666666] border-l border-[#7B6FD4]/30 pl-4 py-1">
              &ldquo;{plan.quote.text}&rdquo;
              <footer className="mt-2 text-[11px] font-sans tracking-[0.15em] uppercase not-italic text-[#666666]/60">
                — {plan.quote.reference}
              </footer>
            </blockquote>
          </div>
        </motion.section>

        {/* Zigzag Path Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative"
        >
          <div className="flex flex-col items-center gap-12 relative py-8">
            {/* Vertical connecting line */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-[#2a2a2a] z-0" />

            {plan.days.map((day, index) => {
              // Determine zigzag position
              const isLeft = index % 2 === 0;
              const isCompleted = day.status === "completed";
              const isCurrent = day.status === "current";
              const isFuture = day.status === "future";

              return (
                <div
                  key={day.id}
                  ref={isCurrent ? currentDayRef : null}
                  className={`relative z-10 flex flex-col items-center ${
                    isLeft ? "-translate-x-12 sm:-translate-x-16" : "translate-x-12 sm:translate-x-16"
                  }`}
                >
                  {/* Day Circle */}
                  {isCompleted ? (
                    // Completed day
                    <div className="w-16 h-16 rounded-full bg-[#7B6FD4] text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg">
                      <Check className="w-6 h-6" />
                    </div>
                  ) : isCurrent ? (
                    // Current day (larger with star)
                    <div className="w-[72px] h-[72px] rounded-full bg-[#7B6FD4] text-white flex flex-col items-center justify-center shadow-[0_0_30px_rgba(123,111,212,0.3)] ring-4 ring-[#141414] ring-offset-0">
                      <span className="text-xl font-bold font-serif">{day.number}</span>
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                  ) : (
                    // Future day
                    <div className="w-16 h-16 rounded-full bg-[#1c1c1c] border border-[#2a2a2a] text-[#444] flex items-center justify-center">
                      <span className="text-lg font-medium font-serif">{day.number}</span>
                    </div>
                  )}

                  {/* Day Labels */}
                  <span
                    className={`mt-3 font-sans tracking-[0.15em] uppercase text-[10px] ${
                      isCurrent ? "text-[#7B6FD4]" : isFuture ? "text-[#666666]/40" : "text-[#666666]"
                    }`}
                  >
                    {isCurrent ? "Aujourd'hui" : `Jour ${day.number}`}
                  </span>
                  <span
                    className={`text-[12px] mt-1 ${
                      isCurrent ? "font-bold text-[#E8E8E8]" : isFuture ? "font-medium text-[#E8E8E8]/40" : "font-medium text-[#E8E8E8]"
                    }`}
                  >
                    {day.title}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.section>
      </main>

      {/* Bottom Actions (Fixed) */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#141414] via-[#141414]/95 to-transparent z-50">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <button
            onClick={() => router.push("/reading-plan/day")}
            className="w-full h-14 bg-[#E8E8E8] text-[#141414] rounded-full font-bold text-sm tracking-wide transition-all active:scale-95 shadow-2xl"
          >
            Commencer le Jour {getCurrentDayNumber()}
          </button>
          <button className="w-full h-12 bg-transparent text-[#E8E8E8] rounded-full font-sans tracking-[0.15em] uppercase text-[11px] transition-all hover:bg-[#1c1c1c]/30 active:opacity-70">
            Aperçu du parcours
          </button>
        </div>
      </div>
    </div>
  );
}
