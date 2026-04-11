---
title: "I Didn't Read Any RAG Papers. I Just Built a Test Harness."
slug: "rag-retrieval-harness"
date: 2026-04-11
tags: ["AI", "RAG", "memory-systems", "testing", "ChromaDB", "Claude"]
category: "AI & Automation"
reading_time: "~9 min"
description: "How a QA engineer approached AI memory optimization the only way he knows — by building a regression test harness first, then iterating until the numbers moved. No papers, no theory, just hypothesis-driven experimentation."
og_image: "<!-- PLACEHOLDER: Terminal showing 61/61 passed, MRR 0.960 -->"
draft: true
---

My AI agents were eating 40% of their context window before they even started working. Each agent in my orchestration pipeline loads the same 40,000 tokens of project context — routing rules, memory files, lessons learned from previous sessions. Spawn ten agents for a feature implementation, and you've burned 400K tokens out of a million just on orientation.

That's not engineering. That's a memory leak with a subscription fee.

So I did what any QA engineer would do: I found a tool that claimed to fix it, strapped a test harness to it, and ran experiments until the numbers said something useful.

<!-- SESSION EXPORT: sessions/2026-04-11-mempalace-rag-harness.txt — Full session transcript for reproducibility and future fine-tuning reference -->

## The 40K Token Problem

Here's my setup. A monorepo workspace with five projects — job search materials, a technical blog, infrastructure knowledge, a job aggregation platform, and a learning project. Each project has its own conventions, file paths, routing rules. A unified CLAUDE.md file acts as the routing brain — 12K tokens of rules about which query goes where.

On top of that: 55 memory files (user preferences, feedback corrections, project state, infrastructure references) plus 12 lesson files discovered during previous sessions. All of it gets loaded when an agent wakes up, because an agent without context is an agent that asks stupid questions.

The math is brutal:

| Component | Tokens |
|-----------|--------|
| CLAUDE.md (routing brain) | ~7,500 |
| Memory files (55 .md files) | ~20,000 |
| Lessons (12 files) | ~5,000 |
| Skill instructions | ~7,500 |
| **Total per agent** | **~40,000** |

Ten agents. 400K tokens. 40% of my context window gone before a single line of code gets written.

## Enter the Palace

I found MemPalace — an open-source project that stores conversations and files in a ChromaDB vector database, organized into "wings" and "rooms" like an actual memory palace. The pitch: wake up your AI with 800 tokens instead of 40,000, then search on demand.

The README had impressive numbers (96.6% recall on LongMemEval) and refreshingly honest corrections from the maintainers about claims they'd overstated. That honesty sold me more than the benchmark did.

But here's the thing — I'm a QA engineer. I don't trust benchmarks that ran on someone else's data. I trust my own harness running on my own corpus. So instead of just installing MemPalace and hoping for the best, I built a retrieval regression test.

> **🔥 Hot Take:** If you can't measure whether your RAG system is working, you don't have a RAG system. You have a prayer.

## The Harness: 61 Golden Cases, Three Difficulty Tiers

I wrote 61 test cases — each one a query paired with the expected source file it should retrieve. Three difficulty tiers:

**Keyword tier** (39 cases) — queries that use words directly from the file. "ScoutQL database path .env override" should find `reference_scoutql_db_path.md`. Easy mode. If your embedding model can't handle this, uninstall it.

**Natural language tier** (16 cases) — questions a human would actually ask. "How should I present choices to the user?" should find `feedback_interaction_style.md`. The query doesn't share exact words with the file name, but the semantic intent maps clearly.

**Paraphrase tier** (6 cases) — rephrased queries with zero keyword overlap. "The user wants deep analysis not surface-level answers" should find `feedback_reasoning_depth.md`. This is where small embedding models start sweating.

Each case specifies a `recall_at` threshold — rank 1 (strict: must be the top result) or rank 3/5 (lenient: acceptable if it's in the top few). I also track cross-wing queries — searching across the entire palace without room filters. That's the hardest test: 248 drawers competing for relevance with no metadata to narrow the field.

The harness runs in **3.9 seconds**. No API calls, no LLM inference — pure local ChromaDB embedding search. Fast enough to run on every change.

## Four Iterations, Measurable Results

Here's where it gets interesting. The first run scored 91.8% Recall@1 and 0.948 MRR (Mean Reciprocal Rank). Solid, but the cross-wing searches were at 40% R@1. Terrible. And I could see exactly why — the failure cases told me everything.

### Improvement A: Stop Indexing the Index

My `MEMORY.md` file is an index — one-line pointers to the actual memory files. It was getting mined into 12 ChromaDB drawers. When someone searched for "orchestrator recipe", the one-line index entry sometimes outranked the actual detailed file because it was more token-dense. Classic RAG antipattern: the table of contents competing with the chapter.

Fix: delete MEMORY.md and entities.json drawers. Five minutes. Fourteen noise drawers gone.

### Improvement B: Tunnel Infrastructure

MemPalace has this concept of "tunnels" — when the same room name appears in multiple wings, it creates a cross-reference. My two wings (memory and lessons) used completely different room vocabularies. Zero tunnels. Zero cross-wing navigation.

Fix: remap lesson files into rooms that match the memory wing — `feedback` and `reference` instead of a flat `general`. Fifteen minutes. Two tunnels formed instantly: 101 drawers connected through `feedback`, 90 through `reference`.

### Improvement C: Cross-File Similarity Audit

I wrote a script that queries every drawer against its nearest neighbors from *different* source files. Found 8 cross-file overlap pairs. The tightest one: my syntax highlighting feedback file (0.221 distance) was nearly identical to the syntax highlighting lesson. Not a duplicate — different perspectives on the same topic — but close enough to interfere with retrieval.

Targeted removal of one entangled chunk from user_profile.md that was a compressed summary of content living in user_scientific_background.md. Thirty seconds of actual surgery after thirty minutes of diagnosis.

### Improvement D: The Chunking Insight

My user profile was getting sliced into 8 tiny chunks (800 chars each — the miner's default). Each chunk captured one facet: setup, voice, skills, tooling. No single chunk contained enough context to match a broad query like "who is the user." They were individually too narrow, collectively too fragmented.

Fix: manually consolidated 8 chunks into 3 larger semantic units — identity+setup, skills+voice, tooling+workflow. Each chunk now has enough density to self-identify against broad queries.

> **💡 Key Insight:** For identity-type documents, fewer larger chunks beat many small chunks. Small chunks fragment the entity's semantic signature. No single chunk matches a general query because each one only captures one facet. Consolidation creates chunks that are both specific enough for narrow queries and dense enough for broad ones.

## The Numbers

| Metric | Baseline | Final | Delta |
|--------|----------|-------|-------|
| Drawers | 265 | 248 | -17 |
| Recall@1 | 91.8% | 93.4% | +1.6% |
| Recall@3 | 96.7% | 98.4% | +1.7% |
| MRR | 0.948 | 0.960 | +0.012 |
| Cross-wing R@1 | 40% | 60% | +20% |
| Paraphrase R@1 | 71.4% | 83.3% | +11.9% |
| Wake-up tokens | ~40,000 | ~800 | -98% |

The palace is smaller, scores better on every metric, and wakes up in 800 tokens instead of 40,000.

For my ten-agent orchestration scenario: **400K tokens → 125K tokens.** From 40% of the context window to 12.5%. That's the difference between agents that can actually think and agents that are already gasping for context before they start.

## What I Actually Built (Without Knowing the Names)

After the session, I looked up what the formal CS literature calls these techniques:

- **Improvement A** = corpus curation (removing meta-documents from the searchable index)
- **Improvement B** = ontology alignment (making taxonomies interoperable for graph traversal)
- **Improvement C** = entity coreference resolution + semantic deduplication
- **Improvement D** = chunking strategy optimization

The regression harness itself? That's an **evaluation-driven development pipeline for AI systems** — the same methodology OpenAI uses for evals, Anthropic uses for constitutional AI testing, and every production ML team uses for model quality.

I arrived at all of it through practical need. Not by reading papers. Not by following a tutorial. Just by having a QA engineer's reflex: if you can't measure it, you can't improve it. Build the harness first, then iterate until the numbers move.

> **🔥 Hot Take:** The best RAG engineers aren't the ones who read the most papers. They're the ones who build retrieval harnesses and refuse to ship without passing scores. If your retrieval system doesn't have regression tests, it's not a system — it's a prototype.

## The Transferable Pattern

Whatever your RAG system looks like — Pinecone, Weaviate, ChromaDB, some custom mess with FAISS — this methodology transfers:

1. **Golden set first.** Write test cases before tuning anything. Query → expected document → acceptable rank.
2. **Three tiers of difficulty.** Keywords (sanity check), natural language (real usage), paraphrases (stress test).
3. **Measure, then cut.** Run the harness. Read the failures. Diagnose *why* before fixing.
4. **One improvement at a time.** Change one thing, re-run, compare. If it regresses, revert. If it improves, keep and compound.
5. **Harness runtime matters.** If your eval takes 20 minutes, you'll run it once. Mine takes 4 seconds. I ran it after every change.

The entire session — from "I have a token budget problem" to "61/61 passed, 93.4% R@1, palace optimized" — took about two hours. The methodology is the same one I use for testing software. It just happens to work on AI systems too.

Funny how that keeps happening.
