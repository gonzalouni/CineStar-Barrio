import { Request, Response } from 'express';
import { getOpsConnection } from '../config/database';
import { CreateReservaDTO, CancelReservaDTO } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ReservasController {
  // POST /api/reservas — Crear reserva con control de concurrencia (RF-01, RF-02, RF-08, RNF-01)
  static async create(req: Request, res: Response): Promise<void> {
    const { funcion_id, asiento_ids, nombre_cliente, telefono_cliente, canal }: CreateReservaDTO = req.body;
    let connection;

    try {
      // Validate input
      if (!funcion_id || !asiento_ids || asiento_ids.length === 0 || !nombre_cliente || !canal) {
        res.status(400).json({ error: 'Función, asientos, nombre del cliente y canal son requeridos' });
        return;
      }

      connection = await getOpsConnection();

      // 1. Check function exists and is active
      const funcResult = await connection.execute(
        `SELECT f.ID, f.SALA_ID, s.CAPACIDAD 
         FROM FUNCIONES f JOIN SALAS s ON f.SALA_ID = s.ID
         WHERE f.ID = :id AND f.ESTADO = 'PROGRAMADA'`,
        { id: funcion_id }
      );
      const funcRows = funcResult.rows as any[];
      if (!funcRows || funcRows.length === 0) {
        res.status(404).json({ error: 'Función no encontrada o no está disponible' });
        return;
      }

      const capacidad = funcRows[0].CAPACIDAD;

      // 2. Check current occupancy (RF-04, RN-02)
      const occupancyResult = await connection.execute(
        `SELECT COUNT(*) AS CNT FROM RESERVA_ASIENTOS ra
         JOIN RESERVAS r ON ra.RESERVA_ID = r.ID
         WHERE ra.FUNCION_ID = :funcion_id 
         AND ra.ESTADO = 'OCUPADO'
         AND r.ESTADO IN ('RESERVADA', 'VENDIDA')`,
        { funcion_id }
      );
      const currentOccupancy = (occupancyResult.rows as any[])[0].CNT;

      if (currentOccupancy + asiento_ids.length > capacidad) {
        res.status(409).json({ 
          error: 'No hay suficientes asientos disponibles',
          disponibles: capacidad - currentOccupancy 
        });
        return;
      }

      // 3. Lock seats with SELECT FOR UPDATE (concurrency control RF-08, RNF-01)
      // Try to lock each requested seat to check availability
      const seatPlaceholders = asiento_ids.map((_, i) => `:a${i}`).join(',');
      const seatBinds: any = {};
      asiento_ids.forEach((id, i) => seatBinds[`a${i}`] = id);

      // Check if any of the requested seats are already occupied for this function
      const conflictResult = await connection.execute(
        `SELECT ra.ASIENTO_ID, a.FILA, a.NUMERO
         FROM RESERVA_ASIENTOS ra
         JOIN ASIENTOS a ON ra.ASIENTO_ID = a.ID
         JOIN RESERVAS r ON ra.RESERVA_ID = r.ID
         WHERE ra.FUNCION_ID = :funcion_id 
         AND ra.ASIENTO_ID IN (${seatPlaceholders})
         AND ra.ESTADO = 'OCUPADO'
         AND r.ESTADO IN ('RESERVADA', 'VENDIDA')
         FOR UPDATE NOWAIT`,
        { funcion_id, ...seatBinds }
      );

      const conflicts = conflictResult.rows as any[];
      if (conflicts && conflicts.length > 0) {
        const conflictSeats = conflicts.map(c => `${c.FILA}${c.NUMERO}`).join(', ');
        res.status(409).json({ 
          error: `Los siguientes asientos ya están ocupados: ${conflictSeats}` 
        });
        return;
      }

      // 4. Generate unique ticket code (RF-03, RN-03)
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const uniquePart = uuidv4().slice(0, 5).toUpperCase();
      const codigoBoleto = `CS-${dateStr}-${uniquePart}`;

      // 5. Create the reservation
      const reservaResult = await connection.execute(
        `INSERT INTO RESERVAS (ID, FUNCION_ID, USUARIO_ID, CODIGO_BOLETO, NOMBRE_CLIENTE, TELEFONO_CLIENTE, CANAL, ESTADO)
         VALUES (SEQ_RESERVAS.NEXTVAL, :funcion_id, :usuario_id, :codigo_boleto, :nombre_cliente, :telefono_cliente, :canal, 'RESERVADA')
         RETURNING ID INTO :id`,
        {
          funcion_id,
          usuario_id: req.user!.userId,
          codigo_boleto: codigoBoleto,
          nombre_cliente,
          telefono_cliente: telefono_cliente || null,
          canal,
          id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
        }
      );

      const reservaId = (reservaResult.outBinds as any).id[0];

      // 6. Insert seat assignments
      for (const asientoId of asiento_ids) {
        await connection.execute(
          `INSERT INTO RESERVA_ASIENTOS (ID, RESERVA_ID, ASIENTO_ID, FUNCION_ID, ESTADO)
           VALUES (SEQ_RESERVA_ASIENTOS.NEXTVAL, :reserva_id, :asiento_id, :funcion_id, 'OCUPADO')`,
          { reserva_id: reservaId, asiento_id: asientoId, funcion_id }
        );
      }

      // 7. Commit the transaction
      await connection.commit();

      res.status(201).json({
        id: reservaId,
        codigo_boleto: codigoBoleto,
        asientos: asiento_ids.length,
        message: 'Reserva creada exitosamente',
      });
    } catch (error: any) {
      console.error('Error creating reserva:', error);
      if (connection) await connection.rollback();

      // ORA-00054: resource busy (another session has locked the row)
      if (error.errorNum === 54) {
        res.status(409).json({ 
          error: 'Otro operador está procesando estos asientos. Intente nuevamente en unos segundos.' 
        });
        return;
      }

      res.status(500).json({ error: 'Error al crear reserva' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // PUT /api/reservas/:id/confirmar — Confirmar venta
  static async confirmar(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    let connection;

    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `UPDATE RESERVAS SET ESTADO = 'VENDIDA', FECHA_ACTUALIZACION = CURRENT_TIMESTAMP
         WHERE ID = :id AND ESTADO = 'RESERVADA'`,
        { id }
      );

      if ((result as any).rowsAffected === 0) {
        res.status(404).json({ error: 'Reserva no encontrada o no está en estado RESERVADA' });
        return;
      }

      await connection.commit();
      res.json({ message: 'Venta confirmada exitosamente' });
    } catch (error: any) {
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al confirmar venta' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // DELETE /api/reservas/:id — Cancelar reserva (RF-06, RF-12, RN-04)
  static async cancel(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const { motivo }: CancelReservaDTO = req.body || {};
    let connection;

    try {
      connection = await getOpsConnection();

      // Get reservation details
      const reservaResult = await connection.execute(
        `SELECT r.ID, r.CODIGO_BOLETO, r.FUNCION_ID, r.NOMBRE_CLIENTE, r.ESTADO
         FROM RESERVAS r WHERE r.ID = :id`,
        { id }
      );

      const reservaRows = reservaResult.rows as any[];
      if (!reservaRows || reservaRows.length === 0) {
        res.status(404).json({ error: 'Reserva no encontrada' });
        return;
      }

      const reserva = reservaRows[0];
      if (reserva.ESTADO === 'CANCELADA') {
        res.status(409).json({ error: 'La reserva ya está cancelada' });
        return;
      }

      // Get seats to be released
      const seatsResult = await connection.execute(
        `SELECT a.FILA || a.NUMERO AS ASIENTO FROM RESERVA_ASIENTOS ra
         JOIN ASIENTOS a ON ra.ASIENTO_ID = a.ID
         WHERE ra.RESERVA_ID = :id AND ra.ESTADO = 'OCUPADO'`,
        { id }
      );
      const seats = (seatsResult.rows as any[]).map(s => s.ASIENTO).join(', ');

      // 1. Update reservation status
      await connection.execute(
        `UPDATE RESERVAS SET ESTADO = 'CANCELADA', FECHA_ACTUALIZACION = CURRENT_TIMESTAMP
         WHERE ID = :id`,
        { id }
      );

      // 2. Release seats (RN-04)
      await connection.execute(
        `UPDATE RESERVA_ASIENTOS SET ESTADO = 'LIBERADO' 
         WHERE RESERVA_ID = :id AND ESTADO = 'OCUPADO'`,
        { id }
      );

      // 3. Record cancellation in audit schema (RF-12)
      await connection.execute(
        `INSERT INTO CINESTAR_ADMIN.CANCELACIONES 
         (ID, RESERVA_ID, CODIGO_BOLETO, FUNCION_ID, USUARIO_ID, USUARIO_NOMBRE, NOMBRE_CLIENTE, ASIENTOS_LIBERADOS, MOTIVO)
         VALUES (CINESTAR_ADMIN.SEQ_CANCELACIONES.NEXTVAL, :reserva_id, :codigo_boleto, :funcion_id, 
                 :usuario_id, :usuario_nombre, :nombre_cliente, :asientos, :motivo)`,
        {
          reserva_id: id,
          codigo_boleto: reserva.CODIGO_BOLETO,
          funcion_id: reserva.FUNCION_ID,
          usuario_id: req.user!.userId,
          usuario_nombre: req.user!.username,
          nombre_cliente: reserva.NOMBRE_CLIENTE,
          asientos: seats,
          motivo: motivo || 'Sin motivo especificado',
        }
      );

      await connection.commit();
      res.json({ message: 'Reserva cancelada exitosamente. Asientos liberados: ' + seats });
    } catch (error: any) {
      console.error('Error cancelling reserva:', error);
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al cancelar reserva' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/reservas
  static async getAll(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const { funcion_id, estado, canal } = req.query;

      let query = `
        SELECT r.ID, r.FUNCION_ID, r.USUARIO_ID, r.CODIGO_BOLETO, r.NOMBRE_CLIENTE,
               r.TELEFONO_CLIENTE, r.CANAL, r.ESTADO, r.FECHA_RESERVA, r.FECHA_ACTUALIZACION,
               p.TITULO AS PELICULA_TITULO, s.NOMBRE AS SALA_NOMBRE,
               f.FECHA AS FUNCION_FECHA, f.HORA_INICIO, f.HORA_FIN,
               u.NOMBRE_COMPLETO AS OPERADOR
        FROM RESERVAS r
        JOIN FUNCIONES f ON r.FUNCION_ID = f.ID
        JOIN PELICULAS p ON f.PELICULA_ID = p.ID
        JOIN SALAS s ON f.SALA_ID = s.ID
        JOIN USUARIOS u ON r.USUARIO_ID = u.ID
        WHERE 1=1
      `;
      const params: any = {};

      if (funcion_id) {
        query += ` AND r.FUNCION_ID = :funcion_id`;
        params.funcion_id = parseInt(funcion_id as string);
      }
      if (estado) {
        query += ` AND r.ESTADO = :estado`;
        params.estado = estado;
      }
      if (canal) {
        query += ` AND r.CANAL = :canal`;
        params.canal = canal;
      }

      query += ` ORDER BY r.FECHA_RESERVA DESC`;

      const result = await connection.execute(query, params);
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener reservas' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/reservas/:id
  static async getById(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT r.ID, r.FUNCION_ID, r.USUARIO_ID, r.CODIGO_BOLETO, r.NOMBRE_CLIENTE,
                r.TELEFONO_CLIENTE, r.CANAL, r.ESTADO, r.FECHA_RESERVA, r.FECHA_ACTUALIZACION,
                p.TITULO AS PELICULA_TITULO, s.NOMBRE AS SALA_NOMBRE,
                f.FECHA AS FUNCION_FECHA, f.HORA_INICIO, f.HORA_FIN, f.PRECIO,
                u.NOMBRE_COMPLETO AS OPERADOR
         FROM RESERVAS r
         JOIN FUNCIONES f ON r.FUNCION_ID = f.ID
         JOIN PELICULAS p ON f.PELICULA_ID = p.ID
         JOIN SALAS s ON f.SALA_ID = s.ID
         JOIN USUARIOS u ON r.USUARIO_ID = u.ID
         WHERE r.ID = :id`,
        { id: parseInt(req.params.id) }
      );

      const rows = result.rows as any[];
      if (!rows || rows.length === 0) {
        res.status(404).json({ error: 'Reserva no encontrada' });
        return;
      }

      // Get associated seats
      const seatsResult = await connection.execute(
        `SELECT a.FILA, a.NUMERO, a.TIPO, a.SECCION, ra.ESTADO
         FROM RESERVA_ASIENTOS ra
         JOIN ASIENTOS a ON ra.ASIENTO_ID = a.ID
         WHERE ra.RESERVA_ID = :id`,
        { id: parseInt(req.params.id) }
      );

      res.json({
        ...rows[0],
        asientos: seatsResult.rows || [],
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener reserva' });
    } finally {
      if (connection) await connection.close();
    }
  }
}
