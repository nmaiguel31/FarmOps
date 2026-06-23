# FarmOps Deployment Setup

FarmOps uses an Angular frontend on Vercel and a Node/Express API on Azure App Service.

## Production URLs

- Frontend: `https://farmops-blond.vercel.app/`
- Backend API root: `https://farmops-api-nmaiguel.azurewebsites.net/`
- Frontend API base URL: `https://farmops-api-nmaiguel.azurewebsites.net/api`

## Required Vercel Environment Variables

Set these variables in the Vercel project settings for Production, Preview, and Development as needed.

| Variable | Value |
| --- | --- |
| `API_BASE_URL` | `https://farmops-api-nmaiguel.azurewebsites.net/api` |
| `GOOGLE_MAPS_API_KEY` | Your restricted Google Maps browser API key |

The Angular environment file is generated at build time by:

```bash
npm run generate-env
```

The generated file is:

```text
farm-management-frontend/src/environments/environment.ts
```

That file is intentionally ignored by Git so real deployment values are not committed.

## Google Cloud API Key Restrictions

The Google Maps key is a browser key, so it will be visible in the built frontend bundle. It must be restricted in Google Cloud Console.

Recommended HTTP referrer restrictions:

```text
http://localhost:4200/*
https://farmops-blond.vercel.app/*
```

If Vercel preview deployments need Maps, also add the relevant preview domain pattern from Vercel.

Required Google APIs:

- Maps JavaScript API
- Places API

FarmOps also loads the Maps JavaScript `geometry` library for area calculations.

## Vercel Project Settings

If deploying from the repository root, the tracked `vercel.json` configures:

```json
{
  "installCommand": "cd farm-management-frontend && npm install",
  "buildCommand": "cd farm-management-frontend && npm run build",
  "outputDirectory": "farm-management-frontend/dist/farm-management-frontend/browser"
}
```

Equivalent Vercel dashboard settings:

- Root Directory: repository root, or `farm-management-frontend` if you prefer project-root deployment
- Install Command from repo root: `cd farm-management-frontend && npm install`
- Build Command from repo root: `cd farm-management-frontend && npm run build`
- Output Directory from repo root: `farm-management-frontend/dist/farm-management-frontend/browser`

If the Vercel Root Directory is set to `farm-management-frontend`, use:

- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist/farm-management-frontend/browser`

## Local Development

Create a local frontend env file:

```text
farm-management-frontend/.env.local
```

Example:

```bash
API_BASE_URL=http://localhost:5000/api
GOOGLE_MAPS_API_KEY=your-local-google-maps-browser-key
```

Then run:

```bash
cd farm-management-frontend
npm start
```

`npm start`, `npm test`, and `npm run build` automatically run the environment generator first.

If `GOOGLE_MAPS_API_KEY` is missing, the app still builds, but Google Maps will not load correctly.

## Backend Azure Configuration

The backend is deployed through GitHub Actions to:

```text
https://farmops-api-nmaiguel.azurewebsites.net/
```

Azure App Service must have these app settings configured:

```text
MONGO_URI
JWT_SECRET
PORT
```

Do not commit backend `.env` files.

## Git Safety

Do not commit:

- `capstone-backend/.env`
- `farm-management-frontend/.env`
- `farm-management-frontend/.env.local`
- `farm-management-frontend/src/environments/environment.ts`
- `farm-management-frontend/.vercel/`
- `dist/`
- `node_modules/`

Safe committed config files include:

- `farm-management-frontend/src/environments/environment.example.ts`
- `farm-management-frontend/scripts/generate-env.cjs`
- `vercel.json`
