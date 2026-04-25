"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Upload, Play, Pause, CheckCircle, Music, Image as ImageIcon } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { AppShell } from "@/components/layout/AppShell";
import { GOSPEL_GENRES, GOSPEL_LANGUAGES } from "@/types/gospel";

type Step = 1 | 2 | 3 | 4;

interface FormData {
  title: string;
  artist_name: string;
  album: string;
  language: string;
  genre: string;
  lyrics: string;
}

const STEP_LABELS = ["Audio", "Infos", "Pochette", "Confirmation"];

export default function GospelUploadPage() {
  const router = useRouter();
  const audioInputRef  = useRef<HTMLInputElement>(null);
  const coverInputRef  = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const [step, setStep]               = useState<Step>(1);
  const [audioFile, setAudioFile]     = useState<File | null>(null);
  const [audioUrl, setAudioUrl]       = useState<string>("");   // storage path
  const [audioDuration, setAudioDuration] = useState(0);
  const [coverFile, setCoverFile]     = useState<File | null>(null);
  const [coverUrl, setCoverUrl]       = useState<string>("");   // storage path
  const [coverPreview, setCoverPreview] = useState<string>("");  // local blob
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [error, setError]             = useState<string>("");
  const [form, setForm]               = useState<FormData>({
    title: "",
    artist_name: "",
    album: "",
    language: "français",
    genre: "Louange",
    lyrics: "",
  });

  // ── Audio upload ─────────────────────────────────────────────
  const handleAudioSelect = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      setError("Fichier audio invalide. Accepte MP3 ou M4A.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("Fichier trop lourd (max 20 Mo).");
      return;
    }
    setError("");
    setAudioFile(file);
    const blob = URL.createObjectURL(file);

    // Measure duration
    const audio = new Audio(blob);
    audio.addEventListener("loadedmetadata", () => setAudioDuration(Math.floor(audio.duration)));
    audioPreviewRef.current = audio;

    // Upload to Supabase Storage
    setIsUploading(true);
    setUploadProgress(10);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Non authentifié"); setIsUploading(false); return; }

    const ext  = file.name.split(".").pop() ?? "mp3";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("gospel-audio")
      .upload(path, file, { upsert: false });

    setUploadProgress(90);
    if (uploadErr) { setError("Erreur upload audio: " + uploadErr.message); setIsUploading(false); return; }
    setAudioUrl(path);
    setUploadProgress(100);
    setIsUploading(false);
  };

  const toggleAudioPreview = () => {
    const a = audioPreviewRef.current;
    if (!a) return;
    if (isAudioPlaying) { a.pause(); setIsAudioPlaying(false); }
    else { a.play(); setIsAudioPlaying(true); a.onended = () => setIsAudioPlaying(false); }
  };

  // ── Cover upload ─────────────────────────────────────────────
  const handleCoverSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Image invalide."); return; }
    if (file.size > 2 * 1024 * 1024) { setError("Image trop lourde (max 2 Mo)."); return; }
    setError("");
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));

    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { data: uploaded, error: err } = await supabase.storage
      .from("gospel-covers")
      .upload(path, file, { upsert: false });

    if (err) { setError("Erreur upload pochette."); return; }
    const { data: { publicUrl } } = supabase.storage
      .from("gospel-covers")
      .getPublicUrl(uploaded.path);
    setCoverUrl(publicUrl);
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError("");
    const res = await fetch("/api/gospel/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:            form.title,
        artist_name:      form.artist_name,
        album:            form.album || null,
        duration_seconds: audioDuration,
        audio_url:        audioUrl,
        cover_url:        coverUrl || null,
        lyrics:           form.lyrics || null,
        genre:            form.genre,
        language:         form.language,
      }),
    });
    const data = await res.json();
    setIsSubmitting(false);
    if (!res.ok) { setError(data.error ?? "Erreur lors de la soumission."); return; }
    setSubmitted(true);
  };

  const canProceedStep1 = audioUrl !== "" && !isUploading;
  const canProceedStep2 = form.title.trim() !== "" && form.artist_name.trim() !== "";

  if (submitted) {
    return (
      <AppShell>
        <div className="flex min-h-screen flex-col items-center justify-center px-8 text-center">
          <div
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(123,111,212,0.15)" }}
          >
            <CheckCircle className="h-10 w-10" style={{ color: "#7B6FD4" }} />
          </div>
          <h2 className="mb-3 font-serif text-[22px] text-[#E8E8E8]">Titre soumis !</h2>
          <p className="mb-2 font-sans text-[14px] text-[#666666]">
            <strong className="text-[#E8E8E8]">{form.title}</strong> est en attente de validation par l&apos;équipe AGAPE.
          </p>
          <p className="mb-8 font-sans text-[13px] text-[#666666]">
            Vous recevrez une notification dès que votre titre sera examiné.
          </p>
          <button
            onClick={() => router.push("/gospel")}
            className="w-full max-w-xs rounded-2xl py-4 font-sans text-[15px] font-semibold text-white"
            style={{ backgroundColor: "#7B6FD4" }}
          >
            Retour au Gospel
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-[#141414] px-5 pb-32 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => (step > 1 ? setStep((s) => (s - 1) as Step) : router.back())}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "#1c1c1c" }}
          >
            <ChevronLeft className="h-5 w-5 text-[#E8E8E8]" />
          </button>
          <div>
            <h1 className="font-serif text-[20px] text-[#E8E8E8]">Soumettre un titre</h1>
            <p className="font-sans text-[12px] text-[#666666]">
              Étape {step} sur 4 — {STEP_LABELS[step - 1]}
            </p>
          </div>
        </div>

        {/* Step progress */}
        <div className="mb-8 flex gap-2">
          {([1, 2, 3, 4] as Step[]).map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-colors"
              style={{ backgroundColor: s <= step ? "#7B6FD4" : "#2a2a2a" }}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-2xl px-4 py-3 font-sans text-[13px] text-red-400" style={{ backgroundColor: "rgba(220,38,38,0.1)" }}>
            {error}
          </div>
        )}

        {/* ── Step 1: Audio ───────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 className="mb-4 font-serif text-[18px] text-[#E8E8E8]">Fichier audio</h2>

            {!audioFile ? (
              <button
                onClick={() => audioInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl py-12 transition-colors"
                style={{ border: "1.5px dashed rgba(123,111,212,0.5)", backgroundColor: "#1c1c1c" }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "rgba(123,111,212,0.15)" }}
                >
                  <Music className="h-7 w-7" style={{ color: "#7B6FD4" }} />
                </div>
                <div className="text-center">
                  <p className="font-sans text-[14px] font-semibold text-[#E8E8E8]">Déposer un fichier audio</p>
                  <p className="mt-1 font-sans text-[12px] text-[#666666]">MP3, M4A — max 20 Mo</p>
                </div>
              </button>
            ) : (
              <div className="rounded-2xl p-4" style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}>
                <div className="mb-3 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: "rgba(123,111,212,0.15)" }}
                  >
                    <Music className="h-6 w-6" style={{ color: "#7B6FD4" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-[13px] font-semibold text-[#E8E8E8]">{audioFile.name}</p>
                    <p className="font-sans text-[11px] text-[#666666]">
                      {(audioFile.size / 1024 / 1024).toFixed(1)} Mo
                      {audioDuration > 0 && ` · ${Math.floor(audioDuration / 60)}:${(audioDuration % 60).toString().padStart(2, "0")}`}
                    </p>
                  </div>
                  <button onClick={toggleAudioPreview} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "#7B6FD4" }}>
                    {isAudioPlaying
                      ? <Pause className="h-4 w-4 fill-white text-white" />
                      : <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
                    }
                  </button>
                </div>

                {isUploading && (
                  <div>
                    <div className="mb-1 flex justify-between">
                      <span className="font-sans text-[11px] text-[#666666]">Upload en cours…</span>
                      <span className="font-sans text-[11px] text-[#666666]">{uploadProgress}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full" style={{ backgroundColor: "#2a2a2a" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, backgroundColor: "#7B6FD4" }} />
                    </div>
                  </div>
                )}

                {!isUploading && audioUrl && (
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle className="h-4 w-4" style={{ color: "#4ade80" }} />
                    <span className="font-sans text-[12px]" style={{ color: "#4ade80" }}>Upload terminé</span>
                  </div>
                )}

                <button onClick={() => { setAudioFile(null); setAudioUrl(""); }} className="mt-3 font-sans text-[12px]" style={{ color: "#666666" }}>
                  Changer de fichier
                </button>
              </div>
            )}

            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/aac"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAudioSelect(e.target.files[0])}
            />

            <button
              disabled={!canProceedStep1}
              onClick={() => setStep(2)}
              className="mt-8 w-full rounded-2xl py-4 font-sans text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#7B6FD4" }}
            >
              Continuer
            </button>
          </div>
        )}

        {/* ── Step 2: Infos ───────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="mb-2 font-serif text-[18px] text-[#E8E8E8]">Informations</h2>

            <FormField label="Titre *" required>
              <input
                type="text"
                placeholder="Nom du titre"
                maxLength={100}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-2xl px-4 py-3 font-sans text-[14px] text-[#E8E8E8] outline-none placeholder:text-[#444]"
                style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
              />
            </FormField>

            <FormField label="Nom d'artiste *">
              <input
                type="text"
                placeholder="Votre nom d'artiste"
                maxLength={80}
                value={form.artist_name}
                onChange={(e) => setForm((f) => ({ ...f, artist_name: e.target.value }))}
                className="w-full rounded-2xl px-4 py-3 font-sans text-[14px] text-[#E8E8E8] outline-none placeholder:text-[#444]"
                style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
              />
            </FormField>

            <FormField label="Album (optionnel)">
              <input
                type="text"
                placeholder="Nom de l'album"
                maxLength={100}
                value={form.album}
                onChange={(e) => setForm((f) => ({ ...f, album: e.target.value }))}
                className="w-full rounded-2xl px-4 py-3 font-sans text-[14px] text-[#E8E8E8] outline-none placeholder:text-[#444]"
                style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
              />
            </FormField>

            <FormField label="Langue">
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="w-full rounded-2xl px-4 py-3 font-sans text-[14px] text-[#E8E8E8] outline-none"
                style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
              >
                {GOSPEL_LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Genre">
              <select
                value={form.genre}
                onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                className="w-full rounded-2xl px-4 py-3 font-sans text-[14px] text-[#E8E8E8] outline-none"
                style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
              >
                {GOSPEL_GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </FormField>

            <FormField label={`Paroles (optionnel) — ${form.lyrics.length}/3000`}>
              <textarea
                placeholder="Collez les paroles ici…"
                maxLength={3000}
                rows={6}
                value={form.lyrics}
                onChange={(e) => setForm((f) => ({ ...f, lyrics: e.target.value }))}
                className="w-full resize-none rounded-2xl px-4 py-3 font-sans text-[14px] text-[#E8E8E8] outline-none placeholder:text-[#444]"
                style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
              />
            </FormField>

            <button
              disabled={!canProceedStep2}
              onClick={() => setStep(3)}
              className="mt-4 w-full rounded-2xl py-4 font-sans text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: "#7B6FD4" }}
            >
              Continuer
            </button>
          </div>
        )}

        {/* ── Step 3: Pochette ────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 className="mb-1 font-serif text-[18px] text-[#E8E8E8]">Pochette</h2>
            <p className="mb-6 font-sans text-[13px] text-[#666666]">JPG ou PNG — max 2 Mo (optionnel)</p>

            {!coverPreview ? (
              <button
                onClick={() => coverInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl py-12"
                style={{ border: "1.5px dashed rgba(123,111,212,0.5)", backgroundColor: "#1c1c1c" }}
              >
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: "rgba(123,111,212,0.15)" }}
                >
                  <ImageIcon className="h-7 w-7" style={{ color: "#7B6FD4" }} />
                </div>
                <p className="font-sans text-[14px] font-semibold text-[#E8E8E8]">Choisir une image</p>
              </button>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <img
                  src={coverPreview}
                  alt="Pochette"
                  className="aspect-square w-64 rounded-[20px] object-cover"
                />
                <button
                  onClick={() => { setCoverFile(null); setCoverPreview(""); setCoverUrl(""); }}
                  className="font-sans text-[13px]"
                  style={{ color: "#666666" }}
                >
                  Changer l&apos;image
                </button>
              </div>
            )}

            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCoverSelect(e.target.files[0])}
            />

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setStep(4)}
                className="flex-1 rounded-2xl py-4 font-sans text-[15px] font-semibold text-[#666666]"
                style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
              >
                Passer
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!!coverFile && !coverUrl}
                className="flex-1 rounded-2xl py-4 font-sans text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: "#7B6FD4" }}
              >
                Continuer
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirmation ────────────────────────────────── */}
        {step === 4 && (
          <div>
            <h2 className="mb-6 font-serif text-[18px] text-[#E8E8E8]">Récapitulatif</h2>

            <div className="mb-6 flex gap-4 rounded-2xl p-4" style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}>
              {coverPreview ? (
                <img src={coverPreview} alt="Pochette" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: "#2a2a2a" }}>🎵</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[15px] font-semibold text-[#E8E8E8]">{form.title}</p>
                <p className="font-sans text-[13px] text-[#666666]">{form.artist_name}</p>
                {form.album && <p className="font-sans text-[12px] text-[#444]">{form.album}</p>}
                <p className="mt-1 font-sans text-[11px] text-[#666666]">{form.genre} · {form.language}</p>
              </div>
            </div>

            <div className="mb-6 space-y-3">
              <ConfirmRow label="Durée" value={audioDuration > 0 ? `${Math.floor(audioDuration / 60)}:${(audioDuration % 60).toString().padStart(2, "0")}` : "—"} />
              <ConfirmRow label="Paroles" value={form.lyrics ? `${form.lyrics.length} caractères` : "Non fournies"} />
              <ConfirmRow label="Pochette" value={coverFile ? coverFile.name : "Aucune"} />
            </div>

            <div className="mb-6 rounded-2xl px-4 py-3 font-sans text-[13px] text-[#666666]" style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}>
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4 shrink-0" style={{ color: "#7B6FD4" }} />
                <span>En attente de validation par l&apos;équipe AGAPE. Vous recevrez une notification lors de la décision.</span>
              </div>
            </div>

            <button
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="w-full rounded-2xl py-4 font-sans text-[15px] font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#7B6FD4" }}
            >
              {isSubmitting ? "Soumission en cours…" : "Soumettre pour validation"}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FormField({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  void required;
  return (
    <div>
      <label className="mb-1.5 block font-sans text-[12px] font-semibold uppercase tracking-wider text-[#666666]">
        {label}
      </label>
      {children}
    </div>
  );
}

function ConfirmRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-sans text-[13px] text-[#666666]">{label}</span>
      <span className="font-sans text-[13px] text-[#E8E8E8]">{value}</span>
    </div>
  );
}
