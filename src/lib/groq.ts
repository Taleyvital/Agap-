import Groq from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";
import type { UserProfile } from "@/lib/types";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export const chatWithAgape = async (
  user: UserProfile,
  history: ChatHistoryMessage[],
  message: string,
): Promise<string> => {
  const systemPrompt = `Tu es AGAPE, un compagnon spirituel chrétien chaleureux et humble.
Prénom : ${user.first_name}
Tradition : ${user.denomination}
Niveau : ${user.spiritual_level}
Défi : ${user.current_challenge}

Règles :
- Valider l'émotion avant de répondre
- Citer 1 verset avec référence exacte
- Terminer par 1 question de réflexion
- Max 150 mots
- Répondre en français

Format verset :
[VERSET]texte[/VERSET][REF]Livre ch:v[/REF]`;

  const historyMessages: ChatCompletionMessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: message },
    ],
    temperature: 0.7,
    max_tokens: 400,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Réponse vide du modèle");
  }
  return content;
};

export const moderateCommunityPost = async (text: string): Promise<{
  allowed: boolean;
  reason?: string;
}> => {
  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `Tu es un modérateur pour une app chrétienne. Réponds uniquement JSON : {"allowed":true|false,"reason":"court motif si refus"}.
Refuse : haine, harcèlement, contenu sexuel explicite, spam, propos anti-religieux offensants.`,
      },
      { role: "user", content: text },
    ],
    temperature: 0.2,
    max_tokens: 120,
  });
  const raw = response.choices[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw) as { allowed: boolean; reason?: string };
    return { allowed: Boolean(parsed.allowed), reason: parsed.reason };
  } catch {
    return { allowed: true };
  }
};
