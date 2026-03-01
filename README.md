# CloudFiles

Multi-cloud file browser for Azure Blob Storage and Google Cloud Storage. Browse, view, and manage files across cloud providers from a single interface. Migrate photos between Google Cloud Storage and Google Photos.

## Architecture

```
Angular 19 SPA  ──>  Azure Functions v4 (.NET 8)  ──>  Azure Blob Storage
                                                   ──>  Google Cloud Storage
                                                   ──>  Google Photos API
                                                   ──>  Azure Resource Manager
```

- **Frontend**: Angular 19 standalone app with Material Design, Tailwind CSS, NgRx
- **Backend**: Azure Functions v4 isolated worker (.NET 8) — BFF pattern
- **Auth**: Per-user OAuth tokens via `angular-auth-oidc-client` — no service accounts
- **Deployment**: GitHub Actions CI/CD to Azure Static Web Apps + Azure Functions

## Tech Stack

### Frontend (`Web.UI/`)
| Technology | Purpose |
|---|---|
| Angular 19 | SPA framework (standalone bootstrap) |
| Angular Material 19 | UI component library |
| Tailwind CSS | Utility-first CSS |
| NgRx (Store, Effects, Router-Store) | State management |
| angular-auth-oidc-client | Multi-provider OIDC authentication |

### Backend (root)
| Technology | Purpose |
|---|---|
| .NET 8 | Runtime |
| Azure Functions v4 (isolated worker) | Serverless API |
| Azure.Storage.Blobs | Azure Blob Storage access |
| Azure.ResourceManager | Azure subscription/resource browsing |
| Durable Functions | Long-running photo migration orchestrations |

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
   cp Web.UI/src/environments/environment.template.ts Web.UI/src/environments/environment.ts
   ```

3. **Updating Bitwarden secrets**:

   When you need to rotate or change a secret (e.g. new Google Client ID), update the field in Bitwarden and re-run the setup script:

   ```bash
   # 1. Edit the "CloudFiles" item in Bitwarden (web vault or desktop app)
   #    Custom fields: GoogleClientId, GoogleClientSecret, AzureTenantId, AzureClientId, ProductionApiUrl

   # 2. Sync and regenerate local config files
   bw sync                   # pull latest vault changes
   bash setup-secrets.sh     # regenerates local.settings.json, environment.ts, environment.prod.ts
   ```

   If using the `bw` CLI directly to update a field:
   ```bash
   # Get the item ID
   bw get item CloudFiles --session "$BW_SESSION" | jq '.id'

   # Edit the item (opens in $EDITOR)
   bw edit item <item-id> --session "$BW_SESSION" "$(bw get item CloudFiles --session "$BW_SESSION" | jq '.fields = [.fields[] | if .name == "GoogleClientId" then .value = "NEW_VALUE" else . end]' | bw encode)"

   # Re-run setup to apply
   bash setup-secrets.sh
   ```

4. **Run locally**:
   ```bash
   # Terminal 1: Storage emulator
   npx azurite --silent --location .azurite

   # Terminal 2: Backend
   func start

   # Terminal 3: Frontend
   cd Web.UI && ng serve
   ```

### Environment Variables

**Backend** (`local.settings.json`):
| Variable | Description |
|----------|-------------|
| `AzureWebJobsStorage` | Azure Storage connection string - needed for durable azure functions (or `UseDevelopmentStorage=true`) |
| `GooglePhotoClientId` | Google OAuth Client ID — used for token validation |
| `AzureTenantId` | Azure AD Tenant ID |

**Frontend** (`environment.ts`):
| Variable | Description |
|----------|-------------|
| `googleClientId` | Google OAuth Client ID |
| `googleClientSecret` | Google OAuth Client Secret |
| `azureTenantId` | Azure AD Tenant ID |
| `azureClientId` | Azure App Registration Client ID |

## Authentication

All cloud operations use the **logged-in user's own OAuth token**. No service accounts or API keys are stored on the server. Each user sees only their own cloud resources.

### OIDC Providers

| Provider | Config ID | Scopes | Access to |
|----------|-----------|--------|-----------|
| Google | `google` | `photoslibrary.appendonly`, `photoslibrary.readonly.appcreateddata`, `photospicker.mediaitems.readonly`, `devstorage.read_only` | Google Photos, Google Cloud Storage |
| Azure | `azure` | `management.azure.com/user_impersonation` | Subscriptions, resource groups, storage accounts |
| Azure Storage | `azure-storage` | `storage.azure.com/user_impersonation` | Blob file read/download |

`azure` and `azure-storage` share the same Azure AD authority and client ID. They are separate configs because Azure AD issues tokens scoped to a single resource audience — a token for `management.azure.com` won't be accepted by the Blob Storage API and vice versa.

### Token Routing

The HTTP interceptor (`auth.interceptor.ts`) attaches the correct Bearer token based on request URL. The backend validates each token before forwarding it to the respective cloud API.

| URL pattern | OIDC Config | Backend Validation | Forwarded To |
|-------------|-------------|-------------------|--------------|
| `/azure/files/*` | `azure-storage` | JWT validation (audience: `storage.azure.com`, issuer: Azure AD tenant) | Azure Blob Storage API |
| `/azure/*` | `azure` | JWT validation (audience: `management.azure.com`, issuer: Azure AD tenant) | Azure Resource Manager API |
| `/google/*` | `google` | Google tokeninfo introspection (scope, audience, expiry) | Google Photos / GCS API |
| `/process/*` | `google` | Google tokeninfo introspection (scope, audience, expiry) | Durable Functions orchestrator |

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

### Photo Migration (Durable Functions)
| Method | Route | Description |
|---|---|---|
| POST | `process/AzureStorageToGooglePhotos/start` | Start Azure → Google Photos migration |
| POST | `process/GoogleStorageToGooglePhotos/start` | Start GCS → Google Photos migration |
| GET | `process/instances` | List orchestration instances |
| DELETE | `process/instances/{id}` | Purge an orchestration instance |

### Utility
| Method | Route | Description |
|---|---|---|
| GET | `ping` | Health check |
| GET | `google/tokenvalidate` | Validate Google token |

## Inspecting Process History in Azure Storage Explorer

Durable Functions orchestration history persists indefinitely (until explicitly purged via the UI). The task hub is **`CloudFilesTaskHub`**.

Connect Azure Storage Explorer to the storage account used by the Function App and look under:

| Location | What you'll find |
|---|---|
| **Tables → `CloudFilesTaskHubInstances`** | One row per orchestration instance — status, created/updated timestamps, serialized input & output |
| **Tables → `CloudFilesTaskHubHistory`** | Full event log for each instance (every activity call, retry, completion event) |
| **Blob Containers → `cloudfilestaskhub-largemessages`** | Overflow storage for inputs/outputs too large for table rows (e.g. large file lists) |

> **Note:** Processes created before Feb 2026 (when the `StartedBy` field was added to orchestration inputs) do not appear in the Processes UI for regular users, but are fully visible here.

## Deployment

CI/CD via GitHub Actions:

- **`CloudFiles-WebUI.yml`** — Builds Angular SPA, runs lint, deploys to Azure Static Web Apps
- **`CloudFiles-Api.yml`** — Builds .NET backend, deploys to Azure Functions

## Project Structure

```
CloudFiles/
├── .github/workflows/          # CI/CD pipelines
├── AzureToGoogle/              # Durable Functions: Azure → Google Photos
├── GoogleToGoogle/             # Durable Functions: GCS → Google Photos
├── Models/                     # Shared data models
│   ├── Azure/                  # Azure resource models
│   └── Google/                 # Google API models
├── UiBffFunctions/             # BFF HTTP trigger functions
│   ├── BFF_AzureFiles.cs       # Azure Blob Storage operations
│   ├── BFF_AzureManagement.cs  # Azure subscription/resource browsing
│   ├── BFF_GooglePhotos.cs     # Google Photos operations
│   ├── BFF_GoogleStorage.cs    # Google Cloud Storage browsing
│   └── BFF_Common.cs           # Health check, token validation
├── Utilities/
│   ├── AzureUtility.cs         # Azure Blob + Resource Manager
│   ├── GoogleUtility.cs        # Google Storage + Photos
│   └── CommonUtility.cs        # Shared helpers
├── Web.UI/                     # Angular 19 frontend
│   └── src/app/
│       ├── core/               # Auth, services, interceptors
│       ├── shared/             # Layout, navigation, animations
│       └── views/
│           ├── file-manager/           # File browsing + detail view
│           ├── storage-browser/        # Azure hierarchy browser
│           ├── google-storage-browser/ # Google Cloud Storage browser
│           ├── google-photos/          # Google Photos picker
│           ├── processes/              # Migration job monitoring
│           └── sessions/               # Sign-in, error pages
├── CloudFiles.csproj
├── Program.cs
└── host.json
```
