# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CloudFiles is a multi-cloud file browser and photo migration tool. Users browse/manage files across Azure Blob Storage and Google Cloud Storage, and migrate photos to/from Google Photos.

**Architecture**: Angular 19 SPA → Azure Functions v4 (.NET 8) BFF → Cloud APIs

All cloud operations use the logged-in user's own OAuth tokens (no service accounts).

## Build & Development Commands

### Frontend (`Web.UI/`)
```bash
cd Web.UI
npm ci                  # install dependencies
npm run start           # dev server (ng serve with SSL, proxies /api to localhost:7071)
npm run build           # production build
npm run lint            # ESLint + Angular linting
npm run test            # unit tests (Karma/Jasmine)
```

### Backend (root)
```bash
dotnet restore          # restore NuGet packages
dotnet build            # build
func start              # run Azure Functions locally
```

### Local Development (3 terminals)
```bash
npx azurite --silent --location .azurite   # Terminal 1: storage emulator
func start                                  # Terminal 2: backend
cd Web.UI && ng serve                       # Terminal 3: frontend at https://localhost:4200
```

### Secrets Setup
```bash
bash setup-secrets.sh   # pulls from Bitwarden, generates local.settings.json + environment.ts
# Or manually: cp local.settings.example.json local.settings.json
#              cp Web.UI/src/environments/environment.template.ts Web.UI/src/environments/environment.ts
```

## Architecture

### Backend (.NET 8, Azure Functions v4 isolated worker)

- **`UiBffFunctions/`** — HTTP trigger functions (BFF endpoints). Each file handles a cloud provider:
  - `BFF_AzureFiles.cs` — Blob Storage file operations
  - `BFF_AzureManagement.cs` — Azure subscription/resource hierarchy
  - `BFF_GooglePhotos.cs` — Google Photos operations & picker
  - `BFF_GoogleStorage.cs` — Google Cloud Storage browsing
  - `BFF_Common.cs` — Health check, token validation
- **`Utilities/`** — Cloud SDK wrappers: `AzureUtility.cs`, `GoogleUtility.cs`, `CommonUtility.cs`
- **`Models/Constants.cs`** — All function and orchestrator name constants
- **`AzureToGoogle/`**, **`GoogleToGoogle/`** — Durable Functions for photo migrations using a 2-phase pattern: parallel byte upload → sequential batched `batchCreate` (up to 50 items per Google Photos API call)
- **`GooglePhotosToAzure/`** — Durable Functions for photo migration using parallel fan-out/fan-in (Azure Blob has no concurrent write quota)
- **`Program.cs`** — Host builder; uses Newtonsoft JSON with camelCase serialization

### Frontend (Angular 19 standalone, `Web.UI/src/app/`)

- **`core/auth/`** — Multi-provider OIDC authentication:
  - `multi-auth.service.ts` — Orchestrates three OIDC configs (google, azure, azure-storage)
  - `auth.interceptor.ts` — Attaches correct Bearer token based on request URL pattern
  - `auth.guard.ts` — Route protection
- **`core/services/`** — API services for each cloud provider
- **`views/`** — Feature modules (lazy-loaded):
  - `file-manager/` — Main file browsing with NgRx store (`store/` subfolder has actions, reducer, effects, selectors)
  - `storage-browser/` — Azure subscription/RG/account hierarchy
  - `google-storage-browser/` — GCS bucket browsing
  - `google-photos/` — Photos picker and album management
  - `processes/` — Migration job monitoring
  - `sessions/` — Sign-in, logout, error pages
- **`shared/components/layouts/`** — `AdminLayoutComponent` (authenticated, with sidebar) and `AuthLayoutComponent` (public)
- **Routes** defined in `app.routing.ts`; default path redirects to `file-manager`

### Authentication — Three OIDC Configs

| Config ID | Resource | Why separate |
|---|---|---|
| `google` | Google Photos + GCS | Google OAuth scopes |
| `azure` | Azure Resource Manager | `management.azure.com` audience |
| `azure-storage` | Azure Blob Storage | `storage.azure.com` audience |

Azure requires separate tokens per resource audience. The HTTP interceptor in `auth.interceptor.ts` routes tokens by URL pattern:
- `/azure/files/*` → azure-storage token
- `/azure/*` → azure token
- `/google/*`, `/process/*` → google token

## Code Conventions

### Frontend
- **Single quotes**, max line length **180**, kebab-case component selectors (no prefix), camelCase directive selectors
- Standalone components used throughout (Angular 19 standalone bootstrap)
- NgRx for complex state (file-manager); simpler views use service-based state
- Feature modules are lazy-loaded via `loadChildren`/`loadComponent`

### Backend
- All function names defined in `Models/Constants.cs` — reference these, don't use string literals
- Token extraction: `CommonUtility.GetTokenFromHeaders(req)` for Google; `AzureUtility.VerifyAzure*HeaderTokenIsValid(req)` for Azure
- Newtonsoft `[JsonProperty("name")]` for JSON serialization (not System.Text.Json)
- Durable Functions follow orchestrator → activity pattern
- **Google Photos writes** use 2-phase approach: Phase 1 fans out upload-byte activities in parallel (`/v1/uploads` has no concurrency quota), Phase 2 calls `batchCreate` sequentially in batches of up to 50 (Google Photos API enforces a concurrent write request quota). See `AzureToGoogle/` and `GoogleToGoogle/`
- **Azure Blob writes** use standard fan-out/fan-in (no concurrent write quota). See `GooglePhotosToAzure/`

## Post-Change Verification

After implementing any changes, always run the relevant checks before considering work complete:

- **Frontend changes (`Web.UI/`):** Run `npm run lint` and `npm run build`
- **Backend changes (root):** Run `dotnet build`

## CI/CD

- **`.github/workflows/CloudFiles-WebUI.yml`** — Frontend: lint, build, deploy to Azure Static Web Apps
- **`.github/workflows/CloudFiles-Api.yml`** — Backend: build, publish, deploy to Azure Functions
- Environment secrets are substituted into `environment.prod.ts` at build time

# Design Tokens (Tailwind)
- Border radius: rounded-lg (cards), rounded-md (buttons/inputs)
- Shadows: shadow-sm (cards), shadow-none (flat elements)
- Spacing: p-4 (card padding), gap-4 (grid gaps), space-y-2 (form fields)
- Colors: slate palette for neutrals, indigo for primary actions
- Transitions: transition-colors duration-150