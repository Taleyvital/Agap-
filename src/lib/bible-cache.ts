import { openDB, type DBSchema } from "idb";
import type { BibleVerseRow } from "@/lib/types";

interface BibleDB extends DBSchema {
  chapters: {
    key: string;
    value: BibleVerseRow[];
  };
}

async function getDB() {
  return openDB<BibleDB>("agape-bible", 1, {
    upgrade(db) {
      db.createObjectStore("chapters");
    },
  });
}

export async function cacheBibleChapter(
  translation: string,
  bookId: number,
  chapter: number,
  verses: BibleVerseRow[]
): Promise<void> {
  try {
    const db = await getDB();
    await db.put("chapters", verses, `${translation}-${bookId}-${chapter}`);
  } catch {
    // IndexedDB may be unavailable in some contexts — fail silently
  }
}

export async function getCachedChapter(
  translation: string,
  bookId: number,
  chapter: number
): Promise<BibleVerseRow[] | undefined> {
  try {
    const db = await getDB();
    return db.get("chapters", `${translation}-${bookId}-${chapter}`);
  } catch {
    return undefined;
  }
}
