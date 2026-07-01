import { Request, Response } from 'express';
import { getOpsConnection, getAdminConnection } from '../config/database';

export class ConsultasController {
  // GET /api/consultas/boleto/:codigo — Consultar por código de boleto (RF-24)
  static async getByBoleto(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT r.ID, r.FUNCION_ID, r.CODIGO_BOLETO, r.NOMBRE_CLIENTE,
                r.TELEFONO_CLIENTE, r.CANAL, r.ESTADO, r.FECHA_RESERVA,
                p.TITULO AS PELICULA_TITULO, s.NOMBRE AS SALA_NOMBRE,
                f.FECHA AS FUNCION_FECHA, f.HORA_INICIO, f.HORA_FIN, f.PRECIO,
                u.NOMBRE_COMPLETO AS OPERADOR
         FROM RESERVAS r
         JOIN FUNCIONES f ON r.FUNCION_ID = f.ID
         JOIN PELICULAS p ON f.PELICULA_ID = p.ID
         JOIN SALAS s ON f.SALA_ID = s.ID
         JOIN USUARIOS u ON r.USUARIO_ID = u.ID
         WHERE r.CODIGO_BOLETO = :codigo`,
        { codigo: req.params.codigo }
      );

      const rows = result.rows as any[];
      if (!rows || rows.length === 0) {
        res.status(404).json({ error: 'Boleto no encontrado' });
        return;
      }

      // Get seats
      const seatsResult = await connection.execute(
        `SELECT a.FILA, a.NUMERO, a.TIPO, ra.ESTADO
         FROM RESERVA_ASIENTOS ra
         JOIN ASIENTOS a ON ra.ASIENTO_ID = a.ID
         WHERE ra.RESERVA_ID = :id`,
        { id: rows[0].ID }
      );

      res.json({ ...rows[0], asientos: seatsResult.rows || [] });
    } catch (error: any) {
      res.status(500).json({ error: 'Error al consultar boleto' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/consultas/historial — Historial de reservas/ventas/cancelaciones (RF-25)
  static async getHistorial(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const { cliente, funcion_id, fecha_desde, fecha_hasta } = req.query;

      let query = `
        SELECT r.ID, r.CODIGO_BOLETO, r.NOMBRE_CLIENTE, r.CANAL, r.ESTADO,
               r.FECHA_RESERVA, r.FECHA_ACTUALIZACION,
               p.TITULO AS PELICULA_TITULO, s.NOMBRE AS SALA_NOMBRE,
               f.FECHA AS FUNCION_FECHA, f.HORA_INICIO
        FROM RESERVAS r
        JOIN FUNCIONES f ON r.FUNCION_ID = f.ID
        JOIN PELICULAS p ON f.PELICULA_ID = p.ID
        JOIN SALAS s ON f.SALA_ID = s.ID
        WHERE 1=1
      `;
      const params: any = {};

      if (cliente) {
        query += ` AND UPPER(r.NOMBRE_CLIENTE) LIKE '%' || UPPER(:cliente) || '%'`;
        params.cliente = cliente;
      }
      if (funcion_id) {
        query += ` AND r.FUNCION_ID = :funcion_id`;
        params.funcion_id = parseInt(funcion_id as string);
      }
      if (fecha_desde) {
        query += ` AND r.FECHA_RESERVA >= TO_TIMESTAMP(:fecha_desde, 'YYYY-MM-DD')`;
        params.fecha_desde = fecha_desde;
      }
      if (fecha_hasta) {
        query += ` AND r.FECHA_RESERVA < TO_TIMESTAMP(:fecha_hasta, 'YYYY-MM-DD') + 1`;
        params.fecha_hasta = fecha_hasta;
      }

      query += ` ORDER BY r.FECHA_RESERVA DESC`;

      const result = await connection.execute(query, params);
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al consultar historial' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/consultas/cartelera — Cartelera vigente (RF-21)
  static async getCartelera(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const { fecha } = req.query;
      const fechaFilter = fecha || new Date().toISOString().slice(0, 10);

      const result = await connection.execute(
        `SELECT f.ID, f.FECHA, f.HORA_INICIO, f.HORA_FIN, f.PRECIO, f.ESTADO,
                p.ID AS PELICULA_ID, p.TITULO, p.DURACION_MIN, p.CLASIFICACION, p.GENERO, p.SINOPSIS, p.POSTER_URL,
                s.ID AS SALA_ID, s.NOMBRE AS SALA_NOMBRE, s.CAPACIDAD,
                (SELECT COUNT(*) FROM RESERVA_ASIENTOS ra 
                 JOIN RESERVAS r ON ra.RESERVA_ID = r.ID
                 WHERE ra.FUNCION_ID = f.ID AND ra.ESTADO = 'OCUPADO' 
                 AND r.ESTADO IN ('RESERVADA', 'VENDIDA')) AS ASIENTOS_OCUPADOS
         FROM FUNCIONES f
         JOIN PELICULAS p ON f.PELICULA_ID = p.ID
         JOIN SALAS s ON f.SALA_ID = s.ID
         WHERE f.ESTADO = 'PROGRAMADA'
         AND TRUNC(f.FECHA) >= TO_DATE(:fecha, 'YYYY-MM-DD')
         ORDER BY f.FECHA, f.HORA_INICIO`,
        { fecha: fechaFilter }
      );

      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al consultar cartelera' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/consultas/disponibilidad/:funcionId — Disponibilidad en tiempo real (RF-22)
  static async getDisponibilidad(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const funcionId = parseInt(req.params.funcionId);

      const result = await connection.execute(
        `SELECT s.CAPACIDAD,
                (SELECT COUNT(*) FROM RESERVA_ASIENTOS ra
                 JOIN RESERVAS r ON ra.RESERVA_ID = r.ID
                 WHERE ra.FUNCION_ID = :funcionId AND ra.ESTADO = 'OCUPADO'
                 AND r.ESTADO IN ('RESERVADA', 'VENDIDA')) AS OCUPADOS
         FROM FUNCIONES f
         JOIN SALAS s ON f.SALA_ID = s.ID
         WHERE f.ID = :funcionId`,
        { funcionId }
      );

      const rows = result.rows as any[];
      if (!rows || rows.length === 0) {
        res.status(404).json({ error: 'Función no encontrada' });
        return;
      }

      res.json({
        capacidad: rows[0].CAPACIDAD,
        ocupados: rows[0].OCUPADOS,
        disponibles: rows[0].CAPACIDAD - rows[0].OCUPADOS,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Error al consultar disponibilidad' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/consultas/log — Log de operaciones (RF-14)
  static async getLog(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getAdminConnection();
      const { operacion, limit } = req.query;

      let query = `SELECT * FROM LOG_OPERACIONES WHERE 1=1`;
      const params: any = {};

      if (operacion) {
        query += ` AND OPERACION = :operacion`;
        params.operacion = operacion;
      }

      query += ` ORDER BY FECHA_HORA DESC`;
      query += ` FETCH FIRST :maxRows ROWS ONLY`;
      params.maxRows = parseInt((limit as string) || '100');

      const result = await connection.execute(query, params);
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al consultar log' });
    } finally {
      if (connection) await connection.close();
    }
  }
}
