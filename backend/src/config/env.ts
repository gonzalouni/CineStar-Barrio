export interface EnvConfig {
  PORT: number;
  DB_HOST: string;
  DB_PORT: number;
  DB_SERVICE: string;
  ORACLE_OPS_USER: string;
  ORACLE_OPS_PASSWORD: string;
  ORACLE_ADMIN_USER: string;
  ORACLE_ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  JWT_REFRESH_EXPIRATION: string;
  NODE_ENV: string;
}

export const env: EnvConfig = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '1521', 10),
  DB_SERVICE: process.env.DB_SERVICE || 'XEPDB1',
  ORACLE_OPS_USER: process.env.ORACLE_OPS_USER || 'CINESTAR_OPS',
  ORACLE_OPS_PASSWORD: process.env.ORACLE_OPS_PASSWORD || 'OpsPass2024!',
  ORACLE_ADMIN_USER: process.env.ORACLE_ADMIN_USER || 'CINESTAR_ADMIN',
  ORACLE_ADMIN_PASSWORD: process.env.ORACLE_ADMIN_PASSWORD || 'AdminPass2024!',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-me',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '8h',
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '24h',
  NODE_ENV: process.env.NODE_ENV || 'development',
};
