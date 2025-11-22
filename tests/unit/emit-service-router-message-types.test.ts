import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { emitServiceRouters } from "../../src/emit-service-router";
import { runProtoc } from "../../src/protoc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("emitServiceRouters - Message Type Imports", () => {
	it("imports message types from *_pb.js files", async () => {
		const fixturesProtoDir = path.join(__dirname, "../../fixtures/proto");
		const resourceProto = path.join(fixturesProtoDir, "resource_example.proto");

		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-msg-types-"),
		);
		const connectDir = path.join(tmpDir, "connect");
		const trpcDir = path.join(tmpDir, "trpc");

		await runProtoc({
			protoFiles: [resourceProto],
			outDir: connectDir,
			protoDir: fixturesProtoDir,
		});

		const services = await emitServiceRouters({
			connectDir,
			trpcDir,
		});

		expect(services.length).toBeGreaterThan(0);

		const firstService = services[0];
		const routerPath = path.join(
			trpcDir,
			"routers",
			`${firstService?.name ?? "Unknown"}Router.ts`,
		);
		const contents = await fs.readFile(routerPath, "utf8");

		// Should import from *_pb.js file
		expect(contents).toMatch(/from\s+["'].*_pb\.js["']/u);

		// Should import message types (Request/Response classes)
		expect(contents).toMatch(/\b\w+Request\b/u);
		expect(contents).toMatch(/\b\w+Response\b/u);
	});

	it("uses message types directly in .input() and .output()", async () => {
		const fixturesProtoDir = path.join(__dirname, "../../fixtures/proto");
		const resourceProto = path.join(fixturesProtoDir, "resource_example.proto");

		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-direct-types-"),
		);
		const connectDir = path.join(tmpDir, "connect");
		const trpcDir = path.join(tmpDir, "trpc");

		await runProtoc({
			protoFiles: [resourceProto],
			outDir: connectDir,
			protoDir: fixturesProtoDir,
		});

		const services = await emitServiceRouters({
			connectDir,
			trpcDir,
		});

		const firstService = services[0];
		const routerPath = path.join(
			trpcDir,
			"routers",
			`${firstService?.name ?? "Unknown"}Router.ts`,
		);
		const contents = await fs.readFile(routerPath, "utf8");

		// Should use message types directly, not service.methods.MethodName.I
		expect(contents).not.toContain(".methods.");
		expect(contents).not.toContain(".I)");
		expect(contents).not.toContain(".O)");

		// Should use message type names as type parameters
		expect(contents).toMatch(/\.input<\w+Request>\(\)/u);
		expect(contents).toMatch(/\.output<\w+Response>\(\)/u);
	});

	it("generates router that doesn't access service.methods at runtime", async () => {
		const fixturesProtoDir = path.join(__dirname, "../../fixtures/proto");
		const resourceProto = path.join(fixturesProtoDir, "resource_example.proto");

		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-no-runtime-access-"),
		);
		const connectDir = path.join(tmpDir, "connect");
		const trpcDir = path.join(tmpDir, "trpc");

		await runProtoc({
			protoFiles: [resourceProto],
			outDir: connectDir,
			protoDir: fixturesProtoDir,
		});

		const services = await emitServiceRouters({
			connectDir,
			trpcDir,
		});

		const firstService = services[0];
		const routerPath = path.join(
			trpcDir,
			"routers",
			`${firstService?.name ?? "Unknown"}Router.ts`,
		);
		const contents = await fs.readFile(routerPath, "utf8");

		// The router function body should not access service.methods
		const routerFunctionMatch = contents.match(
			/export const \w+Router = \(connectBaseUrl: string\) => \{([^}]+)\}/su,
		);

		if (routerFunctionMatch?.[1]) {
			const functionBody = routerFunctionMatch[1];
			expect(functionBody).not.toContain(".methods.");
		}
	});

	it("handles services with multiple methods correctly", async () => {
		const fixturesProtoDir = path.join(__dirname, "../../fixtures/proto");
		const resourceProto = path.join(fixturesProtoDir, "resource_example.proto");

		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-multi-method-"),
		);
		const connectDir = path.join(tmpDir, "connect");
		const trpcDir = path.join(tmpDir, "trpc");

		await runProtoc({
			protoFiles: [resourceProto],
			outDir: connectDir,
			protoDir: fixturesProtoDir,
		});

		const services = await emitServiceRouters({
			connectDir,
			trpcDir,
		});

		const firstService = services[0];
		const routerPath = path.join(
			trpcDir,
			"routers",
			`${firstService?.name ?? "Unknown"}Router.ts`,
		);
		const contents = await fs.readFile(routerPath, "utf8");

		// Should have multiple procedure definitions
		const procedureMatches = contents.match(/t\.procedure/gu);
		expect(procedureMatches).toBeDefined();
		expect(procedureMatches!.length).toBeGreaterThan(1);

		// Each procedure should have .input<>() and .output<>()
		const inputMatches = contents.match(/\.input</gu);
		const outputMatches = contents.match(/\.output</gu);
		expect(inputMatches?.length).toBe(procedureMatches?.length);
		expect(outputMatches?.length).toBe(procedureMatches?.length);
	});
});
