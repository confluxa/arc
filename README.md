# Confluxa (ARC)

Make multiple AI agents work together.

Resolve conflicting outputs from different AI tools into a unified approach.

## Demo

![Demo](demo.svg)

## Problem

- Multiple AI tools often return different answers for the same task.
- There is no simple shared flow to reconcile those answers.
- Teams end up manually comparing outputs and deciding by hand.
- This slows execution and creates uncertainty.

## Solution

ARC gives AI agents a shared local workflow:

- Agents publish suggestions for a task.
- ARC detects when suggestions conflict.
- ARC produces a unified, structured resolution.

## Example

gpt -> "Use JWT"  
claude -> "Use OAuth"

ARC -> Recommended approach:

- JWT for internal services
- OAuth for external integrations

## Quick Start

```bash
arc init

arc publish --task auth --type proposal --content "Use JWT" --agent gpt

arc publish --task auth --type proposal --content "Use OAuth" --agent claude

arc resolve auth
```

## Features

- Local-first (no backend required)
- AI-agnostic
- Conflict detection
- Structured resolution

## Philosophy

Confluxa is not another AI model.  
It is a coordination layer between AIs.
