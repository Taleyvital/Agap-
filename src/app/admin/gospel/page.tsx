"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Check, X, ChevronLeft, Music } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { GospelTrack } from "@/types/gospel";
import { formatDuration } from "@/types/gospel";

type TabStatus = "pending" | "approved" | "rejected";

export default function AdminGospelPage() {
  const router = useRouter();

  const [isAdmin, setIsAdmin]               = useState<boolean | null>(null);
  const [activeTab, setActiveTab]           = useState<TabStatus>("pending");
  const [tracks, setTracks]                 = useState<GospelTrack[]>([]);
  const [loading, setLoading]               = useState(true);
  const [previewId, setPreviewId]           = useState<string | null>(null);
  const [previewAudio, setPreviewAudio]     = useState<HTMLAudioElement | null>(null);
  const [rejectId, setRejectId]             = useState<string | null>(null);
  const [rejectReason, setRejectReason]     = useState("");
  const [actionLoading, setActionLoading]   = useState<string | null>(null);

  // Check admin status
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/login"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      if (!data?.is_admin) { router.replace("/home"); return; }
      setIsAdmin(true);
    });
  }, [router]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchTracks(activeTab);
  }, [isAdmin, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTracks = async (status: TabStatus) => {
    setLoading(true);
    const res  = await fetch(`/api/gospel/admin?status=${status}`);
    const data = await res.json();
    setTracks(data.tracks ?? []);
    setLoading(false);
  };

  const togglePreview = async (track: GospelTrack) => {
    // Stop current if any
    if (previewAudio) { previewAudio.pause(); previewAudio.src = ""; }
    if (previewId === track.id) { setPreviewId(null); setPreviewAudio(null); return; }

    // Fetch signed URL
    const res  = await fetch(`/api/gospel/tracks/${track.id}`);
    const data = await res.json();
    const url  = data.track?.audio_url;
    if (!url) return;

    const audio = new Audio(url);
    audio.play().catch(() => {});
    audio.onended = () => { setPreviewId(null); setPreviewAudio(null); };
    setPreviewId(track.id);
    setPreviewAudio(audio);
  };

  const handleApprove = async (track: GospelTrack) => {
    setActionLoading(track.id);
    await fetch(`/api/gospel/admin/${track.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setActionLoading(null);
    setTracks((t) => t.filter((x) => x.id !== track.id));
  };

  const handleRejectSubmit = async () => {
    if (!rejectId) return;
    setActionLoading(rejectId);
    await fetch(`/api/gospel/admin/${rejectId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejection_reason: rejectReason }),
    });
    setActionLoading(null);
    setTracks((t) => t.filter((x) => x.id !== rejectId));
    setRejectId(null);
    setRejectReason("");
  };

  if (isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7B6FD4] border-t-transparent" />
      </div>
    );
  }

  const TAB_LABELS: Record<TabStatus, string> = {
    pending:  "En attente",
    approved: "Approuvées",
    rejected: "Rejetées",
  };

  return (
    <div className="min-h-screen bg-[#141414]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="mx-auto max-w-[800px] px-5 pb-16 pt-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "#1c1c1c" }}
          >
            <ChevronLeft className="h-5 w-5 text-[#E8E8E8]" />
          </button>
          <div>
            <h1 className="font-serif text-[22px] text-[#E8E8E8]">Admin Gospel</h1>
            <p className="font-sans text-[13px] text-[#666666]">Modération des titres</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl p-1" style={{ backgroundColor: "#1c1c1c" }}>
          {(Object.keys(TAB_LABELS) as TabStatus[]).map((s) => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className="flex-1 rounded-xl py-2 font-sans text-[13px] font-semibold transition-colors"
              style={
                activeTab === s
                  ? { backgroundColor: "#7B6FD4", color: "#fff" }
                  : { color: "#666666" }
              }
            >
              {TAB_LABELS[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center pt-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7B6FD4] border-t-transparent" />
          </div>
        ) : tracks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 pt-20">
            <Music className="h-12 w-12 text-[#2a2a2a]" />
            <p className="font-sans text-[14px] text-[#666666]">Aucun titre ici</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track) => (
              <AdminTrackCard
                key={track.id}
                track={track}
                status={activeTab}
                isPreviewPlaying={previewId === track.id}
                onPreview={() => togglePreview(track)}
                onApprove={() => handleApprove(track)}
                onReject={() => { setRejectId(track.id); setRejectReason(""); }}
                actionLoading={actionLoading === track.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Reject modal */}
      {rejectId && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="w-full max-w-[430px] rounded-t-3xl px-6 pb-10 pt-6"
            style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
          >
            <div className="mb-4 flex justify-center">
              <div className="h-1 w-12 rounded-full" style={{ backgroundColor: "#2a2a2a" }} />
            </div>
            <h3 className="mb-4 font-serif text-[18px] text-[#E8E8E8]">Motif du rejet</h3>
            <textarea
              rows={4}
              placeholder="Expliquez pourquoi ce titre est rejeté…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="mb-4 w-full resize-none rounded-2xl px-4 py-3 font-sans text-[14px] text-[#E8E8E8] outline-none placeholder:text-[#444]"
              style={{ backgroundColor: "#141414", border: "0.5px solid #2a2a2a" }}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectId(null)}
                className="flex-1 rounded-2xl py-3 font-sans text-[14px] text-[#666666]"
                style={{ backgroundColor: "#141414", border: "0.5px solid #2a2a2a" }}
              >
                Annuler
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={actionLoading === rejectId}
                className="flex-1 rounded-2xl py-3 font-sans text-[14px] font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "#5a2d2d" }}
              >
                Rejeter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminTrackCard({
  track,
  status,
  isPreviewPlaying,
  onPreview,
  onApprove,
  onReject,
  actionLoading,
}: {
  track: GospelTrack;
  status: TabStatus;
  isPreviewPlaying: boolean;
  onPreview: () => void;
  onApprove: () => void;
  onReject: () => void;
  actionLoading: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
    >
      <div className="flex items-start gap-3">
        {/* Cover */}
        {track.cover_url ? (
          <img src={track.cover_url} alt={track.title} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: "#2a2a2a" }}>🎵</div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-[14px] font-semibold text-[#E8E8E8]">{track.title}</p>
          <p className="truncate font-sans text-[12px] text-[#666666]">{track.artist_name}</p>
          <p className="font-sans text-[11px] text-[#444]">
            {track.genre} · {track.language} · {formatDuration(track.duration_seconds)}
          </p>
          <p className="mt-1 font-sans text-[11px] text-[#444]">
            Soumis le {new Date(track.submitted_at).toLocaleDateString("fr-FR")}
          </p>
          {status === "rejected" && track.rejection_reason && (
            <p className="mt-1 font-sans text-[11px] text-red-400">Raison: {track.rejection_reason}</p>
          )}
        </div>

        {/* Preview button */}
        <button
          onClick={onPreview}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: "rgba(123,111,212,0.15)" }}
        >
          {isPreviewPlaying
            ? <Pause className="h-4 w-4" style={{ color: "#7B6FD4" }} />
            : <Play className="ml-0.5 h-4 w-4" style={{ color: "#7B6FD4" }} />
          }
        </button>
      </div>

      {/* Action buttons — only for pending */}
      {status === "pending" && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={onApprove}
            disabled={actionLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 font-sans text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#2d5a3d" }}
          >
            <Check className="h-4 w-4" />
            Approuver
          </button>
          <button
            onClick={onReject}
            disabled={actionLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 font-sans text-[13px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#5a2d2d" }}
          >
            <X className="h-4 w-4" />
            Rejeter
          </button>
        </div>
      )}
    </div>
  );
}
