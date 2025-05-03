/**
 * API helper to handle different environments (local vs Netlify)
 */

// Check if we're running in production (Netlify)
const isProduction = import.meta.env.PROD;

/**
 * Get the proper API endpoint URL based on the environment
 * 
 * - In development, use /api/... paths
 * - In production (Netlify), use /.netlify/functions/api
 * 
 * @param endpoint The API endpoint path
 * @returns The full URL for the API endpoint
 */
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  
  if (isProduction) {
    // In production (Netlify), use the serverless function
    // Map /api/messages to /.netlify/functions/api
    if (cleanEndpoint.startsWith('api/')) {
      // Extract the specific endpoint (e.g., "messages" from "api/messages")
      const specificEndpoint = cleanEndpoint.substring(4); // Remove "api/"
      return `/.netlify/functions/api?endpoint=${specificEndpoint}`;
    }
    return `/.netlify/functions/${cleanEndpoint}`;
  }
  
  // In development, use the regular API endpoint
  return `/${cleanEndpoint}`;
};

/**
 * Make an API request with consistent handling across environments
 * 
 * @param method HTTP method
 * @param endpoint API endpoint
 * @param data Optional request body data
 * @returns Response from the API
 */
export async function apiRequest(
  method: string,
  endpoint: string,
  data?: unknown | undefined,
): Promise<Response> {
  const url = getApiUrl(endpoint);
  
  console.log(`[API] ${method} request to ${url}`, data ? { data } : '');
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[API] Error ${res.status}: ${text}`, { endpoint, method });
    throw new Error(`${res.status}: ${text}`);
  }
  
  return res;
} 