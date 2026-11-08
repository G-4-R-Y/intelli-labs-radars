# Intelli Labs Radars

Research observatories for AI and marketing, with a shared field registry and a digest CLI. The observatories retain their individual catalogs, filters, source links, reading lists, toolboxes, and review queues.

| App | Feed | Intended access |
| --- | --- | --- |
| [Frontier Radar](apps/frontier-ai) | `GET /api/papers` | Owner-only, with authenticated service access |
| [Observatório de Mercadologia](apps/mercadologia) | `GET /api/radar` | Public research feed, owner-only collections and editing |

This repository holds source and database migrations. The original hosted Sites continue to own their databases, saved papers, reviews, and weekly schedules. The Frontier app in this repository starts with an empty catalog. Its private editorial material and deployment configuration belong in the running instance.

## Generate a digest

Node.js 22.13+ is sufficient for the digest. Point the registry's environment variables at the exact feed URLs for your instances. Keep authenticated feed URLs and credentials in your local environment or your scheduler's secret store.

```sh
# Default config reads the marketing feed URL from MARKETING_RADAR_FEED_URL.
npm run fields
mkdir -p digest-output
npm run --silent digest -- --format markdown > digest-output/weekly.md

# Also set FRONTIER_RADAR_FEED_URL and FRONTIER_RADAR_GATEWAY_TOKEN in your
# environment to include the existing owner-private Sites feed.
npm run --silent digest -- --include-private --format json > digest-output/private-weekly.json
```

The CLI defaults to the last seven UTC calendar dates, inclusive. Use `--since` and `--through` to pass an explicit window. An exact discovery date (`firstSeen`) takes precedence over publication date for inclusion. Entries retain the original title, source name, link, publication date, and available summary. DOI and arXiv URL variants are deduplicated within each field. Private fields require explicit opt-in. Keep their output private. The CLI reports failures by field and exits nonzero when any selected feed fails, while still emitting results from the others.

## Register another research field

A field needs a JSON feed with a `papers` array. Each record needs `title`, `source`, an HTTPS original `url`, and an ISO day in `date` or `firstSeen`. It may include `summary`, `status`, and both dates. For a standalone runner, the feed can come from any collector that emits this shape.

Add a definition to [config/fields.json](config/fields.json), or save one definition in a JSON file and use `npm run field:add -- <file>`. For example:

```json
{
  "id": "projection-mapping",
  "name": "Projection Mapping",
  "feedEnv": "PROJECTION_RADAR_FEED_URL",
  "visibility": "public",
  "limit": 6
}
```

The next invocation picks up the field without rebuilding either app. Set `enabled` to `false` to pause a field. For local-only configuration, copy `config/fields.json` to `config/fields.local.json` and set `RADARS_CONFIG=config/fields.local.json`. Use `gatewayTokenEnv` for an OpenAI Sites bypass token, `serviceTokenEnv` for `X-Radar-Service-Token`, or both if the host and application each require a token. Set `visibility` to `private` for a private feed and give it at least one authenticated access method. Feed requests refuse redirects.

## Run or deploy the apps

The apps are independent Vinext workers with separate pnpm lockfiles and D1 databases. From either app directory, run `pnpm install --frozen-lockfile` using the pinned pnpm version, then `pnpm build` or `pnpm dev`. Apply the SQL files in `drizzle/` in order to the app's own local D1 binding before using its data features. See the app README for local D1 and development authentication instructions.

For a new Sites deployment, set the new instance's project ID in that app's `.openai/hosting.json`. Configure `RADAR_OWNER_EMAIL` at runtime to enable owner features. For the loopback development mock described in the app README, use `seedy@sites.test` as the owner in local Worker settings. Set `RADAR_SERVICE_TOKEN` (Mercadologia) or `FRONTIER_UPDATE_TOKEN` (Frontier) as runtime secrets for unattended service access. Host Frontier privately. On other infrastructure, enforce a trusted authentication gateway that strips client-supplied identity headers before inserting verified ones. Use the review queue and update routes only through trusted owner or service access.

The CLI aggregates existing feeds. Discovery, editorial review, and scheduled writes stay with each field's collector. See [Mercadologia's update protocol](apps/mercadologia/RADAR_WORKFLOW.md) or the Frontier JSON-RPC tools at `/api/update` for integrations. Run `npm test` for the registry and digest tests.
