# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

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
