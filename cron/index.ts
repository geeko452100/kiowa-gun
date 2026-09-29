interface Env {
  TARGET_URL: string;
  CRON_SECRET: string;
}

const ENDPOINTS = [
  "/api/cron/renewal-reminders",
  "/api/cron/nra-check",
  "/api/cron/renewal-termination",
];

export default {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    for (const path of ENDPOINTS) {
      const res = await fetch(`${env.TARGET_URL}${path}`, {
        method: "POST",
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      });
      if (!res.ok) {
        console.error(`Cron call to ${path} failed`, res.status, await res.text());
      }
    }
  },
};
