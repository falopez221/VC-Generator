const FEMININE_VOICE_HINTS = [
  "female", "zira", "jenny", "aria", "ava", "hazel", "libby", "samantha",
  "susan", "victoria", "karen", "moira", "tessa", "allison", "serena",
];

function selectProfessionalEnglishVoice(voices: SpeechSynthesisVoice[]) {
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  return englishVoices.find((voice) => {
    const name = voice.name.toLowerCase();
    return FEMININE_VOICE_HINTS.some((hint) => name.includes(hint));
  }) ?? englishVoices[0];
}

export function primeEntryVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.getVoices();
}

/**
 * Speaks the short entry line only after a visitor has explicitly activated it.
 * The exact installed voice is supplied by the visitor's browser and operating system.
 */
export function speakEntryGreeting(volume: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve(false);

  const synthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance("Embrace the future.");
  const voice = selectProfessionalEnglishVoice(synthesis.getVoices());
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang || "en-US";
  utterance.volume = Math.min(1, Math.max(0, volume / 100));
  utterance.rate = 0.88;
  utterance.pitch = 0.96;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (spoken: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(fallback);
      resolve(spoken);
    };
    const fallback = window.setTimeout(() => finish(false), 3500);

    utterance.onend = () => finish(true);
    utterance.onerror = () => finish(false);
    synthesis.cancel();
    synthesis.resume();
    synthesis.speak(utterance);
  });
}
