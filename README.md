# New York en famille

Application Vite + TypeScript pour préparer un voyage familial à New York du 4 au 12 juillet 2026.

Le site est pensé comme un compagnon de voyage lisible sur mobile : carte interactive, planning par jour, fiches destinations, itinéraires Google Maps depuis la position courante et recommandations proches adaptées à la famille.

## Fonctionnalités

- Planning jour par jour avec trajets synthétiques, durées et points de vigilance.
- Carte Leaflet avec marqueurs numérotés par jour, hôtel, aéroport, plein écran et contrôle tactile/souris.
- Calques OpenStreetMap, satellite, métro utile, bus/tram utile et archive officielle `Sing for Hope Pianos NYC 2026`.
- Fiches destinations avec Top 5, conseil famille, mission ados, curiosité secrète et liens Google Maps.
- Sections proches pour ados, Papa, Maman, concerts publics, bars et musique live.
- Images chargées dynamiquement avec fallbacks et lightbox plein écran.
- PWA installable avec manifest, icône et service worker.
- Déploiement automatique sur GitHub Pages via GitHub Actions.

## Développement

```bash
npm install
npm run dev
```

Build de production :

```bash
npm run build
```

Prévisualisation locale du build :

```bash
npm run preview
```

## Déploiement

Le workflow `.github/workflows/deploy.yml` construit l'application avec Node 22 et publie le dossier `dist` sur GitHub Pages à chaque push sur `main`.

La configuration Vite utilise `base: "./"` pour fonctionner correctement depuis GitHub Pages.

URL attendue :

```text
https://nmarchand73.github.io/newyork/
```

## Structure

- `src/app.ts` : données du voyage, rendu HTML, carte Leaflet, PWA, interactions et liens Google Maps.
- `src/styles.css` : mise en page responsive, cartes, map controls, lightbox et styles mobiles.
- `public/manifest.webmanifest` : configuration PWA.
- `public/sw.js` : service worker.
- `.github/workflows/deploy.yml` : publication GitHub Pages.
