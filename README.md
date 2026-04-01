# Confluxa (ARC)

**Make multiple AI agents work together.**

When different AI tools give conflicting answers, ARC helps you converge on a single, coherent approach.

---

## Demo

> Two AI agents disagree. ARC resolves.

ARC shows how conflicting outputs from different AI agents can be resolved into a single approach.

![Demo](demo.svg)

---

## Try it in 10 seconds

```bash
# clone repo
git clone https://github.com/confluxa/arc
cd arc

# install & build
npm install
npm run build

# run demo
node bin/arc.js demo
```

---

## The Problem

Using multiple AI tools often leads to:

* Different answers for the same question
* No shared context between tools
* Manual comparison and decision-making
* Slower execution and uncertainty

---

## The Solution

ARC introduces a simple coordination layer:

* Agents publish suggestions for a task
* ARC detects conflicts automatically
* ARC produces a unified, structured resolution

---

## Example

gpt → "Use JWT"
claude → "Use OAuth"

**ARC → Recommended approach (unified decision):**

* JWT for internal services
* OAuth for external integrations

---

## Quick Start

```bash
arc init

arc publish --task auth --type proposal --content "Use JWT" --agent gpt

arc publish --task auth --type proposal --content "Use OAuth" --agent claude

arc resolve auth
```

---

## Install (dev)

```bash
npm install
npm run build
npm link
```

Then run:

```bash
arc demo
```

---

## Why ARC?

* Local-first (no backend required)
* Works with any AI tool
* Makes conflicting outputs actionable
* Turns multiple answers into one decision

---

## Philosophy

Confluxa is not another AI model.
It is a coordination layer between AIs.

---

## Status

Early prototype. Feedback welcome.

---

## Feedback

If this is useful (or not), open an issue or drop a comment.
