import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runProtoc } from "../../src/protoc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("runProtoc", () => {
	it("generates Connect and TS outputs from proto files", async () => {
		const fixturesProtoDir = path.join(__dirname, "../fixtures/simple");
		const resourceProto = path.join(fixturesProtoDir, "resource_example.proto");

		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-protoc-"),
		);
		const outDir = path.join(tmpDir, "generated");

		await runProtoc({
			protoFiles: [resourceProto],
			outDir,
			protoDir: fixturesProtoDir,
		});

		// Check that protoc generated the expected files
		const files = await fs.readdir(outDir);

		// Should have both _pb and _connect files
		const hasPbFile = files.some((f) => f.includes("_pb"));
		const hasConnectFile = files.some((f) => f.includes("_connect"));

		expect(hasPbFile).toBe(true);
		expect(hasConnectFile).toBe(true);
	});

	it("does nothing when no proto files are provided", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-protoc-empty-"),
		);
		const outDir = path.join(tmpDir, "generated");

		// Should not throw
		await expect(
			runProtoc({
				protoFiles: [],
				outDir,
				protoDir: tmpDir,
			}),
		).resolves.toBeUndefined();
	});

	it("throws an error for invalid proto files", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-protoc-invalid-"),
		);
		const outDir = path.join(tmpDir, "generated");
		const invalidProto = path.join(tmpDir, "invalid.proto");

		// Create an invalid proto file
		await fs.writeFile(invalidProto, "this is not valid protobuf syntax");

		await expect(
			runProtoc({
				protoFiles: [invalidProto],
				outDir,
				protoDir: tmpDir,
			}),
		).rejects.toThrow();
	});
});
