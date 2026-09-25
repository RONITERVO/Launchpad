# App context, reviewed 25 September 2026

All 9 Pages-enabled repositories other than Launchpad were checked against their current root README. Eight contain launchable apps; one is a supporting audio host. Mini-apps stay within their parent app.

| Category | App / short label | README context and visual identity |
| --- | --- | --- |
| Play | [Ink Battle](https://github.com/RONITERVO/Ink-Battle/blob/main/README.md) | Now a physical pencil-and-watercolor battle on a 3D sketchbook, with troops, castles and cannons. Mouse, phone and Quest input; the legacy 2D version is an archive. Icon: a tiny castle battle on an open sketchbook. Canonical launch now redirects to drawbattles.com. |
| Play | [StateBeats](https://github.com/RONITERVO/StateBeats/blob/main/README.md) | Spatial rhythm engine/player with moving emitters, orbiting targets, original music, desktop and WebXR modes. Includes Event Horizon and an Ink Battle collaboration. Icon: cyan and magenta rhythm orbs orbiting an amber star. Newly discovered since the first catalog. |
| Play | [CubeHelperXR / Cube XR](https://github.com/RONITERVO/CubeHelperXR/blob/main/README.md) | A Quest mixed-reality Rubik’s cube with hand manipulation, progressively revealed hints and a phone version. Finnish README. Icon: a colorful puzzle cube above a teal spatial ring. |
| Learn | [MaestroTutor / Maestro](https://github.com/RONITERVO/MaestroTutor/blob/main/README.md) | A globe selects languages; a notebook holds bilingual conversations, spoken phrases, imagery and teaching aids. Includes live multimodal calls. Icon: globe, paper airplane and blank speech bubble. Uses chatwithmaestro.com. |
| Learn | [Spanish Quick Apps / Spanish](https://github.com/RONITERVO/Spanish-Quick-Apps/blob/main/README.md) | 25 full-screen touch experiences spanning colors, music and the cosmos. Spanish lines have synchronized narration and English/Finnish translations. Icon: color-spectrum sun and ringed planet. |
| Create | [Idea-To-SVG / Sketch AI](https://github.com/RONITERVO/Idea-To-SVG/blob/main/README.md) | Iterative generation, rendering, visual critique and refinement of SVG graphics, with a sketchpad gallery. Icon: pencil shaping a vector loop with control nodes. |
| Lab | [Automatic Chessboard / Chess](https://github.com/RONITERVO/Automatic-Chessboard/blob/main/README.md) | Arduino/CoreXY automatic chessboard hardware with a browser simulator of mechanisms, sensors, controls, firmware and replay. Icon: chess knight, checkerboard and a copper mechanism detail. |
| Lab | [Magnet Workbench / Magnets](https://github.com/RONITERVO/Magnet-simulation/blob/main/README.md) | Finite-size magnet models, measured force curves, tolerances, supplier samples and delivery inspection. Icon: paired magnets and field arcs. |
| Supporting files | [Spanish Quick Apps audio](https://github.com/RONITERVO/Spanish-Quick-Apps-audio/blob/main/README.md) | Shared English/Finnish narration assets, 6,415 MP3/transcript pairs per language. No root launch page, so it stays in catalog details instead of receiving an app tile. |

Full README snapshots were retained locally for working context. The scheduled sync now records README source URL, content SHA, checked time and a short excerpt in `site/catalog.json`. Curated identities stay in `site/profiles.js`; new apps receive a keyword-based category and an initials fallback until dedicated artwork is added.

Eight separate raster images were generated with Codex’s built-in image tool, then lossily encoded to 384-pixel WebP for quick loading. No compositional edits or crops were made. Exact prompts: [art/prompts.json](../site/art/prompts.json). The tool did not expose its selected model ID. Original 1254-pixel PNGs are retained in the delivered `launchpad-art` folder.
