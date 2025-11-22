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

		const relPath = path.relative(trpcDir, file).replace(/\\/g, "/");
		const baseImport = trimExtension(relPath);
		const connectImport = baseImport;
		const connectWebImport = baseImport.replace("_connect", "_connectweb");

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

				const code = `import { createServiceRouter } from "../routerFactory";
import { ${serviceName} } from "${connectImport}";
import { create${serviceBaseName}Client } from "${connectWebImport}";

export const ${serviceName}Router = (connectBaseUrl: string) =>
  createServiceRouter(
    ${serviceName},
    create${serviceBaseName}Client({ baseUrl: connectBaseUrl })
  );
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
