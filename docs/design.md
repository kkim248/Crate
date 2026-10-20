---
version: alpha
name: Crate
description: A calm, tactile design system for a read-only library of unfinished music projects, built on the Japanese colours wisteria grey and light grey cloud, with deep indigo as the only strong colour.
colors:
  page-top: "#DDE3E1"
  page-mid: "#CBCDD9"
  page-bottom: "#A6A5C4"
  shell: "#F7F7F5"
  panel: "#E6EAEA"
  card: "#FBFBFA"
  deep: "#D4DCDA"
  ink: "#25243A"
  ink-2: "#36354F"
  on-ink: "#F3F2F7"
  text: "#25243A"
  text-muted: "#5E5D75"
  text-faint: "#8E8DA3"
  info: "#4A4985"
  stage-skeleton: "#A6A5C4"
  stage-loop: "#E3BDC4"
  stage-arranging: "#E4B978"
  stage-mixing: "#A8C3A0"
  stage-review: "#D4DCDA"
  wash-wisteria: "#D9D8E8"
  wash-blush: "#EBDADD"
  wash-sage: "#DCE6D8"
  wash-amber: "#EDE0C8"
typography:
  display:
    fontFamily: Manrope
    fontSize: 124px
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: -0.055em
  title-xl:
    fontFamily: Manrope
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: -0.04em
  title:
    fontFamily: Manrope
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.035em
  heading:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.03em
  row-title:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.015em
  body:
    fontFamily: Manrope
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.5
  control:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.3
  label:
    fontFamily: Manrope
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
  caption:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
  numeric:
    fontFamily: IBM Plex Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
rounded:
  tiny: 8px
  small: 12px
  row: 16px
  card: 20px
  panel: 28px
  shell: 36px
  full: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  3xl: 32px
  4xl: 48px
  gap: 12px
  card-pad: 16px
  panel-pad: 24px
components:
  shell:
    backgroundColor: "{colors.shell}"
    rounded: "{rounded.shell}"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-pad}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  rail-item:
    textColor: "{colors.text-muted}"
    rounded: "{rounded.card}"
    size: 52px
  rail-item-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.card}"
    size: 52px
  filter-row:
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: 14px
    height: 46px
  filter-row-selected:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: 14px
    height: 46px
  project-row:
    textColor: "{colors.text}"
    typography: "{typography.row-title}"
    rounded: "{rounded.row}"
    height: 62px
  project-row-selected:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.row-title}"
    rounded: "{rounded.row}"
    height: 62px
  stage-tag:
    textColor: "{colors.text-muted}"
    typography: "{typography.caption}"
    height: 24px
  stage-tag-outline:
    textColor: "{colors.text}"
    typography: "{typography.caption}"
    rounded: "{rounded.full}"
    height: 32px
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: 48px
  button-ghost:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    height: 46px
  search-field:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    height: 46px
  player-bar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.panel}"
    height: 76px
  now-playing:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.panel}"
  queue-row:
    textColor: "{colors.text}"
    typography: "{typography.row-title}"
    rounded: "{rounded.row}"
    height: 64px
  queue-row-current:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    typography: "{typography.row-title}"
    rounded: "{rounded.row}"
    height: 64px
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
  inspector:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.text}"
    rounded: "{rounded.shell}"
---

# Crate Design System

## Overview

Crate is a read-only library for finding and listening to unfinished FL Studio projects. One producer uses it on a desktop, in short repeated sessions. It should feel calm, tactile and personal, closer to a quiet listening room than a dashboard. The project name is the hero. The only imagery is audio itself: the tick ring that moves with the sound. Anything the data cannot supply is left out, never faked.

The look comes from the Japanese colours "greydients" reference: usuku mo nezu (light grey cloud) and fuji nezu (wisteria grey) on an off-white. It was checked against Spotify, Apple Music, Deezer, Suno, YouTube Music and Epidemic Sound on Mobbin for structure: a persistent player bar, a queue where tapping a row plays it, tabbed detail views, undo after actions, and loading skeletons.

## Colors

Cool, quiet neutrals with a lilac undertone. The page behind the window is a vertical blend from cloud (`page-top`) to wisteria (`page-bottom`). Inside the window there are three layers: `shell` (the window), `panel` (soft cloud-to-lilac gradient panels) and `card` (near-white cards on panels). Wells and tracks use `deep`.

`ink` (deep indigo) is the only strong colour. It marks every active state, the primary button, the selected rail item and the now-playing panel. The five `stage-*` colours are categorical data colours: wisteria, blush, amber, sage and cloud. They tint stage pills and pebbles and wash the detail panel and the listening glow with the colour of the current project's stage. They never colour an action. Text pairs meet WCAG AA (`text-muted` is about 5:1 on `panel`). `text-faint` is for disabled use only.

## Typography

Manrope for everything readable, with tight tracking on large sizes. IBM Plex Mono is used only for numerals, times and counts, which nods to the monospaced labels in the colour reference and keeps digits steady. Large numbers use weight 600 and the display size; project names use 700. There are no uppercase tracked eyebrows.

## Scales

Every value comes from a token, never an ad-hoc number.

- **Type:** 12 caption, 13 label, 14 control, 15 body, 18 lead, 20 heading, 24 section, 30 title, 40 hero, plus display for big numbers. Weights 400, 500, 600 and 700 only. Mono is for numbers.
- **Space:** a 4-point scale (4, 8, 12, 16, 20, 24, 32, 48, 64). Panels sit 12px apart. Panel padding is 24, card padding 16 to 20.
- **Control heights:** 24 badge, 32 chip or tag, 40 icon button or filter row, 48 button or field, 64 list row.
- **Icons:** 16, 20, 24 and 32 only, light weight, filled when active.
- **Elevation:** shadow 1 for resting cards, 2 for floating menus and toasts, 3 for the window and dialogs, plus one raised and one inset for small controls.
- **Layers:** sticky headings, tooltips, menus, drawers, dialogs and toasts each have a fixed z-index step.

## Layout

One rounded window on one background. Inside it, a 12px gap separates every panel. The library is three columns: filters (264px), the project list, and the detail panel (380px). Below 1180px the detail panel becomes a drawer opened by selecting a row. Listen is two panels (now playing and the queue). Recap is a 12-column grid of tiles. A player bar sits at the bottom on every page except Listen. Content scrolls inside panels, never the page.

## Elevation & Depth

Surfaces are tonal first (shell, panel, card). Shadows are tinted indigo-grey, never black. Neumorphic raise and inset are reserved for small controls (round play buttons, the search well). Glass is not used. Motion is short and purposeful: crossfades between views, a tick ring that follows the audio spectrum, and an equaliser mark on the playing queue row. Everything respects `prefers-reduced-motion`.

## Shapes

One radius scale: tiny 8, small 12, row 16, card 20, panel 28, window and dialog 36, and every pill or button fully round. Radius follows height: 40px rows use 12, 64px rows use 16. Nested radii step down toward the inside. Tick marks are the product's motif (the listening ring, the progress ring, the recap strip) and the brand mark is five bars.

## Components

- **Rail:** icon-only navigation with tooltips. The active item is an indigo tile.
- **Filter row:** label and count. The selected row becomes a card. Stage rows carry a glossy pebble.
- **Project row:** inline play button, name, session count and a stage pill. Selecting a row fills the detail panel. Double-click opens the full details.
- **Stage tag:** a small pebble and plain text, quiet in lists. Where it can be clicked (the detail panel) it gets a thin outline and a caret.
- **Detail panel:** stage-washed and uncluttered. One Play button (playback then lives in the player bar), four facts, a chip row for tempo, key and versions, Full details, Reveal in Finder, and Keep, Finish and Bin with an undo toast.
- **Sort menu:** a popover with an icon, a one-line explanation and a check on the current choice. It is keyboard operable.
- **Player bar:** now-playing name (opens the project in the library), play or pause, scrub, time and stop.
- **Queue row:** tap to play. Shows decided state (kept, finished, binned, skipped) and an equaliser mark while playing.
- **Volume:** mute, a volume slider and Match levels, which evens out loud and quiet tracks to a common loudness (about -14 LUFS, never boosting past a track's own peak). The correction is shown in dB while playing.
- **Stage menu:** click a project's stage to see why Crate chose it and to set it yourself. Your choice is remembered and can be undone or reset. A small guide next to the Stage filter lists the rules.
- **Inspector:** a dialog with Overview, Sound and Samples tabs. It keeps one fixed size and position so nothing moves when you switch tabs. It lists instruments and VSTs with how many projects use each, effects, and samples by source.
- **States:** loading skeleton panels, empty list message with Clear filters, a calm error screen, and "Could not play this file" when audio fails.

## Do's and Don'ts

Do
- Say it in plain words: "No audio", "audio file", "Playable".
- Show the project name at full size and omit any value that is unavailable.
- Keep indigo as the single action colour and stage colours as data tint only.
- Offer Undo after any action that hides or marks a project.
- Keep every control reachable by keyboard with a visible focus ring.
- Keep dialogs the same size and position across their tabs.
- Never leave the user on an empty list: a filter that matches nothing resets itself.

Don't
- Don't use the word "bounce" in the interface.
- Don't add generated artwork, stock imagery or fake data.
- Don't use pure black or white, glow effects or gradient text.
- Don't put text on neumorphic surfaces.
- Don't write to, move, rename or delete anything in the source folders. Bin only hides a project from the library.
