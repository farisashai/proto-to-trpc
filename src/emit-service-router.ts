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

	for (const file of connectFiles) {
		const moduleUrl = pathToFileURL(file).href;
		const moduleExports: Record<string, unknown> = await import(moduleUrl);

		for (const key of Object.keys(moduleExports)) {
			const svc = moduleExports[key];
			if (
				svc &&
				typeof svc === "object" &&
				"typeName" in (svc as Record<string, unknown>) &&
				"methods" in (svc as Record<string, unknown>)
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

				const code = `import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { createServiceRouter } from "../routerFactory";
import { ${serviceName} } from "${connectImport}.js";

export const ${serviceName}Router = (connectBaseUrl: string) => {
	const transport = createConnectTransport({ baseUrl: connectBaseUrl });
	const client = createClient(${serviceName}, transport);
	return createServiceRouter(${serviceName}, client);
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
