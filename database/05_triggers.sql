-- ============================================
-- CineStar Barrio — Triggers de Auditoría
-- Esquema: CINESTAR_OPS
-- (RF-14) Log de operaciones críticas
-- ============================================

ALTER SESSION SET CONTAINER = XEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = CINESTAR_OPS;

-- ─── Trigger: Log al crear/actualizar reservas ───
CREATE OR REPLACE TRIGGER TRG_LOG_RESERVAS
AFTER INSERT OR UPDATE ON CINESTAR_OPS.RESERVAS
FOR EACH ROW
DECLARE
    v_operacion VARCHAR2(50);
    v_detalles  VARCHAR2(4000);
    v_usuario   VARCHAR2(50);
BEGIN
    -- Obtener nombre de usuario
    BEGIN
        SELECT USERNAME INTO v_usuario 
        FROM CINESTAR_OPS.USUARIOS 
        WHERE ID = :NEW.USUARIO_ID;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            v_usuario := 'SISTEMA';
    END;

    IF INSERTING THEN
        v_operacion := 'CREAR_RESERVA';
        v_detalles := 'Boleto: ' || :NEW.CODIGO_BOLETO || 
                      ', Cliente: ' || :NEW.NOMBRE_CLIENTE || 
                      ', Canal: ' || :NEW.CANAL ||
                      ', Estado: ' || :NEW.ESTADO;
    ELSIF UPDATING THEN
        v_operacion := 'ACTUALIZAR_RESERVA';
        v_detalles := 'Boleto: ' || :NEW.CODIGO_BOLETO || 
                      ', Estado anterior: ' || :OLD.ESTADO || 
                      ', Estado nuevo: ' || :NEW.ESTADO;
    END IF;

    INSERT INTO CINESTAR_ADMIN.LOG_OPERACIONES 
        (ID, OPERACION, TABLA_AFECTADA, REGISTRO_ID, USUARIO_ID, USUARIO_NOMBRE, DETALLES, FECHA_HORA)
    VALUES 
        (CINESTAR_ADMIN.SEQ_LOG_OPERACIONES.NEXTVAL, v_operacion, 'RESERVAS', :NEW.ID, :NEW.USUARIO_ID, v_usuario, v_detalles, CURRENT_TIMESTAMP);
END;
/

-- ─── Trigger: Log al crear funciones ───
CREATE OR REPLACE TRIGGER TRG_LOG_FUNCIONES
AFTER INSERT ON CINESTAR_OPS.FUNCIONES
FOR EACH ROW
DECLARE
    v_pelicula VARCHAR2(200);
    v_sala     VARCHAR2(50);
BEGIN
    BEGIN
        SELECT TITULO INTO v_pelicula FROM CINESTAR_OPS.PELICULAS WHERE ID = :NEW.PELICULA_ID;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN v_pelicula := 'Desconocida';
    END;
    
    BEGIN
        SELECT NOMBRE INTO v_sala FROM CINESTAR_OPS.SALAS WHERE ID = :NEW.SALA_ID;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN v_sala := 'Desconocida';
    END;

    INSERT INTO CINESTAR_ADMIN.LOG_OPERACIONES 
        (ID, OPERACION, TABLA_AFECTADA, REGISTRO_ID, USUARIO_ID, USUARIO_NOMBRE, DETALLES, FECHA_HORA)
    VALUES 
        (CINESTAR_ADMIN.SEQ_LOG_OPERACIONES.NEXTVAL, 'CREAR_FUNCION', 'FUNCIONES', :NEW.ID, NULL, 'SISTEMA', 
         'Película: ' || v_pelicula || ', Sala: ' || v_sala || ', Fecha: ' || TO_CHAR(:NEW.FECHA, 'YYYY-MM-DD'),
         CURRENT_TIMESTAMP);
END;
/

COMMIT;
