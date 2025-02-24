import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok && res.status !== 404) {
    const contentType = res.headers.get('content-type');
    // Check if response is HTML instead of JSON
    if (contentType?.includes('text/html')) {
      throw new Error('Received HTML response instead of JSON. This may indicate a routing issue.');
    }

    try {
      const text = await res.text();
      // Try to parse as JSON first
      try {
        const json = JSON.parse(text);
        throw new Error(`${res.status}: ${json.message || text}`);
      } catch {
        // If not JSON, use text directly
        throw new Error(`${res.status}: ${text}`);
      }
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      ...data ? { "Content-Type": "application/json" } : {},
      // Add custom header to prevent Vite from intercepting
      "X-Custom-Route": "api"
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "X-Custom-Route": "api"
      }
    });

    if ((unauthorizedBehavior === "returnNull" && res.status === 401) || res.status === 404) {
      return null;
    }

    await throwIfResNotOk(res);
    return res.status === 204 ? null : res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 300000, // 5 minutes
      gcTime: 3600000, // 1 hour (renamed from cacheTime in v5)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});