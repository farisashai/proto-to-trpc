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
	// Use the provided protocPath, environment variable, or default to "protoc"
	// which will be resolved from node_modules/.bin via PATH below
	const binary = protocPath ?? process.env.PROTOC ?? "protoc";

	// Ensure protoc can find plugins from this package's node_modules/.bin
	const binDir = path.resolve(process.cwd(), "node_modules", ".bin");
	const envPath = [binDir, process.env.PATH]
		.filter(Boolean)
		.join(path.delimiter);

	const args = [
		`--connect-es_out=${resolvedOutDir}`,
		`--es_out=${resolvedOutDir}`,
		`--proto_path=${resolvedProtoDir}`,
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
				? String(
						(error as Error & { stderr?: string }).stderr || error.message,
					)
				: "Failed to execute protoc. Is it installed and on your PATH?";
		throw new Error(message);
	}
}
