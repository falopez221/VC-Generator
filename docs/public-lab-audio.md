# Public Lab audio

The Lab reuses the existing local interface sounds:

- `ui-hover.wav`
- `ui-toggle.wav`
- `tick.mp3`

`playSound(eventName)` maps semantic Lab events to these files and throttles playback. Audio is initialized only after a user interaction, starts at 25%, can be set to 0/25/50/75/100%, and is never the only state indicator. The Lab remains fully usable with sound off.

