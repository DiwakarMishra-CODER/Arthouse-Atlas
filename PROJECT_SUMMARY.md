# Arthouse Atlas: project summary

**A curated atlas of arthouse cinema, ordered by what critics have agreed on, with recommendations learned from real viewers.**

Live: [arthouse-atlas.vercel.app](https://arthouse-atlas.vercel.app) · Code: [github.com/DiwakarMishra-CODER/Arthouse-Atlas](https://github.com/DiwakarMishra-CODER/Arthouse-Atlas) · By Diwakar Mishra

## In one paragraph

A full-stack web app (React, Express, MongoDB) for discovering arthouse films:
- **The catalogue:** 855 films, 189 directors, 26 movements and 62 studios and labels.
- **The canon:** 791 of the films are ranked by a canon engine that combines 20 public sources, including the Sight and Sound polls, They Shoot Pictures Don't They?, the BBC's polls, year-end lists and festival prizes. It's built so that agreement counts and repetition doesn't.
- **For You:** recommends films with an EASE model trained on 32 million MovieLens ratings, and explains every pick with real counts.
- **The design:** every page is designed as a room of a cinema, with motion drawn from film itself.

## What I'd point to

| | |
|---|---|
| **A fair ranking from messy sources** | Citations weighted by rank, grouped into seven capped families so five similar lists can't count five times, judged only against lists a film could have been on, with a bonus for staying power across decades. The About page shows the whole count for a film, and that breakdown reproduces every stored score exactly. |
| **An honest recommender evaluation** | Committed before it was run, then run on 7,110 held-out people from their last 5 loves. For **72.2%**, the top 10 held a film they went on to love; for **42.1%**, it held the exact next one, out of more than 800 (random 1.2%, most popular 27.6%, old engine 12.1%). |
| **Fast, cinematic rendering** | All 855 stills packed into one sprite sheet and drawn as one pattern fill per frame. Motion only on `transform` and `opacity`, scroll-driven scenes built on framer-motion values, and frame timing measured in headless Chrome against 60 fps. |
| **Link previews for a single-page app** | A Vercel middleware puts each film's own title, line and picture into the HTML for WhatsApp, LinkedIn and Slack previews, with its own tests. |
| **Accessibility** | Zero axe-core violations on every page at desktop and phone sizes, a skip link, visible focus everywhere, reduced-motion versions, and standard controls that stay in reach through the scroll-driven scenes. |
| **Careful data work** | Scripts that dry-run by default and back up before they write. They added frames (799 films now have at least four) and credits (cast for 853 films), and checked every trailer: 41 films gained one that plays, and the 44 with none online show their own frames. |

## Numbers

- **Catalogue:** 855 films from 73 countries, 1920 to 2025.
- **Lists:** 3,245 list citations across the 791 ranked films.
- **MovieLens:** 32,000,204 ratings from 200,948 people. 826 of the films are matched, with 2,033,903 ratings between them.
- **Tests:** 83 backend tests and 6 frontend tests.

## Stack

React 19 · Vite 7 · Tailwind CSS 4 · framer-motion 12 · React Router 7 · d3-geo · Node.js · Express 4 · MongoDB (Mongoose 8) · JWT · bcrypt · Vercel · Render · MongoDB Atlas · sharp · TMDB API · MovieLens 32M

More: [README](README.md) · [Technical overview](TECHNICAL_OVERVIEW.md)
