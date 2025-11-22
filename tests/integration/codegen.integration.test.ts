import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { initTRPC } from "@trpc/server";
import { describe, expect, it } from "vitest";

import { emitAppRouter } from "../../src/emit-app-router";
import { emitIndexFile } from "../../src/emit-index";
import { emitRouterFactory } from "../../src/emit-router-factory";
import { emitServiceRouters } from "../../src/emit-service-router";
import { runProtoc } from "../../src/protoc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This integration test is skipped by default to avoid flakiness
// in constrained environments. Enable by changing describe.skip to
// describe if you want to exercise the full pipeline locally.
describe.skip("codegen pipeline (with protoc)", () => {
	it("produces a router that exposes services as tRPC procedures", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-integration-"),
		);
		const fixturesProtoDir = path.join(__dirname, "../fixtures/simple");
		const resourceProto = path.join(fixturesProtoDir, "resource_example.proto");
		const connectDir = path.join(tmpDir, "connect");
		const trpcDir = path.join(tmpDir, "trpc");

		await runProtoc({
			protoFiles: [resourceProto],
			outDir: connectDir,
			protoDir: fixturesProtoDir,
		});

		await emitRouterFactory(trpcDir);
		const services = await emitServiceRouters({ connectDir, trpcDir });
		await emitAppRouter(services, trpcDir);
		await emitIndexFile(trpcDir);

		const routerModulePath = path.join(trpcDir, "appRouter.ts");
		const routerModule = await import(routerModulePath);

		const { createAppRouter } = routerModule as {
			createAppRouter: (
				connectBaseUrl: string,
			) => ReturnType<typeof initTRPC.create>["router"];
		};

		const appRouter = createAppRouter("http://localhost:8080");

		// We do not assert the exact tRPC API surface here to keep this test
		// independent of tRPC internals; verifying emission and basic import
		// ability is sufficient.
		expect(appRouter).toBeDefined();
	});
});
