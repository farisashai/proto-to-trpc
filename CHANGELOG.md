# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

---

## [0.1.2] - 2025-11-22

### Fixed

#### Critical Type Safety Fix

- **Fixed tRPC procedures showing `any` types** - Resolved TypeScript showing `input: any, output: any` in IDE
  - Changed from `.input(MessageClass)` to `.input<MessageClass>()` - using type parameters instead of runtime values
  - Changed from `.output(MessageClass)` to `.output<MessageClass>()` - using type parameters instead of runtime values
  - Protobuf message types now imported as `import type { ... }` for type-only usage
  - **Result:** Full TypeScript type inference in tRPC routers without runtime validators
  - This was causing loss of type safety in React components using `useMutation()` and `useQuery()`

#### Critical Runtime Fix

- **Fixed service.methods iteration error** - Resolved `TypeError: service.methods is not iterable` at runtime
  - Connect-ES service definitions have `methods` as an object (not an array)
  - Changed from `for (const method of service.methods)` to `for (const method of Object.values(service.methods))`
  - This was causing runtime crashes when creating service routers in production apps

### Changed

#### Architecture Improvement

- **Replaced dynamic router factory with static router generation** - Complete rewrite for full type safety
  - Service routers now generate explicit procedure definitions instead of using dynamic loops
  - Each method is statically typed with its own `.query()` or `.mutation()` call
  - Eliminates all `any` types from the runtime router creation
  - TypeScript can now fully infer procedure types through the entire tRPC call chain

**Before** (dynamic with `any`):
```typescript
export const ResourceServiceRouter = (connectBaseUrl: string) => {
  const client = createClient(ResourceService, transport);
  return createServiceRouter(ResourceService, client); // dynamic loop
};
```

**After** (static with full types):
```typescript
import type { CreateResourceRequest, CreateResourceResponse, ... } from "../../connect/resource_example_pb.js";

export const ResourceServiceRouter = (connectBaseUrl: string) => {
  const client = createClient(ResourceService, transport);
  return t.router({
    CreateResource: t.procedure
      .input<CreateResourceRequest>()    // ✅ Type parameter
      .output<CreateResourceResponse>()  // ✅ Type parameter
      .mutation(async ({ input }) => client.CreateResource(input)),
    GetResource: t.procedure
      .input<GetResourceRequest>()       // ✅ Type parameter
      .output<GetResourceResponse>()     // ✅ Type parameter
      .query(async ({ input }) => client.GetResource(input)),
    // ... each method explicitly typed
  });
};
```

### Added

- **Post-processing for protobuf declaration files**
  - Automatically adds `type` annotations to `proto3` imports in generated `*_pb.d.ts` files
  - Changes `import { Message, proto3 }` to `import { Message, type proto3 }`
  - Improves TypeScript import optimization and tree-shaking

### Technical Details

- Service router generation moved from helper function pattern to inline static generation
- Each service method is now individually inspected and typed at codegen time
- Query vs mutation determination happens at generation time (not runtime)
- **Type parameters** used instead of runtime validators: `.input<Type>()` not `.input(Type)`
- Message types imported as type-only: `import type { ... }` from `*_pb.js` files
- No runtime validation at tRPC layer - Protobuf handles its own validation
- Router factory simplified to export just `t` and verb configuration
- Tests updated to verify static procedure generation and type parameter usage (38 tests passing)
- Added 4 new tests for edge cases:
  - Verify message types imported from `*_pb.js` files
  - Verify message types used as type parameters in `.input<>()` and `.output<>()`
  - Verify generated routers don't access `service.methods` at runtime
  - Verify multiple methods handled correctly

### Breaking Changes

**Generated code structure changed** - If you've committed generated code to git:
- Re-run codegen after upgrading: `proto-to-trpc --proto_dir=./proto --out=./src/gen`
- Service routers now use inline static definitions instead of `createServiceRouter()`
- The `createServiceRouter` helper function is no longer exported or used

---

## [0.1.1] - 2025-11-22

### Added

- Self-contained protoc binary via `@protobuf-ts/protoc` dependency
- Comprehensive test suite with 34 tests across 11 test files
  - Unit tests for all core modules
  - Integration tests for error handling and full pipeline
  - Edge case coverage for nested directories, custom verbs, and error scenarios
- `.npmrc` for enforcing pnpm in local development
- Test scripts: `test:watch` and `test:coverage`

### Fixed

#### Critical Fixes

- **Protoc plugin PATH resolution** - Fixed plugins not being found when using `pnpm dlx proto-to-trpc` or global install
  - Now checks both package's `node_modules/.bin` and project's `node_modules/.bin`
  - Users no longer need to manually install `@bufbuild/protoc-gen-es` and `@connectrpc/protoc-gen-connect-es`

- **Generated service router imports** - Fixed incorrect and deprecated Connect-ES API usage
  - Replaced non-existent `_connectweb` imports with proper `@connectrpc/connect` and `@connectrpc/connect-web` imports
  - Updated to use `createClient` and `createConnectTransport` instead of deprecated `createPromiseClient`
  - Fixed relative import paths (now correctly uses `../../connect/` from `routers/` subdirectory)

#### Code Quality Fixes

- **Removed `any` types from generated code** - Router factory now uses proper generics `Client<T>` for full type safety
- **Fixed all linting issues** - All generated code now passes Biome linting
  - Consistent tab indentation across all generated files
  - Template literals instead of string concatenation
  - Proper type imports
- **Biome configuration** - Excluded protoc-generated files from linting (files we don't control)

### Changed

- **Package dependencies restructured**
  - Moved `@bufbuild/protobuf`, `@bufbuild/protoc-gen-es`, and `@connectrpc/protoc-gen-connect-es` to `dependencies`
  - Added `@protobuf-ts/protoc` as dependency for self-contained protoc binary
  - Downgraded `@bufbuild/protobuf` and `@bufbuild/protoc-gen-es` from v2.x to v1.x for Connect-ES v1.x compatibility
  - Kept `@trpc/client`, `@trpc/server`, and `@connectrpc/connect` as both devDependencies (for testing) and peerDependencies (for users)

- **Removed package.json preinstall script** - Won't interfere with npm installs

### Technical Details

#### Generated Code Improvements

**Router Factory** (with proper types):
```typescript
export function createServiceRouter<T extends AnyService>(
  service: T,
  client: Client<T>,
) {
  const procedures: Record<
    string,
    ReturnType<typeof t.procedure.input>
  > = {};
  // Fully typed, no any types!
}
```

**Service Router** (with correct API and paths):
```typescript
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { ResourceService } from "../../connect/resource_example_connect.js";

export const ResourceServiceRouter = (connectBaseUrl: string) => {
  const transport = createConnectTransport({ baseUrl: connectBaseUrl });
  const client = createClient(ResourceService, transport);
  return createServiceRouter(ResourceService, client);
};
```

### Documentation

- Added `CHANGELOG_FIXES.md` - Detailed explanation of protoc plugin and import fixes
- Added `LINTING_FIXES.md` - Complete documentation of all linting improvements
- Updated `.gitignore` to exclude test artifacts, coverage reports, and generated test files

### Testing

All 34 tests pass:
- ✅ Unit tests for discover, protoc, emit-router-factory, emit-service-router, emit-app-router, emit-index, client, and run modules
- ✅ Integration tests for error handling and full pipeline
- ✅ Tests for nested directories, custom query/mutation verbs, invalid proto files, and missing imports

### Breaking Changes

None.

### Migration Guide

For users upgrading from 0.1.0:
- No manual installation of protoc plugins required anymore
- Generated code now uses correct imports and paths
- All generated code is properly typed (no `any` types)

Simply run:
```bash
pnpm dlx proto-to-trpc@0.1.1 --proto_dir=./proto --out=./src/gen
```

---

## [0.1.0] - 2025-11-22

### Added

- Initial implementation of the `proto-to-trpc` CLI and library scaffolding
- TypeScript, tsup, Vitest, and Biome configuration
- Documentation layout under `docs/` directory
