# Crate

A read-only library for finding and listening to unfinished FL Studio projects.

Crate reads your `.flp` files and audio exports, then lets you browse, play, sort and decide what to finish. It never changes your files.

## Try the demo

```bash
npm --prefix app install
npm --prefix app run dev:demo
```

Open http://localhost:5173. The demo is 11 projects from my library, with short audio clips.

## Run it on your own projects

Needs Node 20.19 or newer and Python 3. Reveal in Finder needs macOS.

```bash
pip install pyflp
python3 scan.py
python3 scan_details.py
node scan_loudness.mjs
npm --prefix app install
npm --prefix app run dev
```

By default projects are read from `~/Documents/Image-Line/FL Studio/Projects` and audio exports from `~/Desktop`. To use other folders, pass them to `scan.py` (`python3 scan.py PROJECTS_DIR AUDIO_DIR`) and set `CRATE_PROJECTS_DIR` and `CRATE_AUDIO_DIR` for the other steps.

The scripts write `crate.json`, `details.json` and `loudness.json` here. They contain your project names and paths, so they are git-ignored.

## Folders

- `app/` the front end and the small local server
- `demo/` the demo library
- `docs/` the design system (`design.html` is a live style guide)
- `scan.py`, `scan_details.py`, `scan_loudness.mjs` read your projects and audio

## License

The code is MIT licensed. The audio clips in `demo/audio` are my own music and are not covered by that license.
