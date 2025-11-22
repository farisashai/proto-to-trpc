# proto-to-trpc

Generate ConnectRPC TypeScript clients and fully-typed tRPC routers from your `.proto` files with a single CLI.

This package is designed to work seamlessly with modern Next.js (App Router), tRPC, and TanStack Query setups.

## Quickstart

After installing the package:

```bash
pnpm dlx proto-to-trpc --proto_dir=./proto --out=./src/gen
```

This will produce:

- `src/gen/connect` – protoc + Connect TS outputs
- `src/gen/trpc` – tRPC router factory, per-service routers, and `appRouter`

For full documentation, architecture, and design notes, see `docs/index.md` in this repository.



