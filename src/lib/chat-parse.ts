export function parseAgapeReply(content: string): {
  body: string;
  verseText: string | null;
  verseRef: string | null;
} {
  const verseMatch = content.match(
    /\[VERSET\]([\s\S]*?)\[\/VERSET\]\[REF\]([\s\S]*?)\[\/REF\]/,
  );
  const stripped = content
    .replace(/\[VERSET\][\s\S]*?\[\/VERSET\]\[REF\][\s\S]*?\[\/REF\]/, "")
    .trim();
  if (verseMatch) {
    return {
      body: stripped || content.replace(/\[VERSET\][\s\S]*?\[\/REF\]/, "").trim(),
      verseText: verseMatch[1]?.trim() ?? null,
      verseRef: verseMatch[2]?.trim() ?? null,
    };
  }
  return { body: content, verseText: null, verseRef: null };
}
