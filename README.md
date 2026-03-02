# CloudFiles

Multi-cloud file browser and migration tool. Browse, view, and manage files across Azure Blob Storage, Google Cloud Storage, Google Drive, Google Photos, pCloud, and Dropbox from a single interface. Migrate files between cloud providers.

## Architecture

```
React 19 SPA (Vite)  ──>  Azure Functions v4 (.NET 8)  ──>  Azure Blob Storage
                                                        ──>  Google Cloud Storage
                                                        ──>  Google Drive
                                                        ──>  Google Photos API
                                                        ──>  Azure Resource Manager
                                                        ──>  pCloud API
                                                        ──>  Dropbox API
```

- **Frontend**: React 19 + Vite + TypeScript, Tailwind CSS v4, shadcn/ui, TanStack Query, Zustand
- **Backend**: Azure Functions v4 isolated worker (.NET 8) — BFF pattern
- **Auth**: Per-user OAuth tokens via `oidc-client-ts` (Google, Azure) + custom OAuth2 (pCloud, Dropbox) — no service accounts
- **Deployment**: GitHub Actions CI/CD to Azure Static Web Apps + Azure Functions

## Tech Stack

### Frontend (`Web.UI/`)
| Technology | Purpose |
|---|---|
| React 19 | UI framework |
| Vite | Dev server & build tool |
| TypeScript | Type safety |
| Tailwind CSS v4 | Utility-first CSS |
| shadcn/ui (Radix) | UI component library |
| TanStack Query | Server state management |
| Zustand | Client state management (file-manager) |
| React Router 7 | Routing (lazy-loaded pages) |
| oidc-client-ts | Multi-provider OIDC authentication (Google, Azure) |

### Backend (root)
| Technology | Purpose |
|---|---|
| .NET 8 | Runtime |
| Azure Functions v4 (isolated worker) | Serverless API |
| Azure.Storage.Blobs | Azure Blob Storage access |
| Azure.ResourceManager | Azure subscription/resource browsing |
| Durable Functions | Long-running migration orchestrations |

## Getting Started

### Prerequisites
- Node.js 20+ (see `.nvmrc`)
- .NET 8 SDK
- Azure Functions Core Tools v4

```bash
winget install Microsoft.DotNet.SDK.8
```

### Setup

1. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd CloudFiles
   dotnet restore
   cd Web.UI && npm install
   ```

2. **Configure secrets** — choose one:

   **Option A: From Bitwarden** (recommended):
   ```bash
   npm install -g @bitwarden/cli   # one-time
   bash setup-secrets.sh
   ```

   **Option B: Manual** — copy templates and fill in values:
   ```bash
   cp local.settings.example.json local.settings.json
   cp Web.UI/src/env.template.ts Web.UI/src/env.ts
   ```

3. **Run locally** (3 terminals):
   ```bash
   # Terminal 1: Storage emulator
   npx azurite --silent --location .azurite

   # Terminal 2: Backend
   func start

   # Terminal 3: Frontend (http://localhost:4200)
   cd Web.UI && npm run dev
   ```

### Environment Variables

**Backend** (`local.settings.json`):
| Variable | Description |
|----------|-------------|
| `AzureWebJobsStorage` | Azure Storage connection string (or `UseDevelopmentStorage=true`) |
| `GooglePhotoClientId` | Google OAuth Client ID — used for token validation |
| `AzureTenantId` | Azure AD Tenant ID |
| `JWT_SECRET` | Secret for signing CloudFiles session JWTs |
| `ADMIN_EMAILS` | Comma-separated admin email addresses |
| `PCloudClientId` | pCloud OAuth Client ID |
| `PCloudClientSecret` | pCloud OAuth Client Secret |
| `DropBoxKey` | Dropbox OAuth App Key |
| `DropBoxSecret` | Dropbox OAuth App Secret |

**Frontend** (`env.ts`):
| Variable | Description |
|----------|-------------|
| `googleClientId` | Google OAuth Client ID |
| `googleClientSecret` | Google OAuth Client Secret |
| `azureTenantId` | Azure AD Tenant ID |
| `azureClientId` | Azure App Registration Client ID |
| `pCloudClientId` | pCloud OAuth Client ID |
| `dropboxClientId` | Dropbox OAuth App Key |

## Authentication

All cloud operations use the **logged-in user's own OAuth token**. No service accounts or API keys are stored on the server. Each user sees only their own cloud resources.

### Two-Layer Auth

**Layer 1: CloudFiles App Auth** — Users log in (Google OAuth, Azure OAuth, or email/password) to create a user record in Azure Table Storage. The backend issues a CloudFiles JWT (HMAC-SHA256, 24h expiry) stored in `localStorage` as `cf_token`.

**Layer 2: Cloud Provider Tokens** — Each cloud provider requires its own OAuth token for API access:

| Provider | Auth Method | Token Storage |
|----------|-------------|---------------|
| Google (Photos, GCS, Drive) | OIDC via `oidc-client-ts` | Session storage |
| Azure (Resource Manager) | OIDC via `oidc-client-ts` | Session storage |
| Azure Storage (Blob) | OIDC via `oidc-client-ts` | Session storage |
| pCloud | Custom OAuth2 | localStorage |
| Dropbox | Custom OAuth2 | localStorage |

Azure requires separate OIDC configs for `management.azure.com` and `storage.azure.com` because Azure AD issues tokens scoped to a single resource audience.

### Token Routing

The Axios interceptor (`axios-client.ts`) attaches the correct Bearer token based on request URL:

| URL pattern | Token source |
|-------------|-------------|
| `/manage/*`, `/auth/me` | CloudFiles JWT |
| `/auth/*` | No auth header |
| `/azure/files/*` | azure-storage OIDC token |
| `/azure/*` | azure OIDC token |
| `/google/*`, `/process/*` | google OIDC token |
| `/pcloud/*` | pCloud localStorage token |
| `/dropbox/*` | Dropbox localStorage token |

**Auth Flow**: Login page → CloudFiles JWT → Connections page → Provider OAuth links → File browsing

## API Endpoints

### Azure Files
| Method | Route | Description |
|---|---|---|
| GET | `azure/files/list?account=&container=&path=` | List files/folders in blob container |
| GET | `azure/files/item?account=&container=&path=` | Download a blob |
| GET | `azure/files/json?account=&container=&path=` | Get file metadata + base64 content |

### Azure Resources
| Method | Route | Description |
|---|---|---|
| GET | `azure/subscription/list` | List subscriptions |
| GET | `azure/subscription/{id}/list` | List resource groups |
| GET | `azure/subscription/{id}/ResourceGroup/{rg}/list` | List storage accounts |
| GET | `azure/subscription/{id}/ResourceGroup/{rg}/accountName/{name}/list` | List blob containers |

### Google Cloud Storage
| Method | Route | Description |
|---|---|---|
| GET | `google/files/list?bucket=&path=` | List files/folders in a GCS bucket |
| GET | `google/storage/buckets?projectId=` | List buckets in a GCP project |

### Google Drive
| Method | Route | Description |
|---|---|---|
| GET | `google/drive/files?folderId=` | List files/folders |

### Google Photos
| Method | Route | Description |
|---|---|---|
| GET | `google/album/list` | List albums |
| POST | `google/album` | Create album |
| POST | `google/photos/sessions` | Create Photos Picker session |
| GET | `google/photos/sessions/{id}` | Poll picker session status |
| GET | `google/photos/sessions/{id}/media` | List picked media items |
| DELETE | `google/photos/sessions/{id}` | Delete picker session |
| GET | `google/photos/image?url=` | Proxy image with auth |

### pCloud
| Method | Route | Description |
|---|---|---|
| POST | `pcloud/oauth/callback` | Exchange auth code for tokens |
| GET | `pcloud/files/list?folderId=` | List folder contents |
| GET | `pcloud/files/download?fileId=` | Download file |

### Dropbox
| Method | Route | Description |
|---|---|---|
| POST | `dropbox/oauth/callback` | Exchange auth code for tokens |
| GET | `dropbox/files/list?path=` | List folder contents |
| GET | `dropbox/files/list/continue?cursor=` | Continue listing (pagination) |
| GET | `dropbox/files/download?path=` | Download file |
| POST | `dropbox/files/upload` | Upload file |

### Photo Migration (Durable Functions)
| Method | Route | Description |
|---|---|---|
| POST | `process/AzureStorageToGooglePhotos/start` | Start Azure → Google Photos migration |
| POST | `process/GoogleStorageToGooglePhotos/start` | Start GCS → Google Photos migration |
| POST | `process/GoogleDriveToAzure/start` | Start Google Drive → Azure migration |
| POST | `process/GooglePhotosToAzure/start` | Start Google Photos → Azure migration |
| GET | `process/instances` | List orchestration instances |
| DELETE | `process/instances/{id}` | Purge an orchestration instance |

### Utility
| Method | Route | Description |
|---|---|---|
| GET | `ping` | Health check |
| GET | `google/tokenvalidate` | Validate Google token |

## Feature Flags

Backend feature flags are set as environment variables — in `local.settings.json` for local dev, or in Azure Portal → Function App → **Configuration → Application settings** for deployed environments.

| Variable                                   | Values                  | Description                                              |
|--------------------------------------------|-------------------------|----------------------------------------------------------|
| `FEATURE_FLAG_TEST_FAIL_FILENAME_CONTAINS` | `""` (off) / any string | Fail any file whose name contains this string (testing). |

**Local / staging only — do not set in production.**

```json
"FEATURE_FLAG_TEST_FAIL_FILENAME_CONTAINS": "IMG_"
```

Failed items show `[TEST] Simulated failure for: <filename>` in the Processes UI under **Failed Files**.

## Inspecting Process History in Azure Storage Explorer

Durable Functions orchestration history persists indefinitely (until explicitly purged via the UI). The task hub is **`CloudFilesTaskHub`**.

| Location | What you'll find |
|---|---|
| **Tables → `CloudFilesTaskHubInstances`** | One row per orchestration instance — status, created/updated timestamps, serialized input & output |
| **Tables → `CloudFilesTaskHubHistory`** | Full event log for each instance (every activity call, retry, completion event) |
| **Blob Containers → `cloudfilestaskhub-largemessages`** | Overflow storage for inputs/outputs too large for table rows |

## Deployment

CI/CD via GitHub Actions:

- **`CloudFiles-WebUI.yml`** — Builds React SPA, runs lint, deploys to Azure Static Web Apps
- **`CloudFiles-Api.yml`** — Builds .NET backend, deploys to Azure Functions

## Project Structure

```
CloudFiles/
├── .github/workflows/          # CI/CD pipelines
├── AzureToGcs/                 # Durable Functions: Azure → Google Cloud Storage
├── AzureToGoogle/              # Durable Functions: Azure → Google Photos
├── GoogleDriveToAzure/         # Durable Functions: Google Drive → Azure
├── GooglePhotosToAzure/        # Durable Functions: Google Photos → Azure
├── GoogleStorageToAzure/       # Durable Functions: Google Storage → Azure
├── GoogleToGoogle/             # Durable Functions: GCS → Google Photos
├── Models/                     # Shared data models
│   ├── Azure/                  # Azure resource models
│   └── Google/                 # Google API models
├── UiBffFunctions/             # BFF HTTP trigger functions
│   ├── BFF_Admin.cs            # Admin user management
│   ├── BFF_Auth.cs             # User auth (OAuth + local), JWT sessions
│   ├── BFF_AzureFiles.cs       # Azure Blob Storage operations
│   ├── BFF_AzureManagement.cs  # Azure subscription/resource browsing
│   ├── BFF_Common.cs           # Health check, token validation
│   ├── BFF_Dropbox.cs          # Dropbox file operations
│   ├── BFF_GoogleDrive.cs      # Google Drive operations
│   ├── BFF_GooglePhotos.cs     # Google Photos operations
│   ├── BFF_GoogleStorage.cs    # Google Cloud Storage browsing
│   └── BFF_PCloud.cs           # pCloud file operations
├── Utilities/
│   ├── AzureUtility.cs         # Azure Blob + Resource Manager
│   ├── CommonUtility.cs        # Shared helpers
│   ├── DropboxUtility.cs       # Dropbox API client
│   ├── GoogleUtility.cs        # Google Storage + Photos + Drive
│   ├── PCloudUtility.cs        # pCloud API client
│   └── UserTableUtility.cs     # Azure Table Storage user management
├── Web.UI/                     # React 19 frontend
│   └── src/
│       ├── api/                # TanStack Query hooks per provider
│       ├── auth/               # OIDC + custom OAuth, auth guards, axios interceptor
│       ├── components/ui/      # shadcn/ui components (Radix + Tailwind)
│       ├── hooks/              # Shared React hooks
│       ├── layouts/            # AppLayout (sidebar + header) & AuthLayout
│       ├── pages/
│       │   ├── admin/          # User management (admin only)
│       │   ├── connections/    # Provider connect/disconnect
│       │   ├── dropbox/        # Dropbox file browser
│       │   ├── file-manager/   # Azure Blob file browsing + detail view
│       │   ├── google-drive/   # Google Drive browser
│       │   ├── google-photos/  # Google Photos picker & albums
│       │   ├── google-storage/ # Google Cloud Storage browser
│       │   ├── login/          # Multi-auth login/register
│       │   ├── pcloud/         # pCloud file browser
│       │   ├── processes/      # Migration job monitoring
│       │   └── storage-browser/# Azure subscription/RG/account hierarchy
│       ├── stores/             # Zustand stores
│       └── router.tsx          # Route definitions
├── CloudFiles.csproj
├── Program.cs
└── host.json
```
