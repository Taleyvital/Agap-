"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CheckCircle, Circle, Sparkles, Calendar, Target, X } from "lucide-react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface ReadingDay {
  day: number;
  ref: string;
  title: string;
  reflection: string;
  questions: string[];
}

interface ReadingPlan {
  title: string;
  description: string;
  theme: string;
  verses_per_day: ReadingDay[];
}

export default function ReadingPlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<ReadingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedDays, setCompletedDays] = useState<Set<number>>(new Set());
  const [selectedDay, setSelectedDay] = useState<ReadingDay | null>(null);
  
  // Motion values for interactive dismissal
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 200], [1, 0]);
  const scale = useTransform(y, [0, 200], [1, 0.95]);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/onboarding");
          return;
        }

        const response = await fetch("/api/reading-plan");
        if (!response.ok) throw new Error("Failed to fetch plan");
        
        const data = await response.json();
        setPlan(data);
      } catch (error) {
        console.error("Error fetching reading plan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [router]);

  const toggleComplete = (day: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCompletedDays((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      return newSet;
    });
  };

  const progress = plan ? Math.round((completedDays.size / plan.verses_per_day.length) * 100) : 0;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-text-secondary">Chargement du plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-5">
        <div className="w-full max-w-md rounded-2xl bg-bg-secondary p-6">
          <p className="text-center text-text-secondary">
            Impossible de charger le plan de lecture. Veuillez réessayer.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 w-full rounded-xl bg-accent py-3 font-sans text-sm font-medium text-white"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  // Day detail modal
  if (selectedDay) {
    return (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedDay(null)}
        />
        <motion.div
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] rounded-t-3xl bg-bg-primary shadow-2xl"
          style={{ y, opacity, scale }}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
            {/* Drag Handle with Header */}
            <motion.div
              className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-md px-5 pt-3 pb-4 cursor-grab active:cursor-grabbing"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              dragPropagation={false}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  setTimeout(() => {
                    setSelectedDay(null);
                    y.set(0);
                  }, 200);
                } else {
                  y.set(0);
                }
              }}
              onPointerDown={() => {}}
            >
              <div className="flex flex-col items-center">
                <div className="mb-3 flex h-1 w-12 items-center justify-center rounded-full bg-text-tertiary/30">
                  <div className="h-full w-full rounded-full bg-text-tertiary/50" />
                </div>
              </div>
              <div className="flex w-full items-center justify-between">
                <button
                  onClick={() => setSelectedDay(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-tertiary text-text-secondary transition-colors hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="font-sans text-xs text-accent">Jour {selectedDay.day}</p>
                <div className="w-8" />
              </div>
            </motion.div>

            {/* Scrollable Content */}
            <div
              className="overflow-y-auto px-5 pb-28"
              style={{ maxHeight: "calc(90vh - 100px)" }}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="mb-6 flex items-center gap-3">
              <div 
                onClick={() => toggleComplete(selectedDay.day)}
                className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-accent/10"
              >
                {completedDays.has(selectedDay.day) ? (
                  <CheckCircle className="h-7 w-7 text-accent" />
                ) : (
                  <Circle className="h-7 w-7 text-text-tertiary" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="font-serif text-xl font-bold text-text-primary">
                  {selectedDay.title}
                </h1>
              </div>
            </div>

            <div className="rounded-2xl bg-bg-secondary p-5">
              <p className="font-serif text-lg text-text-primary italic">
                {selectedDay.ref}
              </p>
            </div>

            <div className="mt-4 rounded-2xl bg-bg-secondary p-5">
              <p className="ui-label mb-3 text-text-tertiary">RÉFLEXION</p>
              <p className="font-sans text-sm text-text-secondary leading-relaxed">
                {selectedDay.reflection}
              </p>
            </div>

            <div className="mt-4 rounded-2xl bg-bg-secondary p-5">
              <p className="ui-label mb-3 text-text-tertiary">QUESTIONS</p>
              <ul className="space-y-3">
                {selectedDay.questions.map((question, index) => (
                  <li
                    key={index}
                    className="flex gap-3 font-sans text-sm text-text-secondary"
                  >
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-medium text-accent">
                      {index + 1}
                    </span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => router.push(`/bible?ref=${selectedDay.ref}`)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-4 font-sans text-sm font-medium text-white"
            >
              <BookOpen className="h-4 w-4" />
              Lire le passage
            </button>
          </div>
          </motion.div>
        
    </>
  );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={() => router.back()}
      />
      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] rounded-t-3xl bg-bg-primary shadow-2xl"
        style={{ y, opacity, scale }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
          {/* Drag Handle - only this area is draggable */}
          <motion.div
            className="flex flex-col items-center px-5 pt-3 pb-2 cursor-grab active:cursor-grabbing"
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            dragPropagation={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > 150 || info.velocity.y > 800) {
                setTimeout(() => {
                  router.back();
                }, 200);
              } else {
                y.set(0);
              }
            }}
            onPointerDown={() => {}}
          >
            <div className="flex h-1 w-12 items-center justify-center rounded-full bg-text-tertiary/30">
              <div className="h-full w-full rounded-full bg-text-tertiary/50" />
            </div>
            <p className="mt-2 font-sans text-xs text-text-tertiary">Glissez vers le bas pour fermer</p>
          </motion.div>

          {/* Scrollable Content */}
          <div
            className="overflow-y-auto px-5 pb-28"
            style={{ maxHeight: "calc(90vh - 60px)" }}
            onClick={(e) => e.stopPropagation()}
          >

        {/* Main Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-orange-700 to-amber-900 p-6"
        >
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/5" />
          
          <div className="relative">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            
            <h1 className="font-serif text-2xl font-bold text-white">
              {plan.title}
            </h1>
            <p className="mt-2 font-sans text-sm text-white/80">
              {plan.description}
            </p>
            
            <div className="mt-4 flex items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                {plan.theme}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-bg-secondary p-4"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
              <Calendar className="h-5 w-5 text-accent" />
            </div>
            <p className="font-sans text-xs text-text-tertiary">Progression</p>
            <p className="mt-1 font-serif text-lg font-semibold text-text-primary">
              {completedDays.size} / {plan.verses_per_day.length}
            </p>
            <p className="font-sans text-xs text-text-secondary">jours complétés</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-bg-secondary p-4"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Target className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="font-sans text-xs text-text-tertiary">Avancement</p>
            <p className="mt-1 font-serif text-lg font-semibold text-text-primary">
              {progress}%
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-tertiary">
              <div 
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        </div>

        {/* Days Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6"
        >
          <p className="mb-4 font-sans text-xs uppercase tracking-wider text-text-tertiary">
            Les 14 Jours
          </p>
          
          <div className="grid grid-cols-3 gap-2">
            {plan.verses_per_day.map((day) => (
              <motion.button
                key={day.day}
                onClick={() => setSelectedDay(day)}
                whileTap={{ scale: 0.95 }}
                className={`relative flex flex-col items-center justify-center rounded-2xl p-3 transition-colors ${
                  completedDays.has(day.day) 
                    ? "bg-accent/10" 
                    : "bg-bg-secondary hover:bg-bg-tertiary"
                }`}
              >
                <span className={`font-sans text-xs ${
                  completedDays.has(day.day) ? "text-accent" : "text-text-tertiary"
                }`}>
                  J{day.day}
                </span>
                <span className="mt-1 font-serif text-xs font-medium text-text-primary line-clamp-1">
                  {day.ref.split(" ")[0]}
                </span>
                {completedDays.has(day.day) && (
                  <CheckCircle className="absolute right-2 top-2 h-3 w-3 text-accent" />
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Today's Reading Card */}
        {plan.verses_per_day.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-6 rounded-2xl bg-gradient-to-br from-indigo-700 via-purple-700 to-slate-900 p-5"
          >
            <p className="font-sans text-xs uppercase tracking-wider text-white/60">
              Lecture du jour
            </p>
            <p className="mt-2 font-serif text-lg text-white">
              {plan.verses_per_day[Math.min(completedDays.size, plan.verses_per_day.length - 1)].title}
            </p>
            <p className="mt-1 font-sans text-sm text-white/70">
              {plan.verses_per_day[Math.min(completedDays.size, plan.verses_per_day.length - 1)].ref}
            </p>
            <button
              onClick={() => setSelectedDay(plan.verses_per_day[Math.min(completedDays.size, plan.verses_per_day.length - 1)])}
              className="mt-4 w-full rounded-xl bg-white/10 py-3 font-sans text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Commencer la lecture
            </button>
          </motion.div>
        )}
          </div>
        </motion.div>
      
    </>
  );
}
