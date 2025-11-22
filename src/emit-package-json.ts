import path from "node:path";

import { writeFile } from "./utils/fs";

/**
 * Emits a package.json file in the output directory to mark generated files as ES modules
 */
export async function emitPackageJson(outDir: string): Promise<void> {
	const packageJson = {
		type: "module",
	};

	const content = JSON.stringify(packageJson, null, "\t");
	await writeFile(path.join(outDir, "package.json"), content);
}
