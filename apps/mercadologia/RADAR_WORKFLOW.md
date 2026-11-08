# Mercadologia weekly radar

Use the Site MCP tools; routine research updates go to the persistent D1 database and do not require republishing.

1. Call radar_status. It returns journal IDs, watchlist sources, prior scans and records.
2. Call sync_radar for all journal IDs in batches of up to three, with days=14 (use 60 for first initialization). Preserve source failures in the scan results.
3. Search the official sites of SSRN, MSI, Wharton, Stanford GSB, INSEAD, NBER, arXiv, SciELO and ACR. Search the past 14 days with overlap, using the last weekly scan to identify novelty. If few findings, widen to 60 days and label older discoveries clearly. Discover via indexes, then read original abstracts or institutional records.
4. Add or enrich up to 12 relevant studies using add_research, with stable DOI or source ID, original URL, publication date, sourceKey, short Portuguese summary (35–65 words), topic, method, limitations, basis consulted, and a cautious application hypothesis. Prefer diverse themes: services, retention, retail/channels, pricing, culture/brands, psychology, quantitative methods, sustainability, privacy, diffusion and AI. Do not fill the selection with AI papers or rank quality solely by journal prestige. Distinguish working papers, articles and institutional recaps. Never invent missing methods/results.
5. Record one weekly-editorial scan via record_radar_scan with a short digest and coverage for all nine watchlist sources. Use no-new when checked with no newly selected study; failed when inaccessible. Record verified source URLs/reasons and do not imply full coverage of blocked/paywalled content.
6. Read radar_status to verify persisted IDs, summaries and coverage. Report a compact digest with original links and the dashboard URL, including failures. Preserve the Site audience and existing records.

MCP writes require the authenticated Site owner. Source metadata can be read by the Site's current audience. Personal notes remain browser-local; public research is durable and shared by the dashboard. No credentials belong in source or schedule prompts.

## Unattended service access

If the Site plugin is unavailable, use the same hosted JSON-RPC tools over HTTPS POST to the returned Site live origin /api/update. Obtain the supported siwc_bypass_bearer_token with the native Sites get_site tool each run. Send it only to this Site, in OAI-Sites-Authorization: Bearer <token> and X-Radar-Service-Token: <token>. The public writer separately validates the service token against its protected runtime secret. Pass credentials via stdin/session memory, never command arguments, source files, logs or task text. A token mismatch must stop writes and be reported, not bypassed. The server also accepts authenticated owner identity for browser/plugin writes.

JSON-RPC body: {"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"radar_status","arguments":{}}}. Other tools use the same envelope. Parse result.content text as JSON. Before writing, verify source access via actual source requests; after writing, call radar_status and compare the IDs/summaries saved.
