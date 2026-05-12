Before I touched code for a living, the thought of running a terminal command felt like defusing a bomb. Now I'm on Linux, throwing around commands that would've made past-me faint - with the healthy respect that `rm -rf /` deserves and nothing more.

So on a random weekend, doom-scrolling tech Instagram like the absolute computer geek I am, I stumbled on a post from a tech creator talking about mining Claude Code conversations into persistent memory. MemPalace - the project that Milla Jovovich co-authors, yes, *that* Milla Jovovich - has this capability built in. And my brain went: *wait, I've only been mining static files this whole time*.

## The Problem I Didn't Know I Had

See, I'd been using MemPalace to store knowledge from my project files - CLAUDE.md documents, architecture specs, lesson files. Static stuff. But my actual work happens in conversations. Two months of building a feature, debugging edge cases, making architectural decisions - all of that lives in JSONL transcripts that I never look at again. When I need to revisit something, I either burn millions of tokens reloading context or dig through handoff docs hoping past-me was thorough.

Mining conversations solves this. The MemPalace concept itself is ancient Greek - the Method of Loci. You imagine a physical space you know intimately and place information in specific locations. Wings, rooms, closets, drawers. When you need something, you mentally walk to where you put it. What makes MemPalace brilliant as software is the compartmentalization - vector proximity is calculated *within* the drawers and closets, so retrieved information is highly related to each other by construction. Finding something irrelevant is probabilistically low.

```animated-diagram
palace-structure
```

And the cosine similarity thing maps beautifully to how human memory actually works. You *know* you stored something relevant, you just can't be sure the recalled version is exactly what you're looking for. Vector search does the same - calculates how close two things are without promising an exact match.

## My Laptop Caught Fire (Not Literally)

So I wrote a script to mine my conversations. Eight cores, twelve threads, sixteen gigs of RAM plus twenty-four gigs of swap. The mining worked. Eighty-five thousand drawers filed into the palace.

Then I benchmarked it.

Queries that should take milliseconds were taking ten minutes. The proximity matrix was fucked. I asked Claude Code to dig into the internals, and we found the architectural flaw.

## ChromaDB's Dual-Write Problem

ChromaDB writes data to two separate places. Metadata goes into SQLite - synchronous, committed immediately, ACID-safe. But the vector embeddings go into an HNSW graph maintained by a C++ background thread. The process is: your Python code calls `add()`, SQLite gets the row instantly, and the embedding gets queued for the C++ thread to process later.

At small scale, the queue drains faster than you fill it. At 100K+ drawers on a non-commercial machine? The queue bloats. My script was efficient enough that it was producing drawers faster than the C++ thread could index them. CPU spiked to 1000%. I SIGTERM'd the process. The C++ thread died mid-work.

Result: SQLite said "102,568 drawers." The HNSW index said "84,965 vectors." 17,603 embeddings - 17.2% of my palace - existed in metadata but had no vector representation. Every query that tried to find them got `Error finding id`. The palace was corrupted.

I thought maybe it was my script's fault. Tried the native MemPalace miner. Same problem. ChromaDB's architecture simply can't handle this scale on consumer hardware without the background thread completing before process exit. And there's no shutdown hook that waits for it.

## sqlite-vec: One Transaction, Zero Divergence

Fortunately, MemPalace's backend was wired with the Strategy Pattern through an entry-point registry. I could plug in an alternative without rewriting callers.

sqlite-vec is a SQLite extension that adds vector search via virtual tables. The key property: both the metadata row AND the vector embedding go into the same SQLite database, in the same transaction. `COMMIT` writes both or neither. There is no background thread, no queue, no second storage layer. Divergence is architecturally impossible.

I implemented the backend - about 400 lines of code. Two tables per collection: `sv_drawers` for metadata/documents, `sv_vec` (a vec0 virtual table) for embeddings, joined by rowid. Same transaction. ACID guarantees.

Then I re-mined from the raw JSONL sources. 85,033 drawers. Health check: 85,033 drawers = 85,033 vectors. Zero divergence. Not because I was more careful - because the architecture doesn't have a seam where data can fall through.

```animated-diagram
dual-write-vs-acid
```

## The Benchmarks

A/B testing against the corrupted ChromaDB palace:

| Metric | ChromaDB | sqlite-vec |
|--------|----------|------------|
| Hit rate | 40% (errors on scoped queries) | 100% |
| p50 latency | 229ms | 119ms |
| p99 latency | 6,191ms (error timeout) | 259ms |
| Divergence | 17.2% lost | 0% |
| Health | Broken | OK |

The latency story is interesting. sqlite-vec uses flat scan (brute-force cosine distance) rather than HNSW's approximate graph traversal. At 85K vectors with 384 dimensions, that's 70-120ms per query. Slightly slower than a healthy HNSW for unscoped searches, but the HNSW was never healthy at this scale on my machine.

Wing-scoped queries (targeting a specific project's conversations) scan only that partition. 21K drawers in the static wing: 68ms. 60K in conversations: 107ms. The knowledge graph and tunnel queries are sub-4ms regardless - they use their own SQLite B-tree indexes.

```animated-diagram
query-flow
```

## Why This Matters Beyond My Laptop

If you have complex documentation - tens of thousands of pages with dependency graphs, cross-references, relationship mappings - this approach works. The vector layer handles semantic discovery. The knowledge graph (534 entities, 5K+ triples in my case) handles structured navigation. Tunnels bridge domains. Closets provide topic-level boosting.

```animated-diagram
kg-tunnel-overlay
```

The total stack: 85K drawers consuming 266MB on disk, queried in 70-120ms, with zero data loss, running on a laptop with 16GB RAM. No GPU. No cloud service. No API fees. Single-file SQLite backup.

The project is open source. The backend abstraction means you can start with sqlite-vec and swap to pgvector or Qdrant when you need concurrent access or billion-scale. The application code doesn't change.

I'm genuinely hyped about what comes next - information decay (drawers aging out), retrieval confidence scoring, maybe eventually running this as a shared team memory. But right now, at this moment, it works. It retrieves what I need. And it doesn't silently lose 17% of my memories doing it.
