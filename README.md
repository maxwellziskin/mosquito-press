# Mosquito Press

[Open Mosquito Press](https://maxwellziskin.github.io/mosquito-press/)

A browser-only editor for bottle-neck booklets, packaging inserts, and zines. The default is a folded eight-page booklet on US Letter paper.

## Hosting

The complete website is in `docs/`. GitHub Pages publishes `main` → `/docs`. `.nojekyll` tells GitHub to serve these files directly. No application server, account system, API keys, cloud database, external font service, or paid backend is required.

All JavaScript, PDF export code, fonts, logos, and the seven supplied brand photos are bundled in this repository. File imports, photo adjustments, PDF/PNG export, and project autosave run in the browser. Imported files are not uploaded. Saved projects and brand kits belong to the browser and site address; moving to a new address requires Download project / Open project file, and Download kit / Import kit.

## Editing and publishing

Edit the source files directly in `docs/`, commit, and push to `main`. GitHub Pages redeploys automatically. There is no build step for ordinary app changes.

Preview locally from the repository root:

```sh
python3 -m http.server 4173 --directory docs
```

Open `http://localhost:4173/`. Opening `index.html` directly via `file://` is not supported because the app uses JavaScript modules.

## Optional PDF-library rebuild

The browser PDF bundle is already committed in `docs/vendor/`. Rebuild it only when updating its dependencies:

```sh
cd scripts/pdf-build
npm ci
npm run build
```

Third-party notices are in `docs/vendor/LICENSES.txt`. Mosquito Ranch branding, supplied photography, and bundled fonts retain their existing ownership and licensing; this repository grants no separate license to those assets.
