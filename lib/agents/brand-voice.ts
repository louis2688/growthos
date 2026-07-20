/**
 * Per-user brand voice: tone + banned words, saved once in Settings and injected into every
 * copy writer's prompt. Lives in auth user_metadata (like the display name) rather than a
 * table — it's a user-owned preference, so the user being able to write it freely is the
 * point, and it saves a migration + RLS policy.
 */
export type BrandVoice = { tone: string; bannedWords: string };

/** Safe extraction from auth user_metadata — absent, partial, or junk shapes yield null. */
export function brandVoiceFromMetadata(metadata: unknown): BrandVoice | null {
  const raw = (metadata as { brand_voice?: unknown } | null | undefined)?.brand_voice;
  if (!raw || typeof raw !== "object") return null;
  const { tone, banned_words } = raw as { tone?: unknown; banned_words?: unknown };
  const voice = {
    tone: typeof tone === "string" ? tone.trim() : "",
    bannedWords: typeof banned_words === "string" ? banned_words.trim() : "",
  };
  return voice.tone || voice.bannedWords ? voice : null;
}

/**
 * The prompt block the copy writers share. Returns "" when no voice is saved, and the
 * callers interpolate it between their context and Rules blocks — so for users who never
 * set a voice the prompts stay byte-identical to the pre-feature ones.
 */
export function voiceSection(voice: BrandVoice | null | undefined): string {
  if (!voice) return "";
  const lines = ["\nThe founder's saved brand voice — apply it within this channel's norms:"];
  if (voice.tone) lines.push(`- Tone: ${voice.tone}`);
  if (voice.bannedWords) lines.push(`- Never use these words or phrases: ${voice.bannedWords}`);
  return lines.join("\n") + "\n";
}
