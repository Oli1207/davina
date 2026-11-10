# Davina

PWA pour avancer chaque jour dans **tous les domaines de la vie** (esprit, corps, cœur, relations, savoir,
travail, argent, mission, expression, joie), seule ou avec un binôme. Pensée pour ne pas être pénible à
remplir : 3 actions par jour au maximum, une version « 2 minutes » pour chaque action, une capture en un tap.

- `docs/CONCEPT.md` : le produit et ses choix.
- `docs/SUPABASE.md` : mise en ligne gratuite pas à pas (Supabase + Netlify).
- `supabase/migrations/` : schéma (avec binôme) et planification du rappel.
- `supabase/functions/rappels/` : un rappel push par jour (Edge Function).
- `frontend/` : React 19 + Vite + Tailwind 4 + vite-plugin-pwa + react-query + zustand.

```bash
cd frontend
npm install
npm run demo   # données factices, sans backend
npm run dev    # avec Supabase (remplir .env d'abord)
```
