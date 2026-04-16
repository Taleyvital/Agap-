"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X, Share2, CheckCircle } from "lucide-react";
import { useXPToast, triggerXP } from "@/components/providers/XPToastProvider";

interface Question {
  id: number;
  text: string;
  answer: string;
}

interface DayReading {
  dayNumber: number;
  totalDays: number;
  title: string;
  scripture: {
    reference: string;
    text: string;
  };
  meditation: string[];
  questions: Question[];
}

// Mock data for day reading
const mockDayReading: DayReading = {
  dayNumber: 1,
  totalDays: 14,
  title: "La Paix Intérieure",
  scripture: {
    reference: "Jean 14:27",
    text: "Je vous laisse la paix, je vous donne ma paix. Je ne vous la donne pas comme le monde la donne. Que votre cœur ne se trouble point, et ne s'alarme point.",
  },
  meditation: [
    "Le tumulte du monde nous pousse souvent à chercher la tranquillité dans des circonstances extérieures favorables. Pourtant, la promesse du Christ s'établit sur une réalité différente : une paix qui subsiste même au cœur de l'orage.",
    "Cette paix n'est pas l'absence de problèmes, mais la présence d'une certitude. C'est l'ancre de l'âme qui refuse de céder à l'alarme, car elle repose sur une parole immuable.",
  ],
  questions: [
    {
      id: 1,
      text: "Quelles sont les sources de trouble qui occupent votre cœur aujourd'hui ?",
      answer: "",
    },
    {
      id: 2,
      text: "Comment la paix de Dieu peut-elle transformer votre perspective sur ces défis ?",
      answer: "",
    },
  ],
};

export default function DayReadingPage() {
  const router = useRouter();
  const { showXPToast } = useXPToast();
  const [dayReading] = useState<DayReading>(mockDayReading);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleComplete = () => {
    setIsCompleted(true);
    void triggerXP("LECTURE_DAY_COMPLETED", showXPToast);
    setTimeout(() => {
      router.push("/reading-plan/1");
    }, 1000);
  };

  const handleShare = () => {
    // Share functionality
    if (navigator.share) {
      navigator.share({
        title: `AGAPE - Jour ${dayReading.dayNumber}: ${dayReading.title}`,
        text: dayReading.scripture.text,
        url: window.location.href,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#141414]/80 backdrop-blur-xl h-16 flex items-center justify-between px-6">
        <div className="flex flex-col">
          <span className="font-sans uppercase tracking-[0.15em] text-[10px] text-[#7B6FD4] font-bold">
            JOUR {dayReading.dayNumber} • {dayReading.totalDays}
          </span>
          <h1 className="font-serif italic text-lg tracking-tight text-[#E8E8E8]">
            {dayReading.title}
          </h1>
        </div>
        <button
          onClick={() => router.push("/reading-plan/1")}
          className="flex items-center justify-center text-[#666666] hover:text-[#E8E8E8] transition-colors active:opacity-70"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto">
        {/* Scripture Context */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span className="font-sans uppercase tracking-[0.15em] text-[11px] text-[#666666]">
            LECTURE BIBLIQUE
          </span>
          <h2 className="text-[#666666] mt-1 font-sans font-medium">
            {dayReading.scripture.reference}
          </h2>
        </motion.div>

        {/* Editorial Verse Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12 bg-[#1a1830] rounded-xl p-6 border-l-[3px] border-[#7B6FD4]"
        >
          <p className="font-serif italic text-xl leading-relaxed text-[#E8E8E8] mb-4">
            « {dayReading.scripture.text} »
          </p>
          <span className="font-sans uppercase tracking-[0.2em] text-[11px] text-[#7B6FD4] font-bold">
            {dayReading.scripture.reference}
          </span>
        </motion.section>

        {/* Meditation Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-12"
        >
          <header className="mb-4">
            <span className="font-sans uppercase tracking-[0.15em] text-[11px] text-[#666666]">
              MÉDITATION DU JOUR
            </span>
          </header>
          <div className="space-y-6 text-[#c9c4d4] leading-relaxed font-sans font-light text-[15px]">
            {dayReading.meditation.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </motion.section>

        {/* Questions Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-12"
        >
          <header className="mb-6">
            <span className="font-sans uppercase tracking-[0.15em] text-[11px] text-[#666666]">
              QUESTIONS DE DISCERNEMENT
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
                      ? "Écrivez vos pensées ici..."
                      : "Réflexion personnelle..."
                  }
                />
              </div>
            ))}
          </div>
        </motion.section>

        {/* Decorative Visual Element */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 rounded-2xl overflow-hidden h-48 relative"
        >
          <div
            className="w-full h-full bg-cover bg-center opacity-40"
            style={{
              backgroundImage: `url(https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80)`,
            }}
          />
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
            Partager
          </button>
          <button
            onClick={handleComplete}
            disabled={isCompleted}
            className="flex-[2] bg-[#7B6FD4] text-[#E8E8E8] font-sans uppercase tracking-[0.15em] text-[11px] font-bold py-4 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
          >
            {isCompleted ? (
              <>
                Complété
                <CheckCircle className="w-4 h-4" />
              </>
            ) : (
              <>
                Terminer le jour
                <CheckCircle className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
