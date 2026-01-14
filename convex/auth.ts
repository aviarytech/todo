import { convexAuth } from "convex/server";
import { httpRouter } from "convex/server";
import { auth } from "./_generated/server";

const http = httpRouter();

auth.useHttpAuth(http);

export default http;
