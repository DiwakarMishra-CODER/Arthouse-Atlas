# Arthouse Atlas: the site

The React app for [Arthouse Atlas](https://arthouse-atlas.vercel.app). It's built with Vite, Tailwind CSS 4, framer-motion and React Router, and deployed on Vercel.

```bash
cp .env.example .env.local   # VITE_API_URL: where the API runs; VITE_GOOGLE_CLIENT_ID: for Google sign-in
npm install
npm run dev                  # http://localhost:5173
npm test                     # the link-preview middleware's tests
npm run lint
```

- `src/pages/`: one file per room of the site.
- `src/components/<room>/`: each room's parts.
- `middleware.js`: link previews (runs on Vercel before a film's, director's, movement's or studio's page is served).
- `public/`: the home page's sprite sheets, the map's shapes, and the link-preview data (`meta/`, written by `backend/scripts/exportMeta.js`).

See the main [README](../README.md) for the whole project.
