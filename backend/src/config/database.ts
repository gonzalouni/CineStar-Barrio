import oracledb from 'oracledb';
import { env } from './env';

// Use thin mode (no Oracle client needed)
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [ oracledb.CLOB ];
oracledb.autoCommit = false; // We manage transactions explicitly

let opsPool: oracledb.Pool | null = null;
let adminPool: oracledb.Pool | null = null;

export async function initDatabase(): Promise<void> {
  const connectString = `${env.DB_HOST}:${env.DB_PORT}/${env.DB_SERVICE}`;

  console.log(`🔌 Connecting to Oracle at ${connectString}...`);

  // Pool for operational schema (CINESTAR_OPS)
  opsPool = await oracledb.createPool({
    user: env.ORACLE_OPS_USER,
    password: env.ORACLE_OPS_PASSWORD,
    connectString,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1,
  });
  console.log('✅ OPS pool created');

  // Pool for admin/audit schema (CINESTAR_ADMIN)
  adminPool = await oracledb.createPool({
    user: env.ORACLE_ADMIN_USER,
    password: env.ORACLE_ADMIN_PASSWORD,
    connectString,
    poolMin: 1,
    poolMax: 5,
    poolIncrement: 1,
  });
  console.log('✅ ADMIN pool created');
}

export async function getOpsConnection(): Promise<oracledb.Connection> {
  if (!opsPool) {
    throw new Error('OPS database pool not initialized');
  }
  return opsPool.getConnection();
}

export async function getAdminConnection(): Promise<oracledb.Connection> {
  if (!adminPool) {
    throw new Error('ADMIN database pool not initialized');
  }
  return adminPool.getConnection();
}

export async function closeDatabase(): Promise<void> {
  if (opsPool) {
    await opsPool.close(0);
    console.log('OPS pool closed');
  }
  if (adminPool) {
    await adminPool.close(0);
    console.log('ADMIN pool closed');
  }
}
