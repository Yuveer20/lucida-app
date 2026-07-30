import express from "express";
import cors from "cors";
import { echoRouter } from "./routes/echo.js";
import { assessRouter } from "./routes/assess.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/echo", echoRouter);
  app.use("/api/assess", assessRouter);

  return app;
}
