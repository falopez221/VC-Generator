import femaleEntryVoicePath from "../../assets/audio/embrace-the-future.wav?url";
import maleEntryVoicePath from "../../assets/audio/embrace-the-future-male.wav?url";

export type EntryVoiceChoice = "female" | "male";

const ENTRY_VOICE_STORAGE_KEY = "venture-governance-entry-voice";
const entryVoicePaths: Record<EntryVoiceChoice, string> = {
  female: femaleEntryVoicePath,
  male: maleEntryVoicePath,
};
const entryVoices: Partial<Record<EntryVoiceChoice, HTMLAudioElement>> = {};

function getEntryVoice(choice: EntryVoiceChoice) {
  if (typeof window === "undefined") return null;
  if (!entryVoices[choice]) {
    const voice = new Audio(entryVoicePaths[choice]);
    voice.preload = "auto";
    entryVoices[choice] = voice;
  }
  return entryVoices[choice] ?? null;
}

export function primeEntryVoice() {
  getEntryVoice("female")?.load();
  getEntryVoice("male")?.load();
}

export function readEntryVoiceChoice(): EntryVoiceChoice {
  if (typeof window === "undefined") return "female";
  return window.localStorage.getItem(ENTRY_VOICE_STORAGE_KEY) === "male" ? "male" : "female";
}

export function storeEntryVoiceChoice(choice: EntryVoiceChoice) {
  if (typeof window !== "undefined") window.localStorage.setItem(ENTRY_VOICE_STORAGE_KEY, choice);
}

/** Plays the bundled welcome voice only after the visitor activates the entry button. */
export function speakEntryGreeting(volume: number, choice: EntryVoiceChoice) {
  const voice = getEntryVoice(choice);
  if (!voice) return Promise.resolve(false);

  voice.pause();
  voice.currentTime = 0;
  voice.volume = Math.min(1, Math.max(0, volume / 100));

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (played: boolean) => {
      if (settled) return;
      settled = true;
      voice.onended = null;
      voice.onerror = null;
      resolve(played);
    };

    voice.onended = () => finish(true);
    voice.onerror = () => finish(false);
    void voice.play().catch(() => finish(false));
  });
}
