import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { emitRouterFactory } from "../../src/emit-router-factory";

describe("emitRouterFactory", () => {
	it("writes routerFactory.ts with createServiceRouter", async () => {
		const dir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-router-"),
		);

		await emitRouterFactory(dir);

		const filePath = path.join(dir, "routerFactory.ts");
		const contents = await fs.readFile(filePath, "utf8");

		expect(contents).toContain("createServiceRouter");
		expect(contents).toContain("QUERY_PREFIXES");
		expect(contents).toContain("MUTATION_PREFIXES");
	});

	it("includes default query and mutation verbs", async () => {
		const dir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-router-default-"),
		);

		await emitRouterFactory(dir);

		const filePath = path.join(dir, "routerFactory.ts");
		const contents = await fs.readFile(filePath, "utf8");

		// Check default query verbs
		expect(contents).toContain('"Get"');
		expect(contents).toContain('"List"');

		// Check default mutation verbs
		expect(contents).toContain('"Create"');
		expect(contents).toContain('"Update"');
		expect(contents).toContain('"Delete"');
	});

	it("supports custom query verbs", async () => {
		const dir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-router-custom-query-"),
		);

		await emitRouterFactory(dir, {
			queryVerbs: ["Fetch", "Search", "Read"],
		});

		const filePath = path.join(dir, "routerFactory.ts");
		const contents = await fs.readFile(filePath, "utf8");

		expect(contents).toContain('"Fetch"');
		expect(contents).toContain('"Search"');
		expect(contents).toContain('"Read"');
	});

	it("supports custom mutation verbs", async () => {
		const dir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-router-custom-mutation-"),
		);

		await emitRouterFactory(dir, {
			mutationVerbs: ["Write", "Remove", "Modify"],
		});

		const filePath = path.join(dir, "routerFactory.ts");
		const contents = await fs.readFile(filePath, "utf8");

		expect(contents).toContain('"Write"');
		expect(contents).toContain('"Remove"');
		expect(contents).toContain('"Modify"');
	});

	it("exports initTRPC instance as t", async () => {
		const dir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-router-export-"),
		);

		await emitRouterFactory(dir);

		const filePath = path.join(dir, "routerFactory.ts");
		const contents = await fs.readFile(filePath, "utf8");

		expect(contents).toContain("export const t =");
		expect(contents).toContain("initTRPC.create()");
	});

	it("creates valid TypeScript code", async () => {
		const dir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-router-valid-"),
		);

		await emitRouterFactory(dir);

		const filePath = path.join(dir, "routerFactory.ts");

		// Try to import the generated file (will throw if syntax is invalid)
		await expect(import(filePath)).resolves.toBeDefined();
	});
});
