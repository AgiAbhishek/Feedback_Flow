import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Use a single connection with longer timeouts to avoid rate limits
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1,
  min: 0,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle({ client: pool, schema });