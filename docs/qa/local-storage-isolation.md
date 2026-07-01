# QA localStorage isolation

## Rule

QA must not write mock API settings into the user's real Electron profile.

## Why

A previous QA run replaced real API provider settings with a mock channel (`qa-text`, `127.0.0.1:*`). After the mock server stopped, the app appeared to have lost the user's API configuration and requests failed with `fetch failed`.

## Required practice

Before any test that changes API settings, model preferences, or provider localStorage:

1. Prefer a separate Electron `userData` directory for QA.
2. If using the real profile is unavoidable, export these keys first and restore them after the test:
   - `endless-creation.api-provider-config`
   - `endless-creation.model-preferences`
   - `endless-creation.generation-preferences`
   - `endless-creation.webdav-config`
3. Do not leave `qa-*`, `mock-*`, or `127.0.0.1:*` provider channels in the user's real profile.
4. End every QA run by confirming the API provider config was restored.

## Minimal restore check

```js
JSON.parse(localStorage.getItem('endless-creation.api-provider-config') || '{}').channels?.map((channel) => ({
  name: channel.name,
  baseUrl: channel.baseUrl,
  hasKey: Boolean(channel.apiKey),
}))
```
