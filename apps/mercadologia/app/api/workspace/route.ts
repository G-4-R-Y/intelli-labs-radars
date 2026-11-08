import { mutateWorkspace, workspaceOwner, workspaceRows } from "../../../lib/research-workspace";

const headers = { "Cache-Control": "private, no-store" };
export async function GET(request: Request) {
  if (!workspaceOwner(request.headers)) return Response.json({ error: "Entre como proprietário." }, { status: 401, headers });
  return Response.json({ records: await workspaceRows() }, { headers });
}

export async function POST(request: Request) {
  if (!workspaceOwner(request.headers)) return Response.json({ error: "Entre como proprietário." }, { status: 401, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin || !request.headers.get("content-type")?.startsWith("application/json")) {
    return Response.json({ error: "Origem inválida." }, { status: 403, headers });
  }
  try {
    await mutateWorkspace(await request.json());
    return Response.json({ saved: true }, { headers });
  } catch {
    return Response.json({ error: "Não foi possível salvar este registro." }, { status: 400, headers });
  }
}
