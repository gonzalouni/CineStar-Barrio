-- ============================================
-- CineStar Barrio — Procedimientos Almacenados
-- Esquema: CINESTAR_OPS
-- Control de concurrencia (RF-08, RNF-01)
-- ============================================

ALTER SESSION SET CONTAINER = XEPDB1;
ALTER SESSION SET CURRENT_SCHEMA = CINESTAR_OPS;

-- ─── Función: Generar código de boleto único (RF-03) ───
CREATE OR REPLACE FUNCTION FN_GENERAR_CODIGO_BOLETO
RETURN VARCHAR2
IS
    v_codigo VARCHAR2(20);
    v_existe NUMBER;
BEGIN
    LOOP
        -- Formato: CS-YYYYMMDD-XXXXX (CS = CineStar)
        v_codigo := 'CS-' || TO_CHAR(SYSDATE, 'YYYYMMDD') || '-' || 
                    LPAD(TRUNC(DBMS_RANDOM.VALUE(10000, 99999)), 5, '0');
        
        SELECT COUNT(*) INTO v_existe 
        FROM CINESTAR_OPS.RESERVAS 
        WHERE CODIGO_BOLETO = v_codigo;
        
        EXIT WHEN v_existe = 0;
    END LOOP;
    
    RETURN v_codigo;
END;
/

-- ─── Procedimiento: Verificar solapamiento de funciones (RF-17, RN-05) ───
CREATE OR REPLACE PROCEDURE SP_VERIFICAR_SOLAPAMIENTO(
    p_sala_id     IN NUMBER,
    p_hora_inicio IN TIMESTAMP,
    p_hora_fin    IN TIMESTAMP,
    p_funcion_id  IN NUMBER DEFAULT NULL,
    p_solapada    OUT NUMBER
)
IS
BEGIN
    SELECT COUNT(*) INTO p_solapada
    FROM CINESTAR_OPS.FUNCIONES
    WHERE SALA_ID = p_sala_id
      AND ESTADO != 'CANCELADA'
      AND (p_funcion_id IS NULL OR ID != p_funcion_id)
      AND HORA_INICIO < p_hora_fin
      AND HORA_FIN > p_hora_inicio;
END;
/

COMMIT;
