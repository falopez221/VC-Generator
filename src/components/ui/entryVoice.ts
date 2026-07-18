import entryVoicePath from "../../assets/audio/embrace-the-future.wav?url";

let entryVoice: HTMLAudioElement | null = null;

function getEntryVoice() {
  if (typeof window === "undefined") return null;
  if (!entryVoice) {
    entryVoice = new Audio(entryVoicePath);
    entryVoice.preload = "auto";
  }
  return entryVoice;
}

export function primeEntryVoice() {
  getEntryVoice()?.load();
}

/** Plays the bundled welcome voice only after the visitor activates the entry button. */
export function speakEntryGreeting(volume: number) {
  const voice = getEntryVoice();
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
