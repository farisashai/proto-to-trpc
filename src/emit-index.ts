import path from "node:path";

import { writeFile } from "./utils/fs";

export async function emitIndexFile(trpcDir: string): Promise<void> {
	const code = `export * from "./appRouter";
export * from "./routerFactory";
`;

	await writeFile(path.join(trpcDir, "index.ts"), code);
}
