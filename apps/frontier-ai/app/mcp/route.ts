import { desc, eq, or } from "drizzle-orm";
import { getDb } from "../../db";
import { papers, researchScans } from "../../db/schema";

import { reviewOperation, reviewTools, workspaceOwner } from "../../lib/research-workspace";

const MCP_VERSION = "2026-07-28";

type RpcRequest = { id?: string | number | null; method?: string; params?: Record<string, unknown> };
type PaperInput = {
  id: string; canonical_url: string; title: string; published_at: string;
  authors?: string[]; lab?: string; region?: string; updated_at?: string | null;
  venue?: string | null; source_group?: string; summary_pt?: string;
  contribution_pt?: string; evidence_pt?: string; limitations_pt?: string;
  verdict?: "obrigatório" | "acompanhar de perto" | "acompanhar, não canonizar ainda";
  topics?: string[]; artifacts?: Record<string, string>[];
  benchmarks?: Record<string, unknown>[];
  scores?: { newness?: number; evidence?: number; importance?: number; relevance?: number };
  landmark?: boolean; status?: "candidate" | "tracked" | "canonical";
  last_verified_at?: string; raw_metadata?: Record<string, unknown>;
};

const tools = [
  ...reviewTools,
  { name: "research_status", description: "Read recent recorded scan windows, coverage and dates.", inputSchema: {type: "object", properties: {}, additionalProperties: false} },
  {
    name: "list_research_items",
    description: "List papers and distilled assessments stored in the Frontier Radar database.",
    inputSchema: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 100 } }, additionalProperties: false },
  },
  {
    name: "upsert_research_items",
    description: "Owner-only: add or update deduplicated AI research records and Portuguese distillations.",
    inputSchema: {
      type: "object", required: ["items"], additionalProperties: false,
      properties: { items: { type: "array", minItems: 1, maxItems: 25, items: {
        type: "object", required: ["id", "canonical_url", "title", "published_at"], additionalProperties: false,
        properties: {
          id: { type: "string" }, canonical_url: { type: "string" }, title: { type: "string" }, published_at: { type: "string" },
          authors: { type: "array", items: { type: "string" } }, lab: { type: "string" }, region: { type: "string" },
          updated_at: { type: ["string", "null"] }, venue: { type: ["string", "null"] }, source_group: { type: "string" },
          summary_pt: { type: "string" }, contribution_pt: { type: "string" }, evidence_pt: { type: "string" },
          limitations_pt: { type: "string" }, verdict: { type: "string" }, topics: { type: "array", items: { type: "string" } },
          artifacts: { type: "array", items: { type: "object" } }, benchmarks: { type: "array", items: { type: "object" } },
          scores: { type: "object" }, landmark: { type: "boolean" }, status: { type: "string" },
          last_verified_at: { type: "string" }, raw_metadata: { type: "object" }
        }
      } } }
    }
  },
  {
    name: "record_research_scan",
    description: "Owner-only: record provenance and counts for a completed research scan.",
    inputSchema: {
      type: "object", required: ["id", "sources", "found_count", "added_count", "updated_count"], additionalProperties: false,
      properties: {
        id: { type: "string" }, window_start: { type: ["string", "null"] }, window_end: { type: ["string", "null"] },
        sources: { type: "array", items: { type: "string" } }, found_count: { type: "integer" },
        added_count: { type: "integer" }, updated_count: { type: "integer" }, notes: { type: "string" }
      }
    }
  }
];

function response(id: RpcRequest["id"], value: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result: value });
}
function rpcError(id: RpcRequest["id"], code: number, message: string) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}
function toolText(value: unknown, isError = false) {
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value) }], ...(isError ? { isError: true } : {}) };
}
function score(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : 0;
}

async function callTool(request: Request, name: string, args: Record<string, unknown>, service: boolean) {
  if (!service && !workspaceOwner(request.headers)) {
    return toolText("Owner authentication is required for this operation.", true);
  }
  const db = getDb();
  if (name === "list_research_items") {
    const limit = Math.max(1, Math.min(100, Number(args.limit ?? 50)));
    const rows = await db.select().from(papers).orderBy(desc(papers.relevanceScore), desc(papers.publishedAt)).limit(limit);
    return toolText({ count: rows.length, items: rows });
  }

  if (name === "research_status") {
    return toolText({ scans: await db.select().from(researchScans).orderBy(desc(researchScans.runAt)).limit(12) });
  }
  if (reviewTools.some(tool => tool.name === name)) return toolText(await reviewOperation(name, args));

  if (name === "upsert_research_items") {
    const items = Array.isArray(args.items) ? (args.items as PaperInput[]) : [];
    if (!items.length || items.length > 25) return toolText("items must contain 1–25 records", true);
    let created = 0;
    let updated = 0;
    for (const item of items) {
      if (!item.id || !item.canonical_url || !item.title || !item.published_at || new URL(item.canonical_url).protocol !== "https:") {
        return toolText("Each item requires id, canonical_url, title, and published_at", true);
      }
      const exists = await db.select({ id: papers.id }).from(papers).where(or(eq(papers.id, item.id), eq(papers.canonicalUrl, item.canonical_url))).limit(1);
      const values = {
        id: exists[0]?.id ?? item.id, canonicalUrl: item.canonical_url, title: item.title,
        authorsJson: JSON.stringify(item.authors ?? []), lab: item.lab ?? "", region: item.region ?? "global",
        publishedAt: item.published_at, updatedAt: item.updated_at ?? null, venue: item.venue ?? null,
        sourceGroup: item.source_group ?? "paper", summaryPt: item.summary_pt ?? "",
        contributionPt: item.contribution_pt ?? "", evidencePt: item.evidence_pt ?? "",
        limitationsPt: item.limitations_pt ?? "", verdict: item.verdict ?? "acompanhar de perto",
        topicsJson: JSON.stringify(item.topics ?? []), artifactsJson: JSON.stringify(item.artifacts ?? []),
        benchmarksJson: JSON.stringify(item.benchmarks ?? []), newnessScore: score(item.scores?.newness),
        evidenceScore: score(item.scores?.evidence), importanceScore: score(item.scores?.importance),
        relevanceScore: score(item.scores?.relevance), landmark: item.landmark ?? false,
        status: item.status ?? "candidate", lastVerifiedAt: item.last_verified_at ?? new Date().toISOString(),
        rawMetadataJson: JSON.stringify(item.raw_metadata ?? {}),
      };
      await db.insert(papers).values(values).onConflictDoUpdate({ target: papers.id, set: values });
      exists.length ? updated++ : created++;
    }
    return toolText({ created, updated, total: items.length });
  }

  if (name === "record_research_scan") {
    const id = String(args.id ?? "").trim();
    if (!id) return toolText("id is required", true);
    const values = {
      id, windowStart: typeof args.window_start === "string" ? args.window_start : null,
      windowEnd: typeof args.window_end === "string" ? args.window_end : null,
      sourcesJson: JSON.stringify(Array.isArray(args.sources) ? args.sources : []),
      foundCount: Number(args.found_count ?? 0), addedCount: Number(args.added_count ?? 0),
      updatedCount: Number(args.updated_count ?? 0), notes: String(args.notes ?? ""),
    };
    await db.insert(researchScans).values(values).onConflictDoUpdate({ target: researchScans.id, set: values });
    return toolText({ recorded: true, id });
  }
  return toolText(`Unknown tool: ${name}`, true);
}

export async function handleRpc(request: Request, service = false) {
  let rpc: RpcRequest;
  try { rpc = (await request.json()) as RpcRequest; }
  catch { return rpcError(null, -32700, "Parse error"); }
  if (rpc.method === "server/discover") return response(rpc.id, { supportedVersions: [MCP_VERSION], capabilities: { tools: {} } });
  if (rpc.method === "tools/list") return response(rpc.id, { tools });
  if (rpc.method === "tools/call") {
    const params = rpc.params ?? {};
    try { return response(rpc.id, await callTool(request, String(params.name ?? ""), (params.arguments ?? {}) as Record<string, unknown>, service)); }
    catch (error) { return response(rpc.id, toolText(error instanceof Error ? error.message : "Unexpected tool error", true)); }
  }
  return rpcError(rpc.id, -32601, "Method not found");
}

export async function POST(request: Request) { return handleRpc(request); }
