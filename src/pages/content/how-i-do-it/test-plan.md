# Test Plan

A test plan is not a list of test cases. It's a structural argument — here's what we're testing, here's why these areas matter more than others, and here's how we'll know when we're done. The test cases come later. The plan comes first.

## The Pipeline

Before writing a single test case, I follow a staged pipeline:

1. **Study the feature** — understand what it does, how it works, what changed since the last version
2. **Requirement analysis** — trace formal requirements and cross-reference with the actual implementation
3. **Test plan creation** — design test cases with priorities and groupings
4. **Testing** — execute the plan
5. **Reporting** — document results

This pipeline is sequential but not waterfall. Each stage can trigger revisiting earlier ones when gaps surface — and they always do.

## Group by Feature Area, Not Methodology

This is the single most important structural decision. Most QA engineers organize their plans by test type — positive tests, negative tests, boundary tests, error handling. That's wrong. Group by feature area instead.

The wrong way looks like "Section 1: Positive tests (all endpoints), Section 2: Negative tests (all endpoints)." The right way groups by what the product actually does:

- **Regression Tests** (known bugs, linked to bug IDs)
- **CRUD & Lifecycle** (create, read, update, delete)
- **Schedule & Timing** (time-based configuration)
- **Integrations & Endpoints** (where data goes)
- **Operations & Concurrency** (start, stop, parallel execution)
- **Query Parameters & Filtering** (pagination, sorting, search)

Why? Execution efficiency — all tests for a feature area share the same preconditions. A schedule test and a storage test need different server state. Reviewers can assess completeness within one domain at a time, rather than mentally cross-referencing a "Negative Tests" section that mixes schedule, storage, and CRUD negatives.

There are exceptions. Regression tests (linked to bug IDs, special lifecycle), cross-cutting input validation (malformed UUIDs, empty bodies — these test the framework, not any specific feature), and explicit coverage holes get their own sections. But these are the exceptions, not the rule.

## The Nine-Section Template

When no standardized template exists and every engineer improvises, I use a nine-section framework:

1. **Overview and Scope** — explicit in-scope and out-of-scope lists, ticket reference
2. **Business Logic** — core workflows: creation, configuration, execution, validation. The highest-value section
3. **API Testing** — endpoints by method, parameter validation, error handling, authentication, pagination
4. **UI Testing** — manual exploration: form validation, navigation, error messages, edge cases
5. **Restrictions and Negative Cases** — invalid inputs, exceeded limits, unsupported configurations. Making edge cases explicit early prevents surprise gaps during review
6. **Platform/Environment Matrix** — OS targets, browser versions, deployment configurations. Explicitly state what's in scope vs out
7. **Logging and Events** — log output verification, event notifications, error reporting
8. **Licensing** — license enforcement, feature gating. Mark N/A if not relevant
9. **Known Issues and Dependencies** — known bugs, upstream dependencies, blocked areas

## Expect Three Refinement Passes

The first draft establishes the structural skeleton. It will not survive the first review intact — and that's by design.

The first review typically reveals missing dimensions. You covered the happy path but missed file systems, storage types, licensing modes, or operational modes. UI and CLI tests are tangled together. There's no section for integration with other features. Common structural changes: separate UI/CLI/Schedule into distinct sections, create an "Integration with other features" section, add license testing, add performance testing.

The second pass adds depth. Dependent settings that only appear when other settings are enabled. State-specific validation — what fields are populated when a job is running vs stopped vs disabled? Operational edge cases — what happens when you stop a job that's not running?

The third pass is deduplication and estimation. After multiple refinement passes, the plan inevitably contains overlapping content from earlier versions merged alongside newer versions. Send a single clean version, not a merged document.

## Estimation by Progressive Subtraction

I estimate by breaking the total count into groups and subtracting as I go.

Start with the total — say, 68 cases. Subtract 22 cases that are blocked on UI access (1-2 days when unblocked). That leaves 46. Subtract 4 cases needing complex environment setup (1 day). 42 remaining. Subtract 7 constraint-validation cases across 3 resource types (3 days, roughly 1 per type). 35 remaining. And so on.

Each group estimate includes: how many cases, why this group takes the time it does, what blocks execution, and where I might need help or additional domain knowledge.

## Priority Assignment

Not all tests are equally important. The framework is simple:

| Priority | Criterion | Example |
|----------|-----------|---------|
| P1 (Critical) | Broken = users cannot use the feature | CRUD operations, pagination |
| P2 (Important) | Broken = degraded experience, workarounds exist | Sorting, individual filters, edge cases |
| P3 (Nice-to-have) | Broken = minor inconvenience | Cosmetic field verification, optional defaults |

One non-obvious call: pagination tests are always P1, even though they test "query parameters" which sounds like P2. The rationale — if pagination is broken, users cannot retrieve data when the result set exceeds one page. That's a complete feature failure, not a degraded experience.

## The Pre-Submission Checklist

Before sending the plan for review:

- All sections from the agreed scope are covered
- Business logic is comprehensive — not "test login" but "test login with valid credentials, expired token, locked account, rate-limited IP"
- Negative cases are explicit, not implied
- Platform scope is stated
- AI-assisted edge case brainstorming has been done (use AI to find cases you haven't considered, but own every line)
- The plan reads as clean, factual content — no investigation notes, no code paths, no speculative labels

Test plans are living documents. The version you submit for review is not the version you'll execute. That's the point — the review process makes it better.
