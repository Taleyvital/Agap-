"use client";

import { Crown, Star, Music, BookOpen, Sparkles } from "lucide-react";

interface PremiumPaywallProps {
  onClose?: () => void;
}

const FEATURES = [
  { icon: Music,    label: "Gospel Streaming illimité" },
  { icon: Star,     label: "Lecteur audio avancé + paroles" },
  { icon: BookOpen, label: "Parcours de lecture exclusifs" },
  { icon: Sparkles, label: "Chat IA sans limite" },
];

export function PremiumPaywall({ onClose }: PremiumPaywallProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
    >
      <div
        className="w-full max-w-[430px] rounded-t-3xl px-6 pb-10 pt-8"
        style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
      >
        {/* Handle */}
        <div className="mb-6 flex justify-center">
          <div className="h-1 w-12 rounded-full" style={{ backgroundColor: "#2a2a2a" }} />
        </div>

        {/* Crown icon */}
        <div className="mb-5 flex justify-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{ backgroundColor: "rgba(123,111,212,0.15)" }}
          >
            <Crown className="h-8 w-8" style={{ color: "#7B6FD4" }} />
          </div>
        </div>

        <h2 className="mb-2 text-center font-serif text-[22px] text-[#E8E8E8]">
          Fonctionnalité Premium
        </h2>
        <p className="mb-7 text-center font-sans text-[14px] text-[#666666]">
          Accède au Gospel Streaming et à toutes les fonctionnalités exclusives.
        </p>

        {/* Features list */}
        <div className="mb-7 space-y-3">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(123,111,212,0.12)" }}
              >
                <Icon className="h-4 w-4" style={{ color: "#7B6FD4" }} />
              </div>
              <span className="font-sans text-[14px] text-[#E8E8E8]">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="mb-3 w-full rounded-2xl py-4 font-sans text-[15px] font-semibold text-white"
          style={{ backgroundColor: "#7B6FD4" }}
          onClick={() => alert("Paiement bientôt disponible — restez connecté !")}
        >
          Passer à Premium
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full rounded-2xl py-3 font-sans text-[14px]"
            style={{ color: "#666666" }}
          >
            Plus tard
          </button>
        )}
      </div>
    </div>
  );
}
