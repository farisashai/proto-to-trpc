import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { discoverProtoFiles } from "../../src/discover";
import { runCodegen } from "../../src/run";
import { runProtoc } from "../../src/protoc";

describe("Error Handling", () => {
	describe("discoverProtoFiles", () => {
		it("returns empty array for non-existent directory", async () => {
			const nonExistentDir = path.join(
				os.tmpdir(),
				`proto-to-trpc-nonexistent-${Date.now()}`,
			);

			const files = await discoverProtoFiles(nonExistentDir);

			expect(files).toEqual([]);
		});

		it("returns empty array for directory with no proto files", async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "proto-to-trpc-empty-"),
			);

			const files = await discoverProtoFiles(tmpDir);

			expect(files).toEqual([]);
		});
	});

	describe("runProtoc", () => {
		it("throws error with helpful message for invalid proto syntax", async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "proto-to-trpc-invalid-proto-"),
			);
			const protoDir = path.join(tmpDir, "proto");
			const outDir = path.join(tmpDir, "out");
			await fs.mkdir(protoDir, { recursive: true });

			const invalidProto = path.join(protoDir, "invalid.proto");
			await fs.writeFile(
				invalidProto,
				`
syntax = "proto3";
// Missing closing brace
message Broken {
  string name = 1;
`,
			);

			await expect(
				runProtoc({
					protoFiles: [invalidProto],
					outDir,
					protoDir,
				}),
			).rejects.toThrow();
		});

		it("throws error for missing import in proto file", async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "proto-to-trpc-missing-import-"),
			);
			const protoDir = path.join(tmpDir, "proto");
			const outDir = path.join(tmpDir, "out");
			await fs.mkdir(protoDir, { recursive: true });

			const protoWithMissingImport = path.join(protoDir, "test.proto");
			await fs.writeFile(
				protoWithMissingImport,
				`
syntax = "proto3";

import "nonexistent/file.proto";

message Test {
  string name = 1;
}
`,
			);

			await expect(
				runProtoc({
					protoFiles: [protoWithMissingImport],
					outDir,
					protoDir,
				}),
			).rejects.toThrow();
		});
	});

	describe("runCodegen", () => {
		it("throws error when proto directory does not exist", async () => {
			const nonExistentDir = path.join(
				os.tmpdir(),
				`proto-to-trpc-nonexistent-${Date.now()}`,
			);
			const outDir = path.join(os.tmpdir(), `proto-to-trpc-out-${Date.now()}`);

			await expect(
				runCodegen({
					protoDir: nonExistentDir,
					outDir,
				}),
			).rejects.toThrow(/No .proto files found/);
		});

		it("throws error when proto directory is empty", async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "proto-to-trpc-empty-codegen-"),
			);
			const protoDir = path.join(tmpDir, "proto");
			const outDir = path.join(tmpDir, "out");

			await fs.mkdir(protoDir, { recursive: true });

			await expect(
				runCodegen({
					protoDir,
					outDir,
				}),
			).rejects.toThrow(/No .proto files found/);
		});

		it("handles errors during codegen gracefully", async () => {
			const tmpDir = await fs.mkdtemp(
				path.join(os.tmpdir(), "proto-to-trpc-error-codegen-"),
			);
			const protoDir = path.join(tmpDir, "proto");
			const outDir = path.join(tmpDir, "out");

			await fs.mkdir(protoDir, { recursive: true });

			// Create an invalid proto file
			const invalidProto = path.join(protoDir, "invalid.proto");
			await fs.writeFile(invalidProto, "this is not valid protobuf");

			const errors: string[] = [];

			await expect(
				runCodegen({
					protoDir,
					outDir,
					onLog: (message) => {
						errors.push(message);
					},
				}),
			).rejects.toThrow();

			// Should have logged some messages before failing
			expect(errors.length).toBeGreaterThan(0);
		});
	});
});
