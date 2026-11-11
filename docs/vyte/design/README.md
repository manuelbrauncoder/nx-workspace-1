# vyte design

A copy of the design canvas [vyte Design](https://claude.ai/artifact/L45ESAH65DizNnJ1cuw2Bg) (private), taken on 2026-11-10. The canvas is the place to change the design; this folder keeps a snapshot next to the code. The chosen direction and its tokens are described in the [spec](../spec.md#look).

| Folder                | Content                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [canvas/](canvas)     | The source files of the canvas: `canvas.json` (layout) and one `.dc.html` per artboard. They only render in the Design editor |
| [previews/](previews) | The same artboards as plain HTML with the default colors filled in. Open them directly in a browser                           |

## Artboards

| Preview                                  | Content                                               | Status   |
| ---------------------------------------- | ----------------------------------------------------- | -------- |
| [Ticket](previews/Ticket.html)           | Guest page, direction A                               | rejected |
| [Abendkarte](previews/Abendkarte.html)   | Guest page, direction B                               | rejected |
| [Konfetti](previews/Konfetti.html)       | Guest page, direction C: the invitation with the form | chosen   |
| [Antwort](previews/Antwort.html)         | Answer sent                                           | Konfetti |
| [Vorbei](previews/Vorbei.html)           | Event over                                            | Konfetti |
| [SaveTheDate](previews/SaveTheDate.html) | Save the date                                         | Konfetti |
| [Fotos](previews/Fotos.html)             | Photo upload through a place card                     | Konfetti |
| [Aufsteller](previews/Aufsteller.html)   | Photo upload through the photo stand                  | Konfetti |

The previews load their fonts from Google Fonts and use example content ("Annas 30. Geburtstag"). The app self-hosts the fonts and fills in real data.

## Updating the snapshot

Read the canvas files again (Artifact tool, `read` with the paths under `project/`) and copy them to `canvas/`. A preview is the artboard with every `{{prop}}` replaced by its default from `data-props`, the `<helmet>` content moved into `<head>` and the editor runtime (`support.js`, `<x-dc>`, the `text/x-dc` script) removed. Both folders are excluded from Prettier, so `canvas/` stays byte for byte what the canvas holds.
