"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, BookOpen } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

interface ReadingPlan {
  id: string;
  title: string;
  description: string;
  total_days: number;
  category: string;
  is_ai_generated: boolean;
  image_url: string | null;
  author: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Identité": "#7B6FD4",
  "Sagesse": "#f0c051",
  "Fondation": "#7B6FD4",
  "Dévotion": "#ff6b6b",
  "Foi": "#4CAF82",
};

export default function ReadingPlanPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const { data } = await supabase
          .from("reading_plans")
          .select("*")
          .eq("is_ai_generated", false)
          .order("created_at", { ascending: false });

        setPlans(data || []);
      } catch (error) {
        console.error("Error loading plans:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
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
              {t("rplan_title")}
            </h1>
            <p className="font-sans text-[15px] text-text-secondary">
              {t("rplan_subtitle")}
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
                {t("rplan_personalized_badge")}
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
                {t("rplan_ai_label")}
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
                    {t("rplan_ai_based_on")}
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
                  {t("rplan_start_btn")}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

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
                {t("rplan_thematic_section")}
              </h3>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-[#7B6FD4] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan, index) => {
                  const accentColor = CATEGORY_COLORS[plan.category] || "#7B6FD4";
                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                      onClick={() => router.push(`/reading-plan/${plan.id}`)}
                      className="group relative flex flex-col bg-bg-secondary rounded-[16px] overflow-hidden border border-separator hover:bg-bg-tertiary transition-all duration-300 cursor-pointer active:scale-[0.98] shadow-sm"
                    >
                      {/* Gradient Header or Cover Image */}
                      <div
                        className="h-36 w-full relative flex items-center justify-center"
                        style={!plan.image_url ? {
                          background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}08 100%)`,
                        } : undefined}
                      >
                        {plan.image_url ? (
                          <Image src={plan.image_url} alt={plan.title} fill className="object-cover" sizes="430px" />
                        ) : (
                          <BookOpen className="w-12 h-12 opacity-20" style={{ color: accentColor }} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1c] to-transparent" />

                        {/* Category Tag */}
                        <div className="absolute top-4 left-4">
                          <span
                            className="text-[10px] px-2 py-1 rounded font-bold tracking-tighter uppercase"
                            style={{
                              backgroundColor: `${accentColor}20`,
                              color: accentColor,
                            }}
                          >
                            {plan.category}
                          </span>
                        </div>

                        {/* Duration */}
                        <div className="absolute top-4 right-4">
                          <span className="text-white/80 text-[10px] font-medium tracking-widest uppercase">
                            {plan.total_days} Jours
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h5 className="font-serif text-xl text-text-primary mb-1 italic">
                          {plan.title}
                        </h5>
                        {plan.author && (
                          <p className="mb-2 font-sans text-[10px] uppercase tracking-[0.15em] text-text-tertiary/50">
                            par {plan.author}
                          </p>
                        )}
                        <p className="text-text-secondary text-sm font-sans line-clamp-2">
                          {plan.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppShell>
  );
}
