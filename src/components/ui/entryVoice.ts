export type EntryVoiceChoice = "female" | "male";

const ENTRY_VOICE_STORAGE_KEY = "venture-governance-entry-voice";
const NATURAL_VOICE_PATTERN = /natural|online|neural|enhanced|google|microsoft/i;
const FEMALE_VOICE_PATTERN = /female|woman|zira|aria|jenny|susan|hazel|samantha|victoria/i;
const MALE_VOICE_PATTERN = /male|man|david|mark|guy|george|daniel|james/i;

export function primeEntryVoice() {
  if (typeof window !== "undefined") window.speechSynthesis.getVoices();
}

export function readEntryVoiceChoice(): EntryVoiceChoice {
  if (typeof window === "undefined") return "female";
  return window.localStorage.getItem(ENTRY_VOICE_STORAGE_KEY) === "male" ? "male" : "female";
}

export function storeEntryVoiceChoice(choice: EntryVoiceChoice) {
  if (typeof window !== "undefined") window.localStorage.setItem(ENTRY_VOICE_STORAGE_KEY, choice);
}

function chooseVoice(choice: EntryVoiceChoice) {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const preferredGender = choice === "female" ? FEMALE_VOICE_PATTERN : MALE_VOICE_PATTERN;
  return voices.find((voice) => NATURAL_VOICE_PATTERN.test(voice.name) && preferredGender.test(voice.name))
    ?? voices.find((voice) => NATURAL_VOICE_PATTERN.test(voice.name))
    ?? voices.find((voice) => preferredGender.test(voice.name))
    ?? voices[0];
}

/** Speaks only after the visitor activates the entry button, using the best available system voice. */
export function speakEntryGreeting(volume: number, choice: EntryVoiceChoice) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve(false);

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance("Enter the field.");
  const voice = chooseVoice(choice);
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? "en-US";
  utterance.volume = Math.min(1, Math.max(0, volume / 100));
  utterance.rate = 0.88;
  utterance.pitch = choice === "female" ? 1.04 : 0.94;

  return new Promise<boolean>((resolve) => {
    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);
    window.speechSynthesis.speak(utterance);
  });
}
