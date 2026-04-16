# Automation Framework

Building an automation framework is not the same as writing tests. The framework is infrastructure — it's the thing that makes the 281st test as easy to write as the 1st. Get the foundation wrong and every test pays the tax.

## Framework Selection

I work primarily with two frameworks: **Pytest** for Python-based API and integration testing, and **Pester** for PowerShell infrastructure testing. The choice is driven by the ecosystem, not personal preference. If the product's automation surface is REST APIs and the team writes Python, it's Pytest. If the surface is Windows infrastructure with PowerShell cmdlets, it's Pester.

Both follow the same principles — fixture-based setup/teardown, assertion messages with diagnostics, cleanup that always runs, and a project structure that separates infrastructure from test logic.

## The Three-Layer Config

Configuration is the first thing that breaks in a new environment. The pattern I use eliminates the "works on my machine" problem:

| Layer | File | Purpose |
|-------|------|---------|
| 1 | `config.example.yaml` | Committed template with placeholders. Documents all keys |
| 2 | `config.yaml` | Gitignored. Real credentials. Never committed |
| 3 | Environment variables | Override everything. CI sets secrets this way |

## Assertion Patterns That Actually Help

The single most impactful rule: every assertion gets a diagnostic message.

```python
# Bad — failure says "AssertionError: False is not True"
assert resp.status_code == 201

# Good — failure shows what happened and why
assert resp.status_code == 201, (
    f"Expected 201, got {resp.status_code}: {resp.text[:500]}"
)
```

Now the failure log shows: what was expected, what was received, and the first 500 characters of the response body. Truncation at 500 prevents log flooding from large error responses.

For a complete API test, assertions operate at three levels:

```python
# Level 1: Status code
assert resp.status_code == 201, f"Expected 201, got {resp.status_code}: {resp.text[:500]}"

# Level 2: Response structure
body = resp.json()
assert "id" in body, f"Response missing 'id' field: {body}"

# Level 3: Field values
assert body["type"] == "Project", f"Expected Project, got {body['type']}"
```

Not every test needs all three levels — negative tests expecting 400 typically stop at status code plus error message structure.

## The POST-then-GET Verification

For tests that create or modify resources, asserting on the POST response alone is never sufficient. The server might echo back what you submitted without actually persisting it. Or it might silently correct your input. The real test is always a subsequent GET:

```python
# Create
resp = api.resource.create(spec)
assert resp.status_code == 201
resource = resp.json()

# Verify what was actually persisted
get_resp = api.resource.get(resource["id"])
stored = get_resp.json()
assert stored["mode"] == "Incremental", f"Mode not persisted: {stored['mode']}"
```

This catches silent corrections, echo-without-persist bugs, and any transformation the server applies between receiving and storing data.

## Cleanup Safety

Every test that creates a resource must delete it. If cleanup fails, the server accumulates orphaned resources that affect subsequent runs, eventually hit limits, and make failures impossible to diagnose. I use three cleanup patterns:

**Yield fixtures** — the preferred pattern for shared resources. The `yield` ensures cleanup runs even if the test fails:

```python
@pytest.fixture
def my_resource(api):
    resp = api.resource.create(make_default_spec())
    assert resp.status_code == 201, f"Fixture setup failed: {resp.status_code}"
    resource = resp.json()
    yield resource
    api.resource.delete(resource["id"])
```

**try/finally** — for one-off creation within a test body, when the resource isn't from a fixture.

**No cleanup** — for negative tests expecting 400. The resource was never created, so there's nothing to clean up. Attempting cleanup would fail with 404.

## Known Bug Handling with xfail

When a test verifies a known bug, it gets an `xfail` marker with the bug ID:

```python
@pytest.mark.xfail(reason="Bug NNNNNNN — field labeling issue")
def test_resource_field_labeling(api):
    ...
```

The rules: xfail only for bugs confirmed as open in the tracker. Always include the bug ID. Use `strict=False` (the default) — if the test unexpectedly passes, it reports as XPASS, signaling the bug may have been fixed. Remove xfail immediately when a bug is marked fixed.

This creates four meaningful states:

| Test Result | xfail? | Status | Meaning |
|-------------|--------|--------|---------|
| Pass | No | PASS | Normal success |
| Fail | No | FAIL | Real failure — investigate |
| Fail | Yes | KNOWN_BUG | Expected failure, bug still open |
| Pass | Yes | BUG_FIXED | Unexpected pass — bug may be fixed! |

The BUG_FIXED signal is the valuable one — it means something changed and the xfail might need to come off.

## Dual Report Output

Standard JUnit XML goes to CI — pass/fail/skip/error. But JUnit can't express KNOWN_BUG or BUG_FIXED. So the framework also produces a structured JSON report via a custom pytest plugin, mapping each test ID to one of six statuses: PASS, FAIL, SKIP, KNOWN_BUG, BUG_FIXED, ERROR.

## CI Integration

Integration tests run against dedicated test environments. The CI workflow uses `workflow_dispatch` is the primary trigger — not push events.

Why manual trigger? Integration tests depend on environment state. A maintenance window would cause all tests to fail and block the entire pipeline. Manual trigger puts the engineer in control of when tests run. Auto-trigger on merge to main serves as a secondary check, but the engineer should know the environment is available before pushing.

The workflow is straightforward: checkout, setup Python, install the package in dev mode, run pytest with JUnit XML output, upload both artifacts. The simplicity is the point — CI configuration is not where you want complexity.
