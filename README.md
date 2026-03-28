# Confluxa ARC CLI (`arc`)

`arc` is a local-first coordination CLI for multiple AI agents and tools.

It is not an LLM. It is the shared messaging and conflict-resolution layer between AIs, built around a local `.confluxa/` folder.

## Why ARC

When multiple agents collaborate on the same task, they often produce competing outputs. ARC keeps that process structured and readable:

- publish proposals/results/notes into a shared local workspace
- inspect task history quickly
- detect conflicts and generate a digest resolution
- keep everything file-based and offline-friendly

## Quick start

```bash
npm install
npm run build
npm link
```

Run a complete demo in one command:

```bash
arc demo
```

Run targeted demo scenarios:

```bash
arc demo auth
arc demo api
arc demo database
```

## Core commands

### Initialize workspace

```bash
arc init
```

Creates:

- `.confluxa/context.json`
- `.confluxa/messages/`
- `.confluxa/tasks/`

### Publish a message

```bash
arc publish --task <task_id> --type <proposal|result|note> --content "<text>" --agent <name>
```

### View task messages

```bash
arc view auth
```

Grouped by agent with human-friendly timestamps.

### Resolve a task

```bash
arc resolve auth
arc resolve auth --json
```

- default: polished human-readable output
- `--json`: machine-readable output only

### Workspace status

```bash
arc status
```

Shows workspace health, message count, task count, and recent tasks.

### Explain ARC quickly

```bash
arc explain
```

Prints a concise developer-focused explanation of what ARC does, how it works, and why it matters.

## Demo-ready workflow

```bash
arc init
arc publish --task auth --type proposal --content "Use JWT for APIs" --agent gpt
arc publish --task auth --type proposal --content "Use OAuth for third-party integrations" --agent claude
arc resolve auth
```

## Text-based sample outputs

### `arc status`

```text
Workspace: OK
Tasks: 2
Messages: 5
Recent tasks:
* auth
* payment
```

### `arc resolve auth`

```text
=== ARC Resolution ===
Task: auth

Status: CONFLICT

Agents involved:

* gpt -> "Use JWT for APIs"
* claude -> "Use OAuth for third-party integrations"

Suggested Resolution:
Use JWT for internal services and OAuth for external integrations
```

### `arc resolve auth --json`

```json
{
  "status": "conflict",
  "messages": [],
  "resolution": "Use JWT for APIs and OAuth for third-party integrations"
}
```
