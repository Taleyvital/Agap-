"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft, Plus, Pencil, Trash2, ChevronRight, ChevronLeft,
  BookOpen, ImageIcon, Loader2, Check, X, GripVertical,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Plan {
  id: string;
  title: string;
  description: string | null;
  total_days: number;
  category: string | null;
  image_url: string | null;
  is_ai_generated: boolean;
  created_at: string;
}

interface Day {
  id: string;
  plan_id: string;
  day_number: number;
  title: string;
  bible_reference: string | null;
  content: string | null;
  reflection_prompt: string | null;
  image_url: string | null;
}

const CATEGORIES = ["Identité", "Sagesse", "Dévotion", "Foi", "Prière", "Guérison", "Espérance", "Louange"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function Spinner() {
  return <Loader2 className="h-5 w-5 animate-spin text-[#7B6FD4]" />;
}

function Badge({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-[#7B6FD4]/20 px-2 py-0.5 font-sans text-[10px] uppercase tracking-wider text-[#7B6FD4]">
      {label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminReadingPlanPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // View state: "plans" | "days"
  const [view, setView] = useState<"plans" | "days">("plans");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  // Data
  const [plans, setPlans] = useState<Plan[]>([]);
  const [days, setDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysLoading, setDaysLoading] = useState(false);

  // Plan form sheet
  const [planSheet, setPlanSheet] = useState<"closed" | "create" | "edit">("closed");
  const [planForm, setPlanForm] = useState({ title: "", description: "", category: "", total_days: 7, image_url: "" });
  const [planImageFile, setPlanImageFile] = useState<File | null>(null);
  const [planImagePreview, setPlanImagePreview] = useState<string | null>(null);
  const [planSaving, setPlanSaving] = useState(false);
  const planImageRef = useRef<HTMLInputElement>(null);

  // Day form sheet
  const [daySheet, setDaySheet] = useState<"closed" | "create" | "edit">("closed");
  const [dayForm, setDayForm] = useState({
    day_number: 1,
    title: "",
    bible_reference: "",
    content: "",
    questions: [""],
    image_url: "",
  });
  const [editingDay, setEditingDay] = useState<Day | null>(null);
  const [dayImageFile, setDayImageFile] = useState<File | null>(null);
  const [dayImagePreview, setDayImagePreview] = useState<string | null>(null);
  const [daySaving, setDaySaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const dayImageRef = useRef<HTMLInputElement>(null);

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
      if (!data?.is_admin) { router.replace("/home"); return; }
      setIsAdmin(true);
    });
  }, [router]);

  // ── Load plans ──────────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("reading_plans")
      .select("*")
      .order("created_at", { ascending: false });
    setPlans((data ?? []) as Plan[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) void fetchPlans();
  }, [isAdmin, fetchPlans]);

  // ── Load days for a plan ────────────────────────────────────────────────────
  const openDays = async (plan: Plan) => {
    setSelectedPlan(plan);
    setView("days");
    setDaysLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("daily_reflections")
      .select("*")
      .eq("plan_id", plan.id)
      .order("day_number");
    setDays((data ?? []) as Day[]);
    setDaysLoading(false);
  };

  // ── Image upload helper ─────────────────────────────────────────────────────
  const uploadImage = async (file: File, folder: string): Promise<string> => {
    const supabase = createSupabaseBrowserClient();
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("reading-plan-images").upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("reading-plan-images").getPublicUrl(path);
    return publicUrl;
  };

  // ── Plan CRUD ───────────────────────────────────────────────────────────────
  const openCreatePlan = () => {
    setPlanForm({ title: "", description: "", category: CATEGORIES[0], total_days: 7, image_url: "" });
    setPlanImageFile(null); setPlanImagePreview(null);
    setPlanSheet("create");
  };

  const openEditPlan = (plan: Plan) => {
    setPlanForm({
      title: plan.title,
      description: plan.description ?? "",
      category: plan.category ?? "",
      total_days: plan.total_days,
      image_url: plan.image_url ?? "",
    });
    setPlanImageFile(null);
    setPlanImagePreview(plan.image_url ?? null);
    setSelectedPlan(plan);
    setPlanSheet("edit");
  };

  const savePlan = async () => {
    if (!planForm.title.trim()) return;
    setPlanSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      let imageUrl = planForm.image_url;
      if (planImageFile) imageUrl = await uploadImage(planImageFile, "plans");

      const payload = {
        title: planForm.title.trim(),
        description: planForm.description.trim() || null,
        category: planForm.category || null,
        total_days: planForm.total_days,
        image_url: imageUrl || null,
      };

      if (planSheet === "create") {
        const { data, error } = await supabase.from("reading_plans").insert(payload).select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Aucune donnée retournée — vérifiez les policies RLS.");
        setPlans((prev) => [data as Plan, ...prev]);
      } else if (selectedPlan) {
        const { data, error } = await supabase.from("reading_plans").update(payload).eq("id", selectedPlan.id).select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Mise à jour bloquée — vérifiez les policies RLS.");
        setPlans((prev) => prev.map((p) => p.id === selectedPlan.id ? data as Plan : p));
      }
      setPlanSheet("closed");
    } catch (e) {
      const msg = (e instanceof Error ? e.message : (e as { message?: string })?.message) ?? JSON.stringify(e);
      alert("Erreur : " + msg);
    } finally {
      setPlanSaving(false);
    }
  };

  const deletePlan = async (plan: Plan) => {
    if (!confirm(`Supprimer "${plan.title}" et tous ses jours ?`)) return;
    setDeletingId(plan.id);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("reading_plans").delete().eq("id", plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Day CRUD ────────────────────────────────────────────────────────────────
  const openCreateDay = () => {
    const nextNum = days.length > 0 ? Math.max(...days.map((d) => d.day_number)) + 1 : 1;
    setDayForm({ day_number: nextNum, title: "", bible_reference: "", content: "", questions: [""], image_url: "" });
    setEditingDay(null);
    setDayImageFile(null); setDayImagePreview(null);
    setDaySheet("create");
  };

  const openEditDay = (day: Day) => {
    const questions = day.reflection_prompt ? day.reflection_prompt.split("|").map((q) => q.trim()) : [""];
    setDayForm({
      day_number: day.day_number,
      title: day.title,
      bible_reference: day.bible_reference ?? "",
      content: day.content ?? "",
      questions,
      image_url: day.image_url ?? "",
    });
    setEditingDay(day);
    setDayImageFile(null);
    setDayImagePreview(day.image_url ?? null);
    setDaySheet("edit");
  };

  const saveDay = async () => {
    if (!dayForm.title.trim() || !selectedPlan) return;
    setDaySaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      let imageUrl = dayForm.image_url;
      if (dayImageFile) imageUrl = await uploadImage(dayImageFile, `days/${selectedPlan.id}`);

      const reflectionPrompt = dayForm.questions.filter((q) => q.trim()).join(" | ");
      const payload = {
        plan_id: selectedPlan.id,
        day_number: dayForm.day_number,
        title: dayForm.title.trim(),
        bible_reference: dayForm.bible_reference.trim() || null,
        content: dayForm.content.trim() || null,
        reflection_prompt: reflectionPrompt || null,
        image_url: imageUrl || null,
      };

      if (daySheet === "create") {
        const { data, error } = await supabase.from("daily_reflections").insert(payload).select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Aucune donnée retournée — vérifiez les policies RLS.");
        setDays((prev) => [...prev, data as Day].sort((a, b) => a.day_number - b.day_number));
      } else if (editingDay) {
        const { data, error } = await supabase.from("daily_reflections").update(payload).eq("id", editingDay.id).select().maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("Mise à jour bloquée — vérifiez les policies RLS.");
        setDays((prev) => prev.map((d) => d.id === editingDay.id ? data as Day : d).sort((a, b) => a.day_number - b.day_number));
      }
      setDaySheet("closed");
    } catch (e) {
      const msg = (e instanceof Error ? e.message : (e as { message?: string })?.message) ?? JSON.stringify(e);
      alert("Erreur : " + msg);
    } finally {
      setDaySaving(false);
    }
  };

  const deleteDay = async (day: Day) => {
    if (!confirm(`Supprimer le jour ${day.day_number} "${day.title}" ?`)) return;
    setDeletingId(day.id);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("daily_reflections").delete().eq("id", day.id);
      setDays((prev) => prev.filter((d) => d.id !== day.id));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Guard ───────────────────────────────────────────────────────────────────
  if (isAdmin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#141414]">
        <Spinner />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#141414] text-[#E8E8E8]">
      <div className="mx-auto max-w-[430px] px-4 pb-20" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 20px)" }}>

        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          {view === "days" ? (
            <button
              type="button"
              onClick={() => setView("plans")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1c1c] border border-[#2a2a2a] text-[#666666]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1c1c] border border-[#2a2a2a] text-[#666666]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex-1">
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#666666]">Admin</p>
            <h1 className="font-serif text-lg italic text-[#E8E8E8]">
              {view === "plans" ? "Plans de lecture" : selectedPlan?.title}
            </h1>
          </div>
          <button
            type="button"
            onClick={view === "plans" ? openCreatePlan : openCreateDay}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7B6FD4] text-white"
          >
            <Plus className="h-4 w-4" />
          </button>
        </header>

        {/* ── PLANS VIEW ── */}
        {view === "plans" && (
          <>
            {loading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <BookOpen className="h-10 w-10 text-[#2a2a2a]" />
                <p className="font-sans text-sm text-[#666666]">Aucun plan pour l&apos;instant</p>
                <button type="button" onClick={openCreatePlan}
                  className="mt-2 rounded-2xl bg-[#7B6FD4] px-5 py-2.5 font-sans text-sm text-white">
                  Créer le premier plan
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#1c1c1c]">
                    {/* Cover image */}
                    {plan.image_url ? (
                      <div className="relative h-36 w-full">
                        <Image src={plan.image_url} alt={plan.title} fill className="object-cover" sizes="430px" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1c] via-transparent to-transparent" />
                        {plan.category && (
                          <div className="absolute top-3 left-3"><Badge label={plan.category} /></div>
                        )}
                        <div className="absolute top-3 right-3 rounded-full bg-black/50 px-2 py-0.5 font-sans text-[10px] text-[#E8E8E8]">
                          {plan.total_days}j
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-24 items-center justify-center bg-gradient-to-br from-[#7B6FD4]/20 to-[#1c1c1c] gap-3">
                        {plan.category && <Badge label={plan.category} />}
                        <span className="font-sans text-xs text-[#666666]">{plan.total_days} jours</span>
                      </div>
                    )}

                    <div className="px-4 py-3">
                      <p className="font-serif text-base italic text-[#E8E8E8]">{plan.title}</p>
                      {plan.description && (
                        <p className="mt-1 font-sans text-xs text-[#666666] line-clamp-2">{plan.description}</p>
                      )}

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void openDays(plan)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#7B6FD4]/10 py-2 font-sans text-xs text-[#7B6FD4]"
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                          Gérer les jours
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditPlan(plan)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#2a2a2a] text-[#666666] hover:text-[#E8E8E8]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void deletePlan(plan)}
                          disabled={deletingId === plan.id}
                          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#2a2a2a] text-[#666666] hover:text-red-400 disabled:opacity-50"
                        >
                          {deletingId === plan.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── DAYS VIEW ── */}
        {view === "days" && (
          <>
            {/* Plan stats */}
            <div className="mb-4 flex gap-2">
              <div className="flex-1 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] px-3 py-2.5 text-center">
                <p className="font-sans text-[10px] text-[#666666] uppercase tracking-wider">Total</p>
                <p className="font-serif text-xl text-[#7B6FD4]">{selectedPlan?.total_days}</p>
              </div>
              <div className="flex-1 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] px-3 py-2.5 text-center">
                <p className="font-sans text-[10px] text-[#666666] uppercase tracking-wider">Créés</p>
                <p className="font-serif text-xl text-[#E8E8E8]">{days.length}</p>
              </div>
              <div className="flex-1 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] px-3 py-2.5 text-center">
                <p className="font-sans text-[10px] text-[#666666] uppercase tracking-wider">Restants</p>
                <p className="font-serif text-xl text-[#E8E8E8]">{Math.max(0, (selectedPlan?.total_days ?? 0) - days.length)}</p>
              </div>
            </div>

            {daysLoading ? (
              <div className="flex justify-center py-16"><Spinner /></div>
            ) : days.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <BookOpen className="h-10 w-10 text-[#2a2a2a]" />
                <p className="font-sans text-sm text-[#666666]">Aucun jour créé</p>
                <button type="button" onClick={openCreateDay}
                  className="mt-2 rounded-2xl bg-[#7B6FD4] px-5 py-2.5 font-sans text-sm text-white">
                  Ajouter le jour 1
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {days.map((day) => (
                  <div key={day.id} className="overflow-hidden rounded-2xl border border-[#2a2a2a] bg-[#1c1c1c]">
                    {day.image_url && (
                      <div className="relative h-24 w-full">
                        <Image src={day.image_url} alt={day.title} fill className="object-cover" sizes="430px" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1c] to-transparent" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7B6FD4]/15 border border-[#7B6FD4]/30">
                        <span className="font-serif text-sm italic text-[#7B6FD4]">{day.day_number}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-sm text-[#E8E8E8] truncate">{day.title}</p>
                        {day.bible_reference && (
                          <p className="font-sans text-[11px] text-[#666666]">{day.bible_reference}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditDay(day)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#666666] hover:text-[#E8E8E8]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteDay(day)}
                        disabled={deletingId === day.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#666666] hover:text-red-400 disabled:opacity-50"
                      >
                        {deletingId === day.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          PLAN FORM SHEET
      ══════════════════════════════════════════════════════════════ */}
      {planSheet !== "closed" && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-[2px]">
          <div
            className="w-full max-w-[430px] rounded-t-3xl border-t border-[#2a2a2a] bg-[#1c1c1c] shadow-2xl overflow-y-auto"
            style={{ maxHeight: "92vh", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
          >
            {/* Handle */}
            <div className="pt-3 pb-1 flex justify-center sticky top-0 bg-[#1c1c1c] z-10">
              <div className="h-1 w-10 rounded-full bg-[#2a2a2a]" />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
              <h2 className="font-serif text-lg italic text-[#E8E8E8]">
                {planSheet === "create" ? "Nouveau plan" : "Modifier le plan"}
              </h2>
              <button type="button" onClick={() => setPlanSheet("closed")} className="text-[#666666]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Cover image */}
              <div>
                <p className="mb-2 font-sans text-[10px] uppercase tracking-wider text-[#666666]">Image de couverture</p>
                <button
                  type="button"
                  onClick={() => planImageRef.current?.click()}
                  className="relative w-full h-36 rounded-2xl border border-dashed border-[#2a2a2a] overflow-hidden bg-[#141414] flex items-center justify-center"
                >
                  {planImagePreview ? (
                    <>
                      <Image src={planImagePreview} alt="" fill className="object-cover" sizes="430px" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <ImageIcon className="h-6 w-6 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-[#666666]">
                      <ImageIcon className="h-7 w-7" />
                      <span className="font-sans text-xs">Ajouter une image</span>
                    </div>
                  )}
                </button>
                <input
                  ref={planImageRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setPlanImageFile(f); setPlanImagePreview(URL.createObjectURL(f)); }
                  }}
                />
              </div>

              {/* Title */}
              <div>
                <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[#666666]">Titre *</p>
                <input
                  type="text"
                  value={planForm.title}
                  onChange={(e) => setPlanForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex : La paix dans la tempête"
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 font-sans text-sm text-[#E8E8E8] placeholder:text-[#666666] focus:border-[#7B6FD4] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[#666666]">Description</p>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Description courte du parcours…"
                  className="w-full resize-none rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 font-sans text-sm text-[#E8E8E8] placeholder:text-[#666666] focus:border-[#7B6FD4] focus:outline-none"
                />
              </div>

              {/* Category + Days */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[#666666]">Catégorie</p>
                  <select
                    value={planForm.category}
                    onChange={(e) => setPlanForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-3 font-sans text-sm text-[#E8E8E8] focus:border-[#7B6FD4] focus:outline-none"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="w-24">
                  <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[#666666]">Durée (j)</p>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={planForm.total_days}
                    onChange={(e) => setPlanForm((p) => ({ ...p, total_days: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-3 font-sans text-sm text-[#E8E8E8] focus:border-[#7B6FD4] focus:outline-none"
                  />
                </div>
              </div>

              {/* Save */}
              <button
                type="button"
                onClick={() => void savePlan()}
                disabled={planSaving || !planForm.title.trim()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7B6FD4] py-3.5 font-sans text-sm font-semibold text-white disabled:opacity-50"
              >
                {planSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {planSaving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          DAY FORM SHEET
      ══════════════════════════════════════════════════════════════ */}
      {daySheet !== "closed" && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-[2px]">
          <div
            className="w-full max-w-[430px] rounded-t-3xl border-t border-[#2a2a2a] bg-[#1c1c1c] shadow-2xl overflow-y-auto"
            style={{ maxHeight: "95vh", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
          >
            <div className="pt-3 pb-1 flex justify-center sticky top-0 bg-[#1c1c1c] z-10">
              <div className="h-1 w-10 rounded-full bg-[#2a2a2a]" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a] sticky top-5 bg-[#1c1c1c] z-10">
              <h2 className="font-serif text-lg italic text-[#E8E8E8]">
                {daySheet === "create" ? "Nouveau jour" : `Jour ${editingDay?.day_number}`}
              </h2>
              <button type="button" onClick={() => setDaySheet("closed")} className="text-[#666666]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Day image */}
              <div>
                <p className="mb-2 font-sans text-[10px] uppercase tracking-wider text-[#666666]">Image du jour</p>
                <button
                  type="button"
                  onClick={() => dayImageRef.current?.click()}
                  className="relative w-full h-28 rounded-2xl border border-dashed border-[#2a2a2a] overflow-hidden bg-[#141414] flex items-center justify-center"
                >
                  {dayImagePreview ? (
                    <>
                      <Image src={dayImagePreview} alt="" fill className="object-cover" sizes="430px" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <ImageIcon className="h-5 w-5 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-[#666666]">
                      <ImageIcon className="h-5 w-5" />
                      <span className="font-sans text-xs">Image optionnelle</span>
                    </div>
                  )}
                </button>
                <input
                  ref={dayImageRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setDayImageFile(f); setDayImagePreview(URL.createObjectURL(f)); }
                  }}
                />
              </div>

              {/* Day number + Title */}
              <div className="flex gap-3">
                <div className="w-20">
                  <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[#666666]">Jour</p>
                  <input
                    type="number"
                    min={1}
                    value={dayForm.day_number}
                    onChange={(e) => setDayForm((p) => ({ ...p, day_number: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-3 py-3 font-sans text-sm text-[#E8E8E8] focus:border-[#7B6FD4] focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[#666666]">Titre *</p>
                  <input
                    type="text"
                    value={dayForm.title}
                    onChange={(e) => setDayForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Ex : Paix intérieure"
                    className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 font-sans text-sm text-[#E8E8E8] placeholder:text-[#666666] focus:border-[#7B6FD4] focus:outline-none"
                  />
                </div>
              </div>

              {/* Bible reference */}
              <div>
                <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[#666666]">Référence biblique</p>
                <input
                  type="text"
                  value={dayForm.bible_reference}
                  onChange={(e) => setDayForm((p) => ({ ...p, bible_reference: e.target.value }))}
                  placeholder="Ex : Philippiens 4:7"
                  className="w-full rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 font-sans text-sm text-[#E8E8E8] placeholder:text-[#666666] focus:border-[#7B6FD4] focus:outline-none"
                />
              </div>

              {/* Content */}
              <div>
                <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wider text-[#666666]">Méditation</p>
                <p className="mb-2 font-sans text-[10px] text-[#666666]">Sépare les paragraphes par une ligne vide.</p>
                <textarea
                  value={dayForm.content}
                  onChange={(e) => setDayForm((p) => ({ ...p, content: e.target.value }))}
                  rows={8}
                  placeholder="Texte de méditation…&#10;&#10;Nouveau paragraphe…"
                  className="w-full resize-none rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 font-sans text-sm leading-relaxed text-[#E8E8E8] placeholder:text-[#666666] focus:border-[#7B6FD4] focus:outline-none"
                />
              </div>

              {/* Questions */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-sans text-[10px] uppercase tracking-wider text-[#666666]">Questions de réflexion</p>
                  <button
                    type="button"
                    onClick={() => setDayForm((p) => ({ ...p, questions: [...p.questions, ""] }))}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 font-sans text-[10px] text-[#7B6FD4] border border-[#7B6FD4]/30"
                  >
                    <Plus className="h-3 w-3" /> Ajouter
                  </button>
                </div>
                <div className="space-y-2">
                  {dayForm.questions.map((q, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => {
                          const updated = [...dayForm.questions];
                          updated[i] = e.target.value;
                          setDayForm((p) => ({ ...p, questions: updated }));
                        }}
                        placeholder={`Question ${i + 1}…`}
                        className="flex-1 rounded-xl border border-[#2a2a2a] bg-[#141414] px-4 py-2.5 font-sans text-sm text-[#E8E8E8] placeholder:text-[#666666] focus:border-[#7B6FD4] focus:outline-none"
                      />
                      {dayForm.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDayForm((p) => ({ ...p, questions: p.questions.filter((_, j) => j !== i) }))}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#2a2a2a] text-[#666666] hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Save */}
              <button
                type="button"
                onClick={() => void saveDay()}
                disabled={daySaving || !dayForm.title.trim()}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7B6FD4] py-3.5 font-sans text-sm font-semibold text-white disabled:opacity-50"
              >
                {daySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {daySaving ? "Enregistrement…" : "Enregistrer le jour"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
