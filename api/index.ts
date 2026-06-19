import type { IncomingMessage, ServerResponse } from "node:http";
import app from "@workspace/api-server/app";

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
