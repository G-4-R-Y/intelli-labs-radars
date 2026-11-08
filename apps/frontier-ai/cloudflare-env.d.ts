declare namespace Cloudflare {
  interface Env {
    RADAR_OWNER_EMAIL?: string;
    DB?: D1Database;
    FRONTIER_UPDATE_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
