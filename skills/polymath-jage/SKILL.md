---
name: polymath-jage
description: Standard Operating Procedure for using polymath-jage, the zero-dependency semantic AST version control and swarm orchestration codebase manager.
---

# Polymath-Jage Codebase Management Protocol

`polymath-jage` is a deterministic, content-addressable version control system that tracks semantic AST blocks (Functions, Classes, Markdown Headers) instead of line-by-line text diffs. 

Whenever you (an AI Agent) are tasked with managing, modifying, or reading a codebase that utilizes this tool, you MUST follow these procedures to maintain the integrity of the Symbiotic Swarm Architecture.

## Core Commands

- **Initialize Repository:** `jage init`
  Run this command to map the semantic diffs of a new directory. If run inside a sub-directory of a Root Swarm, it will automatically inject a `parent_node` binding.

- **Push Semantic Updates:** `jage push`
  Run this command IMMEDIATELY after making any structural or functional edits to a codebase. This guarantees that the native parser correctly hashes your changes, deduplicates the data, and updates the global Object Schema across all layers.

## Agent Directives

As an autonomous agent operating in a `polymath-jage` governed repository:
1. **Never edit the `.jsagent` directory manually.** It is a strictly controlled mathematical database.
2. **Execute `jage push` frequently.** After you write a new script, modify a component, or generate a markdown file, run `jage push` in the terminal to ensure the engine maps your actions.
3. **Respect Symbiotic Links:** If you are working in a deeply nested sub-project, running `jage push` locally will instantly sync your schemas up to the Root Overlord. You do not need to traverse directories to sync.
4. **Clean File Management:** Because `jage` automatically handles Reverse-Sweep Cleanups, if you (the agent) delete or move a file, you do not need to manage the old schemas. Simply run `jage push` and the engine will garbage collect stale data automatically.
