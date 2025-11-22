import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["tests/**/*.test.ts"],
		environment: "node",
		pool: "forks",
		testTimeout: 30000, // 30 seconds - protoc operations can be slow
	},
});
