# Future Enhancements

This document captures the long-term direction for `proto-to-trpc`. The
guiding principle is:

- **The generator should stay minimal, typed, and composable.**  
  It must not become a “framework inside a framework”.

The current generator already provides:

- ConnectRPC TypeScript clients via `protoc --connect-es_out` and `--ts_out`.
- A typed tRPC router **per service**.
- A combined typed `AppRouter`.
- A minimal typed `createTrpcClient()` helper.

All of this output is:

- Static TypeScript (no opaque classes, no private state).
- Free of runtime “magic”.
- Importable and wrappable anywhere in user code.

This **does not block** any real-world extension use case. Instead, it gives
applications an ideal, open surface to build on.

## What applications will build on top

Real apps will layer on things like:

- Caching rules and prefetchers.
- Auth/permission checks and multi-tenant guards.
- Logging, error mapping, and analytics.
- Retry/backoff, circuit breakers, and audit trails.
- Derived/domain APIs (e.g. `resource.getWithProfile()`).
- UI-facing helpers and React hooks tailored to a domain.

These should **not** be baked into the generator. They are better expressed as
normal TypeScript modules that consume the generated types and clients.

Example wrapper pattern:

```ts
import type { AppRouter } from "@/gen/trpc";
import { createTrpcClient } from "@/gen/trpc";

const base = createTrpcClient<AppRouter>();

export function createEnhancedApi() {
  return {
    user: {
      get: base.user.GetUser.query,
      getWithAudit: async (input: { id: string }) => {
        audit("getUser", input);
        return base.user.GetUser.query(input);
      },
      safeGet: async (input: { id: string }) => {
        try {
          return await base.user.GetUser.query(input);
        } catch {
          return null;
        }
      }
    }
  };
}
```

The generator output is intentionally simple enough that patterns like this
remain easy and obvious.

## Minimal extension affordances we will support

To avoid becoming “blocking” while staying minimal, the generator will support
only a small set of explicit extension hooks.

- **Export raw Connect clients**  
  Ensure the generated `trpc` index re-exports the generated Connect clients,
  so callers can:
  - Call Connect directly.
  - Attach Connect interceptors (auth, logging, retries).
  - Build custom transports or side channels.

- **Export `AppRouter` type**  
  The generator already emits:

  ```ts
  export type AppRouter = ReturnType<typeof createAppRouter>;
  ```

  This is enough for:
  - Creating additional tRPC routers and merging them.
  - Adding bespoke endpoints or middleware.
  - Using tRPC utilities that depend on the router type.

- **Documented wrapper patterns (not codegen)**  
  We will keep a small section in the docs showing how to:
  - Wrap `createTrpcClient()` into a domain API (`api.resource.*`).
  - Compose multiple procedures into a higher-level operation.
  - Layer TanStack Query hooks or React helpers on top.

No runtime “plugin system” or template DSL is planned in the core, to avoid
locking users into a specific abstraction.

## Longer-term ideas

These are potential future additions that **respect** the minimal core:

- **Template overrides**  
  Allow users to provide a directory of templates that override the default
  emitters (router factory, service routers, app router, index). The CLI
  would accept a `--templates` flag pointing to that directory, and each
  emitter would first look for a matching template before falling back to
  the built-in implementation.

- **tRPC React client codegen**  
  Generate a `trpcReact.ts` file alongside the existing `trpc` output. This
  file would wrap `@trpc/react-query` (or the current tRPC React bindings)
  to provide a ready-to-use hooks layer for the generated `AppRouter`.

- **Unified `createApi` helper**  
  Provide an optional higher-level helper:

  ```ts
  const api = createApi<AppRouter>({
    trpcUrl: "/api/trpc",
    connectBaseUrl: "http://localhost:8080"
  });
  ```

  This would combine the tRPC client and Connect configuration into a single
  ergonomic entry point while still keeping the core codegen output minimal.

