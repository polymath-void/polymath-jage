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
- **Zero-Dependency Native Parser:** Parses JavaScript, JSX, Python, C, and Markdown entirely natively. No third-party compilers. No Acorn.
- **Symbiotic Swarm Sync:** Master root nodes automatically bind to sub-nodes. Pushes perfectly synchronize 2-way data architectures through infinite recursive deep layers.
- **Auto-Cleanup Reverse Sweep:** Automatically detects deleted and moved files to dynamically prune stale schemas, keeping your map perfectly aligned.

## Benchmarks: polymath-jage vs. Git

While Git is the standard for raw text versioning, `polymath-jage` is engineered for **Semantic Swarm Architecture**.

| Feature | Git | polymath-jage |
| :--- | :--- | :--- |
| **Tracking Method** | Line-by-line Text Diffs | Semantic AST Structural Hashes |
| **Code Refactoring** | Tracks as Add/Delete | Tracks as identical block (Zero storage overhead) |
| **Nested Repositories** | Complex Submodules | Native Two-Way Symbiotic Swarm Sync |
| **Deduplication** | File-level | Function/Class/Section-level |
| **Dependencies** | Requires Git Binary | Pure Node.js (Zero Dependencies) |

## Installation & Usage

Install globally across any architecture (Windows, Mac, Linux, Termux):

```bash
npm install -g polymath-jage
```

### 1. Initialize a Node
Initialize the repository at any directory level:
```bash
jage init
```
*If a Master Root node initializes above existing sub-projects, it will automatically detect them and form a Swarm topology.*

### 2. Map and Sync
Scan the architecture and push semantic diffs:
```bash
jage push
```
*If executed inside a Sub-Agent, the engine will process local hashes and automatically teleport a synchronized copy to the Master Root Overlord.*

---
*Created by Rahman Shuvo --polymath-void*
