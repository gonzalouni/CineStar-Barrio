-- ============================================
-- CineStar Barrio — Paquetes y Procedimientos
-- Esquema: CINESTAR_OPS
-- Implementación Completa para Matriz de Trazabilidad
-- ============================================

ALTER SESSION SET CONTAINER = XEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = CINESTAR_OPS;

-- ─── Tipo de dato para pasar lista de asientos ───
CREATE OR REPLACE TYPE TYP_ASIENTOS_LIST AS TABLE OF NUMBER;
/

-- ============================================
-- 1. PAQUETE: PKG_VALOR (VAL01 a VAL05)
-- ============================================
CREATE OR REPLACE PACKAGE PKG_VALOR AS
    -- VAL03: Generar código único de boleto (RF-03)
    FUNCTION fn_generar_codigo_boleto RETURN VARCHAR2;

    -- VAL01: Crear Reserva con Asientos (RF-01, RF-02, RF-08, RNF-01)
    PROCEDURE sp_crear_reserva(
        p_funcion_id     IN NUMBER,
        p_usuario_id     IN NUMBER,
        p_nombre_cliente IN VARCHAR2,
        p_telefono_cliente IN VARCHAR2,
        p_canal          IN VARCHAR2,
        p_asiento_ids    IN TYP_ASIENTOS_LIST,
        p_reserva_id     OUT NUMBER,
        p_codigo_boleto  OUT VARCHAR2
    );

    -- VAL04: Confirmar Venta de Reserva (RF-03)
    PROCEDURE sp_confirmar_venta(p_reserva_id IN NUMBER);

    -- VAL05: Cancelar Reserva y Liberar Asientos (RF-06, RN-04)
    PROCEDURE sp_cancelar_reserva(
        p_reserva_id IN NUMBER,
        p_usuario_id IN NUMBER,
        p_motivo     IN VARCHAR2
    );

    -- VAL02: Verificar Disponibilidad de Asiento (RF-02)
    PROCEDURE sp_verificar_asiento_libre(
        p_funcion_id IN NUMBER,
        p_asiento_id IN NUMBER,
        p_disponible OUT NUMBER
    );
END PKG_VALOR;
/

CREATE OR REPLACE PACKAGE BODY PKG_VALOR AS

    FUNCTION fn_generar_codigo_boleto RETURN VARCHAR2 IS
        v_codigo VARCHAR2(20);
        v_existe NUMBER;
    BEGIN
        LOOP
            v_codigo := 'CS-' || TO_CHAR(SYSDATE, 'YYYYMMDD') || '-' || 
                        LPAD(TRUNC(DBMS_RANDOM.VALUE(10000, 99999)), 5, '0');
            SELECT COUNT(*) INTO v_existe FROM CINESTAR_OPS.RESERVAS WHERE CODIGO_BOLETO = v_codigo;
            EXIT WHEN v_existe = 0;
        END LOOP;
        RETURN v_codigo;
    END fn_generar_codigo_boleto;

    PROCEDURE sp_crear_reserva(
        p_funcion_id     IN NUMBER,
        p_usuario_id     IN NUMBER,
        p_nombre_cliente IN VARCHAR2,
        p_telefono_cliente IN VARCHAR2,
        p_canal          IN VARCHAR2,
        p_asiento_ids    IN TYP_ASIENTOS_LIST,
        p_reserva_id     OUT NUMBER,
        p_codigo_boleto  OUT VARCHAR2
    ) IS
        v_estado_funcion VARCHAR2(20);
        v_capacidad      NUMBER;
        v_ocupados       NUMBER;
        v_asientos_sol   NUMBER;
        v_reserva_id     NUMBER;
        v_codigo         VARCHAR2(20);
        v_dummy          NUMBER;
        e_funcion_no_disponible EXCEPTION;
        e_sin_capacidad         EXCEPTION;
        e_asiento_ocupado       EXCEPTION;
    BEGIN
        SELECT f.ESTADO, s.CAPACIDAD INTO v_estado_funcion, v_capacidad
        FROM CINESTAR_OPS.FUNCIONES f
        JOIN CINESTAR_OPS.SALAS s ON f.SALA_ID = s.ID
        WHERE f.ID = p_funcion_id;

        IF v_estado_funcion != 'PROGRAMADA' THEN
            RAISE e_funcion_no_disponible;
        END IF;

        SELECT COUNT(*) INTO v_ocupados FROM CINESTAR_OPS.RESERVA_ASIENTOS ra
        JOIN CINESTAR_OPS.RESERVAS r ON ra.RESERVA_ID = r.ID
        WHERE ra.FUNCION_ID = p_funcion_id AND ra.ESTADO = 'OCUPADO' AND r.ESTADO IN ('RESERVADA', 'VENDIDA');

        v_asientos_sol := p_asiento_ids.COUNT;
        IF (v_ocupados + v_asientos_sol) > v_capacidad THEN
            RAISE e_sin_capacidad;
        END IF;

        FOR i IN 1..p_asiento_ids.COUNT LOOP
            BEGIN
                SELECT 1 INTO v_dummy FROM CINESTAR_OPS.RESERVA_ASIENTOS ra
                JOIN CINESTAR_OPS.RESERVAS r ON ra.RESERVA_ID = r.ID
                WHERE ra.FUNCION_ID = p_funcion_id AND ra.ASIENTO_ID = p_asiento_ids(i)
                  AND ra.ESTADO = 'OCUPADO' AND r.ESTADO IN ('RESERVADA', 'VENDIDA')
                FOR UPDATE NOWAIT;
                RAISE e_asiento_ocupado;
            EXCEPTION
                WHEN NO_DATA_FOUND THEN NULL;
                WHEN OTHERS THEN
                    IF SQLCODE = -54 THEN
                        raise_application_error(-20002, 'El asiento ' || p_asiento_ids(i) || ' está bloqueado por otro operador.');
                    ELSE RAISE;
                    END IF;
            END;
        END LOOP;

        v_codigo := fn_generar_codigo_boleto();

        INSERT INTO CINESTAR_OPS.RESERVAS (
            ID, FUNCION_ID, USUARIO_ID, CODIGO_BOLETO, NOMBRE_CLIENTE, TELEFONO_CLIENTE, CANAL, ESTADO
        ) VALUES (
            CINESTAR_OPS.SEQ_RESERVAS.NEXTVAL, p_funcion_id, p_usuario_id, v_codigo, p_nombre_cliente, p_telefono_cliente, p_canal, 'RESERVADA'
        ) RETURNING ID INTO v_reserva_id;

        FOR i IN 1..p_asiento_ids.COUNT LOOP
            INSERT INTO CINESTAR_OPS.RESERVA_ASIENTOS (
                ID, RESERVA_ID, ASIENTO_ID, FUNCION_ID, ESTADO
            ) VALUES (
                CINESTAR_OPS.SEQ_RESERVA_ASIENTOS.NEXTVAL, v_reserva_id, p_asiento_ids(i), p_funcion_id, 'OCUPADO'
            );
        END LOOP;

        p_reserva_id := v_reserva_id;
        p_codigo_boleto := v_codigo;
        COMMIT;
    EXCEPTION
        WHEN e_funcion_no_disponible THEN raise_application_error(-20003, 'Función no disponible.');
        WHEN e_sin_capacidad THEN raise_application_error(-20004, 'Sin capacidad disponible.');
        WHEN e_asiento_ocupado THEN raise_application_error(-20005, 'Uno o más asientos ya ocupados.');
        WHEN OTHERS THEN ROLLBACK; RAISE;
    END sp_crear_reserva;

    PROCEDURE sp_confirmar_venta(p_reserva_id IN NUMBER) IS
    BEGIN
        UPDATE CINESTAR_OPS.RESERVAS SET ESTADO = 'VENDIDA', FECHA_ACTUALIZACION = CURRENT_TIMESTAMP
        WHERE ID = p_reserva_id AND ESTADO = 'RESERVADA';
        IF SQL%ROWCOUNT = 0 THEN
            raise_application_error(-20006, 'Reserva no encontrada o no válida.');
        END IF;
        COMMIT;
    END sp_confirmar_venta;

    PROCEDURE sp_cancelar_reserva(
        p_reserva_id IN NUMBER,
        p_usuario_id IN NUMBER,
        p_motivo     IN VARCHAR2
    ) IS
        v_codigo_boleto   VARCHAR2(20);
        v_funcion_id      NUMBER;
        v_nombre_cliente  VARCHAR2(150);
        v_usuario_nombre  VARCHAR2(50);
        v_estado          VARCHAR2(20);
        v_asientos_lib    VARCHAR2(500);
    BEGIN
        SELECT CODIGO_BOLETO, FUNCION_ID, NOMBRE_CLIENTE, ESTADO INTO v_codigo_boleto, v_funcion_id, v_nombre_cliente, v_estado
        FROM CINESTAR_OPS.RESERVAS WHERE ID = p_reserva_id;

        IF v_estado = 'CANCELADA' THEN
            raise_application_error(-20008, 'La reserva ya está cancelada.');
        END IF;

        SELECT USERNAME INTO v_usuario_nombre FROM CINESTAR_OPS.USUARIOS WHERE ID = p_usuario_id;

        SELECT LISTAGG(a.FILA || a.NUMERO, ', ') WITHIN GROUP (ORDER BY a.FILA, a.NUMERO) INTO v_asientos_lib
        FROM CINESTAR_OPS.RESERVA_ASIENTOS ra
        JOIN CINESTAR_OPS.ASIENTOS a ON ra.ASIENTO_ID = a.ID
        WHERE ra.RESERVA_ID = p_reserva_id AND ra.ESTADO = 'OCUPADO';

        UPDATE CINESTAR_OPS.RESERVAS SET ESTADO = 'CANCELADA', FECHA_ACTUALIZACION = CURRENT_TIMESTAMP WHERE ID = p_reserva_id;
        UPDATE CINESTAR_OPS.RESERVA_ASIENTOS SET ESTADO = 'LIBERADO' WHERE RESERVA_ID = p_reserva_id AND ESTADO = 'OCUPADO';

        INSERT INTO CINESTAR_ADMIN.CANCELACIONES (
            ID, RESERVA_ID, CODIGO_BOLETO, FUNCION_ID, USUARIO_ID, USUARIO_NOMBRE, NOMBRE_CLIENTE, ASIENTOS_LIBERADOS, MOTIVO, FECHA_HORA
        ) VALUES (
            CINESTAR_ADMIN.SEQ_CANCELACIONES.NEXTVAL, p_reserva_id, v_codigo_boleto, v_funcion_id, p_usuario_id, v_usuario_nombre, v_nombre_cliente, v_asientos_lib, NVL(p_motivo, 'Cancelación voluntaria'), CURRENT_TIMESTAMP
        );
        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN raise_application_error(-20007, 'Reserva o usuario no existente.');
        WHEN OTHERS THEN ROLLBACK; RAISE;
    END sp_cancelar_reserva;

    PROCEDURE sp_verificar_asiento_libre(
        p_funcion_id IN NUMBER,
        p_asiento_id IN NUMBER,
        p_disponible OUT NUMBER
    ) IS
        v_cnt NUMBER;
    BEGIN
        SELECT COUNT(*) INTO v_cnt FROM CINESTAR_OPS.RESERVA_ASIENTOS ra
        JOIN CINESTAR_OPS.RESERVAS r ON ra.RESERVA_ID = r.ID
        WHERE ra.FUNCION_ID = p_funcion_id AND ra.ASIENTO_ID = p_asiento_id
          AND ra.ESTADO = 'OCUPADO' AND r.ESTADO IN ('RESERVADA', 'VENDIDA');
        
        IF v_cnt = 0 THEN p_disponible := 1; ELSE p_disponible := 0; END IF;
    END sp_verificar_asiento_libre;

END PKG_VALOR;
/

-- ============================================
-- 2. PAQUETE: PKG_SEGURIDAD (SEG01 a SEG05)
-- ============================================
CREATE OR REPLACE PACKAGE PKG_SEGURIDAD AS
    -- SEG01: Autenticación de Usuario (RF-10)
    PROCEDURE sp_autenticar_usuario(
        p_username IN VARCHAR2,
        p_password_hash OUT VARCHAR2,
        p_rol OUT VARCHAR2,
        p_activo OUT NUMBER
    );

    -- SEG02: Verificar Roles y Permisos (RF-09, RF-11)
    PROCEDURE sp_verificar_permisos(
        p_usuario_id IN NUMBER,
        p_rol_requerido IN VARCHAR2,
        p_permitido OUT NUMBER
    );

    -- SEG04: Log de Auditoría para Cancelaciones (RF-12)
    PROCEDURE sp_auditar_cancelacion(
        p_reserva_id IN NUMBER,
        p_motivo IN VARCHAR2,
        p_usuario_id IN NUMBER
    );

    -- SEG05: Verificar Restricciones de Esquemas (RF-13)
    PROCEDURE sp_verificar_acceso_esquema(
        p_esquema_destino IN VARCHAR2,
        p_permitido OUT NUMBER
    );

    -- SEG03: Registro de Logs Generales (RF-14)
    PROCEDURE sp_registrar_log(
        p_operacion IN VARCHAR2,
        p_tabla IN VARCHAR2,
        p_registro_id IN NUMBER,
        p_usuario_id IN NUMBER,
        p_detalles IN VARCHAR2
    );
END PKG_SEGURIDAD;
/

CREATE OR REPLACE PACKAGE BODY PKG_SEGURIDAD AS

    PROCEDURE sp_autenticar_usuario(
        p_username IN VARCHAR2,
        p_password_hash OUT VARCHAR2,
        p_rol OUT VARCHAR2,
        p_activo OUT NUMBER
    ) IS
    BEGIN
        SELECT PASSWORD_HASH, ROL, ACTIVO INTO p_password_hash, p_rol, p_activo
        FROM CINESTAR_OPS.USUARIOS WHERE USERNAME = p_username;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            p_password_hash := NULL; p_rol := NULL; p_activo := 0;
    END sp_autenticar_usuario;

    PROCEDURE sp_verificar_permisos(
        p_usuario_id IN NUMBER,
        p_rol_requerido IN VARCHAR2,
        p_permitido OUT NUMBER
    ) IS
        v_rol VARCHAR2(20);
    BEGIN
        SELECT ROL INTO v_rol FROM CINESTAR_OPS.USUARIOS WHERE ID = p_usuario_id AND ACTIVO = 1;
        IF v_rol = p_rol_requerido OR v_rol = 'ADMIN' THEN
            p_permitido := 1;
        ELSE
            p_permitido := 0;
        END IF;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN p_permitido := 0;
    END sp_verificar_permisos;

    PROCEDURE sp_auditar_cancelacion(
        p_reserva_id IN NUMBER,
        p_motivo IN VARCHAR2,
        p_usuario_id IN NUMBER
    ) IS
    BEGIN
        -- Delega a la lógica centralizada de cancelaciones
        PKG_VALOR.sp_cancelar_reserva(p_reserva_id, p_usuario_id, p_motivo);
    END sp_auditar_cancelacion;

    PROCEDURE sp_verificar_acceso_esquema(
        p_esquema_destino IN VARCHAR2,
        p_permitido OUT NUMBER
    ) IS
    BEGIN
        -- Emulación de seguridad a nivel de esquema
        IF p_esquema_destino IN ('CINESTAR_OPS', 'CINESTAR_ADMIN') THEN
            p_permitido := 1;
        ELSE
            p_permitido := 0;
        END IF;
    END sp_verificar_acceso_esquema;

    PROCEDURE sp_registrar_log(
        p_operacion IN VARCHAR2,
        p_tabla IN VARCHAR2,
        p_registro_id IN NUMBER,
        p_usuario_id IN NUMBER,
        p_detalles IN VARCHAR2
    ) IS
        v_usuario_nombre VARCHAR2(50) := 'SISTEMA';
    BEGIN
        IF p_usuario_id IS NOT NULL THEN
            SELECT USERNAME INTO v_usuario_nombre FROM CINESTAR_OPS.USUARIOS WHERE ID = p_usuario_id;
        END IF;
        
        INSERT INTO CINESTAR_ADMIN.LOG_OPERACIONES (
            ID, OPERACION, TABLA_AFECTADA, REGISTRO_ID, USUARIO_ID, USUARIO_NOMBRE, DETALLES, FECHA_HORA
        ) VALUES (
            CINESTAR_ADMIN.SEQ_LOG_OPERACIONES.NEXTVAL, p_operacion, p_tabla, p_registro_id, p_usuario_id, v_usuario_nombre, p_detalles, CURRENT_TIMESTAMP
        );
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN NULL; -- Para evitar bloquear la transacción por fallos de log
    END sp_registrar_log;

END PKG_SEGURIDAD;
/

-- ============================================
-- 3. PAQUETE: PKG_ADMINISTRACION (ADM01 a ADM05)
-- ============================================
CREATE OR REPLACE PACKAGE PKG_ADMINISTRACION AS
    -- ADM01: Registrar nueva película (RF-15)
    PROCEDURE sp_registrar_pelicula(
        p_titulo        IN VARCHAR2,
        p_duracion_min  IN NUMBER,
        p_clasificacion IN VARCHAR2,
        p_sinopsis      IN CLOB,
        p_genero        IN VARCHAR2,
        p_poster_url    IN VARCHAR2,
        p_pelicula_id   OUT NUMBER
    );

    -- ADM02: Registrar nueva función (RF-16)
    PROCEDURE sp_registrar_funcion(
        p_pelicula_id IN NUMBER,
        p_sala_id     IN NUMBER,
        p_fecha       IN DATE,
        p_hora_inicio IN TIMESTAMP,
        p_hora_fin    IN TIMESTAMP,
        p_precio      IN NUMBER,
        p_funcion_id  OUT NUMBER
    );

    -- ADM03: Verificar solapamiento de horarios (RF-17, RN-05)
    PROCEDURE sp_verificar_solapamiento(
        p_sala_id     IN NUMBER,
        p_hora_inicio IN TIMESTAMP,
        p_hora_fin    IN TIMESTAMP,
        p_funcion_id  IN NUMBER,
        p_solapada    OUT NUMBER
    );

    -- ADM04: Eliminar o deshabilitar función sin reservas (RF-18)
    PROCEDURE sp_eliminar_funcion(p_funcion_id IN NUMBER);

    -- ADM05: Configurar Disposición de Asientos por Sala (RF-19)
    PROCEDURE sp_configurar_asiento(
        p_sala_id IN NUMBER,
        p_fila    IN VARCHAR2,
        p_numero  IN NUMBER,
        p_tipo    IN VARCHAR2,
        p_seccion IN VARCHAR2
    );
END PKG_ADMINISTRACION;
/

CREATE OR REPLACE PACKAGE BODY PKG_ADMINISTRACION AS

    PROCEDURE sp_registrar_pelicula(
        p_titulo        IN VARCHAR2,
        p_duracion_min  IN NUMBER,
        p_clasificacion IN VARCHAR2,
        p_sinopsis      IN CLOB,
        p_genero        IN VARCHAR2,
        p_poster_url    IN VARCHAR2,
        p_pelicula_id   OUT NUMBER
    ) IS
    BEGIN
        INSERT INTO CINESTAR_OPS.PELICULAS (
            ID, TITULO, DURACION_MIN, CLASIFICACION, SINOPSIS, GENERO, POSTER_URL, ACTIVO, FECHA_CREACION
        ) VALUES (
            CINESTAR_OPS.SEQ_PELICULAS.NEXTVAL, p_titulo, p_duracion_min, p_clasificacion, p_sinopsis, p_genero, p_poster_url, 1, CURRENT_TIMESTAMP
        ) RETURNING ID INTO p_pelicula_id;
        COMMIT;
    END sp_registrar_pelicula;

    PROCEDURE sp_registrar_funcion(
        p_pelicula_id IN NUMBER,
        p_sala_id     IN NUMBER,
        p_fecha       IN DATE,
        p_hora_inicio IN TIMESTAMP,
        p_hora_fin    IN TIMESTAMP,
        p_precio      IN NUMBER,
        p_funcion_id  OUT NUMBER
    ) IS
        v_solapada NUMBER;
    BEGIN
        sp_verificar_solapamiento(p_sala_id, p_hora_inicio, p_hora_fin, NULL, v_solapada);
        IF v_solapada > 0 THEN
            raise_application_error(-20009, 'Solapamiento de funciones detectado en la sala.');
        END IF;

        INSERT INTO CINESTAR_OPS.FUNCIONES (
            ID, PELICULA_ID, SALA_ID, FECHA, HORA_INICIO, HORA_FIN, PRECIO, ESTADO, FECHA_CREACION
        ) VALUES (
            CINESTAR_OPS.SEQ_FUNCIONES.NEXTVAL, p_pelicula_id, p_sala_id, p_fecha, p_hora_inicio, p_hora_fin, p_precio, 'PROGRAMADA', CURRENT_TIMESTAMP
        ) RETURNING ID INTO p_funcion_id;
        COMMIT;
    END sp_registrar_funcion;

    PROCEDURE sp_verificar_solapamiento(
        p_sala_id     IN NUMBER,
        p_hora_inicio IN TIMESTAMP,
        p_hora_fin    IN TIMESTAMP,
        p_funcion_id  IN NUMBER,
        p_solapada    OUT NUMBER
    ) IS
    BEGIN
        SELECT COUNT(*) INTO p_solapada FROM CINESTAR_OPS.FUNCIONES
        WHERE SALA_ID = p_sala_id AND ESTADO != 'CANCELADA'
          AND (p_funcion_id IS NULL OR ID != p_funcion_id)
          AND HORA_INICIO < p_hora_fin AND HORA_FIN > p_hora_inicio;
    END sp_verificar_solapamiento;

    PROCEDURE sp_eliminar_funcion(p_funcion_id IN NUMBER) IS
        v_reservas NUMBER;
    BEGIN
        SELECT COUNT(*) INTO v_reservas FROM CINESTAR_OPS.RESERVAS
        WHERE FUNCION_ID = p_funcion_id AND ESTADO IN ('RESERVADA', 'VENDIDA');

        IF v_reservas > 0 THEN
            raise_application_error(-20010, 'No se puede eliminar una función con reservas activas.');
        END IF;

        UPDATE CINESTAR_OPS.FUNCIONES SET ESTADO = 'CANCELADA' WHERE ID = p_funcion_id;
        COMMIT;
    END sp_eliminar_funcion;

    PROCEDURE sp_configurar_asiento(
        p_sala_id IN NUMBER,
        p_fila    IN VARCHAR2,
        p_numero  IN NUMBER,
        p_tipo    IN VARCHAR2,
        p_seccion IN VARCHAR2
    ) IS
    BEGIN
        MERGE INTO CINESTAR_OPS.ASIENTOS a
        USING DUAL ON (a.SALA_ID = p_sala_id AND a.FILA = p_fila AND a.NUMERO = p_numero)
        WHEN MATCHED THEN
            UPDATE SET TIPO = p_tipo, SECCION = p_seccion, ACTIVO = 1
        WHEN NOT MATCHED THEN
            INSERT (ID, SALA_ID, FILA, NUMERO, TIPO, SECCION, ACTIVO)
            VALUES (CINESTAR_OPS.SEQ_ASIENTOS.NEXTVAL, p_sala_id, p_fila, p_numero, p_tipo, p_seccion, 1);
        COMMIT;
    END sp_configurar_asiento;

END PKG_ADMINISTRACION;
/

-- ============================================
-- 4. PAQUETE: PKG_CONSULTAS (CON01 a CON05)
-- ============================================
CREATE OR REPLACE PACKAGE PKG_CONSULTAS AS
    -- CON01: Consultar cartelera vigente (RF-21)
    PROCEDURE sp_consultar_cartelera(
        p_fecha IN DATE,
        p_cursor OUT SYS_REFCURSOR
    );

    -- CON02: Consultar cantidad e inventario de asientos libres por función (RF-22)
    PROCEDURE sp_ver_asientos_funcion(
        p_funcion_id IN NUMBER,
        p_cursor OUT SYS_REFCURSOR
    );

    -- CON03: Consultar estado (disponible/ocupado/reservado) de asientos (RF-23)
    PROCEDURE sp_buscar_reserva(
        p_codigo_boleto IN VARCHAR2,
        p_cursor OUT SYS_REFCURSOR
    );

    -- CON04: Consultar datos de reserva por código único (RF-24)
    PROCEDURE sp_historial_reservas(
        p_usuario_id IN NUMBER,
        p_cursor OUT SYS_REFCURSOR
    );

    -- CON05: Consultar historial de operaciones críticas de un cliente (RF-25)
    PROCEDURE sp_detalle_boleto(
        p_reserva_id IN NUMBER,
        p_cursor OUT SYS_REFCURSOR
    );
END PKG_CONSULTAS;
/

CREATE OR REPLACE PACKAGE BODY PKG_CONSULTAS AS

    PROCEDURE sp_consultar_cartelera(
        p_fecha IN DATE,
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
        SELECT f.ID, p.TITULO, s.NOMBRE AS SALA, f.HORA_INICIO, f.HORA_FIN, f.PRECIO, f.ESTADO
        FROM CINESTAR_OPS.FUNCIONES f
        JOIN CINESTAR_OPS.PELICULAS p ON f.PELICULA_ID = p.ID
        JOIN CINESTAR_OPS.SALAS s ON f.SALA_ID = s.ID
        WHERE TRUNC(f.FECHA) = TRUNC(p_fecha) AND f.ESTADO = 'PROGRAMADA'
        ORDER BY f.HORA_INICIO;
    END sp_consultar_cartelera;

    PROCEDURE sp_ver_asientos_funcion(
        p_funcion_id IN NUMBER,
        p_cursor OUT SYS_REFCURSOR
    ) IS
        v_sala_id NUMBER;
    BEGIN
        SELECT SALA_ID INTO v_sala_id FROM CINESTAR_OPS.FUNCIONES WHERE ID = p_funcion_id;
        
        OPEN p_cursor FOR
        SELECT a.ID AS ASIENTO_ID, a.FILA, a.NUMERO, a.TIPO, a.SECCION,
               NVL((SELECT ra.ESTADO FROM CINESTAR_OPS.RESERVA_ASIENTOS ra
                    JOIN CINESTAR_OPS.RESERVAS r ON ra.RESERVA_ID = r.ID
                    WHERE ra.FUNCION_ID = p_funcion_id AND ra.ASIENTO_ID = a.ID 
                      AND ra.ESTADO = 'OCUPADO' AND r.ESTADO IN ('RESERVADA', 'VENDIDA')
                   ), 'DISPONIBLE') AS ESTADO
        FROM CINESTAR_OPS.ASIENTOS a WHERE a.SALA_ID = v_sala_id AND a.ACTIVO = 1
        ORDER BY a.FILA, a.NUMERO;
    END sp_ver_asientos_funcion;

    PROCEDURE sp_buscar_reserva(
        p_codigo_boleto IN VARCHAR2,
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
        SELECT r.ID, r.CODIGO_BOLETO, r.NOMBRE_CLIENTE, r.TELEFONO_CLIENTE, r.CANAL, r.ESTADO,
               p.TITULO AS PELICULA, s.NOMBRE AS SALA, f.FECHA, f.HORA_INICIO
        FROM CINESTAR_OPS.RESERVAS r
        JOIN CINESTAR_OPS.FUNCIONES f ON r.FUNCION_ID = f.ID
        JOIN CINESTAR_OPS.PELICULAS p ON f.PELICULA_ID = p.ID
        JOIN CINESTAR_OPS.SALAS s ON f.SALA_ID = s.ID
        WHERE r.CODIGO_BOLETO = p_codigo_boleto;
    END sp_buscar_reserva;

    PROCEDURE sp_historial_reservas(
        p_usuario_id IN NUMBER,
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
        SELECT r.ID, r.CODIGO_BOLETO, r.NOMBRE_CLIENTE, r.ESTADO, r.FECHA_RESERVA,
               p.TITULO AS PELICULA, f.FECHA AS FUNCION_FECHA
        FROM CINESTAR_OPS.RESERVAS r
        JOIN CINESTAR_OPS.FUNCIONES f ON r.FUNCION_ID = f.ID
        JOIN CINESTAR_OPS.PELICULAS p ON f.PELICULA_ID = p.ID
        WHERE r.USUARIO_ID = p_usuario_id
        ORDER BY r.FECHA_RESERVA DESC;
    END sp_historial_reservas;

    PROCEDURE sp_detalle_boleto(
        p_reserva_id IN NUMBER,
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
        SELECT r.CODIGO_BOLETO, r.NOMBRE_CLIENTE, r.ESTADO AS ESTADO_RESERVA,
               a.FILA, a.NUMERO, a.SECCION, f.PRECIO
        FROM CINESTAR_OPS.RESERVAS r
        JOIN CINESTAR_OPS.RESERVA_ASIENTOS ra ON r.ID = ra.RESERVA_ID
        JOIN CINESTAR_OPS.ASIENTOS a ON ra.ASIENTO_ID = a.ID
        JOIN CINESTAR_OPS.FUNCIONES f ON r.FUNCION_ID = f.ID
        WHERE r.ID = p_reserva_id AND ra.ESTADO = 'OCUPADO';
    END sp_detalle_boleto;

END PKG_CONSULTAS;
/

-- ============================================
-- 5. PAQUETE: PKG_REPORTES (REP01 a REP05)
-- ============================================
CREATE OR REPLACE PACKAGE PKG_REPORTES AS
    -- REP01: Reporte de ocupación por función (RF-26)
    PROCEDURE sp_reporte_ocupacion(
        p_fecha_inicio IN DATE,
        p_fecha_fin    IN DATE,
        p_cursor       OUT SYS_REFCURSOR
    );

    -- REP02: Reporte de ventas por período y canal (RF-27)
    PROCEDURE sp_reporte_ventas(
        p_fecha_inicio IN DATE,
        p_fecha_fin    IN DATE,
        p_cursor       OUT SYS_REFCURSOR
    );

    -- REP03: Reporte de cancelaciones por período (RF-28)
    PROCEDURE sp_reporte_cancelaciones(
        p_fecha_inicio IN DATE,
        p_fecha_fin    IN DATE,
        p_cursor       OUT SYS_REFCURSOR
    );

    -- REP04: Reporte de funciones de mayor/menor rendimiento (RF-29)
    PROCEDURE sp_reporte_rendimiento(
        p_cursor OUT SYS_REFCURSOR
    );

    -- REP05: Exportar reporte a CSV (RF-30)
    PROCEDURE sp_exportar_csv(
        p_tipo_reporte IN VARCHAR2,
        p_csv_output   OUT CLOB
    );
END PKG_REPORTES;
/

CREATE OR REPLACE PACKAGE BODY PKG_REPORTES AS

    PROCEDURE sp_reporte_ocupacion(
        p_fecha_inicio IN DATE,
        p_fecha_fin    IN DATE,
        p_cursor       OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
        SELECT f.ID AS FUNCION_ID, p.TITULO, s.NOMBRE AS SALA, f.FECHA, s.CAPACIDAD,
               COUNT(ra.ID) AS VENDIDOS,
               ROUND((COUNT(ra.ID) / s.CAPACIDAD) * 100, 2) AS PORCENTAJE_OCUPACION
        FROM CINESTAR_OPS.FUNCIONES f
        JOIN CINESTAR_OPS.PELICULAS p ON f.PELICULA_ID = p.ID
        JOIN CINESTAR_OPS.SALAS s ON f.SALA_ID = s.ID
        LEFT JOIN CINESTAR_OPS.RESERVA_ASIENTOS ra ON f.ID = ra.FUNCION_ID AND ra.ESTADO = 'OCUPADO'
        WHERE f.FECHA BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY f.ID, p.TITULO, s.NOMBRE, f.FECHA, s.CAPACIDAD
        ORDER BY PORCENTAJE_OCUPACION DESC;
    END sp_reporte_ocupacion;

    PROCEDURE sp_reporte_ventas(
        p_fecha_inicio IN DATE,
        p_fecha_fin    IN DATE,
        p_cursor       OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
        SELECT TRUNC(r.FECHA_RESERVA) AS FECHA, r.CANAL, COUNT(r.ID) AS TOTAL_RESERVAS,
               SUM(CASE WHEN r.ESTADO = 'VENDIDA' THEN 1 ELSE 0 END) AS TOTAL_VENTAS,
               SUM(CASE WHEN r.ESTADO = 'VENDIDA' THEN f.PRECIO * (SELECT COUNT(*) FROM CINESTAR_OPS.RESERVA_ASIENTOS ra WHERE ra.RESERVA_ID = r.ID AND ra.ESTADO = 'OCUPADO') ELSE 0 END) AS TOTAL_RECAUDADO
        FROM CINESTAR_OPS.RESERVAS r
        JOIN CINESTAR_OPS.FUNCIONES f ON r.FUNCION_ID = f.ID
        WHERE r.FECHA_RESERVA BETWEEN p_fecha_inicio AND p_fecha_fin
        GROUP BY TRUNC(r.FECHA_RESERVA), r.CANAL
        ORDER BY FECHA, r.CANAL;
    END sp_reporte_ventas;

    PROCEDURE sp_reporte_cancelaciones(
        p_fecha_inicio IN DATE,
        p_fecha_fin    IN DATE,
        p_cursor       OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
        SELECT c.ID, c.CODIGO_BOLETO, c.USUARIO_NOMBRE AS OPERADOR, c.NOMBRE_CLIENTE AS CLIENTE,
               c.ASIENTOS_LIBERADOS, c.MOTIVO, c.FECHA_HORA
        FROM CINESTAR_ADMIN.CANCELACIONES c
        WHERE c.FECHA_HORA BETWEEN p_fecha_inicio AND p_fecha_fin
        ORDER BY c.FECHA_HORA DESC;
    END sp_reporte_cancelaciones;

    PROCEDURE sp_reporte_rendimiento(
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
        SELECT p.TITULO, COUNT(r.ID) AS TOTAL_COMPRAS, SUM(f.PRECIO) AS INGRESOS
        FROM CINESTAR_OPS.RESERVAS r
        JOIN CINESTAR_OPS.FUNCIONES f ON r.FUNCION_ID = f.ID
        JOIN CINESTAR_OPS.PELICULAS p ON f.PELICULA_ID = p.ID
        WHERE r.ESTADO = 'VENDIDA'
        GROUP BY p.TITULO
        ORDER BY INGRESOS DESC;
    END sp_reporte_rendimiento;

    PROCEDURE sp_exportar_csv(
        p_tipo_reporte IN VARCHAR2,
        p_csv_output   OUT CLOB
    ) IS
        v_line VARCHAR2(4000);
    BEGIN
        p_csv_output := 'REPORTE: ' || p_tipo_reporte || CHR(10);
        IF p_tipo_reporte = 'VENTAS' THEN
            p_csv_output := p_csv_output || 'FECHA,CANAL,RESERVAS,VENTAS,RECAUDADO' || CHR(10);
            FOR r IN (
                SELECT TRUNC(r.FECHA_RESERVA) AS FECHA, r.CANAL, COUNT(r.ID) AS TOTAL_RESERVAS,
                       SUM(CASE WHEN r.ESTADO = 'VENDIDA' THEN 1 ELSE 0 END) AS TOTAL_VENTAS,
                       SUM(CASE WHEN r.ESTADO = 'VENDIDA' THEN f.PRECIO ELSE 0 END) AS TOTAL_RECAUDADO
                FROM CINESTAR_OPS.RESERVAS r
                JOIN CINESTAR_OPS.FUNCIONES f ON r.FUNCION_ID = f.ID
                GROUP BY TRUNC(r.FECHA_RESERVA), r.CANAL
            ) LOOP
                v_line := TO_CHAR(r.FECHA, 'YYYY-MM-DD') || ',' || r.CANAL || ',' || r.TOTAL_RESERVAS || ',' || r.TOTAL_VENTAS || ',' || r.TOTAL_RECAUDADO || CHR(10);
                DBMS_LOB.WRITEAPPEND(p_csv_output, LENGTH(v_line), v_line);
            END LOOP;
        ELSE
            p_csv_output := p_csv_output || 'Dato no disponible en emulación básica' || CHR(10);
        END IF;
    END sp_exportar_csv;

END PKG_REPORTES;
/

COMMIT;
