import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env, projectedCallCount } from './config/env.js';
import { PERSONAS } from './config/personas.js';
import { PRINCIPLES } from './config/principles.js';
import { assessRouter } from './routes/assess.js';
import { extractRouter } from './routes/extract.js';

export function createApp() {
  const app = express();

  // Render (and most PaaS hosts) sit behind a reverse proxy — without this,
  // every request looks like it comes from the proxy's IP, which would make
  // IP-based rate limiting (routes/assess.ts) useless. 1 = trust exactly one
  // hop, matching a single reverse proxy in front of the app.
  app.set('trust proxy', 1);

  app.use(helmet());

  // Falls back to wide-open when CORS_ORIGIN is unset (local dev, same-origin
  // deploys) — set CORS_ORIGIN to the deployed frontend's URL once frontend
  // and backend live on separate domains.
  app.use(cors(env.corsOrigin ? { origin: env.corsOrigin } : undefined));
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    const configured = env.provider === 'groq' ? Boolean(env.groqApiKey) : Boolean(env.anthropicApiKey);
    res.json({
      ok: true,
      provider: env.provider,
      configured,
      model: env.model,
      studentModel: env.studentModel,
      personas: PERSONAS.length,
      principles: PRINCIPLES.length,
      personasPerCall: env.personasPerCall,
      studentPasses: env.studentPasses,
      concurrency: env.concurrency,
      // Rough call count for the current config, so a misconfigured
      // .env shows up here before it shows up in a bill.
      projectedCallsPerAssessment: projectedCallCount(PERSONAS.length),
    });
  });

  // Exposed so the frontend can render persona detail and principle sources
  // without duplicating the registries.
  app.get('/api/personas', (_req, res) => res.json({ personas: PERSONAS }));
  app.get('/api/principles', (_req, res) => res.json({ principles: PRINCIPLES }));

  app.use('/api', assessRouter);
  app.use('/api', extractRouter);

  return app;
}
