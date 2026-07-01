import { Request, Response } from 'express';
import { getOpsConnection } from '../config/database';
import { CreateFuncionDTO } from '../types';

export class FuncionesController {
  // GET /api/funciones
  static async getAll(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const { pelicula_id, sala_id, fecha, estado } = req.query;

      let query = `
        SELECT f.ID, f.PELICULA_ID, f.SALA_ID, f.FECHA, f.HORA_INICIO, f.HORA_FIN, 
               f.PRECIO, f.ESTADO, f.FECHA_CREACION,
               p.TITULO AS PELICULA_TITULO, p.DURACION_MIN, p.CLASIFICACION, p.GENERO,
               s.NOMBRE AS SALA_NOMBRE
        FROM FUNCIONES f
        JOIN PELICULAS p ON f.PELICULA_ID = p.ID
        JOIN SALAS s ON f.SALA_ID = s.ID
        WHERE 1=1
      `;
      const params: any = {};

      if (pelicula_id) {
        query += ` AND f.PELICULA_ID = :pelicula_id`;
        params.pelicula_id = parseInt(pelicula_id as string);
      }
      if (sala_id) {
        query += ` AND f.SALA_ID = :sala_id`;
        params.sala_id = parseInt(sala_id as string);
      }
      if (fecha) {
        query += ` AND TRUNC(f.FECHA) = TO_DATE(:fecha, 'YYYY-MM-DD')`;
        params.fecha = fecha;
      }
      if (estado) {
        query += ` AND f.ESTADO = :estado`;
        params.estado = estado;
      }

      query += ` ORDER BY f.FECHA, f.HORA_INICIO`;

      const result = await connection.execute(query, params);
      res.json(result.rows || []);
    } catch (error: any) {
      console.error('Error getting funciones:', error);
      res.status(500).json({ error: 'Error al obtener funciones' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/funciones/:id
  static async getById(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT f.ID, f.PELICULA_ID, f.SALA_ID, f.FECHA, f.HORA_INICIO, f.HORA_FIN,
                f.PRECIO, f.ESTADO, f.FECHA_CREACION,
                p.TITULO AS PELICULA_TITULO, p.DURACION_MIN, p.CLASIFICACION, p.GENERO, p.SINOPSIS,
                s.NOMBRE AS SALA_NOMBRE, s.CAPACIDAD AS SALA_CAPACIDAD
         FROM FUNCIONES f
         JOIN PELICULAS p ON f.PELICULA_ID = p.ID
         JOIN SALAS s ON f.SALA_ID = s.ID
         WHERE f.ID = :id`,
        { id: parseInt(req.params.id) }
      );
      const rows = result.rows as any[];
      if (!rows || rows.length === 0) {
        res.status(404).json({ error: 'Función no encontrada' });
        return;
      }
      res.json(rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener función' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/funciones/:id/asientos — Mapa de asientos con estado (RF-05, RF-22, RF-23)
  static async getAsientosStatus(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const funcionId = parseInt(req.params.id);

      // Get function info first
      const funcResult = await connection.execute(
        `SELECT f.SALA_ID, s.NOMBRE AS SALA_NOMBRE, s.CAPACIDAD 
         FROM FUNCIONES f JOIN SALAS s ON f.SALA_ID = s.ID 
         WHERE f.ID = :id`,
        { id: funcionId }
      );
      const funcRows = funcResult.rows as any[];
      if (!funcRows || funcRows.length === 0) {
        res.status(404).json({ error: 'Función no encontrada' });
        return;
      }

      const salaId = funcRows[0].SALA_ID;

      // Get all seats with their reservation status for this function
      const result = await connection.execute(
        `SELECT a.ID, a.FILA, a.NUMERO, a.TIPO, a.SECCION,
                CASE 
                  WHEN ra.ID IS NOT NULL AND r.ESTADO = 'VENDIDA' THEN 'OCUPADO'
                  WHEN ra.ID IS NOT NULL AND r.ESTADO = 'RESERVADA' THEN 'RESERVADO'
                  ELSE 'DISPONIBLE'
                END AS ESTADO
         FROM ASIENTOS a
         LEFT JOIN RESERVA_ASIENTOS ra ON a.ID = ra.ASIENTO_ID 
              AND ra.FUNCION_ID = :funcionId AND ra.ESTADO = 'OCUPADO'
         LEFT JOIN RESERVAS r ON ra.RESERVA_ID = r.ID AND r.ESTADO IN ('RESERVADA', 'VENDIDA')
         WHERE a.SALA_ID = :salaId AND a.ACTIVO = 1
         ORDER BY a.FILA, a.NUMERO`,
        { funcionId, salaId }
      );

      // Count available
      const seats = result.rows as any[];
      const disponibles = seats.filter(s => s.ESTADO === 'DISPONIBLE').length;
      const ocupados = seats.filter(s => s.ESTADO === 'OCUPADO').length;
      const reservados = seats.filter(s => s.ESTADO === 'RESERVADO').length;

      res.json({
        sala: funcRows[0],
        asientos: seats,
        resumen: { disponibles, ocupados, reservados, total: seats.length },
      });
    } catch (error: any) {
      console.error('Error getting seat status:', error);
      res.status(500).json({ error: 'Error al obtener estado de asientos' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // POST /api/funciones (RF-16, RF-17)
  static async create(req: Request, res: Response): Promise<void> {
    const { pelicula_id, sala_id, fecha, hora_inicio, hora_fin, precio }: CreateFuncionDTO = req.body;
    let connection;

    try {
      if (!pelicula_id || !sala_id || !fecha || !hora_inicio || !hora_fin || precio === undefined) {
        res.status(400).json({ error: 'Todos los campos son requeridos' });
        return;
      }

      connection = await getOpsConnection();

      // Check for schedule overlap (RF-17, RN-05)
      const overlapResult = await connection.execute(
        `SELECT COUNT(*) AS CNT FROM FUNCIONES 
         WHERE SALA_ID = :sala_id 
         AND ESTADO != 'CANCELADA'
         AND HORA_INICIO < TO_TIMESTAMP(:hora_fin, 'YYYY-MM-DD HH24:MI')
         AND HORA_FIN > TO_TIMESTAMP(:hora_inicio, 'YYYY-MM-DD HH24:MI')`,
        {
          sala_id,
          hora_fin: `${fecha} ${hora_fin}`,
          hora_inicio: `${fecha} ${hora_inicio}`,
        }
      );

      const overlapRows = overlapResult.rows as any[];
      if (overlapRows[0].CNT > 0) {
        res.status(409).json({ error: 'Ya existe una función en esta sala que se superpone con el horario indicado' });
        return;
      }

      const result = await connection.execute(
        `INSERT INTO FUNCIONES (ID, PELICULA_ID, SALA_ID, FECHA, HORA_INICIO, HORA_FIN, PRECIO)
         VALUES (SEQ_FUNCIONES.NEXTVAL, :pelicula_id, :sala_id, 
                 TO_DATE(:fecha, 'YYYY-MM-DD'),
                 TO_TIMESTAMP(:hora_inicio, 'YYYY-MM-DD HH24:MI'), 
                 TO_TIMESTAMP(:hora_fin, 'YYYY-MM-DD HH24:MI'), 
                 :precio)
         RETURNING ID INTO :id`,
        {
          pelicula_id,
          sala_id,
          fecha,
          hora_inicio: `${fecha} ${hora_inicio}`,
          hora_fin: `${fecha} ${hora_fin}`,
          precio,
          id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
        }
      );

      await connection.commit();
      const newId = (result.outBinds as any).id[0];
      res.status(201).json({ id: newId, message: 'Función creada exitosamente' });
    } catch (error: any) {
      console.error('Error creating funcion:', error);
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al crear función' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // PUT /api/funciones/:id (RF-18)
  static async update(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const { pelicula_id, sala_id, fecha, hora_inicio, hora_fin, precio } = req.body;
    let connection;

    try {
      connection = await getOpsConnection();

      // Check if function has confirmed reservations (RF-18)
      const reservasResult = await connection.execute(
        `SELECT COUNT(*) AS CNT FROM RESERVAS 
         WHERE FUNCION_ID = :id AND ESTADO IN ('RESERVADA', 'VENDIDA')`,
        { id }
      );
      const reservasRows = reservasResult.rows as any[];
      if (reservasRows[0].CNT > 0) {
        res.status(409).json({ error: 'No se puede editar una función con reservas confirmadas' });
        return;
      }

      // Check for schedule overlap (excluding current function)
      const overlapResult = await connection.execute(
        `SELECT COUNT(*) AS CNT FROM FUNCIONES 
         WHERE SALA_ID = :sala_id 
         AND ID != :id
         AND ESTADO != 'CANCELADA'
         AND HORA_INICIO < TO_TIMESTAMP(:hora_fin, 'YYYY-MM-DD HH24:MI')
         AND HORA_FIN > TO_TIMESTAMP(:hora_inicio, 'YYYY-MM-DD HH24:MI')`,
        {
          sala_id,
          id,
          hora_fin: `${fecha} ${hora_fin}`,
          hora_inicio: `${fecha} ${hora_inicio}`,
        }
      );

      const overlapRows = overlapResult.rows as any[];
      if (overlapRows[0].CNT > 0) {
        res.status(409).json({ error: 'Conflicto de horario con otra función en la misma sala' });
        return;
      }

      await connection.execute(
        `UPDATE FUNCIONES SET 
          PELICULA_ID = :pelicula_id, 
          SALA_ID = :sala_id,
          FECHA = TO_DATE(:fecha, 'YYYY-MM-DD'),
          HORA_INICIO = TO_TIMESTAMP(:hora_inicio, 'YYYY-MM-DD HH24:MI'),
          HORA_FIN = TO_TIMESTAMP(:hora_fin, 'YYYY-MM-DD HH24:MI'),
          PRECIO = :precio
         WHERE ID = :id`,
        {
          pelicula_id,
          sala_id,
          fecha,
          hora_inicio: `${fecha} ${hora_inicio}`,
          hora_fin: `${fecha} ${hora_fin}`,
          precio,
          id,
        }
      );

      await connection.commit();
      res.json({ message: 'Función actualizada exitosamente' });
    } catch (error: any) {
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al actualizar función' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // DELETE /api/funciones/:id (RF-18)
  static async delete(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    let connection;

    try {
      connection = await getOpsConnection();

      // Check if function has confirmed reservations
      const reservasResult = await connection.execute(
        `SELECT COUNT(*) AS CNT FROM RESERVAS 
         WHERE FUNCION_ID = :id AND ESTADO IN ('RESERVADA', 'VENDIDA')`,
        { id }
      );
      const reservasRows = reservasResult.rows as any[];
      if (reservasRows[0].CNT > 0) {
        res.status(409).json({ error: 'No se puede eliminar una función con reservas confirmadas' });
        return;
      }

      await connection.execute(
        `UPDATE FUNCIONES SET ESTADO = 'CANCELADA' WHERE ID = :id`,
        { id }
      );
      await connection.commit();
      res.json({ message: 'Función cancelada exitosamente' });
    } catch (error: any) {
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al eliminar función' });
    } finally {
      if (connection) await connection.close();
    }
  }
}
