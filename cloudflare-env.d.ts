declare namespace Cloudflare {
  interface Env {
    AI?: Ai;
    DB?: D1Database;
    BUCKET?: R2Bucket;
    TAVILY_API_KEY?: string;
    AUTOMATION_SECRET?: string;
    GMAIL_CLIENT_ID?: string;
    GMAIL_CLIENT_SECRET?: string;
    GMAIL_REFRESH_TOKEN?: string;
    GMAIL_SENDER_EMAIL?: string;
    APP_URL?: string;
    ACCESS_CLIENT_ID?: string;
    ACCESS_CLIENT_SECRET?: string;
  }
}
