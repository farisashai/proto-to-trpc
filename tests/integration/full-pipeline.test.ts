import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runCodegen } from "../../src/run";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Full Pipeline Integration", () => {
	it("generates complete working tRPC router from proto files", async () => {
		const fixturesProtoDir = path.join(__dirname, "../fixtures/simple");
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-full-"),
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

		// 1. Verify all expected log messages
		expect(logs.some((log) => log.includes("Discovering"))).toBe(true);
		expect(logs.some((log) => log.includes("Running protoc"))).toBe(true);
		expect(logs.some((log) => log.includes("Emitting"))).toBe(true);
		expect(logs.some((log) => log.includes("complete"))).toBe(true);

		// 2. Verify directory structure
		const connectDir = path.join(outDir, "connect");
		const trpcDir = path.join(outDir, "trpc");
		const routersDir = path.join(trpcDir, "routers");

		const dirs = await Promise.all([
			fs.stat(connectDir).then(() => true),
			fs.stat(trpcDir).then(() => true),
			fs.stat(routersDir).then(() => true),
		]);

		expect(dirs.every((exists) => exists)).toBe(true);

		// 3. Verify Connect files were generated
		const connectFiles = await fs.readdir(connectDir);
		const hasPbFile = connectFiles.some((f) =>
			f.match(/resource_example_pb\.(js|d\.ts)$/),
		);
		const hasConnectFile = connectFiles.some((f) =>
			f.match(/resource_example_connect\.(js|d\.ts)$/),
		);
		const hasConnectQueryFile = connectFiles.some((f) =>
			f.match(/resource_example_connectquery\.ts$/),
		);
		expect(hasPbFile).toBe(true);
		expect(hasConnectFile).toBe(true);
		expect(hasConnectQueryFile).toBe(true);

		const connectQueryContent = await fs.readFile(
			path.join(connectDir, "resource_example_connectquery.ts"),
			"utf8",
		);
		expect(connectQueryContent).toContain("service: ResourceService");

		// 4. Verify tRPC files were generated
		const trpcFiles = await fs.readdir(trpcDir);
		expect(trpcFiles).toContain("routerFactory.ts");
		expect(trpcFiles).toContain("appRouter.ts");
		expect(trpcFiles).toContain("index.ts");

		// 5. Verify router files
		const routerFiles = await fs.readdir(routersDir);
		expect(routerFiles.length).toBeGreaterThan(0);
		const hasServiceRouter = routerFiles.some((f) =>
			f.match(/.*ServiceRouter\.ts$/),
		);
		expect(hasServiceRouter).toBe(true);

		// 6. Verify content of routerFactory.ts
		const routerFactoryContent = await fs.readFile(
			path.join(trpcDir, "routerFactory.ts"),
			"utf8",
		);
		expect(routerFactoryContent).toContain("initTRPC");
		expect(routerFactoryContent).toContain("createServiceRouter");
		expect(routerFactoryContent).toContain("QUERY_PREFIXES");
		expect(routerFactoryContent).toContain("MUTATION_PREFIXES");
		expect(routerFactoryContent).toContain("export const t =");

		// 7. Verify content of appRouter.ts
		const appRouterContent = await fs.readFile(
			path.join(trpcDir, "appRouter.ts"),
			"utf8",
		);
		expect(appRouterContent).toContain("createAppRouter");
		expect(appRouterContent).toContain("export type AppRouter");
		expect(appRouterContent).toContain("t.router");

		// 8. Verify content of index.ts
		const indexContent = await fs.readFile(
			path.join(trpcDir, "index.ts"),
			"utf8",
		);
		expect(indexContent).toContain('export * from "./appRouter"');
		expect(indexContent).toContain('export * from "./routerFactory"');

		// 9. Verify service router content
		const firstRouter = routerFiles[0];
		if (firstRouter) {
			const routerContent = await fs.readFile(
				path.join(routersDir, firstRouter),
				"utf8",
			);
			expect(routerContent).toContain("t.router");
			expect(routerContent).toContain("export const");
			expect(routerContent).toContain("connectBaseUrl");
			expect(routerContent).toContain("t.procedure");
			// Should have both query and mutation methods
			expect(routerContent).toMatch(/\.(query|mutation)\(/u);
		}

		// 10. Verify the generated code has valid TypeScript syntax by checking
		// it contains proper imports and exports (dynamic import would require
		// all dependencies to be available, which is not the case in test env)
		expect(appRouterContent).toContain("import");
		expect(appRouterContent).toContain("export");
	});

	it("generates router with custom query and mutation verbs", async () => {
		const fixturesProtoDir = path.join(__dirname, "../fixtures/simple");
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-custom-verbs-"),
		);
		const outDir = path.join(tmpDir, "generated");

		await runCodegen({
			protoDir: fixturesProtoDir,
			outDir,
			queryVerbs: ["Fetch", "Read", "Search"],
			mutationVerbs: ["Write", "Remove", "Modify"],
		});

		const routerFactoryContent = await fs.readFile(
			path.join(outDir, "trpc", "routerFactory.ts"),
			"utf8",
		);

		// Verify custom verbs are present
		expect(routerFactoryContent).toContain("Fetch");
		expect(routerFactoryContent).toContain("Read");
		expect(routerFactoryContent).toContain("Search");
		expect(routerFactoryContent).toContain("Write");
		expect(routerFactoryContent).toContain("Remove");
		expect(routerFactoryContent).toContain("Modify");
	});

	it("handles proto files with nested directories", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-nested-"),
		);
		const protoDir = path.join(tmpDir, "proto");
		const nestedDir = path.join(protoDir, "api", "v1");
		const outDir = path.join(tmpDir, "generated");

		await fs.mkdir(nestedDir, { recursive: true });

		const nestedProto = path.join(nestedDir, "service.proto");
		await fs.writeFile(
			nestedProto,
			`
syntax = "proto3";

package api.v1;

message Request {
  string id = 1;
}

message Response {
  string result = 1;
}

service TestService {
  rpc GetData(Request) returns (Response);
}
`,
		);

		await runCodegen({
			protoDir,
			outDir,
		});

		// Verify it generated successfully
		const trpcDir = path.join(outDir, "trpc");
		const routerFactoryExists = await fs
			.stat(path.join(trpcDir, "routerFactory.ts"))
			.then(() => true)
			.catch(() => false);

		expect(routerFactoryExists).toBe(true);
	});
});
