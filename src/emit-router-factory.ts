import path from "node:path";

import { writeFile } from "./utils/fs";

export interface RouterFactoryOptions {
	queryVerbs?: string[];
	mutationVerbs?: string[];
}

const DEFAULT_QUERY_VERBS = ["Get", "List"];
const DEFAULT_MUTATION_VERBS = ["Create", "Update", "Delete"];

export async function emitRouterFactory(
	trpcDir: string,
	options?: RouterFactoryOptions,
): Promise<void> {
	const queryVerbs = JSON.stringify(
		options?.queryVerbs && options.queryVerbs.length > 0
			? options.queryVerbs
			: DEFAULT_QUERY_VERBS,
	);

	const mutationVerbs = JSON.stringify(
		options?.mutationVerbs && options.mutationVerbs.length > 0
			? options.mutationVerbs
			: DEFAULT_MUTATION_VERBS,
	);

	const code = `import { initTRPC } from "@trpc/server";
import type { AnyService, MethodInfoUnary, Client } from "@connectrpc/connect";

export const t = initTRPC.create();

const QUERY_PREFIXES = ${queryVerbs} as const;
const MUTATION_PREFIXES = ${mutationVerbs} as const;

function isQuery(name: string): boolean {
	if (QUERY_PREFIXES.some((prefix) => name.startsWith(prefix))) return true;
	if (MUTATION_PREFIXES.some((prefix) => name.startsWith(prefix))) return false;
	return false;
}

export function createServiceRouter<T extends AnyService>(
	service: T,
	client: Client<T>,
) {
	const procedures: Record<string, any> = {};

	// service.methods is an object, not an array - iterate over its values
	for (const method of Object.values(service.methods) as readonly MethodInfoUnary[]) {
		const name = method.name;
		const fn = (client[name as keyof Client<T>] as CallableFunction).bind(client);

		if (isQuery(name)) {
			procedures[name] = t.procedure
				.input(method.I)
				.output(method.O)
				.query(async ({ input }) => fn(input));
		} else {
			procedures[name] = t.procedure
				.input(method.I)
				.output(method.O)
				.mutation(async ({ input }) => fn(input));
		}
	}

	return t.router(procedures);
}
`;

	await writeFile(path.join(trpcDir, "routerFactory.ts"), code);
}
