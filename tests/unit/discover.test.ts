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
});
