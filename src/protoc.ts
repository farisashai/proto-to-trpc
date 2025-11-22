import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { promisify } from "node:util";

import { ensureDir } from "./utils/fs";

const execFileAsync = promisify(execFile);

export interface ProtocOptions {
	protoFiles: string[];
	outDir: string;
	protoDir: string;
	protocPath?: string;
}

export async function runProtoc(options: ProtocOptions): Promise<void> {
	const { protoFiles, outDir, protoDir, protocPath } = options;

	if (protoFiles.length === 0) {
		return;
	}

	await ensureDir(outDir);

	const resolvedOutDir = path.resolve(outDir);
	const resolvedProtoDir = path.resolve(protoDir);
	// Use the provided protocPath, environment variable, or default to "protoc"
	// which will be resolved from node_modules/.bin via PATH below
	const binary = protocPath ?? process.env.PROTOC ?? "protoc";

	// Find plugin directories:
	// 1. This package's node_modules/.bin (for global installs or pnpm dlx)
	// 2. User's project node_modules/.bin (for local installs)
	const __dirname = path.dirname(fileURLToPath(import.meta.url));
	const packageBinDir = path.resolve(__dirname, "../node_modules/.bin");
	const projectBinDir = path.resolve(process.cwd(), "node_modules", ".bin");

	// Include both directories in PATH, with package bin taking precedence
	const envPath = [packageBinDir, projectBinDir, process.env.PATH]
		.filter(Boolean)
		.join(path.delimiter);

	// Automatically include common third-party proto paths
	// 1. From node_modules (if packages are installed)
	// 2. From bundled deps directory in this package
	const bundledDeps = path.resolve(__dirname, "../deps");

	const thirdPartyProtoPaths = [
		path.join(process.cwd(), "node_modules", "google-proto-files"), // google/protobuf/*, google/api/*
		path.join(process.cwd(), "node_modules", "@bufbuild", "protovalidate"), // buf/validate/*
		bundledDeps, // protoc-gen-openapiv2/options/*, google/* (bundled with this package)
	].filter(existsSync);

	const args = [
		`--connect-es_out=${resolvedOutDir}`,
		`--es_out=${resolvedOutDir}`,
		`--proto_path=${resolvedProtoDir}`,
		...thirdPartyProtoPaths.map((p) => `--proto_path=${p}`),
		"--experimental_allow_proto3_optional",
		...protoFiles,
	];

	try {
		await execFileAsync(binary, args, {
			env: {
				...process.env,
				PATH: envPath,
			},
		});
	} catch (error) {
		const message =
			error instanceof Error && "stderr" in error
				? String((error as Error & { stderr?: string }).stderr || error.message)
				: "Failed to execute protoc. Is it installed and on your PATH?";
		throw new Error(message);
	}
}
