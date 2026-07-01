import { Request, Response } from 'express';
import { getOpsConnection } from '../config/database';

export class SalasController {
  // GET /api/salas
  static async getAll(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT ID, NOMBRE, CAPACIDAD, ACTIVO, FECHA_CREACION FROM SALAS ORDER BY NOMBRE`
      );
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener salas' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/salas/:id
  static async getById(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT ID, NOMBRE, CAPACIDAD, ACTIVO, FECHA_CREACION FROM SALAS WHERE ID = :id`,
        { id: parseInt(req.params.id) }
      );
      const rows = result.rows as any[];
      if (!rows || rows.length === 0) {
        res.status(404).json({ error: 'Sala no encontrada' });
        return;
      }
      res.json(rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener sala' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/salas/:id/asientos
  static async getAsientos(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT ID, SALA_ID, FILA, NUMERO, TIPO, SECCION, ACTIVO 
         FROM ASIENTOS 
         WHERE SALA_ID = :salaId AND ACTIVO = 1
         ORDER BY FILA, NUMERO`,
        { salaId: parseInt(req.params.id) }
      );
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener asientos' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // POST /api/salas
  static async create(req: Request, res: Response): Promise<void> {
    const { nombre, capacidad } = req.body;
    let connection;

    try {
      if (!nombre || !capacidad) {
        res.status(400).json({ error: 'Nombre y capacidad son requeridos' });
        return;
      }

      connection = await getOpsConnection();
      const result = await connection.execute(
        `INSERT INTO SALAS (ID, NOMBRE, CAPACIDAD) 
         VALUES (SEQ_SALAS.NEXTVAL, :nombre, :capacidad)
         RETURNING ID INTO :id`,
        {
          nombre,
          capacidad,
          id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
        }
      );
      await connection.commit();
      const newId = (result.outBinds as any).id[0];
      res.status(201).json({ id: newId, message: 'Sala creada exitosamente' });
    } catch (error: any) {
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al crear sala' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // PUT /api/salas/:id
  static async update(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const { nombre, capacidad } = req.body;
    let connection;

    try {
      connection = await getOpsConnection();
      await connection.execute(
        `UPDATE SALAS SET NOMBRE = :nombre, CAPACIDAD = :capacidad WHERE ID = :id`,
        { nombre, capacidad, id }
      );
      await connection.commit();
      res.json({ message: 'Sala actualizada exitosamente' });
    } catch (error: any) {
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al actualizar sala' });
    } finally {
      if (connection) await connection.close();
    }
  }
}
