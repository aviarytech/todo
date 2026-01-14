import { query } from "convex/server";
import { v } from "convex/values";

/**
 * Example query function
 */
export const example = query({
  args: {},
  handler: async () => {
    return { message: "Hello from Convex!" };
  },
});
