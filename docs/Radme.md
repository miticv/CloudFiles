# CloudFiles

Multi-cloud file browser and photo migration tool. Browse and manage files across Azure Blob Storage, Google Cloud Storage, Google Drive, and Google Photos. Migrate photos between cloud providers.

**Architecture:** React SPA (Vite) → Azure Functions v4 (.NET 8) BFF → Cloud APIs

All cloud operations use the logged-in user's own OAuth tokens (no service accounts).

## Supported Providers

- **Azure Blob Storage** — browse storage accounts, containers, and blobs
- **Google Cloud Storage** — browse GCS buckets and objects
- **Google Drive** — browse folders and files
- **Google Photos** — browse, pick, and migrate photos/albums
- **Dropbox** — browse and manage files

## Local Development

Run 3 terminals:

```bash
# Terminal 1: Azure storage emulator
npx azurite --silent --location .azurite

# Terminal 2: Backend (Azure Functions)
func start

# Terminal 3: Frontend (Vite dev server at http://localhost:4200)
cd Web.UI && npm run dev
```

## Secrets Setup

**Option A — Bitwarden (recommended):**
```bash
bash setup-secrets.sh
```
This pulls secrets from the "CloudFiles" Bitwarden item and generates `local.settings.json` and `Web.UI/src/env.ts`.

**Option B — Manual:**
```bash
cp local.settings.example.json local.settings.json
cp Web.UI/src/env.template.ts Web.UI/src/env.ts
```
Then fill in the placeholder values in both files.

### Required Bitwarden Fields

| Field | Used In |
|---|---|
| `GoogleClientId` | Backend + Frontend |
| `GoogleClientSecret` | Frontend |
| `AzureTenantId` | Backend + Frontend |
| `AzureClientId` | Frontend |
| `JwtSecret` | Backend |
| `AdminEmails` | Backend + Frontend |
| `DropBoxKey` | Backend + Frontend |
| `DropBoxSecret` | Backend |
| `PCloudClientId` | Backend + Frontend |
| `PCloudClientSecret` | Backend |
| `ProductionApiUrl` | CI/CD only |

## Build & Verify

```bash
# Frontend
cd Web.UI
npm ci && npm run lint && npm run build

# Backend
dotnet restore && dotnet build
```

## CI/CD

- **Frontend:** `.github/workflows/CloudFiles-WebUI.yml` — lint, build, deploy to Azure Static Web Apps
- **Backend:** `.github/workflows/CloudFiles-Api.yml` — build, publish, deploy to Azure Functions

Environment secrets are substituted into `env.template.ts` at build time.

## Detailed Architecture

See [CLAUDE.md](../CLAUDE.md) for detailed architecture documentation including authentication layers, code conventions, and file structure.

## Reference Links

- [Durable Functions overview](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-overview?tabs=csharp)
- [Durable Functions entities](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-entities?tabs=csharp)
