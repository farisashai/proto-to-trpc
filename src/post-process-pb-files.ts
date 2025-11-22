import fs from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

/**
 * Post-processes generated *_pb.d.ts files to add type annotations to proto3 imports
 */
export async function postProcessPbFiles(connectDir: string): Promise<void> {
	const normalizedConnect = connectDir.replace(/[\\/]+$/, "");
	const pattern = `${normalizedConnect}/**/*_pb.d.ts`;
	const pbFiles = await fg(pattern, { absolute: true });

	for (const file of pbFiles) {
		let content = await fs.readFile(file, "utf8");

		// Replace: import { Message, proto3 } from "@bufbuild/protobuf";
		// With: import { Message, type proto3 } from "@bufbuild/protobuf";
		content = content.replace(
			/import\s+\{\s*Message,\s*proto3\s*\}\s*from\s+"@bufbuild\/protobuf";/g,
			'import { Message, type proto3 } from "@bufbuild/protobuf";',
		);

		await fs.writeFile(file, content, "utf8");
	}
}
