import { execFile } from "node:child_process";
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
	const binary = protocPath ?? process.env.PROTOC ?? "protoc";

	const args = [
		`--connect-es_out=${resolvedOutDir}`,
		`--ts_out=${resolvedOutDir}`,
		`--proto_path=${resolvedProtoDir}`,
		"--experimental_allow_proto3_optional",
		...protoFiles,
	];

	try {
		await execFileAsync(binary, args);
	} catch (error) {
		const message =
			error instanceof Error && "stderr" in error
				? String(error.stderr || error.message)
				: "Failed to execute protoc. Is it installed and on your PATH?";
		throw new Error(message);
	}
}
