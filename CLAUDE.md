# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`proto-to-trpc` is a CLI tool that generates ConnectRPC TypeScript clients and fully-typed tRPC routers from `.proto` files. It's designed for modern Next.js (App Router), tRPC, and TanStack Query setups.

## Development Commands

### Build and Testing
```bash
pnpm build              # Build the project using tsup
pnpm test               # Run tests with vitest
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Run tests with coverage
```

### Code Quality
```bash
pnpm lint               # Lint and fix with Biome
pnpm format             # Format code with Biome
```

### Development
```bash
pnpm codegen            # Run the CLI on local proto files (./proto → ./src/gen)
```

### Release Workflow
```bash
make tag-beta           # Create beta tag (v0.1.6-beta.0, beta.1, etc.)
make tag-rc             # Create rc tag (v0.1.6-rc.0, rc.1, etc.)
make tag-patch          # Bump patch version and create tag
make tag-minor          # Bump minor version and create tag
make tag-major          # Bump major version and create tag
make publish            # Publish to npm based on latest Git tag
```

The release process is tag-driven: create a Git tag using `make tag-*`, then run `make publish` to publish to npm with the appropriate dist-tag (beta, rc, or latest).

## Architecture

### Code Generation Pipeline

The CLI (`src/cli.ts`) orchestrates the following pipeline in `src/run.ts`:

1. **Discover** (`src/discover.ts`): Find all `.proto` files in the specified directory
2. **Protoc** (`src/protoc.ts`): Run `protoc` with Connect-ES and protobuf-es plugins to generate:
   - `*_pb.ts` files (message types)
   - `*_connect.ts` files (service definitions with typed methods)
3. **Post-process** (`src/post-process-pb-files.ts`): Fix declaration files for proper TypeScript resolution
4. **Emit tRPC Layer**:
   - `emitRouterFactory()`: Creates shared tRPC router factory with verb-based query/mutation classification
   - `emitServiceRouters()`: Scans `*_connect.ts` files and generates a tRPC router for each service
   - `emitAppRouter()`: Combines all service routers into a single `appRouter`
   - `emitIndexFile()`: Creates the main export file
   - `emitPackageJson()`: Generates package.json for the output directory

### Service Router Generation

The key logic in `src/emit-service-router.ts`:
- Dynamically imports each `*_connect.ts` file to introspect service definitions
- For each service method, determines if it's a query or mutation based on configurable verb prefixes (default: `Get`, `List` = query; `Create`, `Update`, `Delete` = mutation)
- Generates static TypeScript code that creates a Connect client and wraps it in tRPC procedures
- Uses a custom `protobuf<T>()` validator that provides type safety without runtime validation

### Output Structure

Generated output directory structure:
```
out/
  connect/           # protoc outputs (Connect + TS)
    *_pb.ts          # Message types
    *_connect.ts     # Service definitions
  trpc/              # Generated tRPC layer
    routerFactory.ts # Shared tRPC instance and helpers
    routers/         # Per-service routers
      *ServiceRouter.ts
    appRouter.ts     # Combined router
    index.ts         # Main exports
  package.json       # Marks output as ESM module
```

## Build Configuration

- **tsup**: Builds two entry points:
  - `src/index.ts` → `dist/index.mjs` (library with `.d.ts`)
  - `src/cli.ts` → `dist/cli.mjs` (CLI with shebang, no types)
- **TypeScript**: ESNext modules with bundler resolution, strict mode enabled
- **Biome**: Used for linting and formatting (replaces ESLint/Prettier)

## Key Design Decisions

1. **Static Code Generation**: All generated code is static TypeScript with no baked-in configuration (e.g., base URLs). Configuration happens at runtime when constructing the app router.

2. **Verb-Based Classification**: Methods are classified as queries or mutations based on their name prefix, with sensible defaults that can be overridden via CLI flags:
   - `--query_verbs=Get,List` (default)
   - `--mutation_verbs=Create,Update,Delete` (default)

3. **ESM-Only**: The package and all generated code use ESM modules exclusively.

4. **Watch Mode**: The CLI supports `--watch` to automatically regenerate on `.proto` file changes using chokidar.

5. **Plugin Resolution**: `src/protoc.ts` handles multiple scenarios for finding protoc plugins:
   - Package's own `node_modules/.bin` (for `pnpm dlx` usage)
   - User's project `node_modules/.bin` (for local installs)
   - Custom `PROTOC` environment variable or `protocPath` option
