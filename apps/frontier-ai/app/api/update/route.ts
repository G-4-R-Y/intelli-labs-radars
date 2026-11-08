import { handleRpc } from "../../mcp/route";
import { isFrontierService } from "../../../lib/service-auth";
import { workspaceOwner } from "../../../lib/research-workspace";

export async function POST(request: Request) {
  if (workspaceOwner(request.headers)) return handleRpc(request);
  if (!await isFrontierService(request.headers)) {
    return new Response("Service authorization required", { status: 403 });
  }
  return handleRpc(request, true);
}
