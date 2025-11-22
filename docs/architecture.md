# Architecture Overview

This project provides a CLI and small library that generate ConnectRPC clients and tRPC routers from `.proto` files.

At a high level:

- The CLI (`proto-to-trpc`) invokes `runCodegen`.
- `runCodegen`:
  - Discovers `.proto` files under a single `--proto_dir`.
  - Invokes `protoc` to emit Connect + TS outputs into `out/connect`.
  - Scans `out/connect` for `*_connect` services.
  - Emits a shared tRPC router factory and per-service routers into `out/trpc`.
  - Emits a combined `appRouter` and `index` file.

All generated code is static TypeScript with no baked-in base URLs; configuration happens only at runtime when you construct the app router and tRPC client.


