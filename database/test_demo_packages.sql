-- ============================================
-- CineStar Barrio — Script de Prueba de Demostración
-- Ejecutar en SQL*Plus para evidenciar funcionamiento
-- ============================================

SET DEFINE OFF;
SET SERVEROUTPUT ON SIZE UNLIMITED;
ALTER SESSION SET CONTAINER = XEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = CINESTAR_OPS;

PROMPT ===================================================
PROMPT PROBANDO PKG_ADMINISTRACION (ADM01, ADM02, ADM03)
PROMPT ===================================================
DECLARE
    v_pelicula_id NUMBER;
    v_funcion_id  NUMBER;
    v_solapada    NUMBER;
BEGIN
    -- ADM01: Registrar Película
    CINESTAR_OPS.PKG_ADMINISTRACION.sp_registrar_pelicula(
        p_titulo        => 'Película Demo PLSQL',
        p_duracion_min  => 120,
        p_clasificacion => 'PG-13',
        p_sinopsis      => 'Una película de prueba para verificar paquetes.',
        p_genero        => 'Acción',
        p_poster_url    => 'http://example.com/demo.jpg',
        p_pelicula_id   => v_pelicula_id
    );
    DBMS_OUTPUT.PUT_LINE('ADM01 OK: Película registrada con ID: ' || v_pelicula_id);

    -- ADM03: Verificar solapamiento
    CINESTAR_OPS.PKG_ADMINISTRACION.sp_verificar_solapamiento(
        p_sala_id     => 1,
        p_hora_inicio => TO_TIMESTAMP('2026-07-02 18:00:00', 'YYYY-MM-DD HH24:MI:SS'),
        p_hora_fin    => TO_TIMESTAMP('2026-07-02 20:00:00', 'YYYY-MM-DD HH24:MI:SS'),
        p_funcion_id  => NULL,
        p_solapada    => v_solapada
    );
    DBMS_OUTPUT.PUT_LINE('ADM03 OK: Solapamientos detectados: ' || v_solapada);

    -- ADM02: Registrar Función
    CINESTAR_OPS.PKG_ADMINISTRACION.sp_registrar_funcion(
        p_pelicula_id => v_pelicula_id,
        p_sala_id     => 1,
        p_fecha       => TO_DATE('2026-07-02', 'YYYY-MM-DD'),
        p_hora_inicio => TO_TIMESTAMP('2026-07-02 18:00:00', 'YYYY-MM-DD HH24:MI:SS'),
        p_hora_fin    => TO_TIMESTAMP('2026-07-02 20:00:00', 'YYYY-MM-DD HH24:MI:SS'),
        p_precio      => 15.50,
        p_funcion_id  => v_funcion_id
    );
    DBMS_OUTPUT.PUT_LINE('ADM02 OK: Función registrada con ID: ' || v_funcion_id);
END;
/

PROMPT
PROMPT ===================================================
PROMPT PROBANDO PKG_VALOR (VAL03, VAL01, VAL04)
PROMPT ===================================================
DECLARE
    v_reserva_id    NUMBER;
    v_codigo_boleto VARCHAR2(20);
    v_asientos      CINESTAR_OPS.TYP_ASIENTOS_LIST;
BEGIN
    -- Inicializar lista de asientos a reservar (IDs 1 y 2 de la base de datos)
    v_asientos := CINESTAR_OPS.TYP_ASIENTOS_LIST(1, 2);

    -- VAL03 y VAL01: Crear Reserva
    CINESTAR_OPS.PKG_VALOR.sp_crear_reserva(
        p_funcion_id       => 1,
        p_usuario_id       => 1,
        p_nombre_cliente   => 'Juan Pérez Demo',
        p_telefono_cliente => '999999999',
        p_canal            => 'TELEFONICA',
        p_asiento_ids      => v_asientos,
        p_reserva_id       => v_reserva_id,
        p_codigo_boleto    => v_codigo_boleto
    );
    DBMS_OUTPUT.PUT_LINE('VAL01 y VAL03 OK: Reserva creada ID: ' || v_reserva_id || ' | Boleto: ' || v_codigo_boleto);

    -- VAL04: Confirmar Venta
    CINESTAR_OPS.PKG_VALOR.sp_confirmar_venta(p_reserva_id => v_reserva_id);
    DBMS_OUTPUT.PUT_LINE('VAL04 OK: Venta de la reserva ' || v_reserva_id || ' confirmada.');
END;
/

PROMPT
PROMPT ===================================================
PROMPT PROBANDO PKG_CONSULTAS (CON01, CON03)
PROMPT ===================================================
DECLARE
    v_cursor SYS_REFCURSOR;
    v_id NUMBER;
    v_titulo VARCHAR2(200);
    v_sala VARCHAR2(50);
    v_inicio TIMESTAMP;
    v_fin TIMESTAMP;
    v_precio NUMBER;
    v_estado VARCHAR2(20);
BEGIN
    -- CON01: Consultar Cartelera
    CINESTAR_OPS.PKG_CONSULTAS.sp_consultar_cartelera(
        p_fecha  => TO_DATE('2026-07-02', 'YYYY-MM-DD'),
        p_cursor => v_cursor
    );
    
    DBMS_OUTPUT.PUT_LINE('CON01 OK: Cartelera obtenida:');
    LOOP
        FETCH v_cursor INTO v_id, v_titulo, v_sala, v_inicio, v_fin, v_precio, v_estado;
        EXIT WHEN v_cursor%NOTFOUND;
        DBMS_OUTPUT.PUT_LINE('  - Función ID: ' || v_id || ' | Película: ' || v_titulo || ' | Sala: ' || v_sala);
    END LOOP;
    CLOSE v_cursor;
END;
/

PROMPT
PROMPT ===================================================
PROMPT PROBANDO PKG_REPORTES (REP04)
PROMPT ===================================================
DECLARE
    v_cursor SYS_REFCURSOR;
    v_titulo VARCHAR2(200);
    v_total  NUMBER;
    v_ingr   NUMBER;
BEGIN
    -- REP04: Reporte de rendimiento
    CINESTAR_OPS.PKG_REPORTES.sp_reporte_rendimiento(p_cursor => v_cursor);
    DBMS_OUTPUT.PUT_LINE('REP04 OK: Reporte de rendimiento de películas:');
    LOOP
        FETCH v_cursor INTO v_titulo, v_total, v_ingr;
        EXIT WHEN v_cursor%NOTFOUND;
        DBMS_OUTPUT.PUT_LINE('  - ' || v_titulo || ' | Compras: ' || v_total || ' | Recaudado: S/ ' || v_ingr);
    END LOOP;
    CLOSE v_cursor;
END;
/

exit;
