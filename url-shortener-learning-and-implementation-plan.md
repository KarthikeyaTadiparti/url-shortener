# URL Shortener --- End-to-End Learning & Implementation Plan

> **Project constraint:** Build a production-grade URL shortener that
> runs locally on one machine and uses one backend application server.
> The goal is to learn production architecture and engineering
> practices---not to build a distributed deployment.

## 1. Project goal and learning approach

Build the project incrementally, starting with a small working
application and evolving it into a maintainable, observable, testable
system.

For every phase, follow this loop:

1.  **Understand** --- learn the concept and why a real application
    needs it.
2.  **Design** --- decide where the responsibility belongs and how
    components interact.
3.  **Implement** --- write the smallest useful version yourself.
4.  **Test** --- cover normal cases, edge cases, and failures.
5.  **Evaluate** --- inspect the code and measure whether the change
    actually helps.
6.  **Refactor** --- improve structure only after the behavior is
    understood.

Do not begin by copying a large production repository or introducing
every technology at once. First make the simplest version work; then add
production concerns one at a time.

### Final capabilities

The finished application should support:

-   Creating short links from long URLs.
-   Redirecting short codes to their original URLs.
-   Custom aliases, expiration dates, and link deactivation.
-   User accounts and ownership of links.
-   Click analytics, including asynchronous aggregation.
-   Redis caching and rate limiting.
-   Background processing through RabbitMQ and a local worker process.
-   Validation, centralized error handling, structured logging, and
    graceful shutdown.
-   Database indexing and query optimization.
-   Automated tests, load tests, health checks, metrics, and dashboards.
-   A small React dashboard for managing links and viewing analytics.

## 2. Constraints and architecture decisions

These are deliberate project constraints, not temporary omissions.

### Deployment and infrastructure constraints

-   Run everything locally; do not deploy the project as part of this
    plan.
-   Use **one backend application server**.
-   Do not add a load balancer.
-   Do not create multiple distributed backend servers.
-   Do not implement machine-ID-based ID generation.
-   Do not introduce distributed coordination or distributed locking
    unless a local feature genuinely requires it.
-   Redis, RabbitMQ, and a separate worker process are allowed, but run
    them locally through Docker Compose.
-   The worker is a separate process on the same machine, not a separate
    distributed service deployment.

### ID generation decision

Use a PostgreSQL-generated numeric ID (identity/sequence), then encode
it as Base62 to create the short code.

Conceptually:

``` text
PostgreSQL ID: 125
       |
       v
Base62 encode
       |
       v
Short code: "cb"
       |
       v
https://sho.rt/cb
```

This is appropriate for the single-backend/local project. Do not
implement Snowflake IDs, machine IDs, or distributed ID generation.

### Recommended stack

  Area                   Technology
  ---------------------- --------------------------------
  Frontend               React + Vite + TypeScript
  Backend                Node.js + Express + TypeScript
  Database               PostgreSQL
  Database access        Drizzle ORM
  Cache                  Redis
  Message broker         RabbitMQ
  Background worker      Node.js + TypeScript process
  Validation             Zod
  Logging                Pino
  Testing                Vitest + Supertest
  Local infrastructure   Docker Compose
  Load testing           k6
  Metrics                Prometheus
  Dashboards             Grafana

**Why Drizzle:** use the PostgreSQL/Drizzle approach already familiar
from the backend work. Keep SQL and database behavior visible while
learning. Avoid changing ORMs halfway through the project just to follow
a tutorial.

## 3. Target repository structure

The repository is organized into top-level `backend/` and `frontend/` applications (with an optional dedicated local `worker/` process for background tasks), sharing local services via Docker Compose (`compose.yaml`).

The backend is structured as a **modular monolith**: one deployable Express API application organized by feature and clear architectural responsibilities.

``` text
url-shortener/
├── backend/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── env.ts
│   │   │   ├── redis.ts
│   │   │   └── rabbitmq.ts
│   │   ├── schema/
│   │   │   ├── index.ts
│   │   │   ├── urls.schema.ts
│   │   │   ├── users.schema.ts
│   │   │   └── analytics.schema.ts
│   │   ├── common/
│   │   │   ├── errors/
│   │   │   │   └── app-error.ts
│   │   │   ├── middleware/
│   │   │   │   ├── error.middleware.ts
│   │   │   │   ├── not-found.middleware.ts
│   │   │   │   ├── request-id.middleware.ts
│   │   │   │   └── auth.middleware.ts
│   │   │   ├── logger/
│   │   │   │   └── logger.ts
│   │   │   ├── validation/
│   │   │   └── utils/
│   │   │       └── base62.util.ts
│   │   ├── modules/
│   │   │   ├── url-creation/
│   │   │   │   ├── url-creation.controller.ts
│   │   │   │   ├── url-creation.routes.ts
│   │   │   │   ├── url-creation.service.ts
│   │   │   │   └── url-creation.repository.ts
│   │   │   ├── url-redirection/
│   │   │   │   ├── url-redirection.controller.ts
│   │   │   │   ├── url-redirection.routes.ts
│   │   │   │   ├── url-redirection.service.ts
│   │   │   │   └── url-redirection.repository.ts
│   │   │   ├── analytics/
│   │   │   │   ├── analytics.controller.ts
│   │   │   │   ├── analytics.routes.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   └── analytics.repository.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── auth.repository.ts
│   │   │   └── users/
│   │   │       ├── users.controller.ts
│   │   │       ├── users.routes.ts
│   │   │       ├── users.service.ts
│   │   │       └── users.repository.ts
│   │   ├── infrastructure/
│   │   │   ├── cache/
│   │   │   │   └── redis.client.ts
│   │   │   ├── messaging/
│   │   │   │   └── rabbitmq.client.ts
│   │   │   └── observability/
│   │   │       └── metrics.ts
│   │   └── types/
│   ├── drizzle/
│   │   └── migrations/
│   ├── tests/
│   ├── .env
│   ├── .gitignore
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── url-creation/
│   │   │   ├── analytics/
│   │   │   └── auth/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   └── query-client.ts
│   │   ├── types/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   └── vite.config.ts
├── worker/
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   │   ├── rabbitmq.ts
│   │   │   └── database.ts
│   │   ├── consumers/
│   │   │   └── analytics.consumer.ts
│   │   ├── processors/
│   │   │   └── analytics.processor.ts
│   │   └── infrastructure/
│   ├── package.json
│   └── tsconfig.json
├── infra/
│   ├── prometheus/
│   └── grafana/
├── docs/
│   ├── architecture/
│   ├── decisions/
│   └── api/
├── compose.yaml
├── .gitignore
├── package.json
└── README.md
```

### Important structure and naming rules

-   **File and module naming conventions:**
    -   Feature modules live under `backend/src/modules/` in kebab-case folders (e.g., `url-creation`, `url-redirection`, `analytics`, `auth`, `users`).
    -   Files inside feature modules strictly follow the `<module-name>.<role>.ts` pattern:
        -   `<module>.controller.ts` (e.g., `url-creation.controller.ts`)
        -   `<module>.routes.ts` (e.g., `url-creation.routes.ts`)
        -   `<module>.service.ts` (e.g., `url-creation.service.ts`)
        -   `<module>.repository.ts` (e.g., `url-creation.repository.ts`)
    -   Keep URL creation (`url-creation`) and URL redirection (`url-redirection`) as logically distinct modules: write path and redirect path have different latencies, caching needs, and scaling characteristics.
    -   Middleware files follow the `<name>.middleware.ts` pattern (e.g., `error.middleware.ts`, `not-found.middleware.ts`, `request-id.middleware.ts`, `auth.middleware.ts`).
    -   Common utility and error files follow kebab-case (e.g., `app-error.ts`, `base62.util.ts`).
    -   Drizzle database schemas live under `backend/src/schema/` with table-specific files (`urls.schema.ts`, `users.schema.ts`, `analytics.schema.ts`) and a central barrel export `index.ts`.
-   `app.ts` (`backend/src/app.ts`) creates and configures the Express application (middleware, routes, error handlers). It should not start listening on a port.
-   `server.ts` (`backend/src/server.ts`) owns process startup, database verification (`pool.query("SELECT 1")`), HTTP `server.listen()`, signal handling (`SIGINT`, `SIGTERM`), and graceful shutdown.
-   Routes define HTTP endpoints and attach middleware/controllers.
-   Controllers translate HTTP input/output. They should not contain business rules or SQL.
-   Services contain use cases and business rules.
-   Repositories own database queries and persistence details (using Drizzle ORM).
-   Infrastructure modules integrate Redis, RabbitMQ, logging, and metrics.
-   Multi-service local orchestration uses `compose.yaml` (PostgreSQL, Redis, RabbitMQ) at the project root.
-   Keep interfaces and abstractions purposeful. Do not create a class for every file or force Java-style OOP where simple functions and modules are clearer.
-   Use classes when they provide a real benefit, such as managing a stateful connection/consumer or encapsulating an invariant. Prefer straightforward functions for stateless use cases.

## 4. Phase-by-phase implementation roadmap

Each phase ends with a working checkpoint. Do not move on until you can
explain the code you wrote.

------------------------------------------------------------------------

## Phase 0 --- Development environment and project setup

### Learn

-   Node.js runtime and npm scripts.
-   TypeScript compilation and module settings.
-   Environment variables and configuration.
-   What a monorepo is and why applications are separated.
-   Difference between application setup (`app.ts`) and process startup
    (`server.ts`).

### Implement

1.  Install Node.js, Git, Docker Desktop, and a code editor.
2.  Create the repository and initialize Git.
3.  Set up separate project workspaces or scripts for `backend/` and `frontend/` (with root convenience scripts in `package.json`).
4.  Configure TypeScript with strict mode (`backend/tsconfig.json`, `frontend/tsconfig.json`).
5.  Add scripts for development, build, type-check, lint, and test.
6.  Add `.env.example` and local `.env` under `backend/`; never commit real secrets.
7.  Create a minimal Express app (`backend/src/app.ts`) and a separate server entry point (`backend/src/server.ts`).
8.  Add a `/health` or root status endpoint.

### Checkpoint

-   `npm run dev` in `backend/` (or `npm run backend` from root) starts the API.
-   `npm run build` succeeds in `backend/` and `frontend/`.
-   `npm run typecheck` succeeds.
-   The server responds at `http://localhost:3000`.
-   You can explain why importing `app.ts` should not start a server.

------------------------------------------------------------------------

## Phase 1 --- Backend foundation and production request lifecycle

### Learn

-   Express request-response lifecycle.
-   Middleware ordering and error propagation.
-   Async errors in Express.
-   Configuration validation.
-   Centralized error handling.
-   Structured logging.
-   Process lifecycle and graceful shutdown.

### Implement

1.  Build an environment schema with Zod in `backend/src/config/env.ts`. Validate required variables at startup.
2.  Add request logging with Pino and a request ID middleware (`backend/src/common/middleware/request-id.middleware.ts`).
3.  Add JSON/body-size limits and a not-found handler (`backend/src/common/middleware/not-found.middleware.ts`).
4.  Create a custom application error class with HTTP status code and stable error code (`backend/src/common/errors/app-error.ts`).
5.  Add one global error middleware (`backend/src/common/middleware/error.middleware.ts`). Keep internal stack traces out of production responses.
6.  Add a consistent API error response shape.
7.  Add startup checks for required dependencies in `backend/src/server.ts`.
8.  Implement `SIGINT` and `SIGTERM` handling:
    -   Stop accepting new HTTP connections via `server.close()`.
    -   Allow in-flight requests to finish.
    -   Close RabbitMQ/Redis connections if initialized.
    -   Close the PostgreSQL pool (`await pool.end()`).
    -   Exit after cleanup; handle shutdown failures.
9.  Handle server `error` events, including port conflicts.
10. Distinguish startup failures from errors that occur while the server is already running.

### Suggested files

``` text
backend/src/config/env.ts
backend/src/config/database.ts
backend/src/common/errors/app-error.ts
backend/src/common/middleware/error.middleware.ts
backend/src/common/middleware/not-found.middleware.ts
backend/src/common/middleware/request-id.middleware.ts
backend/src/common/logger/logger.ts
backend/src/app.ts
backend/src/server.ts
```

### Tests

-   Invalid environment variables prevent startup.
-   Unknown routes return 404.
-   A controller error reaches the global handler.
-   The response does not expose internal stack traces.
-   Shutdown closes the resources that were actually initialized.

### Checkpoint

You can explain what happens from the moment a request reaches Express
until a response is sent, and what happens when the process starts,
crashes, or receives a shutdown signal.

------------------------------------------------------------------------

## Phase 2 --- PostgreSQL schema and database fundamentals

### Learn

-   Relational modeling, primary keys, foreign keys, unique constraints.
-   Identity columns/sequences.
-   Transactions and isolation basics.
-   Indexes and query plans.
-   Connection pools and pool lifecycle.
-   Migrations and schema evolution.

### Initial schema

Start with only the tables required for core URL creation and redirects.

**`users`**

  Column            Purpose
  ----------------- ----------------------
  `id`              Primary key
  `email`           Unique account email
  `password_hash`   Hashed password
  `created_at`      Creation timestamp

**`urls`**

  Column           Purpose
  ---------------- ----------------------------------------------
  `id`             PostgreSQL-generated numeric ID
  `user_id`        Nullable initially; owner when authenticated
  `short_code`     Unique Base62 code
  `original_url`   Destination URL
  `created_at`     Creation timestamp
  `expires_at`     Optional expiration
  `is_active`      Enable/disable a link

Do not add every analytics column to `urls`. Keep event data separate.

### Implement

1.  Run PostgreSQL locally using Docker Compose (`compose.yaml`).
2.  Configure a `pg` connection pool and Drizzle in `backend/src/config/database.ts`.
3.  Validate the database URL via environment configuration.
4.  Create the initial schemas in `backend/src/schema/urls.schema.ts` and `backend/src/schema/users.schema.ts`, exported through `backend/src/schema/index.ts`. Ensure `backend/drizzle.config.ts` points to `./src/schema/index.ts`.
5.  Add a migration workflow (`drizzle-kit generate`, `drizzle-kit migrate`) outputting migrations to `backend/drizzle/migrations/`.
6.  Add a repository for URL persistence (`backend/src/modules/url-creation/url-creation.repository.ts`).
7.  Add a database readiness check in `backend/src/server.ts` that executes `await pool.query("SELECT 1")` during server startup.
8.  Learn to inspect indexes and use `EXPLAIN ANALYZE`.

### Suggested files

``` text
compose.yaml
backend/drizzle.config.ts
backend/src/config/database.ts
backend/src/schema/index.ts
backend/src/schema/urls.schema.ts
backend/src/schema/users.schema.ts
backend/src/modules/url-creation/url-creation.repository.ts
backend/drizzle/migrations/
```

### Checkpoint

-   Database starts consistently via `docker compose up -d postgres`.
-   Migrations can be applied to a clean database.
-   The API connects through the pool during startup in `backend/src/server.ts`.
-   The pool is closed cleanly during graceful shutdown.
-   You understand why one connection per request is not a good design.

------------------------------------------------------------------------

## Phase 3 --- Core URL shortener (no Redis, no RabbitMQ)

Build the simplest correct product before adding infrastructure. The URL functionality is divided into two focused modules:
-   **`url-creation`** (write path & link management): creates short links, lists URLs, gets details, updates and deactivates links.
-   **`url-redirection`** (read/redirect path): resolves short codes, validates status/expiry, and issues HTTP 302 redirects.

### Learn

-   HTTP methods and status codes.
-   Request validation and output serialization.
-   Service/repository separation.
-   Base62 encoding and decoding.
-   Redirect behavior and URL validation.

### Implement the use cases

1.  Create a short URL (`url-creation.service.ts`).
2.  Resolve a short code and redirect (`url-redirection.service.ts`).
3.  List URLs (`url-creation.service.ts`).
4.  Get URL details (`url-creation.service.ts`).
5.  Delete or deactivate a URL (`url-creation.service.ts`).
6.  Update a URL's destination if editing is supported.

### Base62 strategy

Use the database-generated ID as the source of uniqueness:

1.  Insert a URL row and obtain its numeric ID.
2.  Convert that ID to Base62 via `backend/src/common/utils/base62.util.ts`.
3.  Persist the resulting short code.
4.  Return the short URL.

Think carefully about transaction boundaries and uniqueness. A clean
implementation may use a transaction so the record is not left in a
partially initialized state. Keep a unique constraint on `short_code` as
the final integrity guarantee.

Do not use random IDs or machine IDs for the initial design. Later,
compare the trade-offs of sequential IDs, random codes, and
pre-generated code allocation as a learning exercise.

### Suggested API

  Module            Method     Endpoint          Purpose
  ----------------- ---------- ----------------- ----------------------
  `url-creation`    `POST`     `/api/urls`       Create a short URL
  `url-creation`    `GET`      `/api/urls`       List URLs
  `url-creation`    `GET`      `/api/urls/:id`   Get URL details
  `url-creation`    `PATCH`    `/api/urls/:id`   Update/deactivate
  `url-creation`    `DELETE`   `/api/urls/:id`   Delete or deactivate
  `url-redirection` `GET`      `/:shortCode`     Redirect

### Suggested files

``` text
backend/src/modules/url-creation/url-creation.controller.ts
backend/src/modules/url-creation/url-creation.routes.ts
backend/src/modules/url-creation/url-creation.service.ts
backend/src/modules/url-creation/url-creation.repository.ts
backend/src/modules/url-redirection/url-redirection.controller.ts
backend/src/modules/url-redirection/url-redirection.routes.ts
backend/src/modules/url-redirection/url-redirection.service.ts
backend/src/modules/url-redirection/url-redirection.repository.ts
backend/src/common/utils/base62.util.ts
```

### Validation and edge cases

-   Malformed URL.
-   Unsupported schemes such as `javascript:`.
-   Empty or excessively long input.
-   Duplicate custom alias.
-   Unknown short code.
-   Expired link.
-   Inactive link.
-   Database constraint violation.
-   Invalid path characters.
-   Redirect response and `Location` header.

### Tests

Use Vitest and Supertest. Test services and repositories separately
where useful, then test the HTTP contract.

### Checkpoint

You can create a URL, store it in PostgreSQL, and redirect successfully
with no Redis or message broker involved.

------------------------------------------------------------------------

## Phase 4 --- Clean architecture and maintainability review

Do this after the core feature works---not before.

### Learn

-   Separation of concerns.
-   Dependency direction.
-   Modular monolith boundaries.
-   Dependency injection without unnecessary frameworks.
-   When to use classes versus functions.
-   Unit, integration, and API tests.

### Refactor

Maintain a clear distinction between `url-creation` (write path) and `url-redirection` (read path). Both modules adhere strictly to the `<module-name>.<role>.ts` pattern:

``` text
HTTP request (e.g. POST /api/urls or GET /:shortCode)
   |
   v
Route (url-creation.routes.ts / url-redirection.routes.ts)
   |
   v
Controller (url-creation.controller.ts / url-redirection.controller.ts)
   |
   v
Service (url-creation.service.ts / url-redirection.service.ts)
   |
   v
Repository (url-creation.repository.ts / url-redirection.repository.ts)
   |
   v
Database (Drizzle ORM + PostgreSQL)
```

Review these responsibilities:

-   **Controller (`<module>.controller.ts`):** parse validated HTTP input, delegate to the service use case, format HTTP responses. Keep business logic and SQL out of controllers.
-   **Service (`<module>.service.ts`):** enforce domain logic and invariants (e.g., Base62 code encoding, custom alias rules, expiration checks, link deactivation).
-   **Repository (`<module>.repository.ts`):** encapsulate Drizzle database queries and data persistence details.
-   **Routes (`<module>.routes.ts`):** declare route endpoints, attach authentication/validation middleware, and bind controller methods.
-   **Database Schema (`backend/src/schema/`):** define Drizzle table schemas (`urls.schema.ts`, `users.schema.ts`, `analytics.schema.ts`) exported via `index.ts`.
-   **Common Utilities & Errors (`backend/src/common/`):** centralized helpers like `app-error.ts`, `base62.util.ts`, and middleware (`error.middleware.ts`, `not-found.middleware.ts`).

Avoid: - SQL inside controllers. - Business rules inside route
definitions. - One giant service containing every feature. - Generic
repository abstractions that hide useful SQL. - Interfaces that have
only one implementation and no meaningful boundary. - Classes used only
to hold a collection of unrelated functions.

### Checkpoint

A new developer can find the URL creation and redirection flows quickly and understand
where to add a rule, query, endpoint, or test.

------------------------------------------------------------------------

## Phase 5 --- Redis caching

Only introduce Redis after measuring the uncached redirect flow.

### Learn

-   Cache-aside pattern.
-   TTL and expiration.
-   Cache invalidation.
-   Cache stampede basics.
-   Cache failure behavior.
-   What should and should not be cached.

### Implement

1.  Run Redis locally through Docker Compose (`compose.yaml`).
2.  Configure a Redis client in `backend/src/config/redis.ts` and `backend/src/infrastructure/cache/redis.client.ts`.
3.  Cache `shortCode -> destination + status + expiry` on successful lookups in `url-redirection.service.ts`.
4.  On cache miss, read PostgreSQL and populate Redis.
5.  On URL update/deactivation/deletion in `url-creation.service.ts`, invalidate the relevant cache key.
6.  Set a reasonable TTL.
7.  Define behavior when Redis is unavailable: fall back to PostgreSQL rather than making redirects unavailable.
8.  Add cache hit/miss/error metrics and logs.

### Suggested files

``` text
compose.yaml
backend/src/config/redis.ts
backend/src/infrastructure/cache/redis.client.ts
backend/src/modules/url-redirection/url-redirection.service.ts
backend/src/modules/url-creation/url-creation.service.ts
```

### Tests

-   Cache hit avoids a database lookup.
-   Cache miss reads the database and populates cache.
-   Invalidation prevents stale destinations.
-   Expired/inactive links are not redirected.
-   Redis outage does not break the core redirect path.

### Checkpoint

The application remains correct with Redis stopped, while Redis improves
repeated redirect performance when healthy.

------------------------------------------------------------------------

## Phase 6 --- Analytics: synchronous baseline, then asynchronous design

Start by deciding what one click means and what data is worth
collecting.

### Learn

-   Event modeling.
-   Write amplification.
-   Aggregation versus raw event storage.
-   Privacy-conscious analytics.
-   Why analytics should not slow down redirects.

### Design

Use a separate click-events table rather than continuously updating one
large URL row.

Example fields:

-   `id`
-   `url_id`
-   `occurred_at`
-   `referrer` (optional)
-   `user_agent` (optional or normalized)
-   `country` (only if you later add a reliable geo-IP source)
-   `device_type` (derived, optional)

Avoid collecting unnecessary personal information. Do not store full IP
addresses by default.

### Implement in two steps

**Step A --- Baseline**

-   Record a click event in a straightforward implementation.
-   Add per-link total clicks and time-based reports.
-   Measure how much analytics affects redirect latency.

**Step B --- Prepare asynchronous processing**

-   Define an analytics event payload.
-   Separate redirect success from analytics processing.
-   Add tests for duplicate events and missing URL references.

### Suggested files

``` text
backend/src/schema/analytics.schema.ts
backend/src/modules/analytics/analytics.controller.ts
backend/src/modules/analytics/analytics.routes.ts
backend/src/modules/analytics/analytics.service.ts
backend/src/modules/analytics/analytics.repository.ts
```

### Checkpoint

You understand the cost of synchronous analytics and have a clear event
contract before adding RabbitMQ.

------------------------------------------------------------------------

## Phase 7 --- RabbitMQ and local background worker

RabbitMQ is included to learn event-driven processing, not because the
project has multiple backend servers.

### Learn

-   Producer, exchange, queue, binding, routing key.
-   Acknowledgement and rejection.
-   Durable queues and persistent messages.
-   Retry and dead-letter handling.
-   At-least-once delivery.
-   Idempotent consumers.
-   Backpressure and graceful consumer shutdown.

### Local process model

``` text
                 one local machine
+------------------------------------------------------+
|                                                      |
|  Frontend (React)  --->  Backend API (Express)       |
|                                |                     |
|                      +---------+----------+          |
|                      |                    |          |
|                  PostgreSQL             Redis        |
|                      |                               |
|                      +---- RabbitMQ <---- API event  |
|                                  |                   |
|                                  v                   |
|                           Local worker               |
|                                  |                   |
|                                  v                   |
|                         Analytics tables             |
|                                                      |
+------------------------------------------------------+
```

The API (`backend/`) and worker (`worker/`) are separate processes on the same machine. This does
not require multiple servers or a load balancer.

### Implement

1.  Start RabbitMQ locally using Docker Compose (`compose.yaml`).
2.  Configure RabbitMQ connection and publisher in `backend/src/config/rabbitmq.ts` and `backend/src/infrastructure/messaging/rabbitmq.client.ts`.
3.  Create an analytics exchange and queue.
4.  Publish a click event after the redirect decision has been made in `url-redirection.service.ts`.
5.  Keep the redirect response independent of analytics processing.
6.  Build a worker process (`worker/src/index.ts`) that consumes events (`analytics.consumer.ts`).
7.  Acknowledge only after successful processing (`analytics.processor.ts`).
8.  Add retry behavior for transient failures.
9.  Route repeatedly failing messages to a dead-letter queue.
10. Make event processing idempotent.
11. Handle worker shutdown and reconnect behavior.
12. Decide what happens if RabbitMQ is down. Do not silently claim an event was delivered when publishing failed.

### Suggested files

``` text
compose.yaml
backend/src/config/rabbitmq.ts
backend/src/infrastructure/messaging/rabbitmq.client.ts
worker/package.json
worker/tsconfig.json
worker/src/index.ts
worker/src/config/rabbitmq.ts
worker/src/config/database.ts
worker/src/consumers/analytics.consumer.ts
worker/src/processors/analytics.processor.ts
```

### Checkpoint

Redirects do not wait for analytics aggregation. The local worker can be
stopped and restarted without corrupting analytics or losing track of
message-processing failures.

------------------------------------------------------------------------

## Phase 8 --- Authentication, authorization, and link ownership

Add accounts after anonymous URL creation and redirects are stable.

### Learn

-   Password hashing.
-   Authentication versus authorization.
-   Cookie-based sessions or JWT trade-offs.
-   CSRF and CORS considerations.
-   Ownership checks.
-   Rate limiting for sensitive endpoints.

### Implement

1.  Register and log in.
2.  Hash passwords using a suitable password-hashing algorithm; never
    store plaintext passwords.
3.  Add logout and authentication middleware (`backend/src/common/middleware/auth.middleware.ts`).
4.  Associate URLs with users in database schema (`backend/src/schema/urls.schema.ts` and `users.schema.ts`).
5.  Ensure a user can only view, update, or delete their own links.
6.  Decide how anonymous links behave after accounts are introduced.
7.  Add tests for unauthorized and cross-user access.

### Suggested files

``` text
backend/src/schema/users.schema.ts
backend/src/common/middleware/auth.middleware.ts
backend/src/modules/auth/auth.controller.ts
backend/src/modules/auth/auth.routes.ts
backend/src/modules/auth/auth.service.ts
backend/src/modules/auth/auth.repository.ts
backend/src/modules/users/users.controller.ts
backend/src/modules/users/users.routes.ts
backend/src/modules/users/users.service.ts
backend/src/modules/users/users.repository.ts
```

### Checkpoint

Authentication works, and every protected operation enforces ownership
in the service/query layer---not only by hiding buttons in React.

------------------------------------------------------------------------

## Phase 9 --- Custom aliases, expiry, abuse controls, and API hardening

### Learn

-   Abuse prevention.
-   Rate limiting strategies.
-   Input normalization.
-   Open redirect and phishing considerations.
-   Operational limits and API contracts.

### Implement

-   Custom aliases with conflict handling.
-   Expiration date validation and redirect-time expiry checks.
-   Link deactivation.
-   Rate limits for URL creation and authentication endpoints.
-   Request body and URL length limits.
-   Restrict accepted URL schemes to HTTP/HTTPS.
-   Security headers and carefully configured CORS.
-   Consistent pagination and sorting.
-   API versioning only if it solves a real compatibility need.

Consider whether to block private/local network destinations if the
application later fetches URLs for previews or metadata. A redirect-only
service does not need to fetch the destination URL.

### Checkpoint

The API handles invalid, abusive, and boundary inputs predictably
without adding unnecessary infrastructure.

------------------------------------------------------------------------

## Phase 10 --- React dashboard

Build the frontend after the API contract is stable.

### Learn

-   Feature-based React structure.
-   API client boundaries.
-   Loading, error, and empty states.
-   Form validation.
-   Authentication state.
-   Pagination and chart presentation.

### Screens

1.  Register/login.
2.  Dashboard overview.
3.  Create short URL.
4.  URL list with search/filter/pagination.
5.  URL detail page.
6.  Analytics view.
7.  Edit/deactivate/delete actions.

### Frontend structure

``` text
frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── url-creation/
│   │   └── analytics/
│   ├── hooks/
│   ├── lib/
│   │   ├── api-client.ts
│   │   └── query-client.ts
│   ├── types/
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

Keep API calls out of large page components. Use feature-level
hooks/services and shared UI components where they reduce duplication.

### Checkpoint

A user can manage links and inspect analytics without needing to call
endpoints manually.

------------------------------------------------------------------------

## Phase 11 --- Database optimization and scaling experiments

The application remains a single-backend local system. Treat scaling
topics as controlled experiments and design exercises.

### Learn and measure

-   B-tree indexes and composite indexes.
-   Index selectivity and write overhead.
-   `EXPLAIN ANALYZE`.
-   Connection pool sizing.
-   Pagination strategies: offset versus keyset.
-   Table growth and retention.
-   Partitioning concepts.
-   Read/write workload differences.

### Experiments

1.  Measure redirect lookup without an index, then with a unique index
    on `short_code`.
2.  Inspect analytics queries and add indexes based on actual query
    patterns.
3.  Compare offset and cursor/keyset pagination on a larger generated
    dataset.
4.  Generate a large local dataset and measure query latency.
5.  Explore table partitioning locally if analytics volume justifies it.
6.  Study sharding concepts and document what would change in a
    multi-database deployment, but do not turn this project into a
    distributed sharded system.
7.  Tune the PostgreSQL pool based on measured workload, not guesses.

### Checkpoint

Every optimization has a before/after measurement and an explanation. Do
not add indexes or partitioning just because they sound
production-grade.

------------------------------------------------------------------------

## Phase 12 --- Observability, health, and operational readiness

### Learn

-   Logs versus metrics versus traces.
-   Liveness versus readiness.
-   RED metrics: rate, errors, duration.
-   Queue depth and consumer lag.
-   Alert thresholds and dashboards.

### Implement

**Logging** - Structured JSON logs. - Request ID correlation. - Useful
error context without secrets. - Separate operational events from noisy
debug logs.

**Health** - Liveness endpoint: process is alive. - Readiness endpoint:
required dependencies are available enough to serve traffic. - Do not
expose secrets or detailed infrastructure internals in public health
responses.

**Metrics** - Request count and latency. - HTTP error rate. - Redirect
count and latency. - Redis hit/miss/error counts. - Database pool
utilization and query latency where practical. - RabbitMQ queue depth
and consumer processing/failure counts. - Worker processing duration.

**Dashboards** - API overview. - Redirect performance. - Database
health. - Queue and worker health.

### Suggested files

``` text
backend/src/infrastructure/observability/metrics.ts
backend/src/common/logger/logger.ts
infra/prometheus/prometheus.yml
infra/grafana/
```

### Checkpoint

You can identify whether a slowdown is caused by the API, PostgreSQL,
Redis, or the worker using logs and metrics rather than guessing.

------------------------------------------------------------------------

## Phase 13 --- Automated quality, load testing, and failure testing

### Test pyramid

  Level         What to test
  ------------- ------------------------------------------------------
  Unit          Base62, validation, business rules
  Integration   Repositories, transactions, Redis behavior
  API           Routes, middleware, status codes, response contracts
  Worker        Event processing, retries, idempotency
  End-to-end    Important user journeys through UI and API

### Load testing with k6

Test separately:

1.  Redirect reads for existing short codes.
2.  URL creation writes.
3.  Dashboard list and analytics queries.
4.  Mixed read/write workload.
5.  Cache warm versus cache cold.
6.  Worker processing under a burst of events.

Record: - Requests per second. - Median and p95/p99 latency. - Error
rate. - Database connection utilization. - Cache hit ratio. - Queue
depth and processing rate.

Do not invent a target throughput before measuring the local machine.
Establish a baseline, change one thing, and compare.

### Failure tests

-   PostgreSQL unavailable at startup.
-   PostgreSQL becomes unavailable while API is running.
-   Redis unavailable.
-   RabbitMQ unavailable.
-   Worker stops while messages are queued.
-   Malformed message reaches the worker.
-   Duplicate event is delivered.
-   Process receives `SIGTERM` during traffic.
-   Port is already in use.

### Checkpoint

You have repeatable test commands and a report showing performance and
behavior under dependency failures.

------------------------------------------------------------------------

## Phase 14 --- Final production-readiness review (local deployment)

"Production-grade" here means production-quality code and operational
behavior, while retaining the local-only infrastructure constraint.

### Final checklist

**Application** - \[ \] Clear module boundaries. - \[ \] No business
logic in controllers. - \[ \] Centralized error handling. - \[ \]
Validated configuration. - \[ \] Consistent API responses. - \[ \]
Secure password handling and ownership checks. - \[ \] Input validation
and rate limits.

**Data** - \[ \] Migrations are reproducible. - \[ \] Foreign keys and
unique constraints protect invariants. - \[ \] Indexes are justified by
query patterns. - \[ \] Transactions protect multi-step writes. - \[ \]
Backup/restore procedure documented for local data.

**Infrastructure** - [ ] One Express API server (`backend/`). - [ ] One local worker process (`worker/`). - [ ] PostgreSQL, Redis, and RabbitMQ run locally via `compose.yaml`. - [ ] No load balancer or distributed backend servers. - [ ] No machine-ID-based ID generation.

**Reliability** - \[ \] Graceful shutdown. - \[ \] Dependency failure
behavior is defined. - \[ \] Worker retries and dead-letter handling. -
\[ \] Idempotent event processing. - \[ \] Health checks and structured
logs.

**Quality** - \[ \] Unit, integration, API, and worker tests. - \[ \]
Load-test baseline. - \[ \] Performance results documented. - \[ \]
README explains setup, architecture, scripts, migrations, and
troubleshooting.

## 5. Recommended implementation order

Follow this sequence. It intentionally delays complexity until the basic
product is understood.

  ------------------------------------------------------------------------
                         Order Deliverable           Add only after
  ---------------------------- --------------------- ---------------------
                             1 Repository,           ---
                               TypeScript, Express   
                               startup               

                             2 Config, logging,      Basic server works
                               errors, shutdown      

                             3 PostgreSQL +          Startup lifecycle is
                               Drizzle + migrations  understood

                             4 Create and redirect   Database works
                               short URLs            

                             5 CRUD, validation,     Core redirect works
                               tests                 

                             6 Architecture          Core behavior is
                               review/refactor       tested

                             7 Redis cache           Uncached baseline is
                                                     measured

                             8 Synchronous analytics URL behavior is
                               baseline              stable

                             9 RabbitMQ + local      Event contract is
                               worker                defined

                            10 Authentication and    Core API is stable
                               ownership             

                            11 Hardening and rate    Auth and CRUD work
                               limits                

                            12 React dashboard       API contract is
                                                     stable

                            13 DB optimization       Baseline data exists
                               experiments           

                            14 Prometheus/Grafana    Main features are
                               and load tests        integrated

                            15 Failure testing and   Observability is
                               final review          available
  ------------------------------------------------------------------------

## 6. How to study each topic

For each technology, avoid watching a long course from beginning to end
before coding. Use a focused cycle:

1.  Learn the minimum concept needed for the current phase.
2.  Write a small isolated example.
3.  Integrate it into the project.
4.  Add tests for its failure cases.
5.  Explain the design in your own words in `docs/architecture/`.
6.  Move to the next concept.

Keep notes short and practical. For example, a Redis note should answer:
what problem does the cache solve, what is the cache key, when is it
invalidated, what happens if Redis is down, and how did you measure the
benefit?

### Suggested architecture decision records

Create a short record whenever a meaningful design decision is made:

-   `docs/decisions/001-single-backend-local-architecture.md`
-   `docs/decisions/002-sequence-and-base62-ids.md`
-   `docs/decisions/003-modular-monolith.md`
-   `docs/decisions/004-redis-cache-aside.md`
-   `docs/decisions/005-async-analytics-with-rabbitmq.md`
-   `docs/decisions/006-drizzle-and-postgresql.md`

Each record should contain: context, decision, alternatives considered,
consequences, and what would cause the decision to change.

## 7. Definition of done

The project is complete when you can:

1.  Start the entire stack locally from documented commands.
2.  Explain the request lifecycle from Express route to service,
    repository, and PostgreSQL.
3.  Explain startup failures, runtime errors, and graceful shutdown.
4.  Create, resolve, update, deactivate, and expire short links.
5.  Explain how PostgreSQL IDs become Base62 short codes.
6.  Explain cache-aside behavior and cache invalidation.
7.  Explain why analytics is asynchronous and how RabbitMQ delivery is
    handled.
8.  Demonstrate that the worker is a local process and not another
    distributed backend server.
9.  Explain authentication and authorization boundaries.
10. Use tests, logs, metrics, and load-test results to diagnose
    problems.
11. Justify database indexes and other optimizations with measurements.
12. Describe how the architecture could evolve for multiple servers
    without implementing that distributed architecture now.

**The most important rule:** do not confuse "production-grade" with
"using the maximum number of technologies." A smaller system with clear
boundaries, correct behavior, meaningful tests, graceful failure
handling, and measured performance is a much stronger learning project
than a complicated system whose internals you cannot explain.
