# CloudFiles

Multi-cloud file browser for Azure Blob Storage and Google Cloud Storage. Browse, view, and manage files across multiple cloud providers from a single interface.

## Architecture

```
Angular 19 SPA  ──>  Azure Functions v4 (.NET 8)  ──>  Azure Blob Storage
                                                   ──>  Google Cloud Storage
                                                   ──>  Google Photos API
                                                   ──>  Azure Resource Manager
```

- **Frontend**: Angular 19 standalone app with Material Design, Tailwind CSS, NgRx state management
- **Backend**: Azure Functions v4 isolated worker process (.NET 8) serving as a BFF (Backend for Frontend)
- **Auth**: Multi-provider OIDC via `angular-auth-oidc-client` — simultaneous Google + Azure sessions
- **Deployment**: GitHub Actions CI/CD to Azure Static Web Apps (frontend) + Azure Functions (API)

## Tech Stack

### Frontend (`Web.UI/`)
| Technology | Purpose |
|---|---|
| Angular 19 | SPA framework (standalone bootstrap) |
| Angular Material 19 | UI component library |
| Tailwind CSS | Utility-first CSS |
| NgRx (Store, Effects, Router-Store) | State management |
| angular-auth-oidc-client | Multi-provider OIDC authentication |
| @ngx-translate | i18n support |

### Backend (root)
| Technology | Purpose |
|---|---|
| .NET 8 | Runtime |
| Azure Functions v4 (isolated worker) | Serverless API |
| Azure.Storage.Blobs | Azure Blob Storage access |
| Azure.ResourceManager | Azure subscription/resource browsing |
| Durable Functions | Long-running file copy orchestrations |

## Getting Started

### Prerequisites
- Node.js 20+ (see `.nvmrc`)
- .NET 8 SDK
- Azure Functions Core Tools v4
- Azure CLI (`az`)

### Environment Setup

1. **Clone and install**:
   ```bash
   git clone <repo-url>
   cd CloudFiles
   dotnet restore
   cd Web.UI && npm install
   ```

2. **Populate secrets from Bitwarden** (recommended):
   ```bash
   # Install prerequisites (one-time)
   npm install -g @bitwarden/cli
   # jq is also required: https://jqlang.github.io/jq/download/

   # Run the setup script — generates local.settings.json, environment.ts, environment.prod.ts
   bash setup-secrets.sh
   ```
   This reads from a Bitwarden item named **"CloudFiles"** with these custom fields:

   | Field | Description |
   |-------|-------------|
   | `GoogleClientId` | Google OAuth Client ID |
   | `GoogleClientSecret` | Google OAuth Client Secret |
   | `AzureTenantId` | Azure AD Tenant ID |
   | `AzureClientId` | Azure App Registration Client ID |
   | `ProductionApiUrl` | Production API base URL |

3. **Or configure manually** — copy templates and fill in values:
   ```bash
   # Backend
   cp local.settings.example.json local.settings.json
   # edit local.settings.json with your values

   # Frontend
   cp Web.UI/src/environments/environment.template.ts Web.UI/src/environments/environment.ts
   cp Web.UI/src/environments/environment.prod.template.ts Web.UI/src/environments/environment.prod.ts
   # edit both files with your values
   ```

4. **Run locally**:
   ```bash 

    # Terminal 1: azurite (when "AzureWebJobsStorage": "UseDevelopmentStorage=true")
    npx azurite --silent --location .azurite
   
   # Terminal 2: Backend
   func start

   # Terminal 3: Frontend
   cd Web.UI && ng serve
   ```

## Authentication

CloudFiles uses **per-user OAuth tokens** for all cloud operations — no service accounts. Each user sees only their own resources.

### Providers

| Provider | OIDC Config | Scopes | Resources |
|----------|-------------|--------|-----------|
| Google | `google` | `openid email profile`, `photoslibrary.appendonly`, `photoslibrary.readonly.appcreateddata`, `photospicker.mediaitems.readonly`, `devstorage.read_only` | Google Photos, Google Cloud Storage |
| Azure (Management) | `azure` | `openid profile`, `management.azure.com/user_impersonation` | Subscriptions, resource groups, storage accounts |
| Azure (Storage) | `azure-storage` | `openid profile`, `storage.azure.com/user_impersonation` | Blob file read/download |

### How it works

The sign-in page shows provider cards with Connect/Disconnect buttons. Users can be logged into multiple providers simultaneously. The HTTP interceptor automatically attaches the correct Bearer token based on the request URL:

| URL pattern | Token used |
|-------------|------------|
| `/azure/files/*` | `azure-storage` |
| `/azure/*` | `azure` |
| `/google/*`, `/process/*` | `google` |

The backend validates each token and forwards it to the respective cloud API. No secrets or service accounts are stored on the server — the user's own OAuth token provides access to their cloud resources.

## API Endpoints

### File Browsing (BFF)
| Method | Route | Description |
|---|---|---|
| GET | `azure/files/list?path=` | List files/folders in Azure Blob Storage |
| GET | `azure/files/item?path=` | Download a file from Azure Blob Storage |
| GET | `azure/files/json?path=` | Get file metadata + base64 content |
| GET | `google/files/list?bucket=&path=` | List files in Google Cloud Storage |

### Azure Resource Browsing
| Method | Route | Description |
|---|---|---|
| GET | `azure/subscription/list` | List Azure subscriptions |
| GET | `azure/subscription/{id}/list` | List resource groups |
| GET | `azure/subscription/{id}/ResourceGroup/{rg}/list` | List storage accounts |
| GET | `azure/subscription/{id}/ResourceGroup/{rg}/accountName/{name}/list` | List blob containers |

### Google Cloud Storage
| Method | Route | Description |
|---|---|---|
| GET | `google/storage/buckets?projectId=` | List buckets in a GCP project |

### Google Photos (Picker API)
| Method | Route | Description |
|---|---|---|
| POST | `google/photos/sessions` | Create a Photos Picker session |
| GET | `google/photos/sessions/{id}` | Poll picker session status |
| GET | `google/photos/sessions/{id}/media` | List picked media items |
| DELETE | `google/photos/sessions/{id}` | Delete picker session |
| GET | `google/photos/image?url=` | Proxy image with auth header |
| GET | `google/album/list` | List Google Photos albums (legacy) |
| POST | `google/album` | Create a new album (legacy) |

### Utility
| Method | Route | Description |
|---|---|---|
| GET | `ping` | Health check |
| GET | `google/tokenvalidate` | Validate Google token |
| GET | `process/instances` | List Durable Function instances |

## Deployment

CI/CD is configured via GitHub Actions:

- **`CloudFiles-WebUI.yml`** — Builds and deploys the Angular SPA to Azure Static Web Apps
- **`CloudFiles-Api.yml`** — Builds and deploys the .NET Azure Functions to Azure

### GitHub Secrets Required
| Secret | Description |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_WONDERFUL_HILL_0CA4C2B0F` | Azure Static Web Apps deployment token |
| `CLOUDFILES_DEPLOYAZUREFUNCTIONS` | Azure Functions publishing profile |

## Project Structure

```
CloudFiles/
├── .github/workflows/       # CI/CD pipelines
├── AzureToGoogle/            # Durable Functions: Azure → Google Photos copy
├── GoogleToGoogle/           # Durable Functions: GCS → Google Photos copy
├── Models/                   # Shared data models
│   ├── Azure/                # Azure resource models
│   └── Google/               # Google API models
├── UiBffFunctions/           # BFF HTTP trigger functions
│   ├── BFF_AzureFiles.cs     # Azure Blob Storage file operations
│   ├── BFF_AzureManagement.cs# Azure subscription/resource browsing
│   ├── BFF_GooglePhotos.cs   # Google Photos album operations
│   ├── BFF_GoogleStorage.cs  # Google Cloud Storage file listing
│   └── BFF_Common.cs         # Health check, token validation
├── Utilities/                # Business logic
│   ├── AzureUtility.cs       # Azure Blob + Resource Manager operations
│   ├── GoogleUtility.cs      # Google Auth + Storage + Photos operations
│   └── CommonUtility.cs      # Shared helpers
├── Web.UI/                   # Angular 19 frontend
│   └── src/
│       ├── app/
│       │   ├── core/         # Auth services, HTTP service
│       │   ├── shared/       # Layout components, navigation
│       │   └── views/        # Feature modules
│       │       ├── file-manager/     # File browsing + detail view
│       │       ├── storage-browser/        # Azure hierarchy browser
│       │       ├── google-storage-browser/# Google Cloud Storage browser
│       │       ├── google-photos/         # Google Photos picker browser
│       │       └── sessions/              # Sign-in, 404, error pages
│       └── environments/     # Environment configs (gitignored, use setup-secrets.sh)
├── CloudFiles.csproj         # .NET project
├── Program.cs                # Azure Functions host setup
└── host.json                 # Functions host config
```
