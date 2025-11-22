import { defineConfig } from "tsup";

export default defineConfig([
	{
		entry: ["src/index.ts"],
		format: ["esm"],
		dts: true,
		sourcemap: true,
		clean: true,
		outDir: "dist",
		outExtension: () => ({ js: ".mjs" }),
	},
	{
		entry: ["src/cli.ts"],
		format: ["esm"],
		dts: false,
		sourcemap: true,
		clean: false,
		outDir: "dist",
		outExtension: () => ({ js: ".mjs" }),
		banner: {
			js: "#!/usr/bin/env node",
		},
	},
]);
