interface Env {
  APP_URL: string;
  AUTOMATION_SECRET: string;
  ACCESS_CLIENT_ID?: string;
  ACCESS_CLIENT_SECRET?: string;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env) {
    const headers = new Headers({ authorization: `Bearer ${env.AUTOMATION_SECRET}` });
    if (env.ACCESS_CLIENT_ID && env.ACCESS_CLIENT_SECRET) {
      headers.set("CF-Access-Client-Id", env.ACCESS_CLIENT_ID);
      headers.set("CF-Access-Client-Secret", env.ACCESS_CLIENT_SECRET);
    }
    const response = await fetch(`${env.APP_URL.replace(/\/$/, "")}/api/automation/weekly`, {
      method: "POST",
      headers,
    });
    if (!response.ok) throw new Error(`IdeaTent weekly automation failed with ${response.status}`);
    console.log(JSON.stringify({ event: "weekly_automation_complete", result: await response.json() }));
  },
} satisfies ExportedHandler<Env>;
