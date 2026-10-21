# Yunisha's Magical Kingdom

A responsive Dashain fairytale for Yunisha, built in the existing Vite + vanilla JavaScript project. The kingdom scenery is generated locally with Three.js. Interactive sections include the princess portrait, a real-photo memory gallery, two local video surprises, the Dashain courtyard and digital blessings, ten gifts, an animated letter from Didi, simulations, a treasure hunt, an observatory, and a replayable finale.

## Run locally

1. Install Node.js (version 20.19+ or 22.12+).
2. In this folder, run `npm install`.
3. Run `npm run dev` and open the local URL printed by Vite.
4. Run `npm run build` for a production build in `dist/`.

WebGL is used for the procedural kingdom; if it is unavailable, the gradient backdrop and interactive sections remain usable. Google Fonts are optional; system fallbacks are included. The site contains no audio files, so it does not autoplay or request music.

## Local family photographs

The gallery uses the existing files in:

- `assets/images/princess/princess.jpeg`
- `assets/images/dashain/dashain pray.jpeg`
- `assets/images/dashain/sis dashain pic 1.jpeg`
- `assets/images/dashain/sis n me dashain 1.jpeg`
- `assets/images/dashain/sis n me dashain 2.jpeg`
- `assets/images/dashain/sis time.jpeg`
- `assets/images/memories/memory 0.jpeg` through `memory 3.jpeg`

It labels photos with their filenames or neutral descriptions; it does not invent dates or stories. Images are lazy-loaded and viewed in a full-screen-style overlay with previous/next controls. Add future photos to one of these existing folders and add their exact filename to the `galleryPhotos` list in `script.js`.

## Local videos

The video surprise plays `assets/videos/funny vdo 1.mp4` and `assets/videos/funny vdo 2.mp4` directly in the browser. Select a clip and use the play/pause, replay, full-screen, and native volume controls. Video files are not uploaded and never autoplay.

## Experience guide

- Enter through the portal or use **Skip intro**.
- Drag the kingdom scene to look around, then choose a landmark.
- Open the **Memory Gallery** for the supplied photos or **Funny Video Surprise** for the local clips.
- Use **Dashain Courtyard** for the Nepali greeting, symbolic digital tika blessing, courtyard objects, and treasure hunt.
- Open the letter book and use **Read complete letter** to skip its typewriter effect.
- Use the **Motion** control to reduce decorative movement; the browser's reduced-motion preference is respected too.

The local photographs and videos stay on the site/device. No account or backend is needed.
