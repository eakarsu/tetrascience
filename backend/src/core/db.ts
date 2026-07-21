import path from 'path';
import dotenv from 'dotenv';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
export const db = new Pool({ connectionString: process.env.DATABASE_URL, max: Number(process.env.DB_POOL_MAX || 10), idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
export type DbClient = Pick<PoolClient, 'query'>;
export async function one<T extends QueryResultRow>(client: DbClient, sql: string, values: unknown[], code: string, message: string): Promise<T> {
  const result: QueryResult<T> = await client.query(sql, values);
  if (!result.rows[0]) throw new DomainError(404, code, message);
  return result.rows[0];
}
import { DomainError } from './domain';
