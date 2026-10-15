# Motion kit

These are animated scenes in Caleb's brand for AI for Agents videos.
- Brand colors: ivory, ink and one ember accent.
- Fonts: Instrument Serif headlines, Inter labels and Jackson Display caps.
- Each scene is built in HTML and GSAP, and `render.mjs` renders it frame by frame. The renderer seeks every frame, so the output is the same on every run and never drops frames.

```
npm i                                          # once (Playwright)
node render.mjs scenes/pilot-imessage.json out/x.mp4 --look ink --stills 3,10,20 --still-dir out/stills
python3 cut_to_scenes.py scenes/pilot-imessage.json TAKE.MOV out/pilot --model small.en
```

Open `player.html?scenes=scenes/pilot-imessage.json&t=12` (served over http) to look at one moment, or add `&play` to watch it run.

| Scene | What it shows |
|---|---|
| title | Kicker, big headline with one accent word, rule, sub, pills |
| cards | 3 to 4 cards with thin icons |
| thread | Text threads that land bubble by bubble, then a who's-who tag drops on |
| prompt | A draft that types itself out, then Edit and Approve buttons |
| record | A CRM record that fills in, with a highlighter on the client's own words |
| chips | Big numbers that count up |
| chart | Bars that grow (a source line is required for any market number) |
| flow | Steps joined by lines that draw in |
| beforeafter | Without a plan versus with a plan |
| checklist | Items that check off |
| phone | A phone screen with a list and tags popping on |
| sort | Names dropping into friend, family, agent, client and vendor |
| face | Headline on the left and his video in a portrait card |
| talk | His face fills the frame with keyword pills popping in, the way Nate Herk cuts. Use with `"face": "talk"` |

Looks: `ivory` (clean, closest to Nick), `ink` (dark), `grid` (ivory with dots and Jackson Display caps).
Face modes per scene: `full`, `pip` (the 360 px corner box), `talk` (full frame, the stage turns key green and the compositor puts his face under the pills) or `none`. `face_pos.talk_zoom` zooms the full-frame face in.

Fonts are under the SIL Open Font License: Instrument Serif and Inter, plus Jackson Display (Caleb's, built on Inter).
