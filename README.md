# Sport Tracker

Personal fitness & nutrition tracker. Runs on your home NAS as a Docker container. Tracks workouts, meals, shakes, vitamins, and water intake with daily push notification reminders.

## First-time setup

### 1. Generate VAPID keys (one-time)

```bash
npx web-push generate-vapid-keys
```

### 2. Create `.env`

```bash
cp .env.example .env
# Paste your generated keys into .env
# Set VAPID_SUBJECT to your email
```

### 3. Start the app

```bash
docker compose up -d --build
```

App will be available at `http://<your-nas-ip>:8080`.

---

## Updating

```bash
git pull
docker compose up -d --build
```

Data in the `sport-data` Docker volume is not touched during updates.

---

## Migrating to a new machine

```bash
# On old machine — export the Docker volume
docker run --rm -v sport_sport-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/sport-data.tar.gz -C /data .

# Copy to new machine
scp sport-data.tar.gz user@new-nas:~/

# On new machine — restore the volume
docker volume create sport_sport-data
docker run --rm -v sport_sport-data:/data -v ~/:/backup alpine \
  tar xzf /backup/sport-data.tar.gz -C /data

# Start on new machine
docker compose up -d --build
```

---

## Backups

The backend automatically backs up the SQLite database to the same volume nightly at 03:00 (container time). Backups are kept for 7 days:

```
/data/sport-backup-YYYY-MM-DD.db
```

---

## Accessing from Android

1. Open Chrome on your Android phone
2. Navigate to `http://<your-nas-ip>:8080`
3. Tap the browser menu → "Add to Home Screen" for app-like experience
4. Go to Settings in the app and enable push notifications

---

## Development

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

---

## Architecture

- **Frontend**: React 18 + Vite + Tailwind CSS (served by Nginx)
- **Backend**: Node.js 20 + Express + TypeScript
- **Database**: SQLite (via better-sqlite3, WAL mode)
- **Notifications**: Web Push API (VAPID), scheduled by node-cron
- **Deployment**: Docker Compose v2
