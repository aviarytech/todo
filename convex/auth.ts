import { query, getAuthToken } from "./_generated/server.js";

export const getCurrentUser = query({
  handler: async (ctx) => {
    const token = await getAuthToken(ctx);
    if (!token) {
      return null;
    }
    // Token is present, indicating user is authenticated via Clerk
    // In a production app, you would decode the Clerk JWT token here
    // and fetch user info from your user table
    return {
      authenticated: true,
    };
  },
});
