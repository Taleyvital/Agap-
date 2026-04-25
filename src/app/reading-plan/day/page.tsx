"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { X, Share2, CheckCircle } from "lucide-react";
import { useXPToast, triggerXP } from "@/components/providers/XPToastProvider";
import { VerseFullCard } from "@/components/ui/VerseFullCard";
import { useLanguage } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface Question {
  id: number;
  text: string;
}

interface DayReading {
  dayNumber: number;
  totalDays: number;
  title: string;
  bibleReference: string;
  paragraphs: string[];
  questions: Question[];
  planId: string;
}

function DayReadingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showXPToast } = useXPToast();
  const { t } = useLanguage();

  const planId = searchParams.get("planId") ?? "";
  const dayNum = parseInt(searchParams.get("day") ?? "1", 10);

  const [dayReading, setDayReading] = useState<DayReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [verseCardOpen, setVerseCardOpen] = useState(false);

  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!planId) { setLoading(false); return; }
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push("/login"); return; }

        const [reflectionRes, planRes] = await Promise.all([
          supabase
            .from("daily_reflections")
            .select("*")
            .eq("plan_id", planId)
            .eq("day_number", dayNum)
            .single(),
          supabase
            .from("reading_plans")
            .select("total_days")
            .eq("id", planId)
            .single(),
        ]);

        if (!reflectionRes.data) { setLoading(false); return; }

        const r = reflectionRes.data;
        const paragraphs = (r.content as string)
          .split(/\n\n+/)
          .map((p: string) => p.trim())
          .filter(Boolean);

        const questions: Question[] = (r.reflection_prompt as string)
          .split("|")
          .map((q: string, i: number) => ({ id: i + 1, text: q.trim() }))
          .filter((q) => q.text.length > 0);

        setDayReading({
          dayNumber: dayNum,
          totalDays: planRes.data?.total_days ?? 5,
          title: r.title,
          bibleReference: r.bible_reference ?? "",
          paragraphs,
          questions,
          planId,
        });
      } catch (error) {
        console.error("Error loading day reading:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [planId, dayNum, router]);

  const onScripturePointerDown = () => {
    pressTimerRef.current = setTimeout(() => setVerseCardOpen(true), 500);
  };
  const onScripturePointerUp = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const parseRef = (ref: string) => {
    const match = ref.match(/^(.+?)\s+(\d+):(\d+)/);
    if (!match) return { book: ref, chapter: 1, verse: 1 };
    return { book: match[1], chapter: parseInt(match[2]), verse: parseInt(match[3]) };
  };

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleComplete = async () => {
    if (!dayReading) return;
    setIsCompleted(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const nextDay = dayReading.dayNumber + 1;
        await supabase.from("user_plan_progress").upsert(
          {
            user_id: user.id,
            plan_id: dayReading.planId,
            current_day: nextDay <= dayReading.totalDays ? nextDay : dayReading.dayNumber,
            completed_days: dayReading.dayNumber,
            last_read_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: "user_id,plan_id" }
        );
      }
    } catch (error) {
      console.error("Error saving progress:", error);
    }

    void triggerXP("LECTURE_DAY_COMPLETED", showXPToast);
    setTimeout(() => {
      router.push(`/reading-plan/${dayReading.planId}`);
    }, 1000);
  };

  const handleShare = () => {
    if (!dayReading) return;
    if (navigator.share) {
      navigator.share({
        title: `AGAPE - Jour ${dayReading.dayNumber}: ${dayReading.title}`,
        text: dayReading.bibleReference,
        url: window.location.href,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7B6FD4] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!dayReading) {
    return (
      <div className="min-h-screen bg-[#141414] flex flex-col items-center justify-center px-6">
        <p className="text-[#666666] font-sans text-center">Contenu introuvable.</p>
        <button
          onClick={() => router.push("/reading-plan")}
          className="mt-4 text-[#7B6FD4] font-sans text-sm"
        >
          Retour aux plans
        </button>
      </div>
    );
  }

  const parsedRef = parseRef(dayReading.bibleReference);

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#141414]/80 backdrop-blur-xl h-16 flex items-center justify-between px-6">
        <div className="flex flex-col">
          <span className="font-sans uppercase tracking-[0.15em] text-[10px] text-[#7B6FD4] font-bold">
            {t("rplan_day_label")} {dayReading.dayNumber} • {dayReading.totalDays}
          </span>
          <h1 className="font-serif italic text-lg tracking-tight text-[#E8E8E8]">
            {dayReading.title}
          </h1>
        </div>
        <button
          onClick={() => router.push(`/reading-plan/${dayReading.planId}`)}
          className="flex items-center justify-center text-[#666666] hover:text-[#E8E8E8] transition-colors active:opacity-70"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto">
        {/* Bible Reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span className="font-sans uppercase tracking-[0.15em] text-[11px] text-[#666666]">
            {t("rplan_bible_reading")}
          </span>
          <h2 className="text-[#666666] mt-1 font-sans font-medium">
            {dayReading.bibleReference}
          </h2>
        </motion.div>

        {/* Scripture Card — long-press opens fullscreen */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12 bg-[#1a1830] rounded-xl p-6 border-l-[3px] border-[#7B6FD4] cursor-pointer select-none"
          onPointerDown={onScripturePointerDown}
          onPointerUp={onScripturePointerUp}
          onPointerLeave={onScripturePointerUp}
        >
          <p className="font-serif italic text-xl leading-relaxed text-[#E8E8E8] mb-4">
            « {dayReading.bibleReference} »
          </p>
          <span className="font-sans uppercase tracking-[0.2em] text-[11px] text-[#7B6FD4] font-bold">
            {dayReading.bibleReference}
          </span>
          <p className="mt-3 font-sans text-[10px] text-[#444444] uppercase tracking-widest">
            {t("rplan_long_press")}
          </p>
        </motion.section>

        {/* Meditation / Content */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          <header className="mb-4">
            <span className="font-sans uppercase tracking-[0.15em] text-[11px] text-[#666666]">
              {t("rplan_meditation")}
            </span>
          </header>
          <div className="space-y-6 text-[#c9c4d4] leading-relaxed font-sans font-light text-[15px]">
            {dayReading.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </motion.section>

        {/* Reflection Questions */}
        {dayReading.questions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
          >
            <header className="mb-6">
              <span className="font-sans uppercase tracking-[0.15em] text-[11px] text-[#666666]">
                {t("rplan_questions")}
              </span>
            </header>
            <div className="space-y-4">
              {dayReading.questions.map((question) => (
                <div key={question.id} className="bg-[#1c1c1c] p-6 rounded-xl space-y-4">
                  <p className="text-[#E8E8E8] text-sm font-sans font-medium">
                    {question.text}
                  </p>
                  <textarea
                    value={answers[question.id] || ""}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="w-full bg-[#141414] border-none rounded-lg text-sm text-[#E8E8E8] placeholder-[#474552] focus:ring-1 focus:ring-[#7B6FD4] min-h-[100px] resize-none p-4"
                    placeholder={
                      question.id === 1
                        ? t("rplan_write_thoughts")
                        : t("rplan_personal_reflection")
                    }
                  />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Decorative gradient footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 rounded-2xl overflow-hidden h-24 relative"
          style={{
            background: "linear-gradient(135deg, #7B6FD422 0%, #7B6FD408 100%)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent" />
        </motion.div>
      </main>

      {/* Bottom Action Bar */}
      <footer className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-[#141414] via-[#141414]/90 to-transparent z-40">
        <div className="max-w-2xl mx-auto flex gap-4">
          <button
            onClick={handleShare}
            className="flex-1 bg-[#1c1c1c] text-[#E8E8E8] font-sans uppercase tracking-[0.15em] text-[11px] py-4 rounded-full flex items-center justify-center gap-2 hover:bg-[#252525] transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
            {t("rplan_share")}
          </button>
          <button
            onClick={handleComplete}
            disabled={isCompleted}
            className="flex-[2] bg-[#7B6FD4] text-[#E8E8E8] font-sans uppercase tracking-[0.15em] text-[11px] font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
          >
            {isCompleted ? (
              <>
                {t("rplan_completed")}
                <CheckCircle className="w-4 h-4" />
              </>
            ) : (
              <>
                {t("rplan_finish_day")}
                <CheckCircle className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </footer>

      {/* Verse Full Card (long-press on scripture) */}
      <VerseFullCard
        book={parsedRef.book}
        chapter={parsedRef.chapter}
        verse={parsedRef.verse}
        text={dayReading.bibleReference}
        isOpen={verseCardOpen}
        onClose={() => setVerseCardOpen(false)}
      />
    </div>
  );
}

export default function DayReadingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#141414] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#7B6FD4] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <DayReadingContent />
    </Suspense>
  );
}
