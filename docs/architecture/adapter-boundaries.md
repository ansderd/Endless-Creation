# Adapter Boundaries for v0.1 Desktop AI Framework

Endless Creation v0.1 is scoped as a **native desktop AI creation platform framework**. The AI layer is intentionally limited to mock behavior and adapter boundaries so the app can stabilize its Electron + React shell before any real provider integration.

## v0.1 Scope

v0.1 does **not** implement a real AI backend.

In this release:

- AI generation is mock-only.
- Provider calls are represented by adapter interfaces, not live integrations.
- No API keys are requested, stored, bundled, or written to disk.
- No cloud AI service is introduced.
- No local model runtime is started or managed.
- No ComfyUI, Stable Diffusion, OpenAI-compatible API, or video provider is called.

The goal is to keep renderer code pointed at stable service boundaries while leaving all real provider work for later versions.

## Current Mock / Adapter Role

The current AI service should be treated as a renderer-facing mock adapter. It exists to let UI flows exercise these concepts without depending on external systems:

- Creating a generation task.
- Returning a task status.
- Producing a mock result for text, image, video, or project-library workflows.
- Formatting generated content for copy actions.
- Preserving a future-compatible task shape.

The mock adapter is not a provider implementation. It should not grow provider-specific request payloads, API keys, cloud SDKs, model downloads, or local service launch logic.

## Future Provider Call Path

The intended provider boundary is:

```text
React renderer
  -> renderer service adapter
  -> Electron preload bridge
  -> Electron main process
  -> provider registry / provider adapter
  -> cloud API, local model service, ComfyUI, Stable Diffusion, or workflow service
```

### Renderer

The renderer owns UI state and calls a typed client such as `DesktopAiClient`. It should only know app-level concepts:

- `createGenerationTask`
- `getGenerationTask`
- `retryGenerationTask`
- `copyGenerationResult`
- task status and progress display
- user-facing error messages

The renderer must not directly access:

- provider secrets
- `process.env`
- Node filesystem APIs
- raw Electron IPC
- provider-specific HTTP endpoints
- provider-native workflow JSON, unless explicitly represented as user-editable project data later

### Renderer Service Adapter

The renderer service adapter is the compatibility layer between React and Electron. In v0.1 it can use mock behavior. In later versions it can delegate to `window.endlessCreationBridge.ai` when the preload bridge exposes a real AI bridge.

This layer should keep UI calls stable even if the implementation changes from mock to main-process provider orchestration.

### Preload Bridge

The preload bridge should expose a narrow, typed, allowlisted API. It should forward validated requests to the main process via IPC and return normalized results.

The preload bridge should not:

- store API keys
- construct provider requests
- perform model inference
- read or write arbitrary project files
- expose raw `ipcRenderer`, `fs`, `path`, or environment variables to the renderer

### Main Process / Provider Layer

The main process is the future local backend. It should own:

- provider configuration loading
- secure secret lookup
- provider registry selection
- task queue management
- cancellation coordination
- progress polling or event forwarding
- result persistence into project assets
- error normalization

Provider adapters should translate app-level task inputs into provider-specific calls and translate provider responses back into app-level task results.

## Capabilities and Provider Expansion

Generation capabilities should be modeled separately from concrete providers. A provider may support one or more capabilities.

### Text Generation

Future text providers may include:

- OpenAI-compatible cloud APIs
- local OpenAI-compatible servers
- Ollama
- LM Studio
- llama.cpp or vLLM endpoints

Text should remain an app-level capability with common inputs such as prompt, system prompt, tone, context, and model preference. Provider-specific options should stay inside provider config or a controlled advanced-options object.

### Image Generation

Future image providers may include:

- ComfyUI workflows
- Stable Diffusion WebUI
- local image-generation servers
- cloud image APIs

Image generation should support capability-level fields such as prompt, negative prompt, style, dimensions, seed, reference images, and workflow preset. Raw ComfyUI graphs or Stable Diffusion payloads should be hidden behind provider adapters unless the product explicitly adds an advanced workflow editor.

### Video Generation

Future video providers may include:

- ComfyUI video workflows
- AnimateDiff / Stable Video Diffusion style local workflows
- cloud video generation APIs
- custom render queues

Video tasks should be assumed to be long-running and asynchronous. They need stronger progress, cancellation, retry, timeout, and result-storage boundaries than short text tasks.

### Project Library

The project-library capability is not necessarily a model provider. It may combine:

- local project metadata indexing
- text summarization
- asset classification
- search / retrieval
- future embeddings

For v0.1 it remains mock-only. Later, it can be represented as a capability that may use text providers, local storage, and project-index services behind the same task boundary.

## Suggested Provider Shape

A future provider config can be shaped around capabilities instead of features hard-coded into UI:

```ts
type ProviderKind =
  | 'mock'
  | 'openai-compatible'
  | 'local-openai-compatible'
  | 'ollama'
  | 'comfyui'
  | 'stable-diffusion-webui';

interface ProviderConfig {
  id: string;
  name: string;
  kind: ProviderKind;
  enabled: boolean;
  baseUrl?: string;
  capabilities: {
    text?: boolean;
    image?: boolean;
    video?: boolean;
    projectLibrary?: boolean;
    progress?: boolean;
    cancel?: boolean;
  };
  secretRef?: string;
}
```

`secretRef` is only a reference to a secure-store entry. It must never contain the secret value.

## Task Lifecycle

All generation-like work should use a common task lifecycle:

```text
queued -> running -> succeeded
queued -> running -> failed
queued -> cancelled
running -> cancelled
failed -> retry creates a new task
```

Recommended task concerns:

- `taskId` is app-owned, not provider-owned.
- `providerTaskId` is optional and only used by provider adapters.
- Retry should create a new task linked by `retryOfTaskId` instead of mutating history.
- Cancel should be best-effort. If a provider cannot cancel, the app may mark the task cancelled and ignore late provider results.
- Long-running providers should report progress when available, but UI must tolerate providers without progress support.

## Progress, Errors, and Retry

Progress should be normalized to simple app fields:

- percentage when known
- stage label when useful
- user-facing message
- estimated remaining time only when trustworthy

Errors should be normalized before reaching the renderer. Provider-native errors can be logged or attached as diagnostic details, but UI should receive stable app-level codes such as:

- `VALIDATION_ERROR`
- `PROVIDER_NOT_CONFIGURED`
- `SECRET_MISSING`
- `PROVIDER_CONNECTION_FAILED`
- `MODEL_NOT_FOUND`
- `RATE_LIMITED`
- `CONTENT_BLOCKED`
- `GENERATION_FAILED`
- `TASK_CANCELLED`
- `STORAGE_FAILED`
- `UNKNOWN_ERROR`

Retry behavior should depend on the error:

- retryable: transient network failure, provider timeout, local service temporarily unavailable, rate limit after backoff
- not retryable without user action: missing secret, invalid base URL, model not found, validation error, content blocked

## Secrets and Security

Secrets are out of scope for v0.1 and must remain unimplemented.

When implemented later:

- API keys belong in OS-level secure storage, such as Windows Credential Manager, macOS Keychain, Linux Secret Service, or a vetted wrapper such as `keytar`.
- Renderer code should only see `hasSecret: boolean` or a `secretRef`, never the secret value.
- Project files must not contain API keys.
- Local storage must not contain API keys.
- Preload must not expose secret read APIs.
- Logs and error messages must redact tokens, authorization headers, and signed URLs.

## Local Model / Local Service Notes

Local services are out of scope for v0.1.

When added later, the app should treat local services as user-managed endpoints first:

- Do not silently start Ollama, ComfyUI, or Stable Diffusion in early integrations.
- Let users configure `baseUrl`.
- Provide explicit connection tests.
- Detect common local URLs as suggestions only, not assumptions.
- Keep model download and runtime management as a separate product decision.

## v0.1 Boundary Decision

For v0.1, Endless Creation should ship as a desktop framework with mock AI boundaries only. The correct implementation posture is:

- keep UI stable
- keep service contracts typed
- keep Electron bridge narrow
- keep provider details behind future main-process adapters
- avoid real backend, real cloud services, real local inference, and real secrets

This keeps the app safe, testable, and ready for incremental provider integration after the native desktop shell is stable.
