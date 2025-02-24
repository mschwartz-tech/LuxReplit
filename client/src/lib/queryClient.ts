import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok && res.status !== 404) {
    const contentType = res.headers.get('content-type');

    try {
      const text = await res.text();
      // Check for HTML content in response
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error('Received HTML response instead of JSON. Please try again.');
      }

      // Try to parse as JSON
      try {
        const json = JSON.parse(text);
        throw new Error(json.message || text);
      } catch {
        throw new Error(text);
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
  // Add timestamp to prevent caching
  const timestamp = new Date().getTime();
  const urlWithTimestamp = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`;

  const res = await fetch(urlWithTimestamp, {
    method,
    headers: {
      ...data ? { "Content-Type": "application/json" } : {},
      "Accept": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "X-Custom-Route": "api",
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
    const timestamp = new Date().getTime();
    const url = `${queryKey[0]}${queryKey[0].toString().includes('?') ? '&' : '?'}_t=${timestamp}`;

    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "X-Custom-Route": "api",
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
      staleTime: 300000,
      gcTime: 3600000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});