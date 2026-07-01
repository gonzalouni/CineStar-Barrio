import { Request, Response } from 'express';
import { getOpsConnection } from '../config/database';
import { CreatePeliculaDTO } from '../types';

export class PeliculasController {
  // GET /api/peliculas
  static async getAll(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT ID, TITULO, DURACION_MIN, CLASIFICACION, SINOPSIS, GENERO, POSTER_URL, ACTIVO, FECHA_CREACION 
         FROM PELICULAS ORDER BY TITULO`
      );
      res.json(result.rows || []);
    } catch (error: any) {
      console.error('Error getting peliculas:', error);
      res.status(500).json({ error: 'Error al obtener películas' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/peliculas/:id
  static async getById(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT ID, TITULO, DURACION_MIN, CLASIFICACION, SINOPSIS, GENERO, POSTER_URL, ACTIVO, FECHA_CREACION 
         FROM PELICULAS WHERE ID = :id`,
        { id: parseInt(req.params.id) }
      );
      const rows = result.rows as any[];
      if (!rows || rows.length === 0) {
        res.status(404).json({ error: 'Película no encontrada' });
        return;
      }
      res.json(rows[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener película' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // POST /api/peliculas
  static async create(req: Request, res: Response): Promise<void> {
    const { titulo, duracion_min, clasificacion, sinopsis, genero, poster_url }: CreatePeliculaDTO = req.body;
    let connection;

    try {
      if (!titulo || !duracion_min || !clasificacion || !genero) {
        res.status(400).json({ error: 'Título, duración, clasificación y género son requeridos' });
        return;
      }

      connection = await getOpsConnection();
      const result = await connection.execute(
        `INSERT INTO PELICULAS (ID, TITULO, DURACION_MIN, CLASIFICACION, SINOPSIS, GENERO, POSTER_URL)
         VALUES (SEQ_PELICULAS.NEXTVAL, :titulo, :duracion_min, :clasificacion, :sinopsis, :genero, :poster_url)
         RETURNING ID INTO :id`,
        {
          titulo,
          duracion_min,
          clasificacion,
          sinopsis: sinopsis || null,
          genero,
          poster_url: poster_url || null,
          id: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER },
        }
      );

      await connection.commit();
      const newId = (result.outBinds as any).id[0];
      res.status(201).json({ id: newId, message: 'Película creada exitosamente' });
    } catch (error: any) {
      console.error('Error creating pelicula:', error);
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al crear película' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // PUT /api/peliculas/:id
  static async update(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    const { titulo, duracion_min, clasificacion, sinopsis, genero, poster_url } = req.body;
    let connection;

    try {
      connection = await getOpsConnection();
      await connection.execute(
        `UPDATE PELICULAS SET 
          TITULO = :titulo, 
          DURACION_MIN = :duracion_min, 
          CLASIFICACION = :clasificacion, 
          SINOPSIS = :sinopsis, 
          GENERO = :genero,
          POSTER_URL = :poster_url
         WHERE ID = :id`,
        { titulo, duracion_min, clasificacion, sinopsis: sinopsis || null, genero, poster_url: poster_url || null, id }
      );
      await connection.commit();
      res.json({ message: 'Película actualizada exitosamente' });
    } catch (error: any) {
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al actualizar película' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // DELETE /api/peliculas/:id
  static async delete(req: Request, res: Response): Promise<void> {
    const id = parseInt(req.params.id);
    let connection;

    try {
      connection = await getOpsConnection();
      // Soft delete
      await connection.execute(
        `UPDATE PELICULAS SET ACTIVO = 0 WHERE ID = :id`,
        { id }
      );
      await connection.commit();
      res.json({ message: 'Película eliminada exitosamente' });
    } catch (error: any) {
      if (connection) await connection.rollback();
      res.status(500).json({ error: 'Error al eliminar película' });
    } finally {
      if (connection) await connection.close();
    }
  }
}
