// Server-only — uses GROQ_API_KEY. Ne pas importer dans des composants client.
import Groq from "groq-sdk";

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

export async function generateBibleStory(
  passageRef: string,
  character: string,
  verseText: string,
  language: string = "fr",
): Promise<string> {
  const systemPrompt =
    language === "fr"
      ? `Tu es un narrateur biblique expert. Tu racontes les passages de la Bible à la première personne, de façon immersive, cinématographique et fidèle au texte biblique. Ton récit est vivant, émotionnel et spirituellement profond. Tu écris toujours en français, dans un style literary premium. Tu ne trahis jamais le sens théologique du texte. Longueur : 400 à 500 mots exactement.`
      : `You are an expert biblical narrator. You retell Bible passages in first person, in an immersive, cinematic style faithful to the biblical text. Your narrative is vivid, emotional and spiritually deep. You write in a premium literary style. You never betray the theological meaning. Length: exactly 400 to 500 words.`;

  const userPrompt =
    language === "fr"
      ? `Raconte ce passage biblique à la première personne du personnage principal "${character}" : ${passageRef} — "${verseText}".

Structure narrative :
- Commence par une phrase d'accroche sensorielle (ce que le personnage voit, entend, ressent physiquement)
- Développe les émotions intérieures et les doutes du personnage
- Intègre naturellement des éléments du texte biblique original
- Termine par une révélation spirituelle ou un tournant de foi
- Ton : sobre, profond, jamais kitsch`
      : `Retell this biblical passage in first person as the main character "${character}": ${passageRef} — "${verseText}".

Narrative structure:
- Start with a sensory hook (what the character sees, hears, physically feels)
- Develop the character's inner emotions and doubts
- Naturally weave in elements from the original biblical text
- End with a spiritual revelation or turning point of faith
- Tone: sober, deep, never kitsch`;

  const response = await getGroq().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    max_tokens: 1000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Réponse vide du modèle Groq");
  return content.trim();
}

export async function generateStoryQuote(narrativeText: string): Promise<string> {
  try {
    const response = await getGroq().chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.4,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content:
            "Extrait la phrase la plus puissante et mémorable de ce texte narratif. Retourne uniquement la citation, sans guillemets ni explication. Maximum 20 mots.",
        },
        { role: "user", content: narrativeText.slice(0, 1500) },
      ],
    });
    return response.choices[0]?.message?.content?.trim() ?? extractFirstSentence(narrativeText);
  } catch {
    return extractFirstSentence(narrativeText);
  }
}

function extractFirstSentence(text: string): string {
  const match = text.match(/^[^.!?]+[.!?]/);
  return match ? match[0].trim() : text.slice(0, 100).trim();
}
