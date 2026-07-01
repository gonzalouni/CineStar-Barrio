-- ============================================
-- CineStar Barrio — Datos Iniciales (Seed)
-- ============================================

ALTER SESSION SET CONTAINER = XEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = CINESTAR_OPS;

-- NOTA: Los usuarios se crean automáticamente al iniciar el backend
-- con hashes bcrypt correctos (ver backend/src/config/seed.ts)
-- admin/admin123, operador1/operador123, operador2/operador123

-- ─── Salas (RST-05: 3 salas de ~100 asientos) ───
INSERT INTO SALAS (ID, NOMBRE, CAPACIDAD, ACTIVO) VALUES (SEQ_SALAS.NEXTVAL, 'Sala 1', 100, 1);
INSERT INTO SALAS (ID, NOMBRE, CAPACIDAD, ACTIVO) VALUES (SEQ_SALAS.NEXTVAL, 'Sala 2', 100, 1);
INSERT INTO SALAS (ID, NOMBRE, CAPACIDAD, ACTIVO) VALUES (SEQ_SALAS.NEXTVAL, 'Sala 3', 100, 1);

-- ─── Asientos para Sala 1 (100 asientos) ───
-- Distribución basada en la imagen del usuario:
-- Filas A-H: 18 asientos sección principal + 2 asientos sección lateral = 20 por fila
-- Fila I: 16 asientos principales (2 silla de ruedas) + 2 laterales = 20
-- Total: 8 filas * 20 + 1 fila * 20 = 180... ajustamos a ~100

-- Ajuste: Filas A-E con 18+2=20, Fila F con 16+2+2(silla ruedas)=20 → 5*20=100
-- Mejor distribución para ~100 asientos:
-- Filas A-I: Sección principal (12 asientos) + Sección lateral (2 asientos)
-- Fila I incluye 2 sillas de ruedas en la sección principal
-- Total: 9 filas * 12 = 108 principales + 9 * 2 = 18 laterales ≈ ajustamos

-- Distribución final para 100 asientos:
-- Filas A-H (8 filas): 10 asientos sección principal + 2 asientos sección lateral = 96
-- Fila I: 2 sillas de ruedas sección principal + 2 sección lateral = 4
-- Total = 100

DECLARE
    v_sala_id NUMBER;
    v_filas VARCHAR2(100) := 'A,B,C,D,E,F,G,H';
    v_fila VARCHAR2(2);
    v_pos NUMBER;
    v_start NUMBER := 1;
BEGIN
    -- Para cada sala
    FOR s IN 1..3 LOOP
        v_sala_id := s;
        v_start := 1;
        
        -- Filas A-H: 10 principales + 2 laterales cada una
        FOR f IN 1..8 LOOP
            v_fila := CHR(64 + f); -- A=65, B=66, etc.
            
            -- Sección principal (10 asientos normales)
            FOR n IN 1..10 LOOP
                INSERT INTO ASIENTOS (ID, SALA_ID, FILA, NUMERO, TIPO, SECCION, ACTIVO)
                VALUES (SEQ_ASIENTOS.NEXTVAL, v_sala_id, v_fila, n, 'NORMAL', 'PRINCIPAL', 1);
            END LOOP;
            
            -- Sección lateral (2 asientos normales)
            FOR n IN 11..12 LOOP
                INSERT INTO ASIENTOS (ID, SALA_ID, FILA, NUMERO, TIPO, SECCION, ACTIVO)
                VALUES (SEQ_ASIENTOS.NEXTVAL, v_sala_id, v_fila, n, 'NORMAL', 'LATERAL', 1);
            END LOOP;
        END LOOP;
        
        -- Fila I: 2 sillas de ruedas principales + 2 laterales normales
        FOR n IN 1..2 LOOP
            INSERT INTO ASIENTOS (ID, SALA_ID, FILA, NUMERO, TIPO, SECCION, ACTIVO)
            VALUES (SEQ_ASIENTOS.NEXTVAL, v_sala_id, 'I', n, 'SILLA_RUEDAS', 'PRINCIPAL', 1);
        END LOOP;
        FOR n IN 3..4 LOOP
            INSERT INTO ASIENTOS (ID, SALA_ID, FILA, NUMERO, TIPO, SECCION, ACTIVO)
            VALUES (SEQ_ASIENTOS.NEXTVAL, v_sala_id, 'I', n, 'NORMAL', 'LATERAL', 1);
        END LOOP;
    END LOOP;
END;
/

-- ─── Películas de ejemplo ───
INSERT INTO PELICULAS (ID, TITULO, DURACION_MIN, CLASIFICACION, SINOPSIS, GENERO, ACTIVO)
VALUES (SEQ_PELICULAS.NEXTVAL, 'El Gran Escape Estelar', 148, 'PG-13', 
        'Un grupo de astronautas debe encontrar el camino de regreso a la Tierra después de que su nave es golpeada por una tormenta de asteroides en el borde del sistema solar.', 
        'Ciencia Ficción', 1);

INSERT INTO PELICULAS (ID, TITULO, DURACION_MIN, CLASIFICACION, SINOPSIS, GENERO, ACTIVO)
VALUES (SEQ_PELICULAS.NEXTVAL, 'Sombras en la Ciudad', 120, 'R', 
        'Un detective retirado vuelve a la acción cuando descubre que una serie de crímenes están conectados con un caso que nunca pudo resolver hace 20 años.', 
        'Thriller', 1);

INSERT INTO PELICULAS (ID, TITULO, DURACION_MIN, CLASIFICACION, SINOPSIS, GENERO, ACTIVO)
VALUES (SEQ_PELICULAS.NEXTVAL, 'Aventuras en el Bosque Mágico', 95, 'G', 
        'Dos hermanos descubren un portal secreto en el bosque detrás de su casa que los lleva a un mundo lleno de criaturas fantásticas y aventuras increíbles.', 
        'Animación', 1);

-- ─── Funciones de ejemplo ───
INSERT INTO FUNCIONES (ID, PELICULA_ID, SALA_ID, FECHA, HORA_INICIO, HORA_FIN, PRECIO, ESTADO)
VALUES (SEQ_FUNCIONES.NEXTVAL, 1, 1, TRUNC(SYSDATE), 
        TRUNC(SYSDATE) + INTERVAL '14' HOUR, 
        TRUNC(SYSDATE) + INTERVAL '16' HOUR + INTERVAL '28' MINUTE, 
        85.00, 'PROGRAMADA');

INSERT INTO FUNCIONES (ID, PELICULA_ID, SALA_ID, FECHA, HORA_INICIO, HORA_FIN, PRECIO, ESTADO)
VALUES (SEQ_FUNCIONES.NEXTVAL, 1, 1, TRUNC(SYSDATE), 
        TRUNC(SYSDATE) + INTERVAL '17' HOUR, 
        TRUNC(SYSDATE) + INTERVAL '19' HOUR + INTERVAL '28' MINUTE, 
        85.00, 'PROGRAMADA');

INSERT INTO FUNCIONES (ID, PELICULA_ID, SALA_ID, FECHA, HORA_INICIO, HORA_FIN, PRECIO, ESTADO)
VALUES (SEQ_FUNCIONES.NEXTVAL, 2, 2, TRUNC(SYSDATE), 
        TRUNC(SYSDATE) + INTERVAL '15' HOUR, 
        TRUNC(SYSDATE) + INTERVAL '17' HOUR, 
        75.00, 'PROGRAMADA');

INSERT INTO FUNCIONES (ID, PELICULA_ID, SALA_ID, FECHA, HORA_INICIO, HORA_FIN, PRECIO, ESTADO)
VALUES (SEQ_FUNCIONES.NEXTVAL, 3, 3, TRUNC(SYSDATE), 
        TRUNC(SYSDATE) + INTERVAL '13' HOUR, 
        TRUNC(SYSDATE) + INTERVAL '14' HOUR + INTERVAL '35' MINUTE, 
        65.00, 'PROGRAMADA');

INSERT INTO FUNCIONES (ID, PELICULA_ID, SALA_ID, FECHA, HORA_INICIO, HORA_FIN, PRECIO, ESTADO)
VALUES (SEQ_FUNCIONES.NEXTVAL, 2, 3, TRUNC(SYSDATE) + 1, 
        TRUNC(SYSDATE) + 1 + INTERVAL '16' HOUR, 
        TRUNC(SYSDATE) + 1 + INTERVAL '18' HOUR, 
        75.00, 'PROGRAMADA');

COMMIT;
