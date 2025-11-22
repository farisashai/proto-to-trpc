import path from "node:path";

import chokidar from "chokidar";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { runCodegen } from "./run";

function log(message: string) {
	process.stdout.write(`${message}\n`);
}

function logError(message: string) {
	process.stderr.write(`${message}\n`);
}

function parseVerbs(value: unknown): string[] | undefined {
	if (typeof value !== "string") {
		return undefined;
	}

	const parts = value
		.split(",")
		.map((part) => part.trim())
		.filter(Boolean);

	return parts.length > 0 ? parts : undefined;
}

async function runOnce(
	protoDir: string,
	outDir: string,
	queryVerbs?: string[],
	mutationVerbs?: string[],
): Promise<void> {
	await runCodegen({
		protoDir,
		outDir,
		queryVerbs,
		mutationVerbs,
		onLog: (message) => {
			log(message);
		},
	});
}

async function main() {
	const argv = await yargs(hideBin(process.argv))
		.scriptName("proto-to-trpc")
		.usage("$0 --proto_dir=./proto --out=./src/gen")
		.option("proto_dir", {
			type: "string",
			demandOption: true,
			describe: "Directory containing .proto files",
		})
		.option("out", {
			type: "string",
			demandOption: true,
			describe: "Output directory for generated code",
		})
		.option("watch", {
			type: "boolean",
			default: false,
			describe: "Re-run codegen when .proto files change",
		})
		.option("query_verbs", {
			type: "string",
			describe:
				"Comma-separated list of verbs to treat as queries (default: Get,List)",
		})
		.option("mutation_verbs", {
			type: "string",
			describe:
				"Comma-separated list of verbs to treat as mutations (default: Create,Update,Delete)",
		})
		.strict()
		.help()
		.parse();

	const protoDir = argv.proto_dir as string;
	const outDir = argv.out as string;
	const watch = argv.watch as boolean;
	const queryVerbs = parseVerbs(argv.query_verbs);
	const mutationVerbs = parseVerbs(argv.mutation_verbs);

	if (!watch) {
		try {
			await runOnce(protoDir, outDir, queryVerbs, mutationVerbs);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Unknown error during codegen.";
			logError(message);
			process.exitCode = 1;
		}
		return;
	}

	const pattern = path.join(protoDir, "**/*.proto");
	const watcher = chokidar.watch(pattern, {
		ignoreInitial: false,
	});

	let running = false;
	let queued = false;

	const trigger = async () => {
		if (running) {
			queued = true;
			return;
		}

		running = true;
		log("Running codegen...");

		try {
			await runOnce(protoDir, outDir, queryVerbs, mutationVerbs);
			log("Codegen finished.");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Unknown error during codegen.";
			logError(message);
		} finally {
			running = false;
			if (queued) {
				queued = false;
				void trigger();
			}
		}
	};

	watcher.on("add", () => {
		void trigger();
	});

	watcher.on("change", () => {
		void trigger();
	});

	watcher.on("unlink", () => {
		void trigger();
	});

	watcher.on("error", (error) => {
		const message =
			error instanceof Error ? error.message : "Unknown watcher error.";
		logError(message);
	});

	log(`Watching ${pattern} for changes...`);
}

void main();
