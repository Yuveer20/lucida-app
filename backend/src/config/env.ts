import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  groqApiKey: requireEnv("GROQ_API_KEY"),
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  port: Number(process.env.PORT ?? 3001),
};
