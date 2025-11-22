import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";

export interface TrpcClientOptions {
	url?: string;
}

export function createTrpcClient<TRouter extends AnyRouter>(
	options: TrpcClientOptions = {},
) {
	const url = options.url ?? "/api/trpc";

	// The concrete link type is not important for consumers of this helper;
	// we explicitly hide the internal generic wiring from the public surface.
	const link = httpBatchLink({ url } as unknown as Parameters<
		typeof httpBatchLink
	>[0]);

	return createTRPCProxyClient<TRouter>({
		links: [link],
	});
}
