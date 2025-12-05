import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { emitConnectQuery } from "../../src/emit-connectquery";

describe("emitConnectQuery", () => {
	it("generates connectquery files that include service references", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-connectquery-"),
		);
		const connectDir = path.join(tmpDir, "connect");
		await fs.mkdir(connectDir, { recursive: true });

		const connectFile = path.join(connectDir, "example_connect.js");
		await fs.writeFile(
			connectFile,
			`
export const ExampleService = {
	typeName: "example.v1.ExampleService",
	methods: {
		getThing: {
			name: "GetThing",
			I: {},
			O: {},
			kind: "unary",
		},
		createThing: {
			name: "CreateThing",
			I: {},
			O: {},
			kind: "unary",
		},
	},
};
`,
		);

		await emitConnectQuery({ connectDir });

		const connectQueryPath = path.join(connectDir, "example_connectquery.ts");
		const content = await fs.readFile(connectQueryPath, "utf8");

		expect(content).toContain('import { ExampleService } from "./example_connect.js";');
		expect(content).toContain("export const getThing");
		expect(content).toContain("export const createThing");
		expect(content).toContain("service: ExampleService");
	});
});


