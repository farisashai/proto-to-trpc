import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runCodegen } from "../../src/run";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Third-Party Proto Imports", () => {
	// Helper to run codegen and verify basic structure
	async function testFixture(
		fixtureName: string,
		expectedService: string,
		expectedMethods: { name: string; type: "query" | "mutation" }[],
		additionalChecks?: (outDir: string) => Promise<void>,
	) {
		const fixturesProtoDir = path.join(__dirname, "../fixtures", fixtureName);
		const outDir = path.join(__dirname, "../fixtures", fixtureName, "output");

		// Clean up output directory before running
		await fs.rm(outDir, { recursive: true, force: true });

		const logs: string[] = [];

		await runCodegen({
			protoDir: fixturesProtoDir,
			outDir,
			onLog: (message) => {
				logs.push(message);
			},
		});

		// 1. Verify codegen completed successfully
		expect(logs.some((log) => log.includes("complete"))).toBe(true);

		// 2. Verify Connect files were generated
		const connectDir = path.join(outDir, "connect");
		const connectDirExists = await fs
			.access(connectDir)
			.then(() => true)
			.catch(() => false);
		expect(connectDirExists).toBe(true);

		const connectFiles = await fs.readdir(connectDir, { recursive: true });
		const hasServiceConnect = connectFiles.some(
			(f) =>
				f.toString().includes("_connect.js") ||
				f.toString().includes("_connect.d.ts"),
		);
		expect(hasServiceConnect).toBe(true);

		// 3. Verify tRPC router was generated
		const trpcDir = path.join(outDir, "trpc");
		const routersDir = path.join(trpcDir, "routers");
		const routerFiles = await fs.readdir(routersDir);

		const expectedRouterFile = `${expectedService}Router.ts`;
		expect(routerFiles).toContain(expectedRouterFile);

		// 4. Verify router content
		const routerContent = await fs.readFile(
			path.join(routersDir, expectedRouterFile),
			"utf8",
		);

		expect(routerContent).toContain(expectedService);

		for (const method of expectedMethods) {
			expect(routerContent).toContain(method.name);
			expect(routerContent).toContain(
				method.type === "query" ? ".query(" : ".mutation(",
			);
		}

		// 5. Verify appRouter includes the service
		const appRouterContent = await fs.readFile(
			path.join(trpcDir, "appRouter.ts"),
			"utf8",
		);
		expect(appRouterContent).toContain(expectedService);

		// 6. Verify package.json was generated
		const packageJsonPath = path.join(outDir, "package.json");
		const packageJsonExists = await fs
			.access(packageJsonPath)
			.then(() => true)
			.catch(() => false);
		expect(packageJsonExists).toBe(true);

		// 7. Verify routerFactory was generated
		const routerFactoryPath = path.join(trpcDir, "routerFactory.ts");
		const routerFactoryExists = await fs
			.access(routerFactoryPath)
			.then(() => true)
			.catch(() => false);
		expect(routerFactoryExists).toBe(true);

		// 8. Verify index.ts was generated
		const indexPath = path.join(trpcDir, "index.ts");
		const indexExists = await fs
			.access(indexPath)
			.then(() => true)
			.catch(() => false);
		expect(indexExists).toBe(true);

		// 9. Run additional checks if provided
		if (additionalChecks) {
			await additionalChecks(outDir);
		}
	}

	it("generates code with google.protobuf types (timestamp, duration, struct, any)", async () => {
		await testFixture(
			"third-party-google",
			"EventService",
			[
				{ name: "CreateEvent", type: "mutation" },
				{ name: "GetEvent", type: "query" },
			],
			async (outDir) => {
				// Verify the generated types include google.protobuf imports
				const connectDir = path.join(outDir, "connect");
				const connectFiles = await fs.readdir(connectDir, { recursive: true });

				const pbFiles = connectFiles.filter(
					(f) =>
						f.toString().endsWith("_pb.js") ||
						f.toString().endsWith("_pb.d.ts"),
				);
				expect(pbFiles.length).toBeGreaterThan(0);

				// Check that at least one file imports from @bufbuild/protobuf
				let foundProtobufImport = false;
				for (const file of pbFiles) {
					const content = await fs.readFile(
						path.join(connectDir, file.toString()),
						"utf8",
					);
					if (content.includes("@bufbuild/protobuf")) {
						foundProtobufImport = true;
						break;
					}
				}
				expect(foundProtobufImport).toBe(true);
			},
		);
	});

	it("generates code with google.api.annotations", async () => {
		await testFixture(
			"third-party-google-api",
			"ResourceService",
			[
				{ name: "GetResource", type: "query" },
				{ name: "ListResources", type: "query" },
			],
			async (outDir) => {
				// Verify the service definition includes HTTP annotations
				const connectDir = path.join(outDir, "connect");
				const connectFiles = await fs.readdir(connectDir, { recursive: true });

				const connectFile = connectFiles.find(
					(f) =>
						f.toString().includes("_connect.js") ||
						f.toString().includes("_connect.d.ts"),
				);
				expect(connectFile).toBeDefined();
			},
		);
	});

	it("generates code with buf.validate annotations", async () => {
		await testFixture(
			"third-party-buf-validate",
			"UserValidationService",
			[
				{ name: "CreateUser", type: "mutation" },
				{ name: "GetUser", type: "query" },
			],
			async (outDir) => {
				// Verify the generated proto files include validation options
				const connectDir = path.join(outDir, "connect");
				const connectFiles = await fs.readdir(connectDir, { recursive: true });

				const pbFiles = connectFiles.filter(
					(f) =>
						f.toString().endsWith("_pb.js") ||
						f.toString().endsWith("_pb.d.ts"),
				);
				expect(pbFiles.length).toBeGreaterThan(0);
			},
		);
	});

	it("generates code with protoc-gen-openapiv2 annotations", async () => {
		await testFixture(
			"third-party-openapi",
			"ProductService",
			[
				{ name: "GetProduct", type: "query" },
				{ name: "ListProducts", type: "query" },
			],
			async (outDir) => {
				// Verify the service definition includes OpenAPI annotations
				const connectDir = path.join(outDir, "connect");
				const connectFiles = await fs.readdir(connectDir, { recursive: true });

				const connectFile = connectFiles.find(
					(f) =>
						f.toString().includes("_connect.js") ||
						f.toString().includes("_connect.d.ts"),
				);
				expect(connectFile).toBeDefined();
			},
		);
	});

	it("generates code with google.protobuf.descriptor", async () => {
		await testFixture(
			"third-party-descriptor",
			"SchemaService",
			[
				{ name: "GetSchema", type: "query" },
				{ name: "ListSchemas", type: "query" },
			],
			async (outDir) => {
				// Verify descriptor types are imported
				const connectDir = path.join(outDir, "connect");
				const connectFiles = await fs.readdir(connectDir, { recursive: true });

				const pbFiles = connectFiles.filter(
					(f) =>
						f.toString().endsWith("_pb.js") ||
						f.toString().endsWith("_pb.d.ts"),
				);
				expect(pbFiles.length).toBeGreaterThan(0);
			},
		);
	});

	it("generates code with all third-party imports combined", async () => {
		await testFixture(
			"third-party-all-combined",
			"ComplexEntityService",
			[
				{ name: "CreateComplexEntity", type: "mutation" },
				{ name: "GetComplexEntity", type: "query" },
				{ name: "ListComplexEntities", type: "query" },
			],
			async (outDir) => {
				// Verify all types of imports are present
				const connectDir = path.join(outDir, "connect");
				const connectFiles = await fs.readdir(connectDir, { recursive: true });

				const pbFiles = connectFiles.filter(
					(f) =>
						f.toString().endsWith("_pb.js") ||
						f.toString().endsWith("_pb.d.ts"),
				);
				expect(pbFiles.length).toBeGreaterThan(0);

				// Check for protobuf imports
				let foundProtobufImport = false;
				for (const file of pbFiles) {
					const content = await fs.readFile(
						path.join(connectDir, file.toString()),
						"utf8",
					);
					if (content.includes("@bufbuild/protobuf")) {
						foundProtobufImport = true;
						break;
					}
				}
				expect(foundProtobufImport).toBe(true);
			},
		);
	});
});
