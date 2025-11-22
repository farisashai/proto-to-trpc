# Proto-to-tRPC Codegen Plan

## Goals

- **Primary**: Build an npm package (`proto-to-trpc`) that generates ConnectRPC TS clients and fully-typed tRPC routers from `.proto` files using a simple CLI.
- **Compatibility**: Work cleanly with Next.js (App Router), tRPC (current major), and TanStack Query via `@trpc/react-query`.
- **Ergonomics**: Single `--proto_dir` and single `--out` directory, static imports only, no base URLs baked into generated code.
- **Distribution**: ESM-only TypeScript package with a `bin` entry for the CLI and a small, pure programmatic API.
- **Documentation & DX**: Centralized Markdown knowledge base under `/docs`, including this plan and the existing `PLANNING_v1.md`. Use **Biome** for linting and formatting with recommended settings.

## Planned File Structure

### Library repository (this project)

```text
proto-to-trpc/
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  biome.json        # Biome configuration (recommended presets)
  README.md         # Short top-level README pointing to docs/
  LICENSE
  CHANGELOG.md
  docs/
    index.md        # Documentation index / overview
    planning_v1.md  # Migrated from existing PLANNING_v1.md
    plan.md         # This implementation plan
    architecture.md # (optional) deeper architectural details
  src/
    cli.ts
    index.ts
    run.ts
    discover.ts
    protoc.ts
    emit-router-factory.ts
    emit-service-router.ts
    emit-app-router.ts
    emit-index.ts
    utils/
      fs.ts
  tests/
    unit/
      discover.test.ts
      emit-router-factory.test.ts
      emit-service-router.test.ts
      emit-app-router.test.ts
    integration/
      codegen.integration.test.ts
  fixtures/
    proto/
      example_service.proto
  dist/              # built outputs (ignored in git)
```

### Generated output in a consuming app (example)

```text
your-app/
  proto/
    foo.proto
    bar.proto
  src/gen/
    connect/
      *.ts            # protoc + Connect TS outputs
    trpc/
      routerFactory.ts
      routers/
        FooServiceRouter.ts
        BarServiceRouter.ts
      appRouter.ts
      index.ts
```

## High-Level Phases

1. **Repository & tooling scaffolding** – package, TypeScript, Biome, build, and test basics.
2. **Core CLI & runner orchestration** – `src/cli.ts` and `src/run.ts` based on `PLANNING_v1.md`.
3. **Proto discovery & protoc integration** – `discoverProtoFiles` and `runProtoc` for a single proto path.
4. **tRPC codegen emitters** – `emitRouterFactory`, `emitServiceRouters`, `emitAppRouter`, `emitIndexFile` under `src/`.
5. **Watch mode & ergonomics** – `--watch`, basic logging, error messages.
6. **Library surface & helpers** – clean exports and an optional `createTrpcClient` helper.
7. **Testing & examples** – Vitest tests with fixtures and a minimal usage example.
8. **Docs & packaging for npm** – `/docs` knowledge base, root README shim, license, exports map, and publish configuration.
9. **Future enhancements (post-v1)** – template overrides, React client generation, unified `createApi`.

## Detailed Steps

### Phase 1: Repository & Tooling Scaffolding

1. **Initialize npm package metadata**

   - Create `package.json` with name (e.g. `proto-to-trpc`), version, `type: "module"`, `bin` entry (e.g. `"proto-to-trpc": "dist/cli.mjs"`), `exports` for the library entry, and `types` pointing to built declarations.
   - Add keywords, repository, author, license (MIT), and engines (e.g. Node >= 18 or 20).

2. **Set up TypeScript project**

   - Add `tsconfig.json` targeting modern Node (e.g. `module: "NodeNext"`, `target: "ES2020"`, `moduleResolution: "NodeNext"`), with `src` as root and `dist` as outDir, and `strict: true`.
   - Enable `declaration` output for type definitions.

3. **Add build tooling with tsup**

   - Add `tsup.config.ts` to build ESM outputs for:
     - `src/index.ts` (library entry).
     - `src/cli.ts` (CLI entry, with shebang preserved).
   - Configure clean builds, sourcemaps, and `dts` generation via `tsup`.

4. **Set up Biome for linting and formatting**

   - Add `@biomejs/biome` as a devDependency.
   - Create `biome.json` enabling Biome’s **recommended** lint and format presets for TypeScript and JSON.
   - Add npm scripts: `"lint": "biome lint ."`, `"format": "biome format ."`.

5. **Set up test tooling with Vitest**

   - Add `vitest` and a minimal `vitest.config.ts`.
   - Wire `"test": "vitest"` in `package.json`.

6. **Create docs directory and migrate existing planning file**

   - Create `docs/` directory.
   - Move existing `PLANNING_v1.md` to `docs/planning_v1.md` (updating any internal references later if needed).
   - Create `docs/plan.md` containing this implementation plan.
   - Create `docs/index.md` as a simple docs landing page linking to `planning_v1.md` and `plan.md`.
   - Keep a concise root `README.md` that points readers to `/docs` for full documentation.

### Phase 2: Core CLI & Runner Orchestration

1. **Implement `src/cli.ts`**

   - Use `yargs` + `hideBin` to parse:
     - `--proto_dir` (required string).
     - `--out` (required string).
     - `--watch` (optional boolean, default `false`).
   - Construct a normalized options object and call `runCodegen({ protoDir, outDir })`.
   - If `--watch` is set, set up a file watcher (Phase 5) instead of a single run.
   - Handle errors with a clear non-zero exit code and concise stderr messages.

2. **Implement `src/run.ts` orchestration**

   - Import helpers from `./discover`, `./protoc`, `./emit-router-factory`, `./emit-service-router`, `./emit-app-router`, and `./emit-index`.
   - Implement `runCodegen(opts: { protoDir: string; outDir: string; onLog?: (msg: string) => void; })`:
     - Normalize and validate `protoDir` and `outDir` (ensure `outDir` exists or create it).
     - Discover proto files via `discoverProtoFiles(protoDir)`; error if none found.
     - Compute `connectOut = ${outDir}/connect` and `trpcOut = ${outDir}/trpc`.
     - Call `runProtoc({ protoFiles, outDir: connectOut, protoDir })`.
     - Call `emitRouterFactory(trpcOut)`.
     - Call `emitServiceRouters({ connectDir: connectOut, trpcDir: trpcOut })` and capture `serviceInfoList`.
     - Call `emitAppRouter(serviceInfoList, trpcOut)`.
     - Call `emitIndexFile(trpcOut)`.
   - Add minimal logging (optionally via `onLog`) while keeping output clean for CI.

### Phase 3: Proto Discovery & Protoc Integration

1. **Implement `discoverProtoFiles`**

   - Use `fast-glob` to match `"${dir.replace(/\/$/, "")}/**/*.proto"` with `absolute: true`.
   - Export `discoverProtoFiles(dir: string): Promise<string[]>`.

2. **Implement filesystem utilities**

   - Create `src/utils/fs.ts` with helpers:
     - `ensureDir(path: string)` using `fs.promises.mkdir(path, { recursive: true })`.
     - `writeFile(path: string, contents: string)` that ensures parent directory exists then writes the file.

3. **Implement `runProtoc` wrapper**

   - Use `child_process.execFile` (promisified) to run `protoc` with:
     - `--connect-es_out=${outDir}`
     - `--ts_out=${outDir}`
     - `--proto_path=${protoDir}`
     - `--experimental_allow_proto3_optional`
     - All discovered `protoFiles`.
   - Surface helpful error messages if `protoc` or plugins are missing, including suggested install instructions.
   - Optionally accept an environment variable to override the `protoc` binary path without complicating the initial CLI.

### Phase 4: tRPC Codegen Emitters

1. **Implement `emitRouterFactory`**

   - Use `writeFile` to create `"${trpcDir}/routerFactory.ts"`.
   - Emit the `initTRPC.create()` boilerplate and `createServiceRouter` as in `PLANNING_v1.md`, including the query/mutation name heuristics with `QUERY_PREFIXES` and `MUTATION_PREFIXES`.

2. **Implement `emitServiceRouters`**

   - Use `fast-glob` on `"${connectDir}/**/*_connect.ts"` to find connect service modules.
   - Dynamically import each module (using `pathToFileURL` for ESM) and inspect its exports:
     - Identify values with `svc && typeof svc === "object" && svc.typeName && svc.methods`.
   - For each service export:
     - Derive `serviceName` (e.g. `FooService`), `serviceBaseName` (e.g. `Foo`).
     - Compute a router file path under `trpcDir/routers/${serviceName}Router.ts`.
     - Compute relative imports from `trpcDir` to the `_connect.ts` and `_connectweb.ts` modules.
     - Generate code that:
       - Imports `createServiceRouter` and the service / client.
       - Exports a factory: `export const FooServiceRouter = (connectBaseUrl: string) => createServiceRouter(FooService, createFooClient({ baseUrl: connectBaseUrl }));`.
   - Collect `services.push({ name: serviceName, file: "./routers/${serviceName}Router" })` and return this list.

3. **Implement `emitAppRouter`**

   - Accept `services` metadata and `trpcDir`.
   - Generate imports (e.g. `import { FooServiceRouter } from "./routers/FooServiceRouter";`).
   - Generate a `createAppRouter(connectBaseUrl: string)` function that builds a root router via `initTRPC.create()` and composes the per-service routers:
     - Object shape keys are stemmed versions (e.g. `Foo` for `FooService`).
     - Value is `FooServiceRouter(connectBaseUrl)`.
   - Export `type AppRouter = ReturnType<typeof createAppRouter>;`.

4. **Implement `emitIndexFile`**

   - Create `trpc/index.ts` with:
     - `export * from "./appRouter";`
     - `export * from "./routerFactory";`.

### Phase 5: Watch Mode & Ergonomics

1. **Add `--watch` support to CLI**

   - Handle `--watch` in `cli.ts` using `chokidar` to observe `protoDir/**/*.proto` and re-run `runCodegen` on file changes with debouncing.
   - Print concise logs on rebuild start/finish and errors.

2. **Improve UX and error messages**

   - Add validation and helpful messages when:
     - `proto_dir` does not exist or has no `.proto` files.
     - `protoc` or required plugins are not found.
     - No Connect services are discovered in the generated `_connect.ts` files.
   - Use process exit codes and structured messages suitable for CI and editor integrations.

### Phase 6: Library Surface & Helpers

1. **Create a small programmatic API**

   - Implement `src/index.ts` that exports:
     - `runCodegen` for programmatic use.
     - Types for the run options.
   - Keep this surface minimal and stable.

2. **Optional tRPC client helper**

   - Implement `src/client.ts` or export from `src/index.ts` a helper like:
     - `createTrpcClient(opts: { url?: string } = {})` wrapping `createTRPCProxyClient<AppRouter>` and `httpBatchLink`, with default `"/api/trpc"`.
   - Document how users should wire this into their app (Next.js or other environments).

### Phase 7: Testing & Examples

1. **Set up and refine Vitest tests**

   - Ensure `vitest.config.ts` is wired and tests run in CI.

2. **Create test fixtures**

   - Use `fixtures/proto/example_service.proto` for discovery and emitter tests.
   - Optionally create a minimal hand-written `_connect.ts` fixture for service router tests to avoid requiring real protoc in unit tests.

3. **Unit tests for helpers and emitters**

   - Test `discoverProtoFiles` against fixtures.
   - Test `emitRouterFactory` output (snapshot or structural checks for `isQuery` and `isMutation`).
   - Test `emitServiceRouters` using the hand-written `_connect.ts` module to verify:
     - Correct detection of services.
     - Correct router filenames and relative imports.
     - Correct code shape for router factories.
   - Test `emitAppRouter` to ensure proper imports, field naming, and `AppRouter` type.

4. **Integration-style test for router behavior**

   - Use a minimal fake Connect service implementation.
   - Run the full codegen pipeline into a temp directory.
   - Dynamically import the generated `appRouter` and use tRPC’s `createCaller` to:
     - Assert that a `Get*` method is exposed as a query.
     - Assert that a `Create*` or `Update*` method is exposed as a mutation.

### Phase 8: Docs & Packaging for npm

1. **Build out docs knowledge base under `/docs`**

   - Flesh out `docs/index.md` with an overview of the project, quickstart, and links to other docs.
   - Keep `docs/planning_v1.md` as the original deep-dive design reference.
   - Keep `docs/plan.md` up to date with high-level implementation status (optional lightweight updates).
   - Add `docs/architecture.md` to describe the codegen pipeline, file layout, and rationale.

2. **Author or refine root `README.md`**

   - Keep it concise:
     - What the library does and why.
     - Installation and basic CLI usage.
     - Pointer to `docs/index.md` for full documentation.

3. **Add license and housekeeping files**

   - Add `LICENSE` (MIT or your choice) and `CHANGELOG.md` (initial entry).

4. **Configure exports and publishing**

   - Set `exports` map to expose the library entry with ESM + types.
   - Ensure the CLI entry is resolvable via `bin` and executable with a shebang.
   - Verify `npm pack` output contains only needed artifacts.

### Phase 9: Future Enhancements (Post-v1)

1. **Template override mechanism**

   - Allow users to point at a directory of templates that override the default emitters.
   - Add CLI flags (e.g. `--templates`) and design a stable template context interface.

2. **tRPC React client codegen**

   - Add an optional generator for `trpcReact.ts`, mirroring tRPC’s standard React query setup for the generated `AppRouter`.

3. **Unified `createApi` helper**

   - Implement an opinionated unified client creator:
     - `const api = createApi({ trpcUrl, connectUrl });`.
   - Optionally generate a thin wrapper around this helper in the output `trpc` directory.