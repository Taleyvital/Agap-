"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import AvatarBuilder, { type AvatarConfig } from "@/components/AvatarBuilder";

type ShopCategory = "hair" | "beard" | "accessory" | "background";
type ShopTab = { id: ShopCategory; label: string };

const TABS: ShopTab[] = [
  { id: "hair",       label: "Coiffures"   },
  { id: "beard",      label: "Barbes"      },
  { id: "accessory",  label: "Accessoires" },
  { id: "background", label: "Fonds"       },
];

interface ShopItem {
  item_id: string;
  name: string;
  category: string;
  price_coins: number;
  is_premium: boolean;
}

const HOW_TO_EARN = [
  { action: "Lecture du jour",       coins: 10 },
  { action: "Timer de prière",        coins: 5  },
  { action: "Annoter un verset",      coins: 3  },
  { action: "Publier dans la communauté", coins: 5 },
  { action: "Série 7 jours",          coins: 50 },
  { action: "Série 30 jours",         coins: 200},
  { action: "Onboarding complété",    coins: 100},
  { action: "Écouter une histoire",   coins: 15 },
  { action: "Explorer Strong",        coins: 3  },
];

export default function AvatarShopPage() {
  const router = useRouter();
  const [tab, setTab] = useState<ShopCategory>("hair");
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [coinBalance, setCoinBalance] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [userConfig, setUserConfig] = useState<AvatarConfig>({});

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [itemsRes, purchasedRes, coinsRes, avatarRes] = await Promise.all([
        sb.from("avatar_shop_items").select("item_id, name, category, price_coins, is_premium").eq("is_premium", true),
        sb.from("user_purchased_items").select("item_id").eq("user_id", user.id),
        sb.from("user_coins").select("balance").eq("user_id", user.id).maybeSingle(),
        sb.from("avatar_customization").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

      if (itemsRes.data) setItems(itemsRes.data as ShopItem[]);
      if (purchasedRes.data) setPurchasedIds(new Set(purchasedRes.data.map((r) => r.item_id as string)));
      if (coinsRes.data) setCoinBalance(coinsRes.data.balance ?? 0);
      if (avatarRes.data) setUserConfig(avatarRes.data as AvatarConfig);
    })();
  }, []);

  const tabItems = items.filter((i) => i.category === tab);

  const purchase = async (item: ShopItem) => {
    if (!userId || buying) return;
    setBuying(item.item_id);
    setBuyError(null);
    try {
      const res = await fetch("/api/avatar/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.item_id }),
      });
      const json = await res.json() as { success?: boolean; new_balance?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Erreur");
      setCoinBalance(json.new_balance ?? coinBalance - item.price_coins);
      setPurchasedIds((prev) => new Set(Array.from(prev).concat(item.item_id)));
    } catch (err) {
      setBuyError(err instanceof Error ? err.message : "Erreur");
      setTimeout(() => setBuyError(null), 3000);
    } finally {
      setBuying(null);
    }
  };

  function previewConfig(item: ShopItem): AvatarConfig {
    const base = { ...userConfig };
    if (item.category === "hair")       base.hair_style       = item.item_id;
    if (item.category === "beard")      base.beard_style      = item.item_id;
    if (item.category === "accessory")  base.accessory        = item.item_id;
    if (item.category === "background") base.background_color = item.item_id;
    return base;
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
        <h1 className="font-serif text-xl italic text-[#E8E8E8]">Boutique</h1>
        <div
          className="flex items-center gap-1 rounded-full px-3 py-1.5"
          style={{ background: "#1c1c1c", border: "1px solid #E8C84A" }}
        >
          <span className="text-sm">🪙</span>
          <span className="font-sans text-xs font-semibold text-[#E8C84A]">{coinBalance}</span>
        </div>
      </header>

      <div className="px-5 pb-16">
        {/* Error toast */}
        <AnimatePresence>
          {buyError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 rounded-xl bg-red-900/30 border border-red-800 px-4 py-3 font-sans text-sm text-red-300"
            >
              {buyError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-none -mx-5 px-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="shrink-0 rounded-full px-4 py-1.5 font-sans text-xs font-medium transition-all"
              style={{
                background: tab === t.id ? "#7B6FD4" : "#1c1c1c",
                color: tab === t.id ? "white" : "#666666",
                border: tab === t.id ? "none" : "1px solid #2a2a2a",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 gap-3">
          {tabItems.map((item) => {
            const owned = purchasedIds.has(item.item_id);
            const isBuying = buying === item.item_id;
            return (
              <motion.div
                key={item.item_id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden"
                style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
              >
                {/* Avatar preview */}
                <div className="flex justify-center py-4 bg-[#181818]">
                  <div className="rounded-full overflow-hidden" style={{ width: 96, height: 96 }}>
                    <AvatarBuilder config={previewConfig(item)} size={96} />
                  </div>
                </div>
                <div className="px-3 pb-3 pt-2">
                  <p className="font-sans text-[13px] font-medium text-[#E8E8E8] mb-1">{item.name}</p>
                  <div className="flex items-center justify-between">
                    {owned ? (
                      <span className="flex items-center gap-1 rounded-full bg-[#7B6FD4]/20 px-2 py-0.5 font-sans text-[10px] text-[#7B6FD4]">
                        <Check className="h-3 w-3" /> Possédé
                      </span>
                    ) : (
                      <span className="font-sans text-xs font-semibold text-[#E8C84A]">🪙 {item.price_coins}</span>
                    )}
                    {!owned && (
                      <button
                        type="button"
                        onClick={() => void purchase(item)}
                        disabled={isBuying || coinBalance < item.price_coins}
                        className="rounded-xl px-3 py-1.5 font-sans text-[11px] font-semibold text-white transition-all active:scale-95"
                        style={{
                          background: coinBalance < item.price_coins ? "#333" : "#7B6FD4",
                          opacity: isBuying ? 0.7 : 1,
                        }}
                      >
                        {isBuying ? "…" : "Acheter"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {tabItems.length === 0 && (
            <div className="col-span-2 py-12 text-center font-sans text-sm text-[#666666]">
              Chargement…
            </div>
          )}
        </div>

        {/* How to earn coins */}
        <div className="mt-8 rounded-2xl p-4" style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a" }}>
          <h2 className="font-serif text-lg italic text-[#E8E8E8] mb-4">Comment gagner des coins 🪙</h2>
          <div className="space-y-2.5">
            {HOW_TO_EARN.map((row) => (
              <div key={row.action} className="flex items-center justify-between">
                <span className="font-sans text-sm text-[#666666]">{row.action}</span>
                <span className="font-sans text-sm font-semibold text-[#E8C84A]">+{row.coins}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Link to editor */}
        <Link
          href="/profile/avatar"
          className="mt-6 flex w-full items-center justify-center rounded-[14px] py-4 font-sans text-sm font-semibold text-white"
          style={{ background: "#7B6FD4" }}
        >
          Personnaliser mon avatar
        </Link>
      </div>
    </div>
  );
}
