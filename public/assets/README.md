# Assets go here

Copy your existing `assets` folder into this directory, keeping the same structure:

```
public/assets/
├── cars/            <team>.png  (mercedes, redbull, ferrari, mclaren, astonmartin, audi)
├── flags/           italy.png, england.png, monaco.png
├── socialmedia/     youtube.png, instagram.png, tiktok.png, whatsapp.png, twitter.png
├── team logos/      mercedes_logo.png, red_bull_logo.png, ferrari_logo.png,
│                    mclaren_logo.png, Aston_Martin_logo.png, audi_logo.png
├── tracks/          monza-cover.png, monza-game.png, Monza.png
│                    silverstone-cover.png, silverstone-game.png, Silverstone.png
│                    monaco-cover.png, monaco-game.png, Monaco.png
├── cover-main.png
├── cover-signin-up.png
├── f1_v10.mp3
├── flag.jpg
├── flag2.jpg
└── main_logo.png
```

## Two things that will bite you on a real server

**1. Capital letters matter.** Windows treats `Monza.png` and `monza.png` as the same file.
Linux servers, which is what you will be deploying to, do not. Every filename must match
what the HTML and JavaScript ask for, letter for letter, or the image will 404 in
production even though it worked perfectly on your laptop.

**2. The space in `team logos`.** It works, but a folder name with a space in it has to be
URL-encoded in every link. Renaming it to `team-logos` and updating the six `<img>` tags in
`index.html` and `game.html` will save you a confusing bug later.
