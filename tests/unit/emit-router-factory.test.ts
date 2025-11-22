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
});
