import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runCodegen } from "../../src/run";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("runCodegen", () => {
	it("orchestrates full codegen pipeline", async () => {
		const fixturesProtoDir = path.join(__dirname, "../../fixtures/proto");
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-run-"),
		);
		const outDir = path.join(tmpDir, "generated");

		const logs: string[] = [];

		await runCodegen({
			protoDir: fixturesProtoDir,
			outDir,
			onLog: (message) => {
				logs.push(message);
			},
		});

		// Verify logging
		expect(logs.length).toBeGreaterThan(0);
		expect(logs.some((log) => log.includes("Discovering"))).toBe(true);
		expect(logs.some((log) => log.includes("Running protoc"))).toBe(true);
		expect(logs.some((log) => log.includes("complete"))).toBe(true);

		// Verify directory structure
		const connectDir = path.join(outDir, "connect");
		const trpcDir = path.join(outDir, "trpc");

		const connectExists = await fs
			.stat(connectDir)
			.then(() => true)
			.catch(() => false);
		const trpcExists = await fs
			.stat(trpcDir)
			.then(() => true)
			.catch(() => false);

		expect(connectExists).toBe(true);
		expect(trpcExists).toBe(true);

		// Verify key files were generated
		const routerFactoryPath = path.join(trpcDir, "routerFactory.ts");
		const appRouterPath = path.join(trpcDir, "appRouter.ts");
		const indexPath = path.join(trpcDir, "index.ts");

		const routerFactoryExists = await fs
			.stat(routerFactoryPath)
			.then(() => true)
			.catch(() => false);
		const appRouterExists = await fs
			.stat(appRouterPath)
			.then(() => true)
			.catch(() => false);
		const indexExists = await fs
			.stat(indexPath)
			.then(() => true)
			.catch(() => false);

		expect(routerFactoryExists).toBe(true);
		expect(appRouterExists).toBe(true);
		expect(indexExists).toBe(true);
	});

	it("throws error when no proto files found", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-run-empty-"),
		);
		const emptyProtoDir = path.join(tmpDir, "proto");
		const outDir = path.join(tmpDir, "generated");

		await fs.mkdir(emptyProtoDir, { recursive: true });

		await expect(
			runCodegen({
				protoDir: emptyProtoDir,
				outDir,
			}),
		).rejects.toThrow(/No .proto files found/);
	});

	it("accepts custom query and mutation verbs", async () => {
		const fixturesProtoDir = path.join(__dirname, "../../fixtures/proto");
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-run-verbs-"),
		);
		const outDir = path.join(tmpDir, "generated");

		await runCodegen({
			protoDir: fixturesProtoDir,
			outDir,
			queryVerbs: ["Fetch", "Read"],
			mutationVerbs: ["Write", "Remove"],
		});

		// Verify it completed without error
		const routerFactoryPath = path.join(outDir, "trpc", "routerFactory.ts");
		const contents = await fs.readFile(routerFactoryPath, "utf8");

		// The custom verbs should be in the generated code
		expect(contents).toContain("Fetch");
		expect(contents).toContain("Read");
		expect(contents).toContain("Write");
		expect(contents).toContain("Remove");
	});
});
