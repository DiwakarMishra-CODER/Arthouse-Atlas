# Arthouse Atlas: project summary

**A curated atlas of arthouse cinema, ordered by what critics have agreed on, with recommendations learned from real viewers.**

Live: [arthouse-atlas.vercel.app](https://arthouse-atlas.vercel.app) · Code: [github.com/DiwakarMishra-CODER/Arthouse-Atlas](https://github.com/DiwakarMishra-CODER/Arthouse-Atlas) · By Diwakar Mishra

## In one paragraph

A full-stack web app (React, Express, MongoDB) for discovering arthouse films:
- **The catalogue:** 1,120 films, 189 directors, 26 movements and 62 studios and labels.
- **The canon:** 1,056 of the films are ranked by a canon engine that combines 20 public sources, including the Sight and Sound polls, They Shoot Pictures Don't They?, the BBC's polls, year-end lists and festival prizes. It's built so that agreement counts and repetition doesn't.
- **For You:** recommends films with an EASE model trained on 32 million MovieLens ratings, and explains every pick with real counts.
- **The design:** every page is designed as a room of a cinema, with motion drawn from film itself.

## What I'd point to

| | |
|---|---|
| **A fair ranking from messy sources** | Citations weighted by rank, grouped into seven capped families so five similar lists can't count five times, judged only against lists a film could have been on, with a bonus for staying power across decades. The About page shows the whole count for a film, and that breakdown reproduces every stored score exactly. |
| **An honest recommender evaluation** | Committed before it was run, then run on 11,090 held-out people from their last 5 loves. For **66.7%** (2 in 3), the top 10 held a film they went on to love; for **34.8%**, it held the exact next one, out of more than 1,000: **4.7×** the old hand-tuned engine and **1.7×** showing the most popular films (random 0.9%). |
| **Fast, cinematic rendering** | A still for each of 1,118 films, packed into one sprite sheet and drawn as one pattern fill per frame. Motion only on `transform` and `opacity`, scroll-driven scenes built on framer-motion values, and frame timing measured in headless Chrome against 60 fps. |
| **Link previews and search for a single-page app** | A Vercel middleware puts each page's own title, line and picture into the HTML for WhatsApp, LinkedIn and Slack previews, plus a canonical address and schema.org `Movie` data for search engines, with a generated sitemap of 1,404 pages and its own tests. |
| **Accessibility** | Zero axe-core violations on every page at desktop and phone sizes, a skip link, visible focus everywhere, reduced-motion versions, and standard controls that stay in reach through the scroll-driven scenes. |
| **Careful data work** | Scripts that dry-run by default and back up before they write. They added frames (1,048 films now have at least four) and credits (cast for 1,114 films), and checked every trailer against YouTube, replacing dead ones; the 55 films with none online show their own frames. |

## Numbers

- **Catalogue:** 1,120 films from 75 countries, 1915 to 2025, chosen by one rule: every film our canon would rank in its top 500 is in.
- **Lists:** 4,187 list citations across the 1,056 ranked films.
- **MovieLens:** 32,000,204 ratings from 200,948 people. 1,086 of the films are matched, with 3,779,709 ratings between them.
- **Tests:** 83 backend tests and 10 frontend tests.

## Stack

React 19 · Vite 7 · Tailwind CSS 4 · framer-motion 12 · React Router 7 · d3-geo · Node.js · Express 4 · MongoDB (Mongoose 8) · JWT · bcrypt · Vercel · Render · MongoDB Atlas · sharp · TMDB API · MovieLens 32M

More: [README](README.md) · [Technical overview](TECHNICAL_OVERVIEW.md)
