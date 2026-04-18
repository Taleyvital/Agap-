import rawData from "@/data/biblical-objects.json";

export type ObjectCategory =
  | "weapon"
  | "tool"
  | "vessel"
  | "clothing"
  | "animal"
  | "plant"
  | "food"
  | "structure"
  | "place";

export interface BiblicalObject {
  key: string;
  names: { fr: string[]; en: string[]; pt: string[]; es: string[] };
  category: ObjectCategory;
  image_url: string;
  description: { fr: string; en: string; pt: string; es: string };
}

export interface TextSegment {
  text: string;
  object: BiblicalObject | null;
}

const objects = rawData as BiblicalObject[];

/** Unicode-aware letter test (covers Latin extended / accented chars) */
const LETTER = /[a-zA-ZÀ-ÖØ-öø-ÿ]/;

/**
 * Annotates a verse text, returning segments where each segment is either
 * plain text (object: null) or a matched biblical object word.
 */
export function annotateText(
  text: string,
  language: "fr" | "en" | "pt" | "es" = "fr",
): TextSegment[] {
  const found: Array<{ start: number; end: number; object: BiblicalObject }> = [];

  for (const obj of objects) {
    const aliases: string[] = obj.names[language] ?? obj.names.fr;
    for (const alias of aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "gi");
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        const start = m.index;
        const end = start + m[0].length;
        // Unicode-aware word boundary check
        const before = start > 0 ? text[start - 1] : "";
        const after = end < text.length ? text[end] : "";
        if (LETTER.test(before) || LETTER.test(after)) continue;
        // Skip overlapping matches
        if (found.some((f) => f.start < end && f.end > start)) continue;
        found.push({ start, end, object: obj });
      }
    }
  }

  found.sort((a, b) => a.start - b.start);

  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const f of found) {
    if (f.start > cursor) {
      segments.push({ text: text.slice(cursor, f.start), object: null });
    }
    segments.push({ text: text.slice(f.start, f.end), object: f.object });
    cursor = f.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), object: null });
  }

  return segments.length > 0 ? segments : [{ text, object: null }];
}

/** Category label for display */
export const CATEGORY_LABELS: Record<
  ObjectCategory,
  { fr: string; en: string; pt: string; es: string }
> = {
  weapon: { fr: "Arme", en: "Weapon", pt: "Arma", es: "Arma" },
  tool: { fr: "Outil", en: "Tool", pt: "Ferramenta", es: "Herramienta" },
  vessel: { fr: "Récipient", en: "Vessel", pt: "Recipiente", es: "Recipiente" },
  clothing: { fr: "Vêtement", en: "Clothing", pt: "Vestimenta", es: "Vestimenta" },
  animal: { fr: "Animal", en: "Animal", pt: "Animal", es: "Animal" },
  plant: { fr: "Plante", en: "Plante", pt: "Planta", es: "Planta" },
  food: { fr: "Aliment", en: "Food", pt: "Alimento", es: "Alimento" },
  structure: { fr: "Structure", en: "Structure", pt: "Estrutura", es: "Estructura" },
  place: { fr: "Lieu", en: "Place", pt: "Lugar", es: "Lugar" },
};

/** Category icon emoji */
export const CATEGORY_ICONS: Record<ObjectCategory, string> = {
  weapon: "⚔️",
  tool: "🔨",
  vessel: "🏺",
  clothing: "👘",
  animal: "🦁",
  plant: "🌿",
  food: "🫙",
  structure: "🏛️",
  place: "📍",
};
