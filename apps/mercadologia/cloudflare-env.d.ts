declare namespace Cloudflare {
  interface Env {
    RADAR_OWNER_EMAIL?: string;
    DB?: D1Database;
    RADAR_SERVICE_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
