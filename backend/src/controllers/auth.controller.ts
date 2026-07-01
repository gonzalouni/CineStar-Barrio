import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getOpsConnection } from '../config/database';
import { env } from '../config/env';
import { LoginDTO, JWTPayload } from '../types';

export class AuthController {
  // POST /api/auth/login
  static async login(req: Request, res: Response): Promise<void> {
    const { username, password }: LoginDTO = req.body;
    let connection;

    try {
      if (!username || !password) {
        res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
        return;
      }

      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT ID, USERNAME, PASSWORD_HASH, NOMBRE_COMPLETO, ROL, ACTIVO 
         FROM USUARIOS WHERE USERNAME = :username`,
        { username }
      );

      const rows = result.rows as any[];
      if (!rows || rows.length === 0) {
        res.status(401).json({ error: 'Credenciales inválidas' });
        return;
      }

      const user = rows[0];

      if (user.ACTIVO !== 1) {
        res.status(403).json({ error: 'Usuario desactivado. Contacte al administrador.' });
        return;
      }

      const validPassword = await bcrypt.compare(password, user.PASSWORD_HASH);
      if (!validPassword) {
        res.status(401).json({ error: 'Credenciales inválidas' });
        return;
      }

      const payload: JWTPayload = {
        userId: user.ID,
        username: user.USERNAME,
        rol: user.ROL,
      };

      const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRATION });
      const refreshToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRATION });

      res.json({
        token,
        refreshToken,
        user: {
          id: user.ID,
          username: user.USERNAME,
          nombre: user.NOMBRE_COMPLETO,
          rol: user.ROL,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // POST /api/auth/refresh
  static async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    try {
      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token requerido' });
        return;
      }

      const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as JWTPayload;
      const payload: JWTPayload = {
        userId: decoded.userId,
        username: decoded.username,
        rol: decoded.rol,
      };

      const newToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRATION });

      res.json({ token: newToken });
    } catch (error) {
      res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }
  }

  // GET /api/auth/me
  static async me(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const result = await connection.execute(
        `SELECT ID, USERNAME, NOMBRE_COMPLETO, ROL, ACTIVO FROM USUARIOS WHERE ID = :id`,
        { id: req.user!.userId }
      );

      const rows = result.rows as any[];
      if (!rows || rows.length === 0) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }

      const user = rows[0];
      res.json({
        id: user.ID,
        username: user.USERNAME,
        nombre: user.NOMBRE_COMPLETO,
        rol: user.ROL,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Error interno del servidor' });
    } finally {
      if (connection) await connection.close();
    }
  }
}
