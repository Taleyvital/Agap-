export type GospelStatus = "pending" | "approved" | "rejected";

export interface GospelTrack {
  id: string;
  artist_id: string;
  title: string;
  artist_name: string;
  album?: string;
  duration_seconds: number;
  audio_url: string;
  cover_url?: string;
  lyrics?: string;
  lyrics_offset?: number;
  genre: string;
  language: string;
  status: GospelStatus;
  rejection_reason?: string;
  play_count: number;
  submitted_at: string;
  published_at?: string;
  is_liked?: boolean;
  likes_count?: number;
}

export interface GospelPlaylist {
  id: string;
  user_id: string;
  title: string;
  track_ids: string[];
  created_at: string;
}

export const GOSPEL_GENRES = [
  "Louange",
  "Adoration",
  "Gospel Africain",
  "Gospel Contemporain",
  "Cantiques",
] as const;

export const GOSPEL_LANGUAGES = [
  "français",
  "anglais",
  "portugais",
  "espagnol",
] as const;

export type GospelGenre   = (typeof GOSPEL_GENRES)[number];
export type GospelLanguage = (typeof GOSPEL_LANGUAGES)[number];

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
