import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { discoverProtoFiles } from "../../src/discover";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("discoverProtoFiles", () => {
	it("finds .proto files recursively", async () => {
		const fixturesDir = path.join(__dirname, "../../fixtures/proto");
		const files = await discoverProtoFiles(fixturesDir);

		const hasExample = files.some((file) =>
			file.endsWith(path.join("fixtures", "proto", "resource_example.proto")),
		);

		expect(hasExample).toBe(true);
	});

	it("returns absolute paths", async () => {
		const fixturesDir = path.join(__dirname, "../../fixtures/proto");
		const files = await discoverProtoFiles(fixturesDir);

		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			expect(path.isAbsolute(file)).toBe(true);
		}
	});

	it("finds proto files in nested directories", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-discover-"),
		);

		// Create nested structure
		const nested = path.join(tmpDir, "api", "v1", "nested");
		await fs.mkdir(nested, { recursive: true });

		// Create proto files at different levels
		await fs.writeFile(path.join(tmpDir, "top.proto"), "");
		await fs.writeFile(path.join(tmpDir, "api", "middle.proto"), "");
		await fs.writeFile(path.join(nested, "deep.proto"), "");

		const files = await discoverProtoFiles(tmpDir);

		expect(files.length).toBe(3);
		expect(files.some((f) => f.endsWith("top.proto"))).toBe(true);
		expect(files.some((f) => f.endsWith("middle.proto"))).toBe(true);
		expect(files.some((f) => f.endsWith("deep.proto"))).toBe(true);
	});

	it("returns empty array when no proto files exist", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-discover-empty-"),
		);

		const files = await discoverProtoFiles(tmpDir);

		expect(files).toEqual([]);
	});

	it("ignores non-proto files", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-discover-mixed-"),
		);

		await fs.writeFile(path.join(tmpDir, "file.proto"), "");
		await fs.writeFile(path.join(tmpDir, "file.txt"), "");
		await fs.writeFile(path.join(tmpDir, "file.js"), "");
		await fs.writeFile(path.join(tmpDir, "README.md"), "");

		const files = await discoverProtoFiles(tmpDir);

		expect(files.length).toBe(1);
		expect(files[0]).toContain("file.proto");
	});
});
