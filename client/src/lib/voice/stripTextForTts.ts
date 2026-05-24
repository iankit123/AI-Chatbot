function isEmojiCodePoint(codePoint: number): boolean {
  if (codePoint === 0xfe0f || codePoint === 0xfe0e || codePoint === 0x200d) return true;
  if (codePoint >= 0x1f000 && codePoint <= 0x1ffff) return true;
  if (codePoint >= 0x2600 && codePoint <= 0x27bf) return true;
  if (codePoint >= 0x2300 && codePoint <= 0x23ff) return true;
  if (codePoint >= 0x2b05 && codePoint <= 0x2b55) return true;
  if (codePoint === 0x24c2 || codePoint === 0x3030 || codePoint === 0x303d) return true;
  if (codePoint >= 0x3297 && codePoint <= 0x3299) return true;
  return false;
}

/** Remove emoji and pictographs so TTS does not read them aloud (e.g. "smile"). */
export function stripTextForTts(text: string): string {
  let out = "";
  for (const symbol of text) {
    const cp = symbol.codePointAt(0) ?? 0;
    if (isEmojiCodePoint(cp)) continue;
    out += symbol;
  }
  return out.replace(/\s{2,}/g, " ").trim();
}
