import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[lucida] API listening on http://localhost:${env.port} — provider: ${env.provider}, model: ${env.model}`);

  const configured = env.provider === 'groq' ? env.groqApiKey : env.anthropicApiKey;
  if (!configured) {
    const missing = env.provider === 'groq' ? 'GROQ_API_KEY' : 'ANTHROPIC_API_KEY';
    // eslint-disable-next-line no-console
    console.warn(`[lucida] ${missing} is not set — /api/assess will return 500 until it is.`);
  }
});
