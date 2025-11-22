import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { emitServiceRouters } from "../../src/emit-service-router";
import { runProtoc } from "../../src/protoc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("emitServiceRouters", () => {
	it("emits a router file per discovered service", async () => {
		const fixturesProtoDir = path.join(__dirname, "../../fixtures/proto");
		const resourceProto = path.join(fixturesProtoDir, "resource_example.proto");

		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-service-"),
		);
		const connectDir = path.join(tmpDir, "connect");
		const trpcDir = path.join(tmpDir, "trpc");

		await runProtoc({
			protoFiles: [resourceProto],
			outDir: connectDir,
			protoDir: fixturesProtoDir,
		});

		const services = await emitServiceRouters({
			connectDir,
			trpcDir,
		});

		expect(services.length).toBeGreaterThan(0);

		const firstService = services[0];
		expect(firstService).toBeDefined();

		const routerPath = path.join(
			trpcDir,
			"routers",
			`${firstService?.name ?? "Unknown"}Router.ts`,
		);
		const contents = await fs.readFile(routerPath, "utf8");

		expect(contents).toContain("createServiceRouter");
		expect(contents).toContain("Router");
	});
});
