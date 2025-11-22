import fs from "node:fs/promises";
import path from "node:path";

export async function ensureDir(dirPath: string): Promise<void> {
	await fs.mkdir(dirPath, { recursive: true });
}

export async function writeFile(
	filePath: string,
	contents: string,
): Promise<void> {
	const dir = path.dirname(filePath);
	await ensureDir(dir);
	await fs.writeFile(filePath, contents, "utf8");
}
