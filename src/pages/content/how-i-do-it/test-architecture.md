# Test Architecture

A test framework is not a collection of test files. It's a layered system where each layer has a single responsibility, and the wrong scoping decision in the fixture layer will produce intermittent failures that cost you days of debugging.

## The Thin Client Pattern

The framework I build follows a six-layer architecture. Every layer has one job and touches nothing outside its responsibility:

| Layer | Responsibility |
|-------|---------------|
| **Config** | Load YAML + env var overrides. Normalize URLs. Immutable after creation |
| **HTTP Client** | Authentication, failover, TLS, request dispatch. Returns raw Response objects |
| **Typed Endpoints** | One class per API resource type. Business-level method names: `create`, `update`, `start`, `stop` |
| **Facade** | Single entry point wiring client to endpoint classes. Tests import `api.resource.method()` |
| **Fixtures** | Session/module/function scoped. Infrastructure discovery. Cleanup |
| **Tests** | Arrange → Act → Assert → Cleanup. One function per test plan entry |

## Why Raw Response Objects

The endpoint layer returns `requests.Response`, not parsed JSON or typed objects. This is deliberate and worth explaining because it feels like it violates the "make it convenient" instinct.

Tests that check status codes need the Response object. Tests that check error messages need both `.json()` and `.status_code`. And here's the big one: if the client raised exceptions on non-2xx status codes (like `raise_for_status()` does), every negative test — the ones that *expect* a 400 or 404 — would need a try/except just to read the status code. Returning raw Response means a test expecting 400 looks the same as a test expecting 200: just `assert resp.status_code == 400`.

On top of that, if the endpoint layer parsed JSON and returned dicts, every test would implicitly assume the response IS valid JSON — but some tests specifically verify what happens when it's not.

Returning raw Response lets every test choose its own assertion strategy.

## The Fixture Hierarchy — Where Frameworks Succeed or Fail

Fixtures are the most important architecture decision. Wrong scoping causes either flaky tests (shared mutable state) or slow tests (recreating resources every function call).

### Three-Tier Scope Strategy

**Session-scoped** — created once per test run: config, authenticated client, the API facade, and any shared infrastructure your tests depend on (database connections, external service handles, discovered environment capabilities). These are expensive to create and stable across tests. Setting them up per-test would multiply runtime by the number of tests.

**Module-scoped** — created once per test file: shared read-only resources. Within a file, many tests need to read the same resource. Creating a separate one per test would be wasteful if the test only reads it.

**Function-scoped** — created per test: isolated mutable resources. Tests that modify a resource (PUT, POST, start/stop) must have their own. If two mutation tests share a resource, the second test sees the first test's mutations. That's the classic shared-mutable-state flakiness bug — intermittent because test execution order can vary.

### The Read-Only vs Fresh Resource Rule

This is a hard rule. `readonly_resource` (module-scoped) is ONLY for tests that read. `fresh_resource` (function-scoped) is for tests that mutate — properly yielded with cleanup. If a test uses the shared read-only fixture but then does a PUT or DELETE on it, you've planted a time bomb.

Why: Test A mutates the shared resource. Test B reads it expecting original values but gets Test A's leftovers. It passes 9 times out of 10 because pytest happens to run B first. On the 10th run, the order flips and B fails. You spend a day debugging a "flaky test" that's actually a shared-state violation.

## Infrastructure Discovery

Some tests require specific infrastructure — a particular database engine, an external service, a feature flag enabled. Fixtures for these follow a discovery pattern: query the live environment, check if the requirement is met, return the handle. If it's not available, `pytest.skip()` — not `assert False`.

```python
@pytest.fixture(scope="session")
def external_db_connection(config):
    """Returns external DB handle, or skips tests if unavailable."""
    if not config.get("external_db_url"):
        pytest.skip("No external database configured")
    conn = connect(config["external_db_url"])
    yield conn
    conn.close()
```

This means tests requiring specific infrastructure are automatically skipped when it's not available, rather than failing with misleading error messages. Skip and fail are different signals. "4 tests skipped (no external DB)" tells you the tests are fine, you just need a different environment. "4 tests failed" tells you something is broken.

The prerequisite matrix documents which fixtures are mandatory (fail if missing) and which are optional (skip if missing). Core infrastructure fixtures are mandatory — the test run is meaningless without them. Everything environment-specific is optional and skips gracefully. This gives every test run a meaningful result regardless of environment configuration.

## The Default Spec Factory

Instead of each test building API request bodies from scratch, a factory function provides the minimal valid spec:

```python
def make_default_spec(name_suffix="test"):
    """Build minimal valid request body. Tests modify specific fields."""
    return {
        "name": f"AutoTest {name_suffix} {uuid4().hex[:8]}",
        "description": "Automated test resource",
        "type": "standard",
        "enabled": True,
    }
```

Tests modify specific fields as needed. Why a factory and not a fixture? Tests need to modify the spec before submitting it. A fixture returns one fixed spec; a factory can be called with different parameters. Multiple tests in the same function may need multiple different specs.

Every spec includes a unique name with an "AutoTest" prefix and a UUID fragment. This prevents name collisions and powers the safety net cleanup described in the Automation Framework section.

## The 1:1 File-to-Section Mapping

Each test plan section maps to exactly one test file. This mapping is non-negotiable:

| Test Plan Section | Test File |
|-------------------|-----------|
| Regression | `test_regression.py` |
| CRUD & Lifecycle | `test_crud.py` |
| Schedule & Timing | `test_schedule.py` |
| Storage | `test_storage.py` |
| Operations | `test_operations.py` |
| Query Parameters | `test_qp_*.py` |

The reasons are practical: traceability audits become mechanical (compare plan sections to file contents). Selective execution becomes trivial (`pytest test_schedule.py` runs only schedule tests). Failure localization is immediate ("5 failures in test_storage.py" tells you which product area is broken). And code review can be divided — each reviewer takes a few files.

For high-volume sections with similar tests, `pytest.mark.parametrize` prevents nearly-identical function definitions. Each parametrize variant still maps to one test ID.
