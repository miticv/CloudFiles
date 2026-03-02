// ─── Auth ───
export interface AuthUser {
  email: string;
  displayName: string;
  authProvider: string;
  isAdmin: boolean;
}

export interface AuthResponse {
  token: string;
  email: string;
  displayName: string;
  authProvider: string;
  isAdmin: boolean;
}

export interface ProviderStatus {
  configId: string;
  authenticated: boolean;
}

// ─── Azure Browse ───
export interface AzureSubscription {
  id: string;
  subscriptionId: string;
  displayName: string;
  tenantId: string;
  state: string;
}

export interface AzureResourceGroup {
  id: string;
  name: string;
  location: string;
}

export interface AzureStorageAccount {
  id: string;
  name: string;
  type: string;
  location: string;
  creationTime: string;
  accessTier: string;
}

export interface AzureContainer {
  id: string;
  name: string;
  lastModifiedTime: string;
}

// ─── File Manager ───
export interface FileItem {
  itemName: string;
  itemType: string;
  itemPath: string;
  isFolder: boolean;
  contentLength?: number;
  lastModified?: string;
  contentType?: string;
}

export interface FileDetail {
  itemName: string;
  itemType: string;
  itemPath: string;
  isFolder: boolean;
  contentLength: number;
  lastModified: string;
  contentType: string;
  metadata?: Record<string, string>;
}

export interface StorageContext {
  provider: 'azure' | 'google';
  account?: string;
  container?: string;
  bucket?: string;
}

// ─── Google Storage ───
export interface GoogleBucketItem {
  name: string;
  location: string;
  storageClass: string;
  timeCreated: string;
}

// ─── Google Drive ───
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  modifiedTime: string;
  iconLink: string;
  isFolder: boolean;
}

export interface GoogleDriveFileListResponse {
  nextPageToken: string | null;
  files: GoogleDriveFile[];
}

// ─── Google Photos ───
export interface PollingConfig {
  pollInterval: string;
  timeoutIn: string;
}

export interface PickingSession {
  id: string;
  pickerUri: string;
  pollingConfig: PollingConfig;
  mediaItemsSet: boolean;
  expireTime: string;
}

export interface MediaFile {
  baseUrl: string;
  mimeType: string;
  filename: string;
}

export interface PickedMediaItem {
  id: string;
  createTime: string;
  type: string;
  mediaFile: MediaFile;
}

export interface PickedMediaItemsResponse {
  mediaItems: PickedMediaItem[];
  nextPageToken: string;
}

// ─── Google Albums ───
export interface GoogleAlbum {
  id: string;
  title: string;
  productUrl?: string;
  mediaItemsCount?: string;
  coverPhotoBaseUrl?: string;
}

export interface AlbumListResponse {
  albums: GoogleAlbum[];
  nextPageToken?: string;
}

// ─── pCloud ───
export interface PCloudItem {
  name: string;
  fileId: number;
  folderId: number;
  isFolder: boolean;
  size: number;
  contentType: string;
  created: string;
  modified: string;
  parentFolderId: number;
  icon: string;
}

export interface PCloudFolderResponse {
  items: PCloudItem[];
  folderName: string;
  folderId: number;
}

export interface PCloudTokenResponse {
  accessToken: string;
  hostname: string;
}

// ─── Dropbox ───
export interface DropboxItem {
  id: string;
  name: string;
  pathDisplay: string;
  pathLower: string;
  isFolder: boolean;
  size: number;
  serverModified: string;
  contentHash: string;
}

export interface DropboxFolderResponse {
  items: DropboxItem[];
  cursor: string;
  hasMore: boolean;
}

export interface DropboxTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  accountId: string;
}

// ─── Processes ───
export interface MigrationItem {
  itemPath: string;
  isFolder: boolean;
}

export interface StartMigrationRequest {
  albumId: string;
  albumTitle: string;
  selectedItemsList: MigrationItem[];
  accountName: string;
  containerName: string;
  azureAccessToken: string;
  startedBy: string;
}

export interface PhotoCopyItem {
  id: string;
  baseUrl: string;
  mimeType: string;
  filename: string;
}

export interface StartGoogleStorageRequest {
  albumId: string;
  albumTitle: string;
  selectedItemsList: MigrationItem[];
  bucketName: string;
  startedBy: string;
}

export interface StartGooglePhotosToAzureRequest {
  photoItems: PhotoCopyItem[];
  accountName: string;
  containerName: string;
  destinationFolder: string;
  azureAccessToken: string;
  startedBy: string;
}

export interface DriveFileForCopy {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
}

export interface StartGoogleDriveToAzureRequest {
  driveItems: DriveFileForCopy[];
  accountName: string;
  containerName: string;
  destinationFolder: string;
  azureAccessToken: string;
  startedBy: string;
}

export interface GcsSelectedItem {
  itemPath: string;
  isFolder: boolean;
}

export interface StartGcsToAzureRequest {
  selectedItems: GcsSelectedItem[];
  bucketName: string;
  accountName: string;
  containerName: string;
  destinationFolder: string;
  azureAccessToken: string;
  startedBy: string;
}

export interface AzureSelectedItem {
  itemPath: string;
  isFolder: boolean;
}

export interface StartAzureToGcsRequest {
  selectedItems: AzureSelectedItem[];
  accountName: string;
  containerName: string;
  bucketName: string;
  destinationFolder: string;
  startedBy: string;
}

export interface StartJobResponse {
  id: string;
  statusQueryGetUri: string;
  sendEventPostUri: string;
  terminatePostUri: string;
  purgeHistoryDeleteUri: string;
  restartPostUri: string;
}

export const OrchestrationRuntimeStatus = {
  Running: 0,
  Completed: 1,
  ContinuedAsNew: 2,
  Failed: 3,
  Canceled: 4,
  Terminated: 5,
  Pending: 6,
} as const;

export type OrchestrationRuntimeStatus = (typeof OrchestrationRuntimeStatus)[keyof typeof OrchestrationRuntimeStatus];

export interface OrchestrationInstance {
  name: string;
  instanceId: string;
  runtimeStatus: OrchestrationRuntimeStatus;
  createdAt: string;
  lastUpdatedAt: string;
  serializedInput: string;
  serializedOutput: string;
  serializedCustomStatus: string;
  hasFailedFiles?: boolean;
}

export interface ProcessListParams {
  pageSize?: number;
  from?: string;
  to?: string;
  statusList?: number[];
  all?: boolean;
}

// ─── Admin ───
export interface UserDto {
  email: string;
  displayName: string;
  authProvider: string;
  createdAt: string;
  lastLoginAt: string;
  isApproved: boolean;
  isActive: boolean;
  partitionKey: string;
  rowKey: string;
}

// ─── Dropbox Migrations ───
export interface DropboxFileForCopy {
  path: string;
  name: string;
  size: number;
}

export interface StartDropboxToAzureRequest {
  items: DropboxFileForCopy[];
  accountName: string;
  containerName: string;
  destinationFolder: string;
  azureAccessToken: string;
  startedBy: string;
}

export interface StartAzureToDropboxRequest {
  selectedItems: AzureSelectedItem[];
  accountName: string;
  containerName: string;
  destinationFolder: string;
  startedBy: string;
}

// ─── Navigation ───
export interface ConnectionStatus {
  configId: string;
  label: string;
  connected: boolean;
}

export interface MenuItem {
  type: 'link' | 'separator';
  name?: string;
  path?: string;
  icon?: string;
  connectionStatuses?: ConnectionStatus[];
}
