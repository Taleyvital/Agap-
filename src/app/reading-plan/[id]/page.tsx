"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Star } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

interface Day {
  id: number;
  number: number;
  title: string;
  status: "completed" | "current" | "future";
}

interface ReadingPlan {
  id: string;
  title: string;
  description: string;
  total_days: number;
  category: string;
  is_ai_generated: boolean;
  author: string | null;
  days: Day[];
  quoteReference: string;
}

export default function ReadingPlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t } = useLanguage();
  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlanCompleted, setIsPlanCompleted] = useState(false);
  const currentDayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const planId = params.id as string;

        const [planRes, reflectionsRes, progressRes] = await Promise.all([
          supabase.from("reading_plans").select("*").eq("id", planId).single(),
          supabase.from("daily_reflections").select("day_number, title, bible_reference").eq("plan_id", planId).order("day_number"),
          supabase.from("user_plan_progress").select("current_day, completed_days").eq("plan_id", planId).eq("user_id", user.id).maybeSingle(),
        ]);

        if (planRes.error || !planRes.data) { setLoading(false); return; }

        const planData = planRes.data;
        const reflections = reflectionsRes.data || [];
        const currentDay = progressRes.data?.current_day ?? 1;
        const planCompleted = currentDay > planData.total_days;

        const days: Day[] = reflections.map((r) => ({
          id: r.day_number,
          number: r.day_number,
          title: r.title,
          status:
            r.day_number < currentDay
              ? "completed"
              : r.day_number === currentDay
              ? "current"
              : "future",
        }));

        const firstRef = reflections[0]?.bible_reference ?? "";

        setIsPlanCompleted(planCompleted);
        setPlan({
          id: planData.id,
          title: planData.title,
          description: planData.description,
          total_days: planData.total_days,
          category: planData.category,
          is_ai_generated: planData.is_ai_generated,
          author: planData.author ?? null,
          days,
          quoteReference: firstRef,
        });
      } catch (error) {
        console.error("Error loading plan:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, params.id]);

  useEffect(() => {
    if (plan && currentDayRef.current) {
      setTimeout(() => {
        currentDayRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-6">
        <p className="text-text-secondary font-sans text-center">{t("rplan_not_found")}</p>
        <button
          onClick={() => router.push("/reading-plan")}
          className="mt-4 text-accent font-sans text-sm"
        >
          {t("rplan_back_to_plans")}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary pb-40 transition-colors duration-300">
      {/* Header */}
      <header
        className="fixed top-0 w-full z-50 bg-bg-primary/80 backdrop-blur-xl flex items-end px-6 pb-3"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 12px)", minHeight: "64px" }}
      >
        <button
          onClick={() => router.push("/reading-plan")}
          className="flex items-center gap-2 text-accent font-medium text-sm transition-opacity active:opacity-70"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-sans tracking-wide uppercase text-[11px]">
            {t("rplan_back")}
          </span>
        </button>
      </header>

      <main
        className="px-6 max-w-2xl mx-auto"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 80px)" }}
      >
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative dark:bg-[#2a2040] bg-accent/10 rounded-2xl p-8 mb-8 overflow-hidden"
        >
          <div className="absolute -right-4 -bottom-8 text-[180px] font-serif text-white/5 pointer-events-none select-none leading-none">
            φ
          </div>

          <div className="relative z-10">
            {/* Metadata Chips */}
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 rounded-full bg-bg-secondary/50 backdrop-blur-sm text-[10px] font-sans tracking-[0.15em] uppercase text-text-secondary">
                {plan.total_days} Jours
              </span>
              <span className="px-3 py-1 rounded-full bg-bg-secondary/50 backdrop-blur-sm text-[10px] font-sans tracking-[0.15em] uppercase text-text-secondary">
                {plan.category}
              </span>
              {plan.is_ai_generated && (
                <span className="px-3 py-1 rounded-full bg-accent/20 backdrop-blur-sm text-[10px] font-sans tracking-[0.15em] uppercase text-accent border border-accent/20">
                  {t("rplan_ai_badge")}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif italic text-2xl mb-2 text-text-primary leading-tight">
              {plan.title}
            </h1>

            {/* Author — discret */}
            {plan.author && (
              <p className="mb-5 font-sans text-[10px] uppercase tracking-[0.18em] text-text-secondary/60">
                par {plan.author}
              </p>
            )}

            {/* Description as quote */}
            <blockquote className="font-serif italic text-base text-text-secondary border-l border-accent/30 pl-4 py-1">
              {plan.description}
              {plan.quoteReference && (
                <footer className="mt-2 text-[11px] font-sans tracking-[0.15em] uppercase not-italic text-text-secondary/60">
                  — {plan.quoteReference}
                </footer>
              )}
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
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-separator z-0" />

            {plan.days.map((day, index) => {
              const isLeft = index % 2 === 0;
              const isCompleted = day.status === "completed";
              const isCurrent = day.status === "current";
              const isFuture = day.status === "future";

              return (
                <div
                  key={day.id}
                  ref={isCurrent ? currentDayRef : null}
                  onClick={() => {
                    if (!isFuture) {
                      router.push(`/reading-plan/day?planId=${plan.id}&day=${day.number}`);
                    }
                  }}
                  className={`relative z-10 flex flex-col items-center ${
                    isLeft ? "-translate-x-12 sm:-translate-x-16" : "translate-x-12 sm:translate-x-16"
                  } ${!isFuture ? "cursor-pointer" : "cursor-default"}`}
                >
                  {isCompleted ? (
                    <div className="w-16 h-16 rounded-full bg-accent text-white flex items-center justify-center transition-transform active:scale-95 shadow-lg">
                      <Check className="w-6 h-6" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-[72px] h-[72px] rounded-full bg-accent text-white flex flex-col items-center justify-center shadow-[0_0_30px_rgba(123,111,212,0.3)] ring-4 ring-bg-primary ring-offset-0">
                      <span className="text-xl font-bold font-serif">{day.number}</span>
                      <Star className="w-3 h-3 fill-current" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-bg-secondary border border-separator text-text-tertiary flex items-center justify-center">
                      <span className="text-lg font-medium font-serif">{day.number}</span>
                    </div>
                  )}

                  <span
                    className={`mt-3 font-sans tracking-[0.15em] uppercase text-[10px] ${
                      isCurrent ? "text-accent" : isFuture ? "text-text-secondary/40" : "text-text-secondary"
                    }`}
                  >
                    {isCurrent ? t("common_today") : `${t("rplan_day")} ${day.number}`}
                  </span>
                  <span
                    className={`text-[12px] mt-1 text-center max-w-[100px] ${
                      isCurrent
                        ? "font-bold text-text-primary"
                        : isFuture
                        ? "font-medium text-text-primary/40"
                        : "font-medium text-text-primary"
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
      <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent z-50">
        <div className="max-w-md mx-auto">
          {isPlanCompleted ? (
            <div className="w-full h-14 bg-accent/20 border border-accent/40 rounded-full flex items-center justify-center gap-2">
              <Check className="w-5 h-5 text-accent" />
              <span className="font-sans font-semibold text-sm tracking-wide text-accent">
                {t("rplan_completed")}
              </span>
            </div>
          ) : (
            <button
              onClick={() =>
                router.push(
                  `/reading-plan/day?planId=${plan.id}&day=${getCurrentDayNumber()}`
                )
              }
              className="w-full h-14 bg-text-primary text-bg-primary rounded-full font-bold text-sm tracking-wide transition-all active:scale-95 shadow-2xl"
            >
              {t("rplan_start_day")} {getCurrentDayNumber()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
