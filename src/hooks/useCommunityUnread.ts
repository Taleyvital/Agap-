"use client";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

let _cachedCount: number | null = null;

export function markCommunityAsSeen() {
  localStorage.setItem("community_last_seen", new Date().toISOString());
  _cachedCount = 0;
}

export function useCommunityUnread() {
  const [count, setCount] = useState(_cachedCount ?? 0);

  useEffect(() => {
    if (_cachedCount !== null) {
      setCount(_cachedCount);
      return;
    }

    const lastSeen =
      localStorage.getItem("community_last_seen") ??
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const sb = createSupabaseBrowserClient();
    void sb
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .gt("created_at", lastSeen)
      .eq("hidden", false)
      .then(({ count: c }) => {
        _cachedCount = c ?? 0;
        setCount(_cachedCount);
      });
  }, []);

  return count;
}
