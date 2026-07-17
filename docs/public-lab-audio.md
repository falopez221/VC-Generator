# Public Lab audio

The continuous cinematic score is `discovery-scott-buckley.mp3`:

- “Discovery” by Scott Buckley
- Source: https://www.scottbuckley.com.au/library/discovery/
- License: Creative Commons Attribution 4.0 International
- Required attribution: `'Discovery' by Scott Buckley - released under CC-BY 4.0. www.scottbuckley.com.au`

The public site starts the score only after the visitor activates the entry gate. It begins at 75% of the site control and can then be muted or changed to 0/25/50/75/100%. The file uses metadata-only preloading so it does not block useful page content.

The Lab keeps the score continuous and changes the mix rather than restarting it: the level rises when simulation begins, falls while paused, opens slightly around generated opportunities, and settles after convergence. Semantic micro-sounds remain throttled and are never the only state indicator.

Audio playback respects browser autoplay policy, and the complete Lab remains usable with sound off after entry.
