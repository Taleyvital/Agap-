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

const objects = rawData as BiblicalObject[];

/** Strips diacritics and lowercases a string for fuzzy matching */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Detects biblical objects mentioned in a verse text */
export function detectObjectsInText(
  text: string,
  language: "fr" | "en" | "pt" | "es" = "fr",
): BiblicalObject[] {
  const normalizedText = normalize(text);
  const found: BiblicalObject[] = [];
  const seen = new Set<string>();

  for (const obj of objects) {
    if (seen.has(obj.key)) continue;
    const aliases: string[] = obj.names[language] ?? obj.names.fr;
    const matched = aliases.some((alias) => {
      const norm = normalize(alias);
      // Escape special regex chars in alias, then match as whole word
      const escaped = norm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      return regex.test(normalizedText);
    });
    if (matched) {
      found.push(obj);
      seen.add(obj.key);
    }
  }

  return found;
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

/** Category icon emoji (no dependency needed) */
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
