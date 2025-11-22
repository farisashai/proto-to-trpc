import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { emitIndexFile } from "../../src/emit-index";

describe("emitIndexFile", () => {
	it("creates index.ts that re-exports appRouter and routerFactory", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-index-"),
		);

		await emitIndexFile(tmpDir);

		const indexPath = path.join(tmpDir, "index.ts");
		const contents = await fs.readFile(indexPath, "utf8");

		expect(contents).toContain('export * from "./appRouter"');
		expect(contents).toContain('export * from "./routerFactory"');
	});

	it("overwrites existing index.ts file", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-index-overwrite-"),
		);
		const indexPath = path.join(tmpDir, "index.ts");

		// Create an existing file
		await fs.mkdir(tmpDir, { recursive: true });
		await fs.writeFile(indexPath, "// old content");

		await emitIndexFile(tmpDir);

		const contents = await fs.readFile(indexPath, "utf8");

		// Should not contain old content
		expect(contents).not.toContain("// old content");
		expect(contents).toContain('export * from "./appRouter"');
	});
});
