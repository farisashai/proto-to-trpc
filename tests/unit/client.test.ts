import { describe, expect, it } from "vitest";

import { createTrpcClient } from "../../src/client";

describe("createTrpcClient", () => {
	it("creates a tRPC client with default URL", () => {
		const client = createTrpcClient();

		expect(client).toBeDefined();
		// The client is a Proxy, so we can't easily inspect its internals,
		// but we can verify it was created without throwing
	});

	it("creates a tRPC client with custom URL", () => {
		const client = createTrpcClient({ url: "http://localhost:3000/trpc" });

		expect(client).toBeDefined();
	});

	it("creates a tRPC client with empty options", () => {
		const client = createTrpcClient({});

		expect(client).toBeDefined();
	});
});
