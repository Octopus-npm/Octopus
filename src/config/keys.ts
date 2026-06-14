import dotenv from "dotenv";
dotenv.config();

function require_env(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Missing required env variable: ${key}`);
    console.error(`Add it to your .env file and restart.`);
    process.exit(1);
  }
  return value;
}

export const config = {
  groq: {
    apiKey: require_env("GROQ_API_KEY"),
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  },
  gmail: {
    user: process.env.GMAIL_USER ?? "",
    appPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  },
};