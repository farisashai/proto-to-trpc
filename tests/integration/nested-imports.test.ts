import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runCodegen } from "../../src/run";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Nested Proto Imports", () => {
	it("resolves first-party imports relative to proto_dir base", async () => {
		// This test mimics a monorepo structure where:
		// - We run from a frontend project directory (console-ui/)
		// - Proto files are in ../backend/apis/frontend/
		// - Imports are written relative to ../backend/apis/frontend/ (e.g., "frontend/v1/types.proto")
		// - The proto_dir IS the base path for resolving imports

		const fixturesProtoDir = path.join(__dirname, "../fixtures/nested-imports");
		const outDir = path.join(fixturesProtoDir, "output");

		// Clean up output directory before running
		await fs.rm(outDir, { recursive: true, force: true });

		const logs: string[] = [];

		await runCodegen({
			protoDir: fixturesProtoDir,
			outDir,
			onLog: (message) => {
				logs.push(message);
			},
		});

		// 1. Verify codegen completed successfully
		expect(logs.some((log) => log.includes("complete"))).toBe(true);

		// 2. Verify Connect files were generated from service.proto
		const connectDir = path.join(outDir, "connect");
		const connectFiles = await fs.readdir(connectDir, { recursive: true });

		// Should have generated files from both types.proto and service.proto
		const hasTypesPb = connectFiles.some((f) =>
			f.toString().includes("types_pb"),
		);
		const hasServicePb = connectFiles.some((f) =>
			f.toString().includes("service_pb"),
		);
		const hasServiceConnect = connectFiles.some((f) =>
			f.toString().includes("service_connect"),
		);

		expect(hasTypesPb).toBe(true);
		expect(hasServicePb).toBe(true);
		expect(hasServiceConnect).toBe(true);

		// 3. Verify tRPC router was generated for UserService
		const trpcDir = path.join(outDir, "trpc");
		const routersDir = path.join(trpcDir, "routers");
		const routerFiles = await fs.readdir(routersDir);

		expect(routerFiles).toContain("UserServiceRouter.ts");

		// 4. Verify router content includes service and message types
		const routerContent = await fs.readFile(
			path.join(routersDir, "UserServiceRouter.ts"),
			"utf8",
		);

		// Should import the service definition
		expect(routerContent).toContain("UserService");

		// Should import request/response types (which reference types from types.proto)
		expect(routerContent).toContain("GetUserRequest");
		expect(routerContent).toContain("GetUserResponse");
		expect(routerContent).toContain("ListUsersRequest");
		expect(routerContent).toContain("ListUsersResponse");

		// Should have both query procedures (both GetUser and ListUsers are queries)
		expect(routerContent).toContain("GetUser: t.procedure");
		expect(routerContent).toContain("ListUsers: t.procedure");
		expect(routerContent).toContain(".query(");

		// Verify it uses protobuf validator
		expect(routerContent).toContain("protobuf<");

		// 5. Verify all expected output files exist
		const expectedFiles = [
			path.join(outDir, "trpc", "routerFactory.ts"),
			path.join(outDir, "trpc", "appRouter.ts"),
			path.join(outDir, "trpc", "index.ts"),
			path.join(outDir, "package.json"),
		];

		for (const file of expectedFiles) {
			const exists = await fs
				.access(file)
				.then(() => true)
				.catch(() => false);
			expect(exists).toBe(true);
		}
	});
});
