import path from "node:path";

import { discoverProtoFiles } from "./discover";
import { emitAppRouter } from "./emit-app-router";
import { emitConnectQuery } from "./emit-connectquery";
import { emitIndexFile } from "./emit-index";
import { emitPackageJson } from "./emit-package-json";
import { emitRouterFactory } from "./emit-router-factory";
import { emitServiceRouters } from "./emit-service-router";
import { postProcessPbFiles } from "./post-process-pb-files";
import { runProtoc } from "./protoc";

export interface CodegenOptions {
	protoDir: string;
	outDir: string;
	/**
	 * Verbs that should be treated as queries, e.g. ["Get", "List"].
	 * If omitted, the default is ["Get", "List"].
	 */
	queryVerbs?: string[];
	/**
	 * Verbs that should be treated as mutations, e.g. ["Create", "Update", "Delete"].
	 * If omitted, the default is ["Create", "Update", "Delete"].
	 */
	mutationVerbs?: string[];
	/**
	 * If true, only generate ConnectRPC code (skip tRPC router generation).
	 */
	connectOnly?: boolean;
	onLog?: (message: string) => void;
}

function log(onLog: CodegenOptions["onLog"], message: string) {
	if (onLog) {
		onLog(message);
	}
}

export async function runCodegen(options: CodegenOptions): Promise<void> {
	const { protoDir, outDir, onLog, connectOnly } = options;

	const resolvedProtoDir = path.resolve(protoDir);
	const resolvedOutDir = path.resolve(outDir);

	const queryVerbs =
		options.queryVerbs && options.queryVerbs.length > 0
			? options.queryVerbs
			: undefined;
	const mutationVerbs =
		options.mutationVerbs && options.mutationVerbs.length > 0
			? options.mutationVerbs
			: undefined;

	log(onLog, `Discovering .proto files in ${resolvedProtoDir}`);
	const protoFiles = await discoverProtoFiles(resolvedProtoDir);

	if (protoFiles.length === 0) {
		throw new Error(`No .proto files found under ${resolvedProtoDir}`);
	}

	const connectOut = path.join(resolvedOutDir, "connect");
	const trpcOut = path.join(resolvedOutDir, "trpc");

	log(onLog, "Running protoc to generate ConnectRPC and TS outputs...");
	await runProtoc({
		protoFiles,
		outDir: connectOut,
		protoDir: resolvedProtoDir,
	});

	log(onLog, "Post-processing protobuf declaration files...");
	await postProcessPbFiles(connectOut);

	log(onLog, "Emitting connectquery re-exports...");
	await emitConnectQuery({ connectDir: connectOut });

	// Skip tRPC generation if connectOnly is set
	if (connectOnly) {
		log(onLog, "Skipping tRPC generation (--connect-only)");
		log(onLog, "Emitting package.json...");
		await emitPackageJson(resolvedOutDir);
		log(onLog, "Code generation complete.");
		return;
	}

	log(onLog, "Emitting tRPC router factory...");
	await emitRouterFactory(trpcOut, {
		queryVerbs,
		mutationVerbs,
	});

	log(onLog, "Emitting per-service routers...");
	const serviceInfoList = await emitServiceRouters({
		connectDir: connectOut,
		trpcDir: trpcOut,
		queryVerbs,
		mutationVerbs,
	});

	log(onLog, "Emitting appRouter...");
	await emitAppRouter(serviceInfoList, trpcOut);

	log(onLog, "Emitting index file...");
	await emitIndexFile(trpcOut);

	log(onLog, "Emitting package.json...");
	await emitPackageJson(resolvedOutDir);

	log(onLog, "Code generation complete.");
}
