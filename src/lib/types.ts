export interface UserProfile {
  first_name: string;
  denomination: string;
  spiritual_level: string;
  current_challenge: string;
  anonymous_name?: string;
  avatar_url?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export type BibleVerseRow = {
  pk: number;
  verse: number;
  text: string;
  comment?: string;
};

export type BibleBook = {
  bookid: number;
  name: string;
  chronorder: number;
  chapters: number;
};
