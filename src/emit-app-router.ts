import path from "node:path";

import type { ServiceInfo } from "./emit-service-router";
import { writeFile } from "./utils/fs";

export async function emitAppRouter(
	services: ServiceInfo[],
	trpcDir: string,
): Promise<void> {
	const imports = services
		.map(
			(service) => `import { ${service.name}Router } from "${service.file}";`,
		)
		.join("\n");

	const fields = services
		.map((service) => {
			const stem = service.name.replace(/Service$/u, "");
			return `\t\t${stem}: ${service.name}Router(connectBaseUrl)`;
		})
		.join(",\n");

	const code = `import { t } from "./routerFactory";
${imports}

export function createAppRouter(connectBaseUrl: string) {
	return t.router({
${fields}
	});
}

export type AppRouter = ReturnType<typeof createAppRouter>;
`;

	await writeFile(path.join(trpcDir, "appRouter.ts"), code);
}
