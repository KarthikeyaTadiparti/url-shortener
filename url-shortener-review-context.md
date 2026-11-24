# URL Shortener --- Implementation Review Context

> **Purpose:** Give a coding agent the context and evaluation criteria
> needed to review, challenge, and cross-verify the existing URL
> Shortener implementation.
>
> **This is a review brief, not an implementation prompt.** Do not build
> the project, rewrite files, generate code, or make changes merely
> because this document describes desired behaviour. Inspect the actual
> repository and compare what exists against this brief. Report gaps and
> risks with evidence. Only modify code when the user separately and
> explicitly asks for changes.

## 1. Project context

The project is a learning-oriented URL shortener based on the
Engineering Atlas article:

**"Design a URL shortener (and Pastebin)"**\
https://engineering-atlas.in/system-design/storage-media/design-a-url-shortener/

The article describes a production-scale distributed system. This
project intentionally implements a **single-backend, local-first
version** of the URL shortener. The goal is to learn the important
engineering ideas without introducing infrastructure whose only purpose
is multi-server or multi-region operation.

### Current intended constraints

-   Run the application locally; deployment is not currently a
    requirement.
-   Use one Node.js backend process.
-   Use PostgreSQL as the primary database, run locally through Docker.
-   Use TypeScript and Drizzle ORM for database access.
-   Use Express for the backend HTTP API (verify the repository rather
    than assuming every detail below is already implemented).
-   A React + TypeScript frontend is the expected frontend direction,
    but review the actual repository structure before making
    assumptions.
-   No load balancer, multiple backend instances, CDN/edge layer,
    multi-region deployment, database replicas, or database sharding.
-   Keep the write and redirect responsibilities logically separate,
    even if they run inside the same backend process.
-   Redis and RabbitMQ are optional learning components, not mandatory
    infrastructure. Their presence and role must be determined from the
    repository and the user's current decisions.
-   Do not assume that a feature is implemented just because it is
    described here. Treat this document as a review target, not evidence
    of implementation.

## 2. Review role and operating rules

Act as a **senior engineer reviewing an existing implementation**, not
as an autonomous coding agent.

1.  Inspect the repository, relevant source files, configuration,
    migrations, tests, and Docker setup before reaching conclusions.
2.  Do not assume the code follows this document. Verify every claim
    against actual code.
3.  Do not silently change files, install packages, run destructive
    commands, reset databases, or alter configuration.
4.  Do not implement missing features. Identify them and explain why
    they matter.
5.  Do not recommend distributed infrastructure that conflicts with the
    single-backend/local-first scope unless clearly labelled as future
    work.
6.  Distinguish:
    -   **Article requirement/design:** directly described by
        Engineering Atlas.
    -   **Project adaptation:** deliberate simplification for this local
        single-backend project.
    -   **Optional enhancement:** useful learning exercise, not required
        for the current scope.
    -   **Finding/recommendation:** your own technical assessment based
        on the repository.
7.  If a requirement is ambiguous or a product decision is missing, ask
    one focused question or state the assumption. Do not invent
    requirements.
8.  Prefer concrete evidence: file path, symbol/function, relevant line
    range, test name, schema constraint, or reproducible scenario.
9.  Check whether tests actually verify behaviour. A passing test suite
    does not prove untested requirements.
10. Do not over-engineer. A simple solution is acceptable when it
    satisfies the project's scope and has a clear correctness argument.

## 3. Source architecture: what the article describes

The article's production design has two main paths that meet at the link
store:

### Write path

1.  Client sends a create-link request.
2.  API gateway handles authentication and rate limiting.
3.  Write service validates the URL and checks it against a threat list.
4.  ID allocation supplies a unique numeric ID from a leased range.
5.  A keyed Feistel permutation scrambles the ID.
6.  Base62 encodes it into a seven-character code.
7.  The link is inserted with a conditional/atomic uniqueness check.
8.  A safety rescan can be queued asynchronously.
9.  The API returns the short URL.

### Redirect/read path

1.  Browser requests `GET /{code}`.
2.  CDN/edge may answer for an edge-cached hot link.
3.  Otherwise a redirect service checks its in-process LRU cache.
4.  On a miss, it checks Redis.
5.  On another miss, it reads the link store by code.
6.  Successful reads populate the caches.
7.  The service checks link status and expiry, then returns a 302
    redirect.
8.  Click analytics are emitted asynchronously, after the redirect
    response is not held up by analytics processing.

### Article's scale assumptions

The article uses an illustrative production target of roughly:

-   100 million daily users.
-   About 1 billion live links.
-   Around 1,000 reads per write.
-   Roughly 12,000 redirects/second average and 60,000/second peak in
    its worked estimate.
-   Redirect p99 under 100 ms end-to-end, with under 10 ms server-side
    target.
-   Redirect availability target of 99.99%; creation availability target
    of 99.9%.
-   Analytics may be eventually consistent and lag by minutes.

**These are article assumptions, not performance targets for this local
project.** Do not claim this local implementation meets them without a
suitable load test and deployment environment.

## 4. Local project architecture and intentional simplifications

The target local architecture is conceptually:

``` text
Client / Frontend
       |
       v
Single Express + Node.js backend process
       |
       +---- URL creation module
       |
       +---- Redirect module
       |
       +---- In-process LRU cache
       |
       +---- Optional Redis cache
       |
       +---- PostgreSQL (Docker)
       |
       +---- Optional background event processing
                    |
                    +---- Optional RabbitMQ
                    |
                    +---- PostgreSQL analytics data
```

The modules are logical boundaries, not separate deployable
microservices.

### Remove from the current implementation scope

These article components are not needed for the local single-backend
version:

-   API gateway as a separate infrastructure service.
-   CDN or edge caching.
-   Load balancer.
-   Multiple write-service or redirect-service instances.
-   Machine IDs for distributed ID generation.
-   Per-region ID slices.
-   Multi-region routing and failover.
-   Cross-region replication and read-after-write handling.
-   Database sharding/partitioning for horizontal scale.
-   Distributed key-value store.
-   Regional cache invalidation.
-   Kafka as a production-scale event streaming platform.

A reviewer should flag these only if the code unnecessarily introduces
them or if the user explicitly chooses to study them. Do not treat their
absence as a defect.

### Keep the underlying engineering concerns

Even in one process, review the implementation for:

-   Unique short-code generation.
-   Atomic uniqueness enforcement at the database.
-   Correct Base62 conversion.
-   URL validation and redirect safety.
-   Correct HTTP redirect behaviour.
-   Expiry and blocked-link handling.
-   Cache correctness and invalidation.
-   Concurrency behaviour.
-   Analytics isolation from the redirect response.
-   Rate limiting and abuse controls.
-   Graceful handling of dependency failures.
-   Useful automated tests.

## 5. Functional behaviour to review

The article builds the system one requirement at a time: create a link,
follow a link, then custom aliases and expiry.

### 5.1 Create a short link

The article's example API is:

``` http
POST /v1/urls
Content-Type: application/json
Idempotency-Key: <optional-key>

{
  "long_url": "https://example.com/some/long/path",
  "custom_alias": "optional-alias",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

The article's example successful response is `201 Created`, containing
the code, short URL, and optional expiry.

Relevant outcomes in the article:

-   `201 Created`: link created.
-   `400 Bad Request`: invalid or blocked URL.
-   `409 Conflict`: custom alias already taken.
-   `429 Too Many Requests`: creation rate limit exceeded.

Review the repository's actual API contract. Do not demand the exact
route or response property names above if the project has intentionally
chosen different names; instead, verify that its contract is consistent
and documented.

Review points:

-   Validate that the destination is an absolute URL with an allowed
    scheme (`http` or `https`).
-   Validate host and URL length.
-   Reject the shortener's own domain as a destination to avoid redirect
    loops.
-   Validate expiry is in the future and respects any configured maximum
    lifetime.
-   Derive creator identity from authenticated server-side context,
    never trust a user ID supplied in the request body.
-   Validate custom alias syntax and reserved words.
-   Return a conflict when an alias is already claimed.
-   Consider an idempotency key if retries are in scope. If supported,
    the same retried create request should not create multiple links.
-   Avoid leaking internal errors or database details to clients.

### 5.2 Follow a short link

The article's example is:

``` http
GET /{code}
```

Expected outcomes:

-   `302 Found` with a `Location` header for a valid active link.
-   `404 Not Found` for an unknown code.
-   `410 Gone` for an expired or taken-down link.

Review points:

-   The redirect lookup must use the short code and return the correct
    destination.
-   Check status and expiry before redirecting.
-   Do not redirect blocked or expired links.
-   Use a deliberate cache policy. The article recommends `302` with
    explicit browser cache control, for example
    `Cache-Control: private, max-age=0`.
-   Ensure the implementation does not accidentally return a success
    page instead of an HTTP redirect.
-   Ensure analytics work does not delay the redirect response.

### 5.3 Custom aliases

The article's collision-avoidance proposal is:

-   Generated codes are exactly seven characters.
-   Custom aliases are 8--30 characters.
-   Therefore, generated codes and aliases occupy separate namespaces by
    length.
-   Alias claims use an atomic conditional insert; concurrent attempts
    for the same alias must result in one success and one conflict.
-   A reserved-word list and profanity filter may be applied.
-   If the project chooses aliases that can be seven characters, the
    namespaces overlap and the generator must explicitly handle
    collisions.

Review the actual alias policy. Do not assume the project has adopted
the article's exact 8--30 character rule unless it has been agreed.

### 5.4 Expiry and reuse

-   Expiry must be checked on the redirect path, not only when data is
    initially cached.
-   Cache TTL must not extend beyond the link's expiry.
-   Expired links should return the chosen gone response (`410` in the
    article).
-   **Do not reuse expired generated codes.** The article explains that
    old links can remain in printed flyers, emails, and other places;
    reusing a code could redirect someone to an unrelated destination.
-   If deletion is supported, distinguish soft deletion/takedown from
    permanent physical cleanup.

## 6. ID generation and Base62

This is one of the most important areas to review carefully.

### 6.1 Article's production approach

The article proposes:

1.  A strongly consistent, durable counter.
2.  Write servers lease blocks/ranges of IDs rather than requesting one
    ID per link.
3.  A keyed Feistel permutation maps sequential IDs into a scrambled
    domain.
4.  The result is Base62-encoded into seven characters.
5.  A conditional put/unique constraint remains the final safety net.

The article warns against:

-   Truncating a hash of the URL: truncation can collide.
-   Generating random codes and doing a separate "check then insert":
    concurrent requests can race.
-   A single Redis `INCR` as the only durable allocator: asynchronous
    failover can lose an acknowledged increment and reissue IDs.
-   Direct sequential Base62 codes if codes should not be predictable.
-   Snowflake-style 64-bit IDs if seven-character shortness is a
    requirement; 64 bits need about 11 Base62 characters.

The article's Base62 capacity arithmetic:

-   `62^6` ≈ 56.8 billion.
-   `62^7` ≈ 3.52 trillion.

### 6.2 Local project adaptation

For a single backend process and one PostgreSQL database, a PostgreSQL
sequence is a reasonable initial allocator:

``` sql
CREATE SEQUENCE short_code_sequence;
SELECT nextval('short_code_sequence');
```

Then convert the numeric value to Base62.

This replaces the operational need for a distributed leased-range
allocator. It does **not** automatically make codes unpredictable.

Review carefully:

-   Is the sequence/ID allocator safe under concurrent requests?
-   Is the code conversion correct for the chosen Base62 alphabet?
-   Are leading zeroes/padding handled consistently if fixed
    seven-character codes are required?
-   Is the numeric domain bounded or checked so codes do not exceed the
    chosen seven-character space?
-   Is the code stored with a database uniqueness constraint?
-   Does the implementation correctly handle a uniqueness conflict?
-   Are codes ever reused after expiry/deletion? They should not be.
-   Are generated codes predictable? If so, is that an accepted
    trade-off or is a permutation/obfuscation step intended?

### 6.3 Feistel permutation

Feistel is an optional advanced learning feature for the local version,
but it is part of the article's preferred production design.

If implemented, review:

-   It is a bijection over the intended finite domain: distinct input
    IDs map to distinct output values.
-   The output remains in the valid code domain; a naïve permutation
    over a larger domain may require cycle-walking or another
    domain-mapping strategy.
-   The Base62 output fits the required length.
-   The key is stable. The article warns that rotating the Feistel key
    can map old IDs differently and cause collisions with existing
    codes.
-   The permutation is not incorrectly described as encryption or a
    substitute for access control.
-   The database uniqueness constraint remains in place as a final
    guard.

Do not require Feistel for the first working version. Treat it as an
explicit optional phase unless the current code already implements it.

### 6.4 Leased ranges

Leased ID ranges are not necessary for one backend process. They are an
optional exercise or a future multi-instance requirement.

If the project implements them anyway, review the allocator
transaction/locking semantics, range boundaries, crash behaviour, and
the guarantee that no two workers can own overlapping ranges. Do not
insist on them merely because the article uses them.

## 7. Database and data model

The article identifies these core entities:

-   **Link:** code, long URL, creator, created time, optional expiry,
    status.
-   **User:** creator identity when signed-in users and quotas are
    supported.
-   **ID range:** leased counter range in the distributed design.
-   **Click event:** redirect event with code, time, country, referrer,
    user-agent class, and request ID.

For the local implementation:

-   PostgreSQL is the primary durable store.
-   Drizzle ORM is the intended database access layer.
-   An ID-range table is not required unless the project implements
    leased ranges.
-   User and ownership tables depend on whether authentication is part
    of the actual project scope.
-   Click-event storage depends on the analytics scope.

Review the schema and migrations for:

-   Primary keys and appropriate data types.
-   Unique constraint/index on `code`.
-   Non-null constraints for required fields.
-   Correct timestamp/time-zone handling.
-   Valid status representation.
-   Expiry representation and consistent semantics.
-   Foreign keys where relationships exist.
-   Indexes justified by actual queries.
-   No unnecessary sharding/partitioning for the local scope.

The article's primary access pattern is one lookup by short code and one
insert/conditional insert by code. PostgreSQL is a valid choice for this
access pattern; a distributed NoSQL store is not required.

## 8. Caching

### 8.1 Article's layered cache

The article's production read path is:

1.  CDN/edge cache.
2.  Redirect server's in-process LRU.
3.  Redis.
4.  Link store.

The local adaptation can start with:

1.  In-process LRU.
2.  PostgreSQL.

A single local Redis instance may be added as an optional learning layer
between LRU and PostgreSQL. Redis is not required merely to claim that
the project has caching.

### 8.2 Cache correctness checklist

Review:

-   Cache key is based on the short code.
-   Cached value contains enough information to enforce status and
    expiry, not just the destination URL.
-   Cache TTL never outlives `expires_at`.
-   Expired entries are not redirected even if still present in cache.
-   Updates, deletion, blocking, and takedown invalidate or update the
    cache.
-   Negative caching for unknown codes has a short, deliberate TTL if
    implemented.
-   Cache misses fall through correctly to PostgreSQL.
-   Cache errors do not crash the redirect handler unnecessarily.
-   LRU size is bounded to avoid unbounded memory growth.
-   Cache entries are not accidentally shared across unrelated keys.
-   If multiple concurrent requests miss the same key, request
    coalescing/single-flight may prevent duplicate database reads.

For one backend process, local LRU invalidation is straightforward. If
Redis is used, it is still a separate dependency and its failure
behaviour should be explicit.

### 8.3 Viral-link concerns

The article discusses hot keys and viral links. The CDN, multiple server
LRUs, Redis sharding, top-K detection, edge caching, and salted Kafka
keys are production-scale solutions.

For this local project, do not require these mechanisms. It is still
useful to understand that a single hot key can overload a shared cache
or database in a distributed deployment.

## 9. Redirect status and HTTP cache policy

The article prefers `302 Found` with explicit cache-control headers.

Reasoning:

-   A bare `301` is cacheable by default and may cause a browser to skip
    the shortener on later visits.
-   If the browser bypasses the shortener, the service cannot count that
    visit, change the destination, or immediately enforce a takedown.
-   `302` allows the service to control browser caching with response
    headers.
-   The article's example is `Cache-Control: private, max-age=0`.

Review the actual response status and headers. Do not simply check that
the handler calls `res.redirect()`; verify the resulting status,
`Location`, and cache headers with an integration test or HTTP client.

The article notes that `307`/`308` preserve the HTTP method, while
`301`/`302` have historical method-changing behaviour. Since short-link
visits are GET requests, its main reason for choosing 302 is cache
control.

## 10. Analytics and asynchronous processing

### 10.1 Article's approach

The article sends click events asynchronously to Kafka:

-   Redirect service buffers click events.
-   Events are flushed in batches.
-   CDN edge logs also enter the analytics stream so edge-served clicks
    are counted.
-   A stream processor deduplicates by request ID, filters bots,
    aggregates per minute, and writes to an analytics store.
-   Analytics is eventually consistent and may lag by minutes.
-   Analytics must not slow down a redirect.

### 10.2 Local project adaptation

Kafka is not required. Possible levels:

1.  **Simplest:** record click information in PostgreSQL, while being
    careful not to make a slow analytics operation block the redirect
    response.
2.  **Background worker:** enqueue events in-process and process them
    asynchronously. Be aware that in-memory events can be lost if the
    process crashes.
3.  **RabbitMQ (optional):** publish click events to a local broker and
    consume them in a background worker. This is a useful message-queue
    learning exercise, not an article requirement for the local version.

If RabbitMQ is used, review:

-   Publisher/consumer responsibilities.
-   Acknowledgement and retry behaviour.
-   What happens when the broker is unavailable.
-   Whether messages can be duplicated and how the consumer handles
    that.
-   Whether the redirect response waits for analytics work.
-   Whether event loss is possible and whether the implementation
    documents that trade-off.

Do not claim exactly-once click counting unless the full event and
persistence design actually supports it. A practical design usually
needs idempotent processing/deduplication, such as a unique
request/event ID.

Analytics counts should be described as clicks/requests, not unique
people, unless identity and deduplication semantics genuinely support
unique-user measurement.

## 11. Abuse prevention and takedown

The article treats abuse prevention as part of the product, not an
optional afterthought.

Review for:

-   Creation rate limiting.
-   Strict URL validation.
-   Blocking known malicious destinations using a threat list or an
    explicitly documented simpler policy.
-   Reserved aliases and optional profanity filtering.
-   Ability to mark links as blocked/taken down.
-   Redirect path checks blocked status.
-   Cache purge/invalidation after takedown.
-   Optional asynchronous rescanning of links, if implemented.
-   Safe handling of untrusted URL input and error messages.

Do not claim that basic URL parsing alone detects phishing or malware.
If no threat-intelligence integration exists, state that limitation
clearly.

## 12. Failure handling and resilience

The article describes per-dependency failure behaviour:

  -----------------------------------------------------------------------
  Dependency/failure      Article's principle     Local review
                                                  expectation
  ----------------------- ----------------------- -----------------------
  Redis unavailable       Fall back to LRU and    If Redis exists,
                          store, with concurrency redirect should degrade
                          limits                  gracefully where
                                                  possible

  ID allocator            Existing leased ranges  With PostgreSQL
  unavailable             allow creation to       sequence, creation
                          continue temporarily    depends on PostgreSQL
                                                  unless another
                                                  allocator is
                                                  deliberately designed

  Link-store partition    Cached links may still  Local PostgreSQL outage
  unavailable             redirect; cold links    means uncached lookups
                          fail with retry         and writes cannot work
                          guidance                

  Kafka unavailable       Bounded buffer may drop RabbitMQ/worker failure
                          analytics events;       must not unnecessarily
                          redirects continue      block redirects

  Backend process crashes Not solved by the       Local application is
                          article's cache         unavailable until
                          fallback alone          restarted; document
                                                  this limitation
  -----------------------------------------------------------------------

Review actual failure paths, timeouts, error mapping, retry behaviour,
and graceful shutdown. Avoid infinite retries, unbounded in-memory
queues, and retries that amplify an outage.

Do not demand circuit breakers or distributed failover unless justified
by the dependencies and project scope.

## 13. Testing and verification expectations

When reviewing, look for evidence that important properties are tested.

### URL creation

-   Valid URL creates a record and returns a short code.
-   Invalid schemes and malformed URLs are rejected.
-   Own short domain is rejected as a destination if that rule is
    implemented.
-   Expiry in the past is rejected.
-   Custom alias success and duplicate alias conflict.
-   Concurrent requests attempting the same alias cannot both succeed.
-   Retried requests behave according to the idempotency contract, if
    supported.

### Code generation

-   Base62 encode/decode round-trip tests.
-   Boundary tests around zero, alphabet transitions, and maximum
    supported code value.
-   Fixed-width formatting tests if seven characters are required.
-   Concurrent generation tests.
-   Database uniqueness constraint test.
-   No reuse of codes after expiration/deletion.
-   Feistel bijection/domain tests if Feistel is implemented.

### Redirect

-   Existing active code returns the expected 302 and `Location`.
-   Unknown code returns 404.
-   Expired/blocked code returns 410 or the explicitly documented
    equivalent.
-   Correct cache headers.
-   Cached expired/blocked records do not redirect.
-   Cache miss reads from PostgreSQL.
-   Cache hit avoids a database lookup, where measurable/testable.

### Cache

-   TTL and expiry boundaries.
-   Invalidation after updates/takedown.
-   Negative cache behaviour if implemented.
-   Bounded LRU behaviour.
-   Redis failure fallback if Redis is included.
-   Concurrent cache miss behaviour if single-flight is implemented.

### Analytics

-   Redirect succeeds even if analytics processing fails, according to
    the chosen design.
-   Event contains the expected code and timestamp.
-   Duplicate event handling if deduplication is claimed.
-   Consumer retry/acknowledgement behaviour if RabbitMQ is used.

### Operational setup

-   Docker Compose starts the required local dependencies.
-   Application configuration is environment-based.
-   Secrets are not committed.
-   Database migrations are reproducible.
-   Graceful shutdown closes database/broker connections.
-   Tests do not depend on production services or external credentials.

Do not assume these tests exist. Inspect and report.

## 14. Scope classification for review findings

Classify each finding using one of these labels:

-   **Bug:** Existing behaviour is incorrect or violates an agreed
    requirement.
-   **Correctness risk:** A race, data-integrity issue, expiry issue, or
    failure mode could cause incorrect behaviour.
-   **Security/abuse risk:** A vulnerability or unsafe redirect/URL
    handling issue.
-   **Missing core behaviour:** A functional requirement has not been
    implemented.
-   **Optional improvement:** Useful, but not required for the agreed
    local scope.
-   **Future distributed-scale concern:** Relevant only if the project
    later adds multiple instances, regions, or production-scale traffic.
-   **Not applicable:** An article feature intentionally excluded by the
    local project scope.

Do not label an intentionally removed CDN, load balancer, Kafka cluster,
sharding, or multi-region setup as a bug.

## 15. Required review response format

When asked to review the project, respond in this structure:

### A. Overall assessment

A short summary of what was inspected and whether the implementation is
broadly correct for the current local scope.

### B. Findings (highest severity first)

For each finding include:

-   **Severity/category**
-   **What is wrong or missing**
-   **Evidence:** file path, function/class/schema, and line range where
    available
-   **Why it matters**
-   **Concrete scenario that exposes the problem**
-   **Suggested direction**, without implementing it

Prioritize correctness, data integrity, security, and broken core
behaviour over style.

### C. Cross-check against this brief

Use a concise table:

  -----------------------------------------------------------------------
  Area                    Status                  Evidence / notes
  ----------------------- ----------------------- -----------------------
  URL creation and        Pass / Partial / Fail / ...
  validation              Not implemented         

  Redirect behaviour      ...                     ...

  Code generation and     ...                     ...
  uniqueness                                      

  PostgreSQL schema and   ...                     ...
  constraints                                     

  Expiry and code reuse   ...                     ...

  Caching                 ...                     ...

  Analytics isolation     ...                     ...

  Abuse prevention        ...                     ...

  Failure handling        ...                     ...

  Tests and local setup   ...                     ...
  -----------------------------------------------------------------------

Use **Not applicable** for intentionally excluded distributed
components.

### D. Missing tests

List specific tests needed to prove the important behaviours. Avoid
generic advice such as "add more tests."

### E. Next priorities

Give a short, ordered list of the most valuable issues to address. Do
not turn this into an implementation plan unless asked.

## 16. Important review principles

-   Correctness beats architectural complexity.
-   Database constraints are part of correctness; application-level
    checks alone are not enough for uniqueness under concurrency.
-   A PostgreSQL sequence can allocate unique numeric IDs for this
    single-database setup, but sequential Base62 codes are predictable
    unless transformed.
-   A unique constraint is still needed even when the generator is
    designed to be unique.
-   A cache is a performance layer, not the source of truth.
-   Expiry and takedown must remain effective when data is cached.
-   Redirect latency must not depend on analytics processing.
-   A queue can introduce duplicate delivery and/or event loss depending
    on its acknowledgement and persistence design; inspect the actual
    guarantees.
-   Do not promise exactly-once analytics without evidence.
-   Do not claim production-scale performance from local functional
    tests.
-   Do not add complexity simply to match every box in the article's
    distributed architecture.
-   If the implementation makes a different choice from the article,
    evaluate whether the choice is valid for this project's constraints
    rather than treating every difference as a defect.

## 17. Boundaries of this document

This brief is based on the Engineering Atlas URL Shortener article and
the agreed local single-backend project direction. It is not a complete
product specification.

It does not establish that the project must include authentication, user
dashboards, click analytics UI, RabbitMQ, Redis, Feistel, custom
aliases, or any particular frontend feature. Verify current project
requirements and repository state before treating optional features as
commitments.

The article also includes a Pastebin adaptation. **Pastebin
functionality is out of scope** for this URL shortener unless the user
explicitly asks to add it.

------------------------------------------------------------------------

**Instruction to the reviewing agent:** First inspect and understand the
existing implementation. Then evaluate it against this context, clearly
separating actual defects from deliberate scope reductions and optional
future enhancements. Do not implement anything as part of a review.
