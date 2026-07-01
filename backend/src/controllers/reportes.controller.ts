import { Request, Response } from 'express';
import { getAdminConnection, getOpsConnection } from '../config/database';

export class ReportesController {
  // GET /api/reportes/ocupacion — Reporte de ocupación (RF-26)
  static async getOcupacion(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const { sala_id, fecha_desde, fecha_hasta } = req.query;

      let query = `
        SELECT f.ID AS FUNCION_ID, p.TITULO AS PELICULA, s.NOMBRE AS SALA,
               TO_CHAR(f.FECHA, 'YYYY-MM-DD') AS FECHA,
               TO_CHAR(f.HORA_INICIO, 'HH24:MI') AS HORA,
               s.CAPACIDAD,
               (SELECT COUNT(*) FROM RESERVA_ASIENTOS ra
                JOIN RESERVAS r ON ra.RESERVA_ID = r.ID
                WHERE ra.FUNCION_ID = f.ID AND ra.ESTADO = 'OCUPADO'
                AND r.ESTADO = 'VENDIDA') AS VENDIDOS,
               (SELECT COUNT(*) FROM RESERVA_ASIENTOS ra
                JOIN RESERVAS r ON ra.RESERVA_ID = r.ID
                WHERE ra.FUNCION_ID = f.ID AND ra.ESTADO = 'OCUPADO'
                AND r.ESTADO = 'RESERVADA') AS RESERVADOS,
               ROUND((SELECT COUNT(*) FROM RESERVA_ASIENTOS ra
                JOIN RESERVAS r ON ra.RESERVA_ID = r.ID
                WHERE ra.FUNCION_ID = f.ID AND ra.ESTADO = 'OCUPADO'
                AND r.ESTADO IN ('RESERVADA', 'VENDIDA')) * 100.0 / s.CAPACIDAD, 1) AS PORCENTAJE_OCUPACION
        FROM FUNCIONES f
        JOIN PELICULAS p ON f.PELICULA_ID = p.ID
        JOIN SALAS s ON f.SALA_ID = s.ID
        WHERE f.ESTADO != 'CANCELADA'
      `;
      const params: any = {};

      if (sala_id) {
        query += ` AND f.SALA_ID = :sala_id`;
        params.sala_id = parseInt(sala_id as string);
      }
      if (fecha_desde) {
        query += ` AND TRUNC(f.FECHA) >= TO_DATE(:fecha_desde, 'YYYY-MM-DD')`;
        params.fecha_desde = fecha_desde;
      }
      if (fecha_hasta) {
        query += ` AND TRUNC(f.FECHA) <= TO_DATE(:fecha_hasta, 'YYYY-MM-DD')`;
        params.fecha_hasta = fecha_hasta;
      }

      query += ` ORDER BY f.FECHA DESC, f.HORA_INICIO`;

      const result = await connection.execute(query, params);
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al generar reporte de ocupación' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/reportes/ventas — Reporte de ventas por período y canal (RF-27)
  static async getVentas(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const { fecha_desde, fecha_hasta, agrupacion } = req.query;

      let dateFormat = 'YYYY-MM-DD';
      if (agrupacion === 'semanal') {
        dateFormat = 'IYYY-IW';
      }

      let query = `
        SELECT TO_CHAR(r.FECHA_RESERVA, '${dateFormat}') AS PERIODO,
               r.CANAL,
               COUNT(*) AS TOTAL_RESERVAS,
               SUM(CASE WHEN r.ESTADO = 'VENDIDA' THEN 1 ELSE 0 END) AS VENTAS,
               SUM(CASE WHEN r.ESTADO = 'RESERVADA' THEN 1 ELSE 0 END) AS RESERVAS_PENDIENTES,
               SUM(CASE WHEN r.ESTADO = 'CANCELADA' THEN 1 ELSE 0 END) AS CANCELADAS,
               SUM(CASE WHEN r.ESTADO IN ('VENDIDA') THEN f.PRECIO ELSE 0 END) AS INGRESOS
        FROM RESERVAS r
        JOIN FUNCIONES f ON r.FUNCION_ID = f.ID
        WHERE 1=1
      `;
      const params: any = {};

      if (fecha_desde) {
        query += ` AND r.FECHA_RESERVA >= TO_TIMESTAMP(:fecha_desde, 'YYYY-MM-DD')`;
        params.fecha_desde = fecha_desde;
      }
      if (fecha_hasta) {
        query += ` AND r.FECHA_RESERVA < TO_TIMESTAMP(:fecha_hasta, 'YYYY-MM-DD') + 1`;
        params.fecha_hasta = fecha_hasta;
      }

      query += ` GROUP BY TO_CHAR(r.FECHA_RESERVA, '${dateFormat}'), r.CANAL`;
      query += ` ORDER BY PERIODO DESC, r.CANAL`;

      const result = await connection.execute(query, params);
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al generar reporte de ventas' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/reportes/cancelaciones — Reporte de cancelaciones (RF-28)
  static async getCancelaciones(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getAdminConnection();
      const { fecha_desde, fecha_hasta } = req.query;

      let query = `
        SELECT c.ID, c.RESERVA_ID, c.CODIGO_BOLETO, c.USUARIO_NOMBRE,
               c.NOMBRE_CLIENTE, c.ASIENTOS_LIBERADOS, c.MOTIVO, c.FECHA_HORA,
               p.TITULO AS PELICULA, s.NOMBRE AS SALA
        FROM CANCELACIONES c
        JOIN CINESTAR_OPS.FUNCIONES f ON c.FUNCION_ID = f.ID
        JOIN CINESTAR_OPS.PELICULAS p ON f.PELICULA_ID = p.ID
        JOIN CINESTAR_OPS.SALAS s ON f.SALA_ID = s.ID
        WHERE 1=1
      `;
      const params: any = {};

      if (fecha_desde) {
        query += ` AND c.FECHA_HORA >= TO_TIMESTAMP(:fecha_desde, 'YYYY-MM-DD')`;
        params.fecha_desde = fecha_desde;
      }
      if (fecha_hasta) {
        query += ` AND c.FECHA_HORA < TO_TIMESTAMP(:fecha_hasta, 'YYYY-MM-DD') + 1`;
        params.fecha_hasta = fecha_hasta;
      }

      query += ` ORDER BY c.FECHA_HORA DESC`;

      const result = await connection.execute(query, params);
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al generar reporte de cancelaciones' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/reportes/ranking — Funciones con mayor/menor ocupación (RF-29)
  static async getRanking(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();
      const { fecha_desde, fecha_hasta, orden } = req.query;
      const orderDir = orden === 'ASC' ? 'ASC' : 'DESC';

      let query = `
        SELECT f.ID AS FUNCION_ID, p.TITULO AS PELICULA, s.NOMBRE AS SALA,
               TO_CHAR(f.FECHA, 'YYYY-MM-DD') AS FECHA,
               TO_CHAR(f.HORA_INICIO, 'HH24:MI') AS HORA,
               s.CAPACIDAD,
               (SELECT COUNT(*) FROM RESERVA_ASIENTOS ra
                JOIN RESERVAS r ON ra.RESERVA_ID = r.ID
                WHERE ra.FUNCION_ID = f.ID AND ra.ESTADO = 'OCUPADO'
                AND r.ESTADO IN ('RESERVADA', 'VENDIDA')) AS TOTAL_OCUPADOS,
               ROUND((SELECT COUNT(*) FROM RESERVA_ASIENTOS ra
                JOIN RESERVAS r ON ra.RESERVA_ID = r.ID
                WHERE ra.FUNCION_ID = f.ID AND ra.ESTADO = 'OCUPADO'
                AND r.ESTADO IN ('RESERVADA', 'VENDIDA')) * 100.0 / s.CAPACIDAD, 1) AS PORCENTAJE
        FROM FUNCIONES f
        JOIN PELICULAS p ON f.PELICULA_ID = p.ID
        JOIN SALAS s ON f.SALA_ID = s.ID
        WHERE f.ESTADO != 'CANCELADA'
      `;
      const params: any = {};

      if (fecha_desde) {
        query += ` AND TRUNC(f.FECHA) >= TO_DATE(:fecha_desde, 'YYYY-MM-DD')`;
        params.fecha_desde = fecha_desde;
      }
      if (fecha_hasta) {
        query += ` AND TRUNC(f.FECHA) <= TO_DATE(:fecha_hasta, 'YYYY-MM-DD')`;
        params.fecha_hasta = fecha_hasta;
      }

      query += ` ORDER BY PORCENTAJE ${orderDir}`;
      query += ` FETCH FIRST 20 ROWS ONLY`;

      const result = await connection.execute(query, params);
      res.json(result.rows || []);
    } catch (error: any) {
      res.status(500).json({ error: 'Error al generar ranking' });
    } finally {
      if (connection) await connection.close();
    }
  }

  // GET /api/reportes/exportar/:tipo — Exportar reportes en CSV (RF-30)
  static async exportar(req: Request, res: Response): Promise<void> {
    const { tipo } = req.params;
    const { formato } = req.query;

    try {
      // Get report data first
      let data: any[] = [];
      let filename = '';

      // Simulate the request to get data
      const mockReq = { ...req, params: { ...req.params }, query: { ...req.query } };
      const dataPromise = new Promise<any[]>((resolve) => {
        const mockRes = {
          json: (d: any) => resolve(Array.isArray(d) ? d : [d]),
          status: () => mockRes,
        } as any;

        switch (tipo) {
          case 'ocupacion':
            filename = 'reporte_ocupacion';
            ReportesController.getOcupacion(mockReq as any, mockRes);
            break;
          case 'ventas':
            filename = 'reporte_ventas';
            ReportesController.getVentas(mockReq as any, mockRes);
            break;
          case 'cancelaciones':
            filename = 'reporte_cancelaciones';
            ReportesController.getCancelaciones(mockReq as any, mockRes);
            break;
          case 'ranking':
            filename = 'reporte_ranking';
            ReportesController.getRanking(mockReq as any, mockRes);
            break;
          default:
            resolve([]);
        }
      });

      data = await dataPromise;

      if (formato === 'csv') {
        // CSV export
        if (data.length === 0) {
          res.status(404).json({ error: 'No hay datos para exportar' });
          return;
        }

        const headers = Object.keys(data[0]);
        const csvRows = [
          headers.join(','),
          ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
        ];
        const csvContent = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.send(csvContent);
      } else {
        // PDF export using PDFKit
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
        doc.pipe(res);

        // Title
        doc.fontSize(18).font('Helvetica-Bold')
           .text(`CineStar Barrio - ${filename.replace('reporte_', 'Reporte de ').replace('_', ' ')}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).font('Helvetica')
           .text(`Generado: ${new Date().toLocaleString('es-MX')}`, { align: 'right' });
        doc.moveDown();

        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          const colWidth = (doc.page.width - 80) / headers.length;

          // Table header
          doc.fontSize(8).font('Helvetica-Bold');
          headers.forEach((h, i) => {
            doc.text(h, 40 + i * colWidth, doc.y, { width: colWidth, continued: i < headers.length - 1 });
          });
          doc.moveDown();

          // Draw line
          doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
          doc.moveDown(0.5);

          // Table rows
          doc.font('Helvetica').fontSize(7);
          data.forEach((row) => {
            if (doc.y > doc.page.height - 60) {
              doc.addPage();
            }
            headers.forEach((h, i) => {
              const val = row[h] != null ? String(row[h]) : '';
              doc.text(val.substring(0, 30), 40 + i * colWidth, doc.y, { width: colWidth, continued: i < headers.length - 1 });
            });
            doc.moveDown();
          });
        } else {
          doc.text('No hay datos disponibles para el período seleccionado.');
        }

        doc.end();
      }
    } catch (error: any) {
      console.error('Error exporting report:', error);
      res.status(500).json({ error: 'Error al exportar reporte' });
    }
  }

  // GET /api/reportes/dashboard — Stats for dashboard
  static async getDashboard(req: Request, res: Response): Promise<void> {
    let connection;
    try {
      connection = await getOpsConnection();

      const [funciones, reservas, peliculas, ocupacion] = await Promise.all([
        connection.execute(
          `SELECT COUNT(*) AS TOTAL FROM FUNCIONES WHERE ESTADO = 'PROGRAMADA' AND TRUNC(FECHA) >= TRUNC(SYSDATE)`
        ),
        connection.execute(
          `SELECT COUNT(*) AS TOTAL, 
                  SUM(CASE WHEN ESTADO = 'RESERVADA' THEN 1 ELSE 0 END) AS RESERVADAS,
                  SUM(CASE WHEN ESTADO = 'VENDIDA' THEN 1 ELSE 0 END) AS VENDIDAS,
                  SUM(CASE WHEN ESTADO = 'CANCELADA' THEN 1 ELSE 0 END) AS CANCELADAS
           FROM RESERVAS WHERE TRUNC(FECHA_RESERVA) = TRUNC(SYSDATE)`
        ),
        connection.execute(`SELECT COUNT(*) AS TOTAL FROM PELICULAS WHERE ACTIVO = 1`),
        connection.execute(
          `SELECT ROUND(AVG(PORCENTAJE), 1) AS PROMEDIO FROM (
            SELECT (SELECT COUNT(*) FROM RESERVA_ASIENTOS ra
                    JOIN RESERVAS r ON ra.RESERVA_ID = r.ID
                    WHERE ra.FUNCION_ID = f.ID AND ra.ESTADO = 'OCUPADO'
                    AND r.ESTADO IN ('RESERVADA', 'VENDIDA')) * 100.0 / s.CAPACIDAD AS PORCENTAJE
            FROM FUNCIONES f
            JOIN SALAS s ON f.SALA_ID = s.ID
            WHERE f.ESTADO = 'PROGRAMADA' AND TRUNC(f.FECHA) = TRUNC(SYSDATE)
          )`
        ),
      ]);

      res.json({
        funciones_hoy: (funciones.rows as any[])[0].TOTAL,
        reservas_hoy: (reservas.rows as any[])[0],
        peliculas_activas: (peliculas.rows as any[])[0].TOTAL,
        ocupacion_promedio: (ocupacion.rows as any[])[0].PROMEDIO || 0,
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Error al obtener datos del dashboard' });
    } finally {
      if (connection) await connection.close();
    }
  }
}
