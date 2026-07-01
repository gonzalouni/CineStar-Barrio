import bcrypt from 'bcryptjs';
import { getOpsConnection } from '../config/database';

export async function seedUsers(): Promise<void> {
  let connection;
  try {
    connection = await getOpsConnection();

    // Check if admin user exists
    const result = await connection.execute(
      `SELECT COUNT(*) AS CNT FROM USUARIOS WHERE USERNAME = 'admin'`
    );
    const count = (result.rows as any[])[0].CNT;

    if (count === 0) {
      console.log('🌱 Seeding default users...');

      const adminHash = await bcrypt.hash('admin123', 10);
      const operadorHash = await bcrypt.hash('operador123', 10);

      // Admin user
      await connection.execute(
        `INSERT INTO USUARIOS (ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, ROL, ACTIVO)
         VALUES (SEQ_USUARIOS.NEXTVAL, 'admin', :hash, 'Administrador General', 'ADMIN', 1)`,
        { hash: adminHash }
      );

      // Operator 1
      await connection.execute(
        `INSERT INTO USUARIOS (ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, ROL, ACTIVO)
         VALUES (SEQ_USUARIOS.NEXTVAL, 'operador1', :hash, 'Juan Pérez - Taquilla 1', 'OPERADOR', 1)`,
        { hash: operadorHash }
      );

      // Operator 2
      await connection.execute(
        `INSERT INTO USUARIOS (ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, ROL, ACTIVO)
         VALUES (SEQ_USUARIOS.NEXTVAL, 'operador2', :hash, 'María García - Taquilla 2', 'OPERADOR', 1)`,
        { hash: operadorHash }
      );

      await connection.commit();
      console.log('✅ Default users created (admin/admin123, operador1/operador123, operador2/operador123)');
    } else {
      console.log('👤 Users already exist, skipping seed');
    }
  } catch (error: any) {
    console.error('Error seeding users:', error.message);
    if (connection) await connection.rollback();
  } finally {
    if (connection) await connection.close();
  }
}
