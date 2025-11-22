import path from "node:path";
import { pathToFileURL } from "node:url";

import fg from "fast-glob";

import { writeFile } from "./utils/fs";

export interface ServiceInfo {
	name: string;
	file: string;
}

export interface EmitServiceRoutersOptions {
	connectDir: string;
	trpcDir: string;
	queryVerbs?: string[];
	mutationVerbs?: string[];
}

const DEFAULT_QUERY_VERBS = ["Get", "List"];
const DEFAULT_MUTATION_VERBS = ["Create", "Update", "Delete"];

function isQuery(name: string, queryVerbs: string[], mutationVerbs: string[]): boolean {
	if (queryVerbs.some((prefix) => name.startsWith(prefix))) return true;
	if (mutationVerbs.some((prefix) => name.startsWith(prefix))) return false;
	return false;
}

function trimExtension(filePath: string): string {
	return filePath.replace(/\.[cm]?[jt]sx?$/u, "");
}

export async function emitServiceRouters(
	options: EmitServiceRoutersOptions,
): Promise<ServiceInfo[]> {
	const { connectDir, trpcDir } = options;

	const normalizedConnect = connectDir.replace(/[\\/]+$/, "");
	const pattern = `${normalizedConnect}/**/*_connect.{js,cjs,mjs,ts,tsx}`;
	const connectFiles = await fg(pattern, { absolute: true });

	const services: ServiceInfo[] = [];

	const queryVerbs = options.queryVerbs && options.queryVerbs.length > 0
		? options.queryVerbs
		: DEFAULT_QUERY_VERBS;
	const mutationVerbs = options.mutationVerbs && options.mutationVerbs.length > 0
		? options.mutationVerbs
		: DEFAULT_MUTATION_VERBS;

	for (const file of connectFiles) {
		const moduleUrl = pathToFileURL(file).href;
		const moduleExports: Record<string, unknown> = await import(moduleUrl);

		for (const key of Object.keys(moduleExports)) {
			const svc = moduleExports[key] as any;
			if (
				svc &&
				typeof svc === "object" &&
				"typeName" in svc &&
				"methods" in svc
			) {
				const serviceName = key;
				const serviceBaseName = serviceName.replace(/Service$/u, "");
				const routerFile = path.join(
					trpcDir,
					"routers",
					`${serviceName}Router.ts`,
				);

				// Calculate relative path from the router file location to the connect file
				const routerDir = path.dirname(routerFile);
				const relPath = path.relative(routerDir, file).replace(/\\/g, "/");
				const connectImport = trimExtension(relPath);

				// Find the corresponding _pb file for message type imports
				const pbFile = file.replace(/_connect\.(js|ts|mjs|cjs)$/u, "_pb.$1");
				const pbRelPath = path.relative(routerDir, pbFile).replace(/\\/g, "/");
				const pbImport = trimExtension(pbRelPath);

				// Generate static procedure definitions and collect message types
				const procedures: string[] = [];
				const messageTypes = new Set<string>();
				const methods = Object.values(svc.methods) as any[];

				for (const method of methods) {
					const methodName = method.name;
					const procedureType = isQuery(methodName, queryVerbs, mutationVerbs) ? "query" : "mutation";

					// Get message type names from the method
					const inputTypeName = method.I?.typeName?.split('.').pop() || `${methodName}Request`;
					const outputTypeName = method.O?.typeName?.split('.').pop() || `${methodName}Response`;

					messageTypes.add(inputTypeName);
					messageTypes.add(outputTypeName);

					procedures.push(`\t\t${methodName}: t.procedure
\t\t\t.input(protobuf<${inputTypeName}>())
\t\t\t.output(protobuf<${outputTypeName}>())
\t\t\t.${procedureType}(async ({ input }) => client.${methodName}(input))`);
				}

				const messageTypeImports = Array.from(messageTypes).join(", ");

				const code = `import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { t, protobuf } from "../routerFactory";
import { ${serviceName} } from "${connectImport}.js";
import type { ${messageTypeImports} } from "${pbImport}.js";

export const ${serviceName}Router = (connectBaseUrl: string) => {
	const transport = createConnectTransport({ baseUrl: connectBaseUrl });
	const client = createClient(${serviceName}, transport);

	return t.router({
${procedures.join(",\n")}
	});
};
`;

				await writeFile(routerFile, code);
				services.push({
					name: serviceName,
					file: `./routers/${serviceName}Router`,
				});
			}
		}
	}

	return services;
}
