export type ThemeMode = 'dark' | 'light';

export type GenerationTaskType = 'text' | 'image' | 'video' | 'library';
export type CreationMode = GenerationTaskType;
export type GenerationMode = GenerationTaskType;

export type GenerationTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type GenerationProviderKind =
  | 'mock'
  | 'openai-compatible'
  | 'local-openai-compatible'
  | 'ollama'
  | 'comfyui'
  | 'stable-diffusion-webui';

export type GenerationResultCopyFormat = 'plain-text' | 'markdown' | 'url' | 'json';

export interface NavItem {
  id: CreationMode;
  label: string;
  description: string;
  shortcut: string;
}

export interface RecentProject {
  id: string;
  title: string;
  type: string;
  updatedAt: string;
  status: 'draft' | 'ready' | 'review';
}

export interface ProjectAssetRef {
  id: string;
  taskId?: string;
  kind: GenerationTaskType;
  title?: string;
  url?: string;
  localPath?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  assetIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GenerationProviderConfig {
  id: string;
  name: string;
  kind: GenerationProviderKind;
  enabled: boolean;
  baseUrl?: string;
  defaultTextModel?: string;
  defaultImageModel?: string;
  defaultVideoModel?: string;
  capabilities: {
    text?: boolean;
    image?: boolean;
    video?: boolean;
    progress?: boolean;
    cancel?: boolean;
  };
  /** Reference to an OS keychain entry. Never expose the secret value to renderer code. */
  secretRef?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationTaskInput {
  type: GenerationTaskType;
  prompt: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface TextGenerationTaskInput extends GenerationTaskInput {
  type: 'text';
  tone?: 'creative' | 'professional' | 'casual';
}

export interface ImageGenerationTaskInput extends GenerationTaskInput {
  type: 'image';
  style?: 'cinematic' | 'anime' | 'realistic';
  width?: number;
  height?: number;
}

export interface VideoGenerationTaskInput extends GenerationTaskInput {
  type: 'video';
  durationSeconds?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
}

export interface LibraryGenerationTaskInput extends GenerationTaskInput {
  type: 'library';
}

export type CreateGenerationTaskInput =
  | TextGenerationTaskInput
  | ImageGenerationTaskInput
  | VideoGenerationTaskInput
  | LibraryGenerationTaskInput;

export interface GenerationProgress {
  percent: number;
  stage?: 'queued' | 'preparing' | 'generating' | 'finalizing';
  message?: string;
}

export type GenerationTaskErrorCode =
  | 'VALIDATION_ERROR'
  | 'MOCK_FAILED'
  | 'TASK_NOT_FOUND'
  | 'TASK_NOT_READY'
  | 'CANCELLED'
  | 'UNKNOWN_ERROR';

export interface GenerationTaskError {
  code: GenerationTaskErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

export interface GenerationResult {
  /** Legacy renderer summary fields kept stable for v0.3 UI. */
  title: string;
  summary: string;
  content: string;
  type?: GenerationTaskType;
  assets?: ProjectAssetRef[];
}

export interface GenerationTask {
  id: string;
  /** v0.3 legacy UI mode; mirrors input.type. */
  mode: GenerationMode;
  /** Future bridge task type; mirrors mode while renderer migrates. */
  type?: GenerationTaskType;
  prompt: string;
  input?: CreateGenerationTaskInput;
  status: GenerationTaskStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  result?: GenerationResult;
  error?: GenerationTaskError;
  /** Legacy error message for current UI. */
  errorMessage?: string;
  progress?: GenerationProgress;
  providerId?: string;
  providerTaskId?: string;
  projectId?: string;
  retryOfTaskId?: string;
  retryCount?: number;
}

export interface RetryGenerationTaskInput {
  taskId: string;
  overrides?: Partial<CreateGenerationTaskInput>;
}

export interface CopyGenerationResultInput {
  taskId: string;
  format: GenerationResultCopyFormat;
}

export interface CopyGenerationResult {
  text: string;
  format: GenerationResultCopyFormat;
}

export interface DesktopAiClient {
  createGenerationTask(input: CreateGenerationTaskInput): Promise<GenerationTask>;
  getGenerationTask(taskId: string): Promise<GenerationTask>;
  retryGenerationTask(input: RetryGenerationTaskInput): Promise<GenerationTask>;
  copyGenerationResult(input: CopyGenerationResultInput): Promise<CopyGenerationResult>;
}
