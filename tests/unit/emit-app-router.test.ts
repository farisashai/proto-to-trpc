import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ServiceInfo } from "../../src/emit-service-router";
import { emitAppRouter } from "../../src/emit-app-router";

describe("emitAppRouter", () => {
	it("emits appRouter.ts that wires all services", async () => {
		const tmpDir = await fs.mkdtemp(
			path.join(os.tmpdir(), "proto-to-trpc-app-"),
		);
		const trpcDir = path.join(tmpDir, "trpc");

		const services: ServiceInfo[] = [
			{ name: "ExampleService", file: "./routers/ExampleServiceRouter" },
		];

		await emitAppRouter(services, trpcDir);

		const appRouterPath = path.join(trpcDir, "appRouter.ts");
		const contents = await fs.readFile(appRouterPath, "utf8");

		expect(contents).toContain("createAppRouter");
		expect(contents).toContain("ExampleServiceRouter");
		expect(contents).toContain("export type AppRouter");
	});
});
