import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { PrayerRequest } from "@/lib/types";
import { useAuth } from "./useAuth";
import { triggerXP, useXPToast } from "@/components/providers/XPToastProvider";

export function usePrayerRequests() {
  const { user } = useAuth();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();
  const { showXPToast } = useXPToast();

  const fetchPrayers = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase
      .from("prayer_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prayers:", error);
    } else {
      setPrayers(data || []);
    }
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      fetchPrayers();
    }
  }, [user, fetchPrayers]);

  const addPrayer = async (titre: string, note?: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("prayer_requests")
      .insert({
        user_id: user.id,
        titre,
        note_initiale: note,
        exaucee: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding prayer:", error);
      throw error;
    }
    setPrayers((prev) => [data, ...prev]);
    return data;
  };

  const markAsAnswered = async (
    id: string,
    temoignage: string,
    partage: boolean
  ) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("prayer_requests")
      .update({
        exaucee: true,
        date_exaucement: new Date().toISOString(),
        temoignage: temoignage,
        partage_communaute: partage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error marking prayer as answered:", error);
      throw error;
    }

    // Update local state
    setPrayers((prev) =>
      prev.map((p) => (p.id === id ? data : p))
    );

    // If partage is true, create a community post
    if (partage) {
      await supabase.from("community_posts").insert({
        user_id: user.id,
        category: "témoignage",
        content: `🙏 TÉMOIGNAGE : ${data.titre}\n\n${temoignage}`,
      });
    }

    void triggerXP("PRAYER_ANSWERED_LOGGED", showXPToast);

    return data;
  };

  return {
    prayers,
    loading,
    addPrayer,
    markAsAnswered,
    refresh: fetchPrayers,
  };
}
