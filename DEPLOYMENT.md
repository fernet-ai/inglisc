# Production deployment checklist

## 1. Deploy the backend

1. Create a Render Web Service from the `inglisc-be` repository.
2. Render configuration:
   - Runtime: Node
   - Node version: 22
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check: `/health`
3. Set these environment variables:

```text
ENVIRONMENT=production
ALLOWED_ORIGINS=https://your-vercel-domain.vercel.app
```

The backend is stored in process memory. One instance is required. A free instance that sleeps may lose every active lobby when it restarts.

## 2. Configure Vercel

Import the `inglisc` repository and set:

```text
Framework preset: Other
Build command: npm run build:web
Output directory: dist
```

The repository already includes `vercel.json`.

Set the Vercel environment variable:

```text
EXPO_PUBLIC_SERVER_URL=https://your-render-service.onrender.com
```

Redeploy after changing it.

## 3. Build the Android preview APK

Install EAS CLI and log in:

```bash
npm install -g eas-cli
eas login
```

Set the production backend as an EAS environment secret:

```bash
eas env:create --name EXPO_PUBLIC_SERVER_URL --value https://your-render-service.onrender.com --environment preview
```

Build:

```bash
npm run build:android
```

The `preview` profile creates an internal APK. It is suitable for testing, not for Play Store submission.

For Play Store submission:

```bash
eas build --platform android --profile production
eas submit --platform android --profile production
```

The production profile creates an Android App Bundle (`AAB`).

## 4. Smoke test

Verify these URLs:

```text
https://your-render-service.onrender.com/health
https://your-vercel-domain.vercel.app
```

On three separate devices:

1. Create a lobby.
2. Join from the web app and two Android devices.
3. Start a 6-round game.
4. Complete one round.
5. Test rematch and player exit.
6. Reload the web app and verify session recovery.

## 5. Before public release

- Add PostgreSQL or Redis instead of process memory.
- Restrict CORS to exact production origins.
- Add rate limiting and lobby creation limits.
- Move auth tokens to SecureStore on native builds.
- Add monitoring, crash reporting and structured logs.
- Replace test credentials and remove LAN-only environment values.
- Configure custom domains and HTTPS.
