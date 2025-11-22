import fg from "fast-glob";

export async function discoverProtoFiles(dir: string): Promise<string[]> {
	const normalized = dir.replace(/\/$/, "");
	return fg(`${normalized}/**/*.proto`, { absolute: true });
}
