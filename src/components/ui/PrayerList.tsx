"use client";

import { useState } from "react";
import { Check, HandHeart, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrayerRequests } from "@/hooks/usePrayerRequests";
import { PrayerRequest } from "@/lib/types";
import confetti from "canvas-confetti";

export function PrayerList() {
  const { prayers, loading, addPrayer, markAsAnswered } = usePrayerRequests();
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [answerSheetOpen, setAnswerSheetOpen] = useState(false);
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerRequest | null>(null);
  
  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newNote, setNewNote] = useState("");
  const [testimony, setTestimony] = useState("");
  const [shareCommunity, setShareCommunity] = useState(true);

  const activePrayers = prayers.filter((p) => !p.exaucee);
  const answeredPrayers = prayers.filter((p) => p.exaucee);

  const handleAddPrayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await addPrayer(newTitle, newNote);
      setNewTitle("");
      setNewNote("");
      setAddSheetOpen(false);
    } catch {
      alert("Erreur lors de l'ajout");
    }
  };

  const handleMarkAsAnswered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrayer || !testimony.trim()) return;
    try {
      await markAsAnswered(selectedPrayer.id, testimony, shareCommunity);
      setAnswerSheetOpen(false);
      setTestimony("");
      setSelectedPrayer(null);
      
      // Celebration!
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#7B6FD4", "#FFFFFF", "#FFD700"],
      });
      
    } catch {
      alert("Erreur lors de la mise à jour");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center pt-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl italic text-text-primary">
            Mes Sujets de Prière
          </h2>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-text-tertiary">
            {activePrayers.length} prières • {answeredPrayers.length} exaucées
          </p>
        </div>
        <button
          onClick={() => setAddSheetOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform active:scale-90"
        >
          <Plus size={20} />
        </button>
      </div>

      {prayers.length === 0 ? (
        <EmptyState onAdd={() => setAddSheetOpen(true)} />
      ) : (
        <div className="mt-8 space-y-8">
          {/* Active Prayers */}
          {activePrayers.length > 0 && (
            <section>
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
                En cours
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <AnimatePresence mode="popLayout">
                  {activePrayers.map((prayer) => (
                    <motion.div
                      key={prayer.id}
                      layoutId={prayer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative overflow-hidden rounded-2xl border border-separator bg-gradient-to-br from-bg-secondary to-bg-tertiary p-5 transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xl">
                          <HandHeart className="h-6 w-6 text-accent" aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-lg font-semibold text-text-primary leading-tight">
                            {prayer.titre}
                          </p>
                          {prayer.note_initiale && (
                            <p className="mt-2 font-sans text-sm text-text-secondary line-clamp-2">
                              {prayer.note_initiale}
                            </p>
                          )}
                          <p className="mt-3 text-[10px] uppercase tracking-wider text-text-tertiary">
                            Depuis le {new Date(prayer.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                          <span className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                            En prière
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPrayer(prayer);
                            setAnswerSheetOpen(true);
                          }}
                          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:bg-accent-light active:scale-95"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Exaucée
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}

          {/* Answered Prayers */}
          {answeredPrayers.length > 0 && (
            <section>
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">
                Exaucées 🎉
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <AnimatePresence mode="popLayout">
                  {answeredPrayers.map((prayer) => (
                    <motion.div
                      key={prayer.id}
                      layoutId={prayer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group relative overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-bg-secondary p-5 transition-all hover:border-green-500/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-500/20 text-xl">
                          <Check className="h-6 w-6 text-green-600" aria-hidden />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-serif text-lg font-semibold text-text-primary leading-tight">
                            {prayer.titre}
                          </p>
                          {prayer.temoignage && (
                            <p className="mt-2 font-serif text-sm italic text-text-secondary line-clamp-2 leading-relaxed">
                              &ldquo;{prayer.temoignage}&rdquo;
                            </p>
                          )}
                          <p className="mt-3 text-[10px] uppercase tracking-wider text-green-600 font-semibold">
                            Exaucée le {new Date(prayer.date_exaucement!).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🎉</span>
                          <span className="text-[10px] uppercase tracking-wider text-green-600 font-semibold">
                            Dieu a répondu
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Bottom Sheets */}
      <BottomSheets 
        addOpen={addSheetOpen}
        setAddOpen={setAddSheetOpen}
        answerOpen={answerSheetOpen}
        setAnswerOpen={setAnswerSheetOpen}
        newTitle={newTitle}
        setNewTitle={setNewTitle}
        newNote={newNote}
        setNewNote={setNewNote}
        testimony={testimony}
        setTestimony={setTestimony}
        shareCommunity={shareCommunity}
        setShareCommunity={setShareCommunity}
        onAdd={handleAddPrayer}
        onAnswer={handleMarkAsAnswered}
      />
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-bg-secondary text-4xl">
        <HandHeart className="h-10 w-10 text-accent" aria-hidden />
      </div>
      <h3 className="font-serif text-2xl italic text-text-primary">
        Commence à noter tes prières
      </h3>
      <p className="mt-3 max-w-[240px] text-xs leading-relaxed text-text-tertiary">
        Chaque prière exaucée est un témoignage de Sa fidélité
      </p>
      <button
        onClick={onAdd}
        className="mt-8 rounded-full bg-accent px-8 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg transition-transform active:scale-95"
      >
        Première prière +
      </button>
    </div>
  );
}

interface BottomSheetsProps {
  addOpen: boolean;
  setAddOpen: (open: boolean) => void;
  answerOpen: boolean;
  setAnswerOpen: (open: boolean) => void;
  newTitle: string;
  setNewTitle: (val: string) => void;
  newNote: string;
  setNewNote: (val: string) => void;
  testimony: string;
  setTestimony: (val: string) => void;
  shareCommunity: boolean;
  setShareCommunity: (val: boolean) => void;
  onAdd: (e: React.FormEvent) => Promise<void>;
  onAnswer: (e: React.FormEvent) => Promise<void>;
}

function BottomSheets({ 
  addOpen, setAddOpen, 
  answerOpen, setAnswerOpen,
  newTitle, setNewTitle,
  newNote, setNewNote,
  testimony, setTestimony,
  shareCommunity, setShareCommunity,
  onAdd, onAnswer
}: BottomSheetsProps) {
  return (
    <>
      {/* Overlay shared */}
      <AnimatePresence>
        {(addOpen || answerOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setAddOpen(false); setAnswerOpen(false); }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
          />
        )}
      </AnimatePresence>

      {/* Add Prayer Sheet */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-[32px] border-t border-separator bg-bg-secondary p-8 shadow-2xl"
          >
             <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-bg-tertiary" />
             <p className="text-center text-[10px] font-bold uppercase tracking-[0.25em] text-text-tertiary mb-8">
               Nouveau sujet de prière
             </p>
             
             <form onSubmit={onAdd} className="space-y-6">
               <div className="space-y-2">
                 <input
                   autoFocus
                   type="text"
                   maxLength={100}
                   value={newTitle}
                   onChange={(e) => setNewTitle(e.target.value)}
                   placeholder="Pour quoi veux-tu prier ?"
                   className="w-full rounded-2xl bg-bg-tertiary p-5 font-serif text-lg text-text-primary placeholder:text-text-tertiary focus:outline-accent/30"
                 />
                 <div className="text-right text-[10px] text-text-tertiary">
                   {newTitle.length}/100
                 </div>
               </div>

               <div className="space-y-2">
                 <textarea
                   maxLength={300}
                   rows={3}
                   value={newNote}
                   onChange={(e) => setNewNote(e.target.value)}
                   placeholder="Contexte ou détails (optionnel)..."
                   className="w-full resize-none rounded-2xl bg-bg-tertiary p-5 font-sans text-sm text-text-primary placeholder:text-text-tertiary focus:outline-accent/30"
                 />
                 <div className="text-right text-[10px] text-text-tertiary">
                   {newNote.length}/300
                 </div>
               </div>

               <button
                 type="submit"
                 className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-4 font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
               >
                 Ajouter <HandHeart className="h-4 w-4" aria-hidden />
               </button>
             </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answered Prayer Sheet */}
      <AnimatePresence>
        {answerOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-[32px] border-t border-separator bg-bg-secondary p-8 shadow-2xl"
          >
             <div className="mx-auto mb-6 h-1 w-12 rounded-full bg-bg-tertiary" />
             
             <div className="text-center space-y-2 mb-8">
               <h2 className="font-serif text-2xl italic text-text-primary">🎉 Dieu a répondu !</h2>
               <p className="text-xs text-text-tertiary">Prends un moment pour noter ce miracle</p>
             </div>

             <div className="flex justify-center mb-8">
                <span className="rounded-full bg-bg-tertiary px-4 py-1.5 text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                  Exaucée le {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
             </div>
             
             <form onSubmit={onAnswer} className="space-y-6">
               <div className="space-y-3">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                   Comment Dieu a-t-il répondu ?
                 </p>
                 <textarea
                   autoFocus
                   maxLength={500}
                   rows={4}
                   value={testimony}
                   onChange={(e) => setTestimony(e.target.value)}
                   placeholder="Raconte ce que Dieu a fait..."
                   className="w-full resize-none rounded-2xl bg-bg-tertiary p-5 font-serif text-base italic text-text-primary placeholder:text-text-tertiary focus:outline-accent/30"
                 />
                 <div className="text-right text-[10px] text-text-tertiary">
                   {testimony.length}/500
                 </div>
               </div>

               <div className="flex items-center justify-between rounded-2xl bg-bg-tertiary/50 p-4">
                 <div className="space-y-0.5">
                   <p className="text-xs font-semibold text-text-primary">Partage anonyme</p>
                   <p className="text-[10px] text-text-tertiary leading-tight pr-4">Publier le témoignage dans la Communauté</p>
                 </div>
                 <button
                   type="button"
                   onClick={() => setShareCommunity(!shareCommunity)}
                   className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${shareCommunity ? 'bg-accent' : 'bg-bg-tertiary'}`}
                 >
                   <motion.div 
                     animate={{ x: shareCommunity ? 22 : 4 }}
                     className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm"
                   />
                 </button>
               </div>

               <button
                 type="submit"
                 className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-4 font-bold uppercase tracking-[0.15em] text-white shadow-lg shadow-accent/20 transition-opacity hover:opacity-90 active:scale-[0.98]"
               >
                 Confirmer ✓
               </button>
             </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
