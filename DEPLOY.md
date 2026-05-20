# Deployment Guide — Yellow Design

## Architecture

- **Firebase Hosting** — customer app (`yellow-design-app`) + admin (`yellow-design-admin`)
- **Cloud Run** — Express API (`yellow-design-backend`) in `asia-south1`
- **Cloud SQL PostgreSQL** — `db-f1-micro` in `asia-south1` (~$10/month)
- **Secret Manager** — all secrets stored here, injected at runtime

Firebase Hosting rewrites proxy all `/auth/**`, `/bookings/**`, `/admin/**` etc. calls to Cloud Run, so no CORS issues and no hardcoded API URLs needed in the client.

---

## Prerequisites

- Node 20+
- `gcloud` CLI authenticated: `gcloud auth login && gcloud config set project YOUR_PROJECT_ID`
- `firebase` CLI: `npm install -g firebase-tools && firebase login`
- Docker (only needed for local testing; Cloud Build handles production)

---

## 1. GCP Project Setup

```bash
export PROJECT_ID=your-project-id

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  --project=$PROJECT_ID

# Create Artifact Registry repo
gcloud artifacts repositories create yellow-design \
  --repository-format=docker \
  --location=asia-south1 \
  --project=$PROJECT_ID

# Grant Cloud Build permission to deploy to Cloud Run
PROJECT_NUM=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUM}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 2. Cloud SQL PostgreSQL

```bash
# Create instance (db-f1-micro = ~$10/month, asia-south1 = Mumbai)
gcloud sql instances create yellow-design-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=asia-south1 \
  --storage-auto-increase \
  --project=$PROJECT_ID

# Create database
gcloud sql databases create yellow_design --instance=yellow-design-db --project=$PROJECT_ID

# Create user
gcloud sql users create yellow_user \
  --instance=yellow-design-db \
  --password=CHOOSE_A_STRONG_PASSWORD \
  --project=$PROJECT_ID

# Get connection string (use Cloud SQL Auth Proxy format for Cloud Run)
# DATABASE_URL format:
# postgresql://yellow_user:PASSWORD@/yellow_design?host=/cloudsql/PROJECT_ID:asia-south1:yellow-design-db
```

---

## 3. Secret Manager

Create all secrets:

```bash
gcloud secrets create jwt-secret --replication-policy="automatic" --project=$PROJECT_ID
gcloud secrets create database-url --replication-policy="automatic" --project=$PROJECT_ID
gcloud secrets create msg91-authkey --replication-policy="automatic" --project=$PROJECT_ID
gcloud secrets create msg91-template-id --replication-policy="automatic" --project=$PROJECT_ID
gcloud secrets create google-api-key --replication-policy="automatic" --project=$PROJECT_ID
gcloud secrets create flight-api-key --replication-policy="automatic" --project=$PROJECT_ID
gcloud secrets create allowed-origins --replication-policy="automatic" --project=$PROJECT_ID
gcloud secrets create admin-key --replication-policy="automatic" --project=$PROJECT_ID
```

Add values:

```bash
echo -n "your-jwt-secret-32-chars-minimum" | gcloud secrets versions add jwt-secret --data-file=- --project=$PROJECT_ID

echo -n "postgresql://yellow_user:PASSWORD@/yellow_design?host=/cloudsql/${PROJECT_ID}:asia-south1:yellow-design-db" \
  | gcloud secrets versions add database-url --data-file=- --project=$PROJECT_ID

echo -n "your-msg91-authkey" | gcloud secrets versions add msg91-authkey --data-file=- --project=$PROJECT_ID
echo -n "your-msg91-template-id" | gcloud secrets versions add msg91-template-id --data-file=- --project=$PROJECT_ID
echo -n "your-google-maps-api-key" | gcloud secrets versions add google-api-key --data-file=- --project=$PROJECT_ID
echo -n "your-rapidapi-flight-key" | gcloud secrets versions add flight-api-key --data-file=- --project=$PROJECT_ID
echo -n "https://yellow-design-app.web.app" | gcloud secrets versions add allowed-origins --data-file=- --project=$PROJECT_ID
echo -n "your-admin-key-here" | gcloud secrets versions add admin-key --data-file=- --project=$PROJECT_ID
```

Grant Cloud Run service account access to secrets:

```bash
# Cloud Run uses the Compute Engine default SA
COMPUTE_SA="${PROJECT_NUM}-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/secretmanager.secretAccessor"

# Also grant Cloud SQL Client for the Cloud SQL proxy
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/cloudsql.client"
```

---

## 4. Build & Deploy Backend

From the project root:

```bash
gcloud builds submit --config cloudbuild.yaml --project=$PROJECT_ID
```

With a git tag:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions _TAG=$(git rev-parse --short HEAD),_GIT_SHA=$(git rev-parse --short HEAD) \
  --project=$PROJECT_ID
```

### Database Migrations

Migrations run automatically on every deploy via `start.sh` which calls `npx prisma migrate deploy`. On the **first deploy**, make sure the Cloud SQL instance is running and `DATABASE_URL` secret is set before deploying.

To run migrations manually:

```bash
# Install deps in server/
cd server && npm install

# Point to your Cloud SQL instance (via Cloud SQL Auth Proxy or direct)
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## 5. Build & Deploy Frontend

```bash
# Build customer Expo web app
npx expo export --platform web --output-dir ./dist

# Build admin React app
cd admin && npm run build && cd ..

# Deploy both hosting sites
firebase deploy --only hosting --project=$PROJECT_ID
```

Deploy only one site:

```bash
firebase deploy --only hosting:yellow-design-app --project=$PROJECT_ID
firebase deploy --only hosting:yellow-design-admin --project=$PROJECT_ID
```

---

## 6. Firebase Hosting Setup

First-time setup only:

```bash
firebase use $PROJECT_ID
firebase hosting:sites:create yellow-design-app
firebase hosting:sites:create yellow-design-admin
```

---

## 7. Cost Estimate

| Service | Monthly cost |
|---------|-------------|
| Cloud SQL db-f1-micro | ~$10 |
| Cloud Run (min 0, ~100 req/day) | ~$0–3 |
| Firebase Hosting | Free (10 GB/month) |
| Artifact Registry | ~$0.50 |
| Secret Manager | ~$0.06 |
| **Total** | **~$11–14/month** |

Scale up to db-g1-small (+$25/month) when you need more than ~5 concurrent users.

---

## 8. Useful Commands

```bash
# Stream Cloud Run logs
gcloud run services logs tail yellow-design-backend --region=asia-south1 --project=$PROJECT_ID

# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=yellow-design-backend" \
  --limit=50 --project=$PROJECT_ID

# Scale to zero immediately (saves cost during dev)
gcloud run services update yellow-design-backend \
  --min-instances=0 --region=asia-south1 --project=$PROJECT_ID

# Get Cloud Run service URL
gcloud run services describe yellow-design-backend \
  --region=asia-south1 --format='value(status.url)' --project=$PROJECT_ID

# Run Prisma Studio against production DB (via Cloud SQL Auth Proxy)
# 1. Start proxy: cloud-sql-proxy PROJECT_ID:asia-south1:yellow-design-db
# 2. DATABASE_URL="postgresql://yellow_user:PASS@localhost/yellow_design" npx prisma studio
```
