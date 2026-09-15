# polymath-jage (Codebase Manager)

[![NPM Version](https://img.shields.io/npm/v/polymath-jage.svg)](https://www.npmjs.com/package/polymath-jage)
[![GitHub Repository](https://img.shields.io/badge/GitHub-polymath--void%2Fpolymath--jage-blue)](https://github.com/polymath-void/polymath-jage)

A robust, platform-independent, zero-dependency Universal Codebase Manager. `polymath-jage` brings a purely deterministic, content-addressable semantic version control system to your entire workspace.

Designed for the modern era of massive architectures, it moves beyond traditional line-by-line diffing. Instead, it mathematically deconstructs your code into structural semantic blocks (Functions, Classes, Markdown Headers) and orchestrates them across an infinite-depth swarm network.

## The Problem It Solves

Modern development requires handling massive, deeply nested, multi-repository codebases. Traditional version control systems struggle with:
1. **Semantic Blindness:** Moving a function from one file to another is tracked as a deletion and an addition. The system doesn't actually understand that the *logic* is the same.
2. **Dependency Bloat:** Most modern AST parsers require massive `node_modules` trees, slowing down global execution.
3. **Submodule Friction:** Managing nested repositories (like Git Submodules) is notoriously brittle and difficult to keep synchronized.

`polymath-jage` solves all of these problems at the architectural level.

## Core Features

- **Semantic AST Blob Storage:** Intelligently maps and deduplicates functions, classes, and markdown blocks universally. If 10 projects share the same boilerplate function, it is stored exactly once.
- **Zero-Dependency Native Parser:** Parses JavaScript, JSX, Python, C, Kotlin, XML, and Markdown entirely natively. No third-party compilers. No Acorn.
- **Symbiotic Swarm Sync:** Master root nodes automatically bind to sub-nodes. Pushes perfectly synchronize 2-way data architectures through infinite recursive deep layers.
- **Auto-Cleanup Reverse Sweep:** Automatically detects deleted and moved files to dynamically prune stale schemas, keeping your map perfectly aligned.

## v2.0.0 — New Features

### 🔗 AST Dependency Graph (Blast Radius Analysis)
Track cross-file dependencies and compute the impact of your changes before they break downstream consumers.

```bash
$ jage push --analyze

Analyzing AST modifications...
Modified nodes detected:
  - src/auth.js: validateToken()

⚠️  BLAST RADIUS WARNING ⚠️
The following downstream nodes may be impacted:
  - src/api/users.js: getUserProfile() (Direct dependency)
  - src/api/posts.js: createPost() (Direct dependency)
  - src/server.js: requestHandler() (Depth 2 dependency)

Total impacted nodes: 3 across 3 file(s).
```

### ⏪ Atomic Node Rollbacks
Surgically revert a single broken function or class to a previous version while keeping the rest of the file's new logic intact. No more reverting entire files.

```bash
$ jage revert node push.js:js_block_runPush --version=3

✔ Dry-run structural validation passed.
✔ Successfully reverted 'js_block_runPush' in 'push.js' to version 3.
```

### 👻 Daemon Mode (Auto-Trigger Hooks)
AI agents shouldn't have to invoke `jage push` after every edit. Daemon Mode runs a silent background watcher that automatically triggers AST hashing when files are saved.

```bash
$ jage daemon start
Daemon started in background (PID: 12345). Logs at .jsagent/daemon.log

$ jage daemon stop
Daemon stopped (PID: 12345).
```

### 🤖 Android Reference Resolution Linter
A pre-push validation plugin that catches broken XML resource references and Kotlin semantic errors *before* they reach CI.

```bash
$ jage push
[INFO] Android Linter: Building resource dictionary...
[INFO] Android Linter: Validating layout references...
[FATAL] Semantic Resolution Failed
  res/layout/fragment_home.xml:55:12: error: resource 'style/Theme.PolymathFS' not found
   -> Did you mean: '@style/Theme.PolymathFileSystem'?
[ABORT] Push cancelled. Codebase structural integrity preserved.
```

## Benchmarks: polymath-jage vs. Git

While Git is the standard for raw text versioning, `polymath-jage` is engineered for **Semantic Swarm Architecture**.

| Feature | Git | polymath-jage |
| :--- | :--- | :--- |
| **Tracking Method** | Line-by-line Text Diffs | Semantic AST Structural Hashes |
| **Code Refactoring** | Tracks as Add/Delete | Tracks as identical block (Zero storage overhead) |
| **Nested Repositories** | Complex Submodules | Native Two-Way Symbiotic Swarm Sync |
| **Deduplication** | File-level | Function/Class/Section-level |
| **Dependencies** | Requires Git Binary | Pure Node.js (Zero Dependencies) |
| **Impact Analysis** | None | AST Dependency Graph with Blast Radius |
| **Rollbacks** | Full file revert | Surgical per-function rollback |
| **Background Sync** | Manual commits | Auto-trigger Daemon Mode |

## Installation & Usage

Install globally across any architecture (Windows, Mac, Linux, Termux):

```bash
npm install -g polymath-jage
```

### 1. Initialize a Node
```bash
jage init
```
*If a Master Root node initializes above existing sub-projects, it will automatically detect them and form a Swarm topology.*

### 2. Map and Sync
```bash
jage push
```

### 3. Analyze Impact
```bash
jage push --analyze
```

### 4. Surgical Rollback
```bash
jage revert node <filename>:<blockName> --version=<v#>
```

### 5. Background Daemon
```bash
jage daemon start
jage daemon stop
```

---
*Created by Rahman Shuvo --polymath-void*
