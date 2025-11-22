# Proto-to-TRPC Codegen Implementation Plan

## Goals
- **Primary**: Build an npm package (`proto-to-trpc`) that generates ConnectRPC TS clients and fully-typed tRPC routers from `.proto` files using a simple CLI.
- **Compatibility**: Work cleanly with Next.js (App Router), tRPC (current major), and TanStack Query via `@trpc/react-query`.
- **Ergonomics**: Single `--proto_dir` and single `--out` directory, static imports only, no base URLs baked into generated code.
- **Distribution**: ESM-only TypeScript package with a `bin` entry for the CLI and a small, pure programmatic API.
- **Documentation & DX**: Centralized Markdown knowledge base under `/docs`, including this plan and the existing architecture document. Use **Biome** for linting and formatting with recommended settings.

For the full, up-to-date version of this plan, see the source `proto.plan.md` at the repository root. This file is a copy kept in `docs/` for discoverability.

