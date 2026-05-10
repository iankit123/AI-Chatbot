import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const peek = res.clone();
    const raw = ((await peek.text()) || res.statusText).slice(0, 800);
    let detail = raw;
    try {
      detail = JSON.stringify(JSON.parse(raw));
    } catch {
      /* keep raw snippet (e.g. HTML error page) */
    }
    throw new Error(`${res.status}: ${detail}`);
  }
}

// Get the base URL for API requests
function getApiBaseUrl() {
  // In production, use the deployed URL
  if (import.meta.env.PROD) {
    return '';
  }
  // In development, the Vite proxy handles requests, so use a relative path
  return '';
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Construct the full URL with appropriate base
  const fullUrl = `${getApiBaseUrl()}${url}`;

  console.log(`[apiRequest] ${method} ${fullUrl}`);
  if (data) {
    console.log('[apiRequest] Request data:', JSON.stringify(data, null, 2));
  }
  
  try {
    // Initialize headers with proper type
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    
    // Add Content-Type header only if there's data
    if (data) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: 'include',
      mode: 'cors',
      cache: 'no-cache',
    });

    console.log(`[apiRequest] Response status: ${res.status} ${res.statusText}`);

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error('[apiRequest] Network Error: Failed to fetch. This is often a CORS issue. Check the server logs for preflight request details.');
    } else {
      console.error('[apiRequest] Error making request:', error);
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const fullUrl = `${getApiBaseUrl()}${url}`;
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
