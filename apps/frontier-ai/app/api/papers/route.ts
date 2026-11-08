import { isFrontierService } from "../../../lib/service-auth";
import { workspaceOwner } from "../../../lib/research-workspace";
import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { papers, researchScans } from "../../../db/schema";

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!workspaceOwner(request.headers) && !await isFrontierService(request.headers)) {
    return Response.json({ error: "Owner or service authorization required." }, { status: 401, headers });
  }
  try {
    const rows = await getDb().select().from(papers)
      .orderBy(desc(papers.relevanceScore), desc(papers.publishedAt));
    const [latestScan] = await getDb().select().from(researchScans).orderBy(desc(researchScans.runAt)).limit(1);
    return Response.json({
      latestScan: latestScan ? { runAt: latestScan.runAt, end: latestScan.windowEnd } : null,
      papers: rows.map((row) => ({
        id: row.id, title: row.title, date: row.publishedAt, source: row.lab,
        group: row.sourceGroup, region: row.region,
        topics: parseJson<string[]>(row.topicsJson, []), score: row.relevanceScore,
        landmark: row.landmark, url: row.canonicalUrl, summary: row.summaryPt,
        contribution: row.contributionPt, evidence: row.evidencePt,
        limitations: row.limitationsPt, verdict: row.verdict,
        authors: parseJson<string[]>(row.authorsJson, []),
        artifacts: parseJson<Record<string, string>[]>(row.artifactsJson, []),
        scores: { newness: row.newnessScore, evidence: row.evidenceScore, importance: row.importanceScore },
        status: row.status, lastVerifiedAt: row.lastVerifiedAt,
      })),
      storage: "Cloudflare D1",
    }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500, headers });
  }
}
