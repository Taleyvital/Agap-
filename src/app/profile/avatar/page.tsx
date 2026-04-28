"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, Lock, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import AvatarBuilder, { type AvatarConfig } from "@/components/AvatarBuilder";
import { invalidateAvatarCache } from "@/components/UserAvatar";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "skin" | "eyes" | "hair" | "mouth" | "beard" | "accessory" | "background";

interface Option {
  id: string;
  label: string;
  premium?: boolean;
  owned?: boolean;
  color?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "skin",       label: "Peau"        },
  { id: "eyes",       label: "Yeux"        },
  { id: "hair",       label: "Cheveux"     },
  { id: "mouth",      label: "Bouche"      },
  { id: "beard",      label: "Barbe"       },
  { id: "accessory",  label: "Accessoires" },
  { id: "background", label: "Fond"        },
];

const SKIN_OPTIONS: Option[] = [
  { id: "tone1", label: "Clair",       color: "#FDDBB4" },
  { id: "tone2", label: "Medium clair",color: "#E8B98A" },
  { id: "tone3", label: "Medium",      color: "#C68642" },
  { id: "tone4", label: "Foncé",       color: "#8D5524" },
  { id: "tone5", label: "Très foncé",  color: "#5C3317" },
  { id: "tone6", label: "Profond",     color: "#3B1F0F" },
];

const EYE_SHAPE_OPTIONS: Option[] = [
  { id: "almond", label: "Amande" },
  { id: "round",  label: "Rond"   },
  { id: "asian",  label: "Bridé"  },
  { id: "wide",   label: "Large"  },
];

const EYE_COLOR_OPTIONS: Option[] = [
  { id: "brown",  label: "Marron",   color: "#7B3A28" },
  { id: "black",  label: "Noir",     color: "#222222" },
  { id: "hazel",  label: "Noisette", color: "#7A5C14" },
  { id: "honey",  label: "Miel",     color: "#B87A14" },
];

const EYEBROW_OPTIONS: Option[] = [
  { id: "natural",  label: "Naturel" },
  { id: "arched",   label: "Arqué"   },
  { id: "straight", label: "Droit"   },
  { id: "thick",    label: "Épais"   },
];

const NOSE_OPTIONS: Option[] = [
  { id: "rounded", label: "Arrondi" },
  { id: "fine",    label: "Fin"     },
  { id: "wide",    label: "Large"   },
  { id: "button",  label: "Bouton"  },
];

const MOUTH_OPTIONS: Option[] = [
  { id: "smile",     label: "Sourire"      },
  { id: "neutral",   label: "Neutre"       },
  { id: "big_smile", label: "Grand sourire"},
];

const FREE_HAIR_STYLES: Option[] = [
  { id: "short",        label: "Court"          },
  { id: "afro",         label: "Afro"           },
  { id: "shaved",       label: "Rasé"           },
  { id: "short_braids", label: "Nattes courtes" },
];

const PREMIUM_HAIR_STYLES: Option[] = [
  { id: "locks",      label: "Dreadlocks",     premium: true },
  { id: "braids_long",label: "Nattes longues", premium: true },
  { id: "cornrows",   label: "Cornrows",       premium: true },
  { id: "fade",       label: "Dégradé",        premium: true },
  { id: "curly_long", label: "Boucles longues",premium: true },
  { id: "hijab",      label: "Hijab",          premium: true },
  { id: "twists",     label: "Twists",         premium: true },
];

const HAIR_COLOR_OPTIONS: Option[] = [
  { id: "black",    label: "Noir",    color: "#1A1A1A" },
  { id: "brown",    label: "Brun",    color: "#4A2800" },
  { id: "chestnut", label: "Châtain", color: "#954A1A" },
];

const BEARD_OPTIONS: Option[] = [
  { id: "none",        label: "Aucune"         },
  { id: "beard_full",  label: "Barbe complète", premium: true },
  { id: "beard_short", label: "Barbe courte",   premium: true },
  { id: "goatee",      label: "Bouc",           premium: true },
  { id: "mustache",    label: "Moustache",      premium: true },
];

const ACCESSORY_OPTIONS: Option[] = [
  { id: "none",           label: "Aucun"                  },
  { id: "glasses_round",  label: "Lunettes rondes",  premium: true },
  { id: "glasses_rect",   label: "Lunettes rect.",   premium: true },
  { id: "crown",          label: "Couronne",         premium: true },
  { id: "halo",           label: "Auréole",          premium: true },
  { id: "headphones",     label: "Écouteurs",        premium: true },
  { id: "cross_necklace", label: "Collier croix",    premium: true },
  { id: "flower",         label: "Fleur",            premium: true },
];

const BACKGROUND_OPTIONS: Option[] = [
  { id: "#1a1830", label: "Nuit",          color: "#1a1830" },
  { id: "#141414", label: "Sombre",        color: "#141414" },
  { id: "bg_violet",label: "Violet",       color: "#2a2040", premium: true },
  { id: "bg_blue",  label: "Bleu nuit",    color: "#1a3040", premium: true },
  { id: "bg_red",   label: "Rouge",        color: "#2a1a1a", premium: true },
  { id: "bg_green", label: "Vert forêt",   color: "#1a2a1a", premium: true },
  { id: "bg_golden",label: "Doré",         color: "#2a2010", premium: true },
];

const DEFAULT_CONFIG: Required<AvatarConfig> = {
  skin_tone: "tone3", eye_shape: "almond", eye_color: "brown",
  eyebrow_style: "natural", nose_shape: "rounded", mouth_style: "smile",
  hair_style: "short", hair_color: "black", beard_style: "none",
  accessory: "none", background_color: "#1a1830",
};

// ── Component ────────────────────────────────────────────────────────────────

export default function AvatarEditorPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [config, setConfig] = useState<Required<AvatarConfig>>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<Tab>("skin");
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [coinBalance, setCoinBalance] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [avatarRes, purchasedRes, coinsRes] = await Promise.all([
        sb.from("avatar_customization").select("*").eq("user_id", user.id).maybeSingle(),
        sb.from("user_purchased_items").select("item_id").eq("user_id", user.id),
        sb.from("user_coins").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);

      if (avatarRes.data) setConfig({ ...DEFAULT_CONFIG, ...avatarRes.data } as Required<AvatarConfig>);
      if (purchasedRes.data) setPurchasedIds(new Set(purchasedRes.data.map((r) => r.item_id as string)));
      if (coinsRes.data) setCoinBalance(coinsRes.data.balance ?? 0);
    })();
  }, []);

  const set = useCallback(<K extends keyof AvatarConfig>(key: K, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const sb = createSupabaseBrowserClient();
    await sb.from("avatar_customization").upsert({ ...config, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    invalidateAvatarCache(qc, userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  function renderOptions(options: Option[], configKey: keyof AvatarConfig) {
    const current = config[configKey] as string;
    return (
      <div className="grid grid-cols-4 gap-3 py-1">
        {options.map((opt) => {
          const selected = current === opt.id;
          const owned = !opt.premium || purchasedIds.has(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => owned && set(configKey, opt.id)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className="relative flex h-16 w-16 items-center justify-center rounded-2xl transition-all"
                style={{
                  background: opt.color ? opt.color : "#222",
                  border: selected ? "2.5px solid #7B6FD4" : "1.5px solid rgba(255,255,255,0.08)",
                  boxShadow: selected ? "0 0 0 3px rgba(123,111,212,0.25)" : undefined,
                  opacity: !owned ? 0.6 : 1,
                }}
              >
                {!opt.color && (
                  <span className="font-sans text-[10px] font-medium text-white/80 text-center leading-tight px-1">
                    {opt.label}
                  </span>
                )}
                {opt.premium && !owned && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/50">
                    <Lock className="h-4 w-4 text-[#E8C84A]" />
                  </div>
                )}
                {selected && owned && (
                  <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#7B6FD4]">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
              <span className="font-sans text-[9px] text-center text-text-secondary leading-tight line-clamp-1 w-16">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  function renderTabContent() {
    switch (activeTab) {
      case "skin": return (
        <div className="space-y-4">
          <p className="font-sans text-xs text-text-secondary">Teinte de peau</p>
          {renderOptions(SKIN_OPTIONS, "skin_tone")}
        </div>
      );
      case "eyes": return (
        <div className="space-y-5">
          <div>
            <p className="font-sans text-xs text-text-secondary mb-3">Forme des yeux</p>
            {renderOptions(EYE_SHAPE_OPTIONS, "eye_shape")}
          </div>
          <div>
            <p className="font-sans text-xs text-text-secondary mb-3">Couleur des yeux</p>
            {renderOptions(EYE_COLOR_OPTIONS, "eye_color")}
          </div>
          <div>
            <p className="font-sans text-xs text-text-secondary mb-3">Sourcils</p>
            {renderOptions(EYEBROW_OPTIONS, "eyebrow_style")}
          </div>
          <div>
            <p className="font-sans text-xs text-text-secondary mb-3">Nez</p>
            {renderOptions(NOSE_OPTIONS, "nose_shape")}
          </div>
        </div>
      );
      case "hair": return (
        <div className="space-y-5">
          <div>
            <p className="font-sans text-xs text-text-secondary mb-3">Style gratuit</p>
            {renderOptions(FREE_HAIR_STYLES, "hair_style")}
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-sans text-xs text-text-secondary">Style premium</p>
              <Link href="/avatar/shop" className="flex items-center gap-1 font-sans text-[10px] text-[#7B6FD4]">
                <ShoppingBag className="h-3 w-3" /> Boutique
              </Link>
            </div>
            {renderOptions(PREMIUM_HAIR_STYLES, "hair_style")}
          </div>
          <div>
            <p className="font-sans text-xs text-text-secondary mb-3">Couleur des cheveux</p>
            {renderOptions(HAIR_COLOR_OPTIONS, "hair_color")}
          </div>
        </div>
      );
      case "mouth": return renderOptions(MOUTH_OPTIONS, "mouth_style");
      case "beard": return (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-sans text-xs text-text-secondary">Barbe / Moustache</p>
            <Link href="/avatar/shop" className="flex items-center gap-1 font-sans text-[10px] text-[#7B6FD4]">
              <ShoppingBag className="h-3 w-3" /> Boutique
            </Link>
          </div>
          {renderOptions(BEARD_OPTIONS, "beard_style")}
        </div>
      );
      case "accessory": return (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-sans text-xs text-text-secondary">Accessoires</p>
            <Link href="/avatar/shop" className="flex items-center gap-1 font-sans text-[10px] text-[#7B6FD4]">
              <ShoppingBag className="h-3 w-3" /> Boutique
            </Link>
          </div>
          {renderOptions(ACCESSORY_OPTIONS, "accessory")}
        </div>
      );
      case "background": return (
        <div>
          <p className="font-sans text-xs text-text-secondary mb-3">Couleur de fond</p>
          {renderOptions(BACKGROUND_OPTIONS, "background_color")}
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#141414] text-[#E8E8E8]">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-safe-top pt-4 pb-4 sticky top-0 z-20 bg-[#141414] border-b border-[#2a2a2a]">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#2a2a2a]"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <h1 className="font-serif text-xl italic text-[#E8E8E8]">Crée ton avatar</h1>
          <p className="font-sans text-[10px] text-[#666666]">Ton visage dans AGAPE</p>
        </div>
        {/* Coin balance */}
        <div
          className="flex items-center gap-1 rounded-full px-3 py-1.5"
          style={{ background: "#1c1c1c", border: "1px solid #E8C84A" }}
        >
          <span className="text-sm">🪙</span>
          <span className="font-sans text-xs font-semibold text-[#E8C84A]">{coinBalance}</span>
        </div>
      </header>

      <div className="px-5 pb-36">
        {/* Preview */}
        <motion.div
          className="flex justify-center py-6"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <div
            className="rounded-full overflow-hidden shadow-2xl"
            style={{
              width: 160, height: 160,
              boxShadow: "0 0 0 3px rgba(123,111,212,0.4), 0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            <AvatarBuilder config={config} size={160} />
          </div>
        </motion.div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-5 px-5">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="shrink-0 rounded-full px-4 py-1.5 font-sans text-xs font-medium transition-all"
              style={{
                background: activeTab === tab.id ? "#7B6FD4" : "#1c1c1c",
                color: activeTab === tab.id ? "white" : "#666666",
                border: activeTab === tab.id ? "none" : "1px solid #2a2a2a",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Options */}
        <div className="mt-5 rounded-2xl bg-[#1c1c1c] border border-[#2a2a2a] p-4 min-h-[200px]">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 pb-safe-bottom pb-6 pt-4 bg-[#141414] border-t border-[#2a2a2a]">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="w-full rounded-[14px] py-4 font-sans text-sm font-semibold text-white transition-all active:scale-95"
          style={{ background: saving ? "#5B549E" : "#7B6FD4" }}
        >
          {saved ? "✓ Sauvegardé !" : saving ? "Sauvegarde…" : "Sauvegarder mon avatar"}
        </button>
      </div>
    </div>
  );
}
