# Demo Idea Submission App — Implementation Plan

## Overview

Build a small, course-friendly demo application where users can submit a single text-based **idea** through a beautiful web interface.

The app will be intentionally minimal:

- one page only
- one textarea field for the idea
- one submit button
- inline success and error feedback
- no authentication
- no admin area
- no idea listing
- SQLite storage via `better-sqlite3`
- raw SQL only

This app will be built as a **TanStack Start** application with **TypeScript** and **Tailwind CSS**, using **Bun for package management** and **Node.js for actually running the app**.

The target runtime environment is a **VPS**, which makes SQLite a good fit because persistent disk storage is available.

---

## Confirmed Requirements

### Functional requirements

- Users can submit one idea via a web UI.
- The form contains a single field:
  - `idea` via `<textarea>`
- On successful submission, the user sees a confirmation message.
- On failure, the user sees an error message.
- Data is stored in SQLite.
- Each idea record has:
  - an auto-generated ID
  - the submitted idea text

### Non-functional / technical requirements

- Use **TanStack Start**.
- Use **Tailwind CSS**.
- Use **SQLite** with **better-sqlite3**.
- Use **raw SQL statements**, no ORM.
- Use **TypeScript**.
- Use **Node.js**, not Bun or Deno, to run the app.
- Use **Bun** only for package management (`bun add`, `bun install`, etc.).
- Use a **light-mode** UI.
- App will run on a **VPS**.

---

## Documentation Research Summary

### TanStack Start

Based on the current official TanStack Start docs:

- TanStack Start is currently in **Release Candidate** stage, but its API is presented as stable.
- Project setup is done via the current TanStack tooling and Vite-based configuration.
- TanStack Start uses **file-based routing** in `src/routes`.
- The recommended full-stack pattern is to use **server functions** via `createServerFn()`.
- TanStack Start docs explicitly support server-side capabilities like:
  - database access
  - file system access
  - environment variables
- The docs recommend separating code into:
  - shared schemas/types in plain `.ts` files
  - server-only helpers in `.server.ts`
  - client-callable server-function wrappers in `.functions.ts`
- Current Node deployment guidance uses **Nitro** and starts the app with:
  - `node .output/server/index.mjs`

### Tailwind CSS

Based on the current official Tailwind docs:

- Current Tailwind is **v4**.
- For Vite-based apps, the official integration is via **`@tailwindcss/vite`**.
- Tailwind v4 uses:
  - `@import "tailwindcss";`
- Tailwind v4 no longer relies on the older `@tailwind base/components/utilities` directives.
- The official TanStack Start integration pattern imports the app stylesheet into `__root.tsx` via `?url`.
- Tailwind v4 targets modern browsers.

### better-sqlite3

Based on the current better-sqlite3 docs and package metadata:

- `better-sqlite3` is a synchronous SQLite driver.
- It is well-suited to a small VPS-hosted demo app.
- Core API usage is intentionally simple:
  - `db.prepare(...).run()`
  - `db.prepare(...).get()`
  - `db.prepare(...).all()`
- The docs recommend enabling:
  - `PRAGMA journal_mode = WAL`
- Current package metadata indicates support for current modern Node versions, including Node 24.
- For TypeScript support, the ecosystem currently uses:
  - `@types/better-sqlite3`

---

## Chosen Stack

### Core stack

- **TanStack Start**
- **React**
- **TypeScript**
- **Tailwind CSS v4**
- **better-sqlite3**
- **SQLite**
- **Nitro** for Node-compatible production output

### Tooling / execution model

- **Bun** for package installation and dependency management
- **Node.js** for dev/build/start scripts and production runtime

### Recommended Node version

- **Node 24**

Reasoning:

- good fit for VPS deployment
- aligns well with current `better-sqlite3` support
- stable and course-friendly choice

---

## Application Scope

The application will consist of a **single public route** at `/`.

That page will include:

- a headline
- a short explanatory subtitle
- a styled form card
- one textarea input for the idea
- one submit button
- inline success message on successful submission
- inline error message on failure

There will be:

- no authentication
- no protected routes
- no dashboard
- no idea listing page
- no delete/edit functionality

This keeps the app focused and ideal as an educational demo.

---

## Data Model

### SQLite schema

The database schema will be intentionally minimal:

```sql
CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idea TEXT NOT NULL
);
```

### Table details

- `id`
  - auto-incrementing integer primary key
- `idea`
  - required text value

No extra fields are planned unless requirements change.

---

## Database Strategy

### Storage location

The SQLite database file will live at:

```txt
data/ideas.db
```

### Runtime behavior

On server startup or first DB access, the server-side DB setup will:

1. ensure the `data/` directory exists
2. open or create `data/ideas.db`
3. enable recommended SQLite pragmas
4. create the `ideas` table if it does not yet exist

### Planned pragmas

At minimum:

```sql
PRAGMA journal_mode = WAL;
```

Potentially also:

```sql
PRAGMA foreign_keys = ON;
```

Even though foreign keys are not needed right now, enabling them is generally a safe default when working with SQLite.

### Query strategy

Use raw SQL via prepared statements.

Examples of the intended pattern:

- schema initialization via `db.exec(...)`
- inserts via `db.prepare(...).run(...)`

No ORM, query builder, or abstraction layer beyond a few tiny helper functions.

---

## Validation Strategy

Validation will be kept deliberately simple.

### Input rules

- Trim incoming text.
- Reject empty values.
- Likely also reject whitespace-only input.

### Where validation happens

#### Client-side validation

Used only for UX:

- prevents obvious empty submissions
- gives faster feedback

#### Server-side validation

This is the real source of truth:

- validates all submitted data again
- prevents invalid inserts
- ensures the DB never receives empty idea values

### Shared schema

A small shared schema file will be used, most likely with **Zod**, so both client and server can rely on the same validation rules and inferred TypeScript types.

---

## TanStack Start Architecture

The implementation will follow the current TanStack Start guidance for full-stack apps.

### Planned file roles

#### Shared schema file

A regular `.ts` file for:

- validation schema
- shared input type

#### Server-only database files

`.server.ts` files for:

- opening/configuring SQLite
- schema bootstrap
- raw SQL helpers

#### Server function file

A `.functions.ts` file for:

- defining a TanStack Start server function using `createServerFn({ method: 'POST' })`
- calling server-only insert logic from the UI safely

This keeps DB logic server-only and aligned with TanStack Start’s current architecture.

---

## Planned Project Structure

```txt
src/
  routes/
    __root.tsx
    index.tsx
  lib/
    idea-schema.ts
    db.server.ts
    ideas.server.ts
    ideas.functions.ts
  styles.css

data/
  ideas.db   # created at runtime

.plans/
  app-implementation-plan.md

.gitignore
package.json
tsconfig.json
vite.config.ts
```

---

## Planned File Responsibilities

### `src/routes/__root.tsx`

Purpose:

- define the root document shell
- attach meta tags
- link the global stylesheet
- provide the outer HTML structure required by TanStack Start

Planned responsibilities:

- include viewport and charset metadata
- import the stylesheet via `?url`
- keep the root shell minimal and clean

### `src/routes/index.tsx`

Purpose:

- render the app’s only page
- contain the idea submission UI
- manage local UI state
- call the server function on submit

Planned responsibilities:

- render title/subtitle/form
- manage textarea value
- manage submit state
- show success and error messages
- clear the textarea after a successful submission

### `src/lib/idea-schema.ts`

Purpose:

- define the shared validation rules for idea submission
- export the inferred TS type for the submitted input

Planned responsibilities:

- define a small Zod schema like `{ idea: z.string().trim().min(1) }`
- export the schema and type

### `src/lib/db.server.ts`

Purpose:

- create and export the SQLite connection
- configure the database connection
- ensure the database file location exists

Planned responsibilities:

- create `data/` when needed
- instantiate `better-sqlite3`
- set pragmas
- export a reusable singleton DB instance

### `src/lib/ideas.server.ts`

Purpose:

- contain raw SQL helper logic for the `ideas` table
- centralize DB schema bootstrap and insert behavior

Planned responsibilities:

- create table if not exists
- expose `insertIdea()` helper
- possibly expose future helpers if the project grows later

### `src/lib/ideas.functions.ts`

Purpose:

- expose a TanStack Start server function for idea submission

Planned responsibilities:

- use `createServerFn({ method: 'POST' })`
- validate the submitted payload
- call server-only DB helper
- return a success payload to the client

### `src/styles.css`

Purpose:

- import Tailwind CSS v4
- define any tiny global or component-level enhancements needed for the final look

Planned responsibilities:

- include `@import "tailwindcss";`
- provide a clean global base if needed
- keep custom CSS minimal and complementary to Tailwind utilities

---

## UX and UI Direction

### Design goals

The UI should feel:

- clean
- modern
- polished
- welcoming
- light-mode focused
- minimal but not plain

### Visual direction

Planned style characteristics:

- light background with subtle depth
- centered content area
- strong, readable heading
- supportive subheading text
- elegant form card with rounded corners
- tasteful shadowing and spacing
- subtle accent color for interactive elements
- accessible focus states
- clear submit, success, and error states

### Form behavior

Planned UX details:

- button becomes disabled while submitting
- button text changes during submission, e.g. `Submitting...`
- textarea clears after success
- success message appears inline after submission
- error message appears inline if submission fails
- error/success states should be visually distinct and easy to understand

### Accessibility considerations

The implementation should also aim for:

- visible labels or equivalent accessible labeling
- sufficient contrast
- keyboard-friendly form interaction
- `aria-live` or similarly accessible messaging for success/error feedback where appropriate

---

## Submission Flow

### High-level flow

1. User opens `/`
2. User enters text into the textarea
3. User clicks submit
4. Client performs basic validation
5. Client calls a TanStack Start server function
6. Server validates input again
7. Server inserts the idea into SQLite using raw SQL
8. Server returns success or throws an error
9. UI shows success or error message

### Success path

- insert succeeds
- form resets
- success confirmation is shown

### Failure path

Potential failure causes:

- empty input
- malformed input
- DB unavailable
- SQLite write failure

Behavior:

- catch the error on the client
- show a friendly inline error message
- do not clear the input on failure

---

## Deployment Plan

### Hosting context

The app will run on a **VPS**.

That is a good fit for SQLite because:

- persistent storage is available
- a single small app can reliably use a local database file
- complexity stays low for educational/demo use cases

### Production runtime

The app will be built and run according to the current TanStack Start Node deployment guidance.

Expected build/start flow:

```bash
npm run build
npm run start
```

With the production start command equivalent to:

```bash
node .output/server/index.mjs
```

### Package management vs runtime

This project intentionally separates the two:

#### Bun is used for

- installing dependencies
- adding packages
- maintaining the lockfile

Examples:

```bash
bun install
bun add better-sqlite3 zod
bun add -d @types/better-sqlite3
```

#### Node is used for

- dev server scripts
- build scripts
- production runtime

Examples:

```bash
npm run dev
npm run build
npm run start
```

This directly matches the chosen project constraints.

---

## Planned Scripts

Expected scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build && tsc --noEmit",
    "preview": "vite preview",
    "start": "node .output/server/index.mjs"
  }
}
```

The exact final script list may vary slightly depending on the generated scaffold, but the intent is:

- Vite dev for development
- Vite build + type check for production build
- Node execution for production runtime

---

## Dependency Plan

### Runtime dependencies

Expected core runtime dependencies:

- `@tanstack/react-start`
- `@tanstack/react-router`
- `react`
- `react-dom`
- `tailwindcss`
- `better-sqlite3`
- `zod`

### Development dependencies

Expected supporting development dependencies:

- `@tailwindcss/vite`
- `@vitejs/plugin-react`
- `typescript`
- `vite`
- `nitro`
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `@types/better-sqlite3`

### Versioning approach

Because TanStack Start is still in RC, a conservative approach is recommended:

- prefer pinning exact versions or closely controlled versions
- avoid letting important framework packages drift unexpectedly during course production

---

## Git Ignore Strategy

The repository should ignore the usual Node/Vite build artifacts plus SQLite runtime files.

### Important ignores

- `node_modules/`
- `.output/`
- `dist/`
- `*.log`
- `.DS_Store`
- `.env`
- `.env.*`
- `data/*.db`
- `data/*.db-shm`
- `data/*.db-wal`
- `*.tsbuildinfo`
- coverage directories if they appear later

### Important note

Lockfiles should **not** be ignored.

When the app is scaffolded, the Bun lockfile should be committed for reproducibility.

---

## Intentional Simplicity Choices

A few implementation choices are deliberately simple because this is course/demo material:

- no ORM
- no authentication
- no admin UI
- no query caching complexity
- no unnecessary component splitting unless it improves clarity
- no over-engineered abstractions around DB access
- one small server function for one clear use case

This is desirable because the educational focus is clarity, not feature breadth.

---

## Risks / Caveats

### TanStack Start is still RC

The docs describe the API as stable, but the framework is still labeled Release Candidate. That means:

- the stack is modern and suitable
- but exact APIs and scaffolding details may still evolve
- pinning versions is recommended

### SQLite is great for this use case, but not universal

SQLite is a good fit for:

- a small VPS-hosted app
- a course demo
- modest write traffic

SQLite would be a weaker fit for:

- heavy write concurrency
- multi-instance deployments sharing no common disk
- highly ephemeral serverless storage environments

These concerns do not conflict with the current project goals.

---

## Implementation Sequence

Planned step-by-step execution order:

1. Scaffold a TanStack Start + TypeScript app in this directory.
2. Configure Tailwind CSS v4 using the current official Vite/TanStack Start pattern.
3. Ensure Nitro is configured for Node-compatible production output.
4. Install and configure `better-sqlite3`.
5. Add SQLite singleton setup and schema bootstrap.
6. Add shared Zod validation schema.
7. Add a TanStack Start server function for idea submission.
8. Build the single-page light-mode UI.
9. Add polished success/error messaging.
10. Test locally in dev mode.
11. Test a production build locally.
12. Prepare for VPS deployment.

---

## Definition of Done

The app can be considered complete when all of the following are true:

- The app runs as a TanStack Start project.
- Tailwind CSS styling is working.
- There is exactly one public page for idea submission.
- The page contains one textarea for the idea.
- Empty submissions are rejected.
- Valid submissions are stored in SQLite.
- The database uses `better-sqlite3`.
- Raw SQL is used directly.
- Success and error states are clearly communicated in the UI.
- The app builds successfully for Node deployment.
- The app can run on a VPS with persistent disk storage.

---

## Current Status

At this stage:

- requirements are clarified
- documentation research is completed
- the implementation approach is defined
- repository planning artifacts can now be committed

The actual app scaffold and implementation will happen in the next phase.
