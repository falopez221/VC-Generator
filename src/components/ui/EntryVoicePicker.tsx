"use client";

import type { EntryVoiceChoice } from "./entryVoice";

export function EntryVoicePicker({ value, onChange }: { value: EntryVoiceChoice; onChange: (choice: EntryVoiceChoice) => void }) {
  return (
    <div className="entry-voice-picker" role="group" aria-label="Welcome voice">
      <span>SELECT WELCOME VOICE</span>
      <div>
        <button className={value === "female" ? "is-selected" : undefined} type="button" aria-pressed={value === "female"} onClick={() => onChange("female")}>FEMALE VOICE</button>
        <button className={value === "male" ? "is-selected" : undefined} type="button" aria-pressed={value === "male"} onClick={() => onChange("male")}>MALE VOICE</button>
      </div>
    </div>
  );
}
