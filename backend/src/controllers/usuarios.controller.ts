import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getOpsConnection } from '../config/database';
import { CreateUsuarioDTO } from '../types';

export class UsuariosController {
  // GET /api/usuarios
  static async getAll(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT ID, USERNAME, NOMBRE_COMPLETO, ROL, ACTIVO, FECHA_CREACION, FECHA_ACTUALIZACION
         FROM USUARIOS ORDER BY NOMBRE_COMPLETO`
      );
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener usuarios' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // POST /api/usuarios (RF-20)
  static async create(req: Request, res: Response): Promise<void> {
    const { username, password, nombre_completo, rol }: CreateUsuarioDTO = req.body;
    let connection;

    try {
      if (!username || !password || !nombre_completo || !rol) {
        res.status(400).json({ error: 'Todos los campos son requeridos' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      connection = await getOpsConnection();
      const result = await connection.execute(
        `INSERT INTO USUARIOS (ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, ROL)
         VALUES (SEQ_USUARIOS.NEXTVAL, :username, :password_hash, :nombre_completo, :rol)
         RETURNING ID INTO :id`,
        {
          username,
          password_hash: passwordHash,
          nombre_completo,
          rol,
          id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
        }
      );
      await connection.commit();
      const newId = (result.outBinds as any).id[0];
      res.status(201).json({ id: newId, message: 'Usuario creado exitosamente' });
    } catch (error: any) {
      if (connection) await connection.rollback();
      if (error.errorNum === 1) {
        res.status(409).json({ error: 'El nombre de usuario ya existe' });
        return;
      }
      res.status(500).json({ error: 'Error al crear usuario' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // PUT /api/usuarios/:id (RF-20)
  static async update(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const { nombre_completo, rol, password, activo } = req.body;
    let connection;

    try {
      connection = await getOpsConnection();

      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await connection.execute(
          `UPDATE USUARIOS SET NOMBRE_COMPLETO = :nombre_completo, ROL = :rol, 
           PASSWORD_HASH = :password_hash, ACTIVO = :activo, FECHA_ACTUALIZACION = CURRENT_TIMESTAMP
           WHERE ID = :id`,
          { nombre_completo, rol, password_hash: passwordHash, activo: activo ?? 1, id }
        );
      } else {
        await connection.execute(
          `UPDATE USUARIOS SET NOMBRE_COMPLETO = :nombre_completo, ROL = :rol, 
           ACTIVO = :activo, FECHA_ACTUALIZACION = CURRENT_TIMESTAMP
           WHERE ID = :id`,
          { nombre_completo, rol, activo: activo ?? 1, id }
        );
      }

      await connection.commit();
      res.json({ message: 'Usuario actualizado exitosamente' });
    } catch (error: any) {
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al actualizar usuario' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // PUT /api/usuarios/:id/toggle — Activar/Desactivar (RF-20)
  static async toggle(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    let connection;

    try {
      connection = await getOpsConnection();
      await connection.execute(
        `UPDATE USUARIOS SET ACTIVO = CASE WHEN ACTIVO = 1 THEN 0 ELSE 1 END, 
         FECHA_ACTUALIZACION = CURRENT_TIMESTAMP
         WHERE ID = :id`,
        { id }
      );
      await connection.commit();
      res.json({ message: 'Estado del usuario actualizado' });
    } catch (error: any) {
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al cambiar estado del usuario' });
    } finally {
      if (connection) await connection.close();
    }
  }
}
