# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CloudFiles is a multi-cloud file browser and photo migration tool. Users browse/manage files across Azure Blob Storage and Google Cloud Storage, and migrate photos to/from Google Photos.

**Architecture**: React SPA (Vite) → Azure Functions v4 (.NET 8) BFF → Cloud APIs

All cloud operations use the logged-in user's own OAuth tokens (no service accounts).

## Build & Development Commands

### Frontend (`Web.UI/`)
```bash
cd Web.UI
npm ci                  # install dependencies
npm run dev             # dev server (Vite, proxies /api to localhost:7071)
npm run build           # production build (tsc + vite build)
npm run lint            # ESLint
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
cd Web.UI && npm run dev                    # Terminal 3: frontend at http://localhost:4200
```

### Secrets Setup
```bash
bash setup-secrets.sh   # pulls from Bitwarden, generates local.settings.json + env.ts
# Or manually: cp local.settings.example.json local.settings.json
#              cp Web.UI/src/env.template.ts Web.UI/src/env.ts
```

## Architecture

### Backend (.NET 8, Azure Functions v4 isolated worker)

- **`UiBffFunctions/`** — HTTP trigger functions (BFF endpoints). Each file handles a cloud provider:
  - `BFF_AzureFiles.cs` — Blob Storage file operations
  - `BFF_AzureManagement.cs` — Azure subscription/resource hierarchy
  - `BFF_GooglePhotos.cs` — Google Photos operations & picker
  - `BFF_GoogleStorage.cs` — Google Cloud Storage browsing
  - `BFF_Common.cs` — Health check, token validation
  - `BFF_Auth.cs` — User registration/login (OAuth + local), JWT session management
  - `BFF_Admin.cs` — Admin user management (list, update)
- **`Utilities/`** — Cloud SDK wrappers: `AzureUtility.cs`, `GoogleUtility.cs`, `CommonUtility.cs`, `UserTableUtility.cs`
- **`Models/Constants.cs`** — All function and orchestrator name constants
- **`AzureToGoogle/`**, **`GoogleToGoogle/`** — Durable Functions for photo migrations: parallel upload in batches of 50 with retry (3 attempts, exponential backoff) → `batchCreate` per batch
- **`GooglePhotosToAzure/`** — Durable Functions for photo migration using parallel fan-out/fan-in
- **`Program.cs`** — Host builder; uses Newtonsoft JSON with camelCase serialization

### Frontend (React + Vite + TypeScript, `Web.UI/src/`)

- **`auth/`** — Multi-provider OIDC authentication + app auth:
  - `oidc-config.ts` — Three `UserManager` instances (google, azure, azure-storage) from `oidc-client-ts`
  - `oidc-provider.tsx` — React context for OIDC state, callback processing, auth chain
  - `auth-context.tsx` — CloudFiles JWT context (login, register, OAuth login, logout)
  - `axios-client.ts` — Axios interceptor with URL-based token routing
  - `auth-guard.tsx` — Two-tier route protection (CloudFiles JWT + OIDC provider)
  - `admin-guard.tsx` — Admin-only route protection
- **`api/`** — TanStack Query hooks for each cloud provider + `types.ts` (all TypeScript interfaces)
- **`stores/`** — Zustand store for file-manager state
- **`pages/`** — Feature pages (lazy-loaded via React Router):
  - `file-manager/` — Main file browsing with Zustand store, detail drawer, selection
  - `storage-browser/` — Azure subscription/RG/account hierarchy
  - `google-storage/` — GCS bucket browsing
  - `google-drive/` — Google Drive folder navigation
  - `google-photos/` — Photos picker and album management
  - `processes/` — Migration job monitoring
  - `connections/` — Provider connect/disconnect
  - `login/` — Multi-auth login/register
  - `admin/` — User management (admin only)
- **`layouts/`** — `AppLayout` (sidebar + header + footer) and `AuthLayout` (public)
- **`components/ui/`** — shadcn/ui components (Radix + Tailwind)
- **Routes** defined in `router.tsx`; default path redirects to `file-manager`

### Authentication — Two Layers

**Layer 1: CloudFiles App Auth** — Users must log in (Google OAuth, Azure OAuth, or email/password) to create a user record in Azure Table Storage (`Users` table). The backend issues a CloudFiles JWT (HMAC-SHA256, 24h expiry) stored in `localStorage` as `cf_token`.

**Layer 2: Three OIDC Configs** (for cloud API access)

| Config ID | Resource | Why separate |
|---|---|---|
| `google` | Google Photos + GCS | Google OAuth scopes |
| `azure` | Azure Resource Manager | `management.azure.com` audience |
| `azure-storage` | Azure Blob Storage | `storage.azure.com` audience |

Azure requires separate tokens per resource audience. The Axios interceptor in `axios-client.ts` routes tokens by URL pattern:
- `/manage/*`, `/auth/me` → CloudFiles JWT (from localStorage)
- `/auth/*` → no auth header
- `/azure/files/*` → azure-storage token
- `/azure/*` → azure token
- `/google/*`, `/process/*` → google token

**Auth Flow**: Login page (`/sessions/login`) → CloudFiles JWT → Connections page (`/connections`) → OIDC provider links → File browsing

## Code Conventions

### Frontend
- **Single quotes**, TypeScript strict mode, functional components with hooks
- TanStack Query for server state, Zustand for client state (file-manager only)
- Pages are lazy-loaded via `lazy: () => import(...)` in router
- shadcn/ui components (Radix primitives + Tailwind CSS v4)
- Lucide React for icons

### Backend
- All function names defined in `Models/Constants.cs` — reference these, don't use string literals
- Token extraction: `CommonUtility.GetTokenFromHeaders(req)` for Google; `AzureUtility.VerifyAzure*HeaderTokenIsValid(req)` for Azure
- Newtonsoft `[JsonProperty("name")]` for JSON serialization (not System.Text.Json)
- Durable Functions follow orchestrator → activity pattern
- **Google Photos writes** process files in chunks of 50: fan-out parallel uploads with retry (3 attempts, exponential backoff 5s/10s/20s via `TaskOptions.FromRetryPolicy`), then one `batchCreate` call per chunk. `HttpRequestException` propagates from activities so Durable Functions retries automatically; `TaskFailedException` is caught in the orchestrator's `SafeUpload` wrapper to record failures gracefully. See `AzureToGoogle/` and `GoogleToGoogle/`
- **Azure Blob writes** use standard fan-out/fan-in (no concurrent write quota). See `GooglePhotosToAzure/`

## Post-Change Verification

After implementing any changes, always run the relevant checks before considering work complete:

- **Frontend changes (`Web.UI/`):** Run `npm run lint` and `npm run build`
- **Backend changes (root):** Run `dotnet build`

## CI/CD

- **`.github/workflows/CloudFiles-WebUI.yml`** — Frontend: lint, build, deploy to Azure Static Web Apps
- **`.github/workflows/CloudFiles-Api.yml`** — Backend: build, publish, deploy to Azure Functions
- Environment secrets are substituted into `env.template.ts` at build time

# Design Tokens (Tailwind)
- Border radius: rounded-lg (cards), rounded-md (buttons/inputs)
- Shadows: shadow-sm (cards), shadow-none (flat elements)
- Spacing: p-4 (card padding), gap-4 (grid gaps), space-y-2 (form fields)
- Colors: slate palette for neutrals, indigo for primary actions
- Transitions: transition-colors duration-150
