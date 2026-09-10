# Raid Comp Optimizer

A small React app that splits a pool of available players across up to 3
raid groups to maximize DPS, based on TBC Anniversary sim data.

## Features

- **Optimize from pool** - enter what you have available, get the best split
- **Build & compare manually** - freely assign specs to slots and compare
- **Profiles & settings** - upload custom gear/talents per spec and resim
  live in your browser (real TBC sim engine compiled to WASM), or customize
  the shared encounter/debuff settings everyone is simmed against

Custom resimming runs the actual sim engine client-side - no server needed,
but it does real computation in your browser and can take anywhere from
~30 seconds (Very low precision, one profile) to several minutes (Medium
precision, resimming everything after an encounter/debuff change). Progress
is shown live.

## Run locally

```
npm install
npm run dev
```

## Deploy to GitHub Pages (automatic)

1. Create a new repo on GitHub and push this folder to it:

   ```
   git init
   git add .
   git commit -m "raid comp optimizer"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

2. On GitHub, go to **Settings -> Pages** for the repo, and under
   "Build and deployment" set **Source** to **GitHub Actions**.

3. That's it. The included workflow (`.github/workflows/deploy.yml`) builds
   and deploys automatically on every push to `main`. After the first push
   finishes (check the **Actions** tab for progress), your app will be live
   at:

   ```
   https://<your-username>.github.io/<your-repo>/
   ```

Every future push to `main` redeploys automatically - no manual build step
needed.
