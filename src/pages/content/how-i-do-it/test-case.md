# Test Case Design

A test case is a contract. It says: given this precondition, when I perform this action, I expect this outcome. If any of those three pieces is vague, two testers will disagree on pass/fail — and your test case is worthless.

## The Anatomy

Every test case I write follows a rigid six-field structure:

- **N.** Sequential number — globally unique across the entire plan
- **ID** — hierarchical name like `W.SCHED.14` (the W prefix, a section abbreviation, and the case number)
- **Level** — validation depth tag (RESP, L1, L2, L3.B-R, or L3.B-C)
- **Precondition** — what must be true before execution
- **Action** — exact API call or user interaction
- **Expected** — exact response with specific assertions
- **Bug** — bug ID if applicable, with status

The sequential number never restarts at section boundaries. Test 175 follows test 174 even if they're in different sections. This prevents ID collisions when multiple people add tests.

## The Test ID Taxonomy

The hierarchical naming convention makes filtering trivial. The prefix tells you the domain, the suffix tells you the test:

| Prefix | Domain |
|--------|--------|
| W.CRUD | Create/Read/Update/Delete lifecycle |
| W.SCHED | Schedule and timing |
| W.OPS | Operations (start, stop, disable, enable) |
| W.OPS.EDGE | Operations edge cases |
| W.QP.TASKS | Query parameters for the jobs endpoint |
| W.QP.STATES | Query parameters for the states endpoint |
| W.SC | Silent corrections (API quietly fixes invalid input) |
| W.REG | Regression tests linked to known bugs |
| W.CONC | Concurrency |

Want all query parameter tests? `W.QP.*`. Want all operations edge cases? `W.OPS.EDGE`. The taxonomy pays for itself the first time someone asks "how many schedule tests do we have?"

## Level Tags

Not all tests validate at the same depth. Level tags classify what a test is actually checking:

| Tag | What it validates |
|-----|-------------------|
| **RESP** | Response structure — does the body have the right fields? |
| **L1** | Input validation — does the API reject bad input? |
| **L2** | Business logic — does the API enforce business rules? |
| **L3.B-R** | Backend rejection — the server explicitly rejects the input |
| **L3.B-C** | Backend correction — the server silently corrects the input |

Level tags are internal — they help the tester understand the depth of the test without reading the full description.

## Expected Outcomes — The Core Discipline

This is where test cases succeed or fail. A vague Expected field makes the entire test useless.

Every expected outcome must contain three things: the exact HTTP status code (not "success" or "4xx" — the specific code: 201, 400, 404, 409), specific body assertions (which fields, which values), and negative assertions where relevant (not just what IS present, but what is NOT).

**Good:** "HTTP 201. GET response: `mode=Advanced`, `config.notifications=true`, `config.targets` contains `/data`."

**Bad:** "Policy created successfully with correct values."

The second version is useless. Two testers will check different fields, assert different values, and disagree on pass/fail.

A non-obvious detail: status codes for the same HTTP method vary by operation. Start returns 201 (creates a session), but Stop returns 200 (modifies state). Delete returns 204 (no content). This is a common source of test failures when assumed rather than verified.

## Edge Case Discovery

Edge cases are not discovered by accident. I use systematic discovery patterns.

**The boundary condition template** — for every field that accepts a range of values: minimum valid value, maximum valid value, one below minimum, one above maximum, zero, negative, type mismatch. Applied systematically to date-time fields (valid ranges, timezone edges), pagination parameters, and filter values.

**The cross-feature interaction template** — for every feature that can combine with other features: Feature A alone (baseline), Feature A + Feature B together (do they interact?), Feature A configured then switch to Feature B (does the old config persist or clear?), Feature A and B with conflicting settings (which wins?).

**The "What would a chaotic user do?" template** — modify configuration while an operation is running. Send two conflicting requests simultaneously. Change state mid-operation. Test with 1 item, then with hundreds. Use the old configuration format with the new API version. Request an operation that requires infrastructure that doesn't exist.

## The Negative Test Pairing Rule

For every positive test, ask: what's the corresponding negative test?

| Positive Test | Negative Counterpart |
|---------------|---------------------|
| POST with `mode=Advanced` + valid scope → 201 | POST with `mode=Advanced` WITHOUT scope → 400 |
| POST with valid resource group ID → 201 | POST with nonexistent resource group ID → 400 |
| PUT to update description → 200 | PUT to change read-only type field → 400 |

Not every positive test needs a negative counterpart, but the question must be asked. The cross-cutting negatives that don't belong in any feature section get collected in a dedicated Input Validation section.

## The Silent Correction Pattern

Some APIs silently "correct" invalid input rather than rejecting it. These are sneaky — the POST succeeds with 201, but the stored value isn't what you submitted. Testing these requires a specific pattern:

1. Submit the invalid value via POST
2. Verify you get 201 (not rejected)
3. GET the created resource
4. Verify the stored value is the expected corrected value — not the submitted value, and not some arbitrary default

Tests that only check the POST status code miss silent corrections entirely. A test that passes on 201 and moves on has learned nothing about what the API actually did with the input.

## Preconditions Map to Fixtures

This is a design decision, not an afterthought. When I write "Precondition: Existing project with active task," I'm thinking about the test fixture that will create that state. "Precondition: External storage endpoint" maps to an infrastructure discovery fixture that skips the test if the lab doesn't have one.

The mapping from preconditions to fixtures must be intentional from the start. If your preconditions don't translate cleanly to automation fixtures, your test cases will be painful to automate — and you'll end up rewriting them.
