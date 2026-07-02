## Sistema de Gestión de Reservas y Venta de Entradas — CineStar Barrio

## 1. Introducción

### 1.1 Propósito
Este documento especifica los requerimientos funcionales, no funcionales, de negocio y restricciones del sistema de reservas y venta de entradas para "CineStar Barrio", con el objetivo de centralizar la información entre el canal de taquilla física y el canal de reservas telefónicas, eliminando la sobreventa de asientos y agilizando la atención al público.

### 1.2 Alcance
El sistema cubrirá la gestión de cartelera, funciones, salas, asientos, reservas, ventas y cancelaciones, en una aplicación cliente-servidor cuya base de datos se implementará obligatoriamente en Oracle 21c Express Edition, organizada en al menos 2 esquemas. El lenguaje de programación del cliente/servidor es libre a elección del equipo de desarrollo. No incluye pasarelas de pago en línea, programas de lealtad ni venta de alimentos.

### 1.3 Contexto del problema
Actualmente CineStar Barrio no cuenta con un sistema centralizado, lo que genera:
- Sobreventa de asientos por falta de sincronización en tiempo real entre taquilla y teléfono.
- Falta de visibilidad inmediata sobre disponibilidad de asientos.
- Verificaciones manuales que retrasan la atención al público.
- No existe información de auditoría de las funciones y reservas.

---

## 2. Requerimientos Funcionales

### 2.1 Requerimientos funcionales de negocio que agregan valor
Funcionalidades centrales que resuelven el problema de sobreventa y descoordinación entre canales, entregando el valor principal del sistema.

| ID | Descripción |
|----|-------------|
| RF-01 | El sistema debe permitir seleccionar y reservar asiento(s) disponibles para una función, ya sea por taquilla o por teléfono. |
| RF-02 | El sistema debe garantizar que un mismo asiento no pueda quedar asignado a más de una reserva para la misma función, sin importar el canal de origen. |
| RF-03 | El sistema debe generar un código único de boleto por cada reserva/venta confirmada. |
| RF-04 | El sistema debe impedir confirmar una reserva cuando el cupo total de la sala para esa función ya fue alcanzado, mostrando un mensaje claro al operador. |
| RF-05 | El sistema debe mostrar un mapa visual de asientos por función, indicando estado: disponible, ocupado o reservado. |
| RF-06 | El sistema debe permitir cancelar una reserva existente, liberando el/los asiento(s) asociado(s) de forma inmediata para nuevas reservas. |
| RF-07 | El sistema debe registrar el canal de origen de cada reserva (taquilla o telefónica). |
| RF-08 | Si dos operadores intentan reservar el mismo asiento simultáneamente, el sistema debe garantizar que solo uno de ellos tenga éxito. |

### 2.2 Requerimientos funcionales de seguridad
Control de acceso, autenticación y trazabilidad de acciones sobre el sistema.

| ID | Descripción |
|----|-------------|
| RF-09 | El sistema debe distinguir al menos dos roles de usuario: administrador y operador de taquilla, con permisos diferenciados. |
| RF-10 | El acceso al sistema debe requerir autenticación (usuario y contraseña) tanto en la terminal de taquilla como en el área administrativa. |
| RF-11 | El sistema debe restringir las operaciones de gestión de cartelera, funciones y salas exclusivamente al rol administrador. |
| RF-12 | El sistema debe registrar, para toda cancelación, el usuario que la ejecutó junto con la fecha y hora exacta. |
| RF-13 | El acceso a los datos de cada esquema de la base de datos debe estar restringido según el perfil/rol de la aplicación que lo consulta (p. ej., esquema operativo vs. esquema administrativo/auditoría). |
| RF-14 | El sistema debe registrar un historial (log) de operaciones críticas: creación de funciones, reservas, ventas y cancelaciones, con usuario y marca de tiempo. |

### 2.3 Requerimientos funcionales administrativos
Funcionalidades orientadas a la configuración y mantenimiento de la información base del cine.

| ID | Descripción |
|----|-------------|
| RF-15 | El administrador debe poder registrar nuevas películas (título, duración, clasificación, sinopsis, género). |
| RF-16 | El administrador debe poder crear funciones asociando una película a una sala, fecha y horario específicos. |
| RF-17 | El sistema debe impedir la creación de dos funciones en la misma sala con horarios que se superpongan. |
| RF-18 | El administrador debe poder editar o eliminar funciones que aún no tengan reservas confirmadas. |
| RF-19 | El administrador debe poder configurar la disposición de asientos de cada una de las 3 salas (~100 asientos cada una). |
| RF-20 | El administrador debe poder gestionar (crear, editar, desactivar) los usuarios/operadores del sistema y sus roles. |

### 2.4 Requerimientos funcionales de consultas
Funcionalidades para obtener información en tiempo real, sin necesidad de verificación manual.

| ID | Descripción |
|----|-------------|
| RF-21 | El sistema debe permitir consultar la cartelera vigente filtrando por película, sala, fecha u horario. |
| RF-22 | El personal de taquilla debe poder consultar en tiempo real la cantidad de asientos disponibles por función. |
| RF-23 | El sistema debe permitir consultar el estado (disponible/ocupado/reservado) de cada asiento de una función determinada. |
| RF-24 | El sistema debe permitir consultar los datos de una reserva o venta a partir del código único de boleto. |
| RF-25 | El sistema debe permitir consultar el historial de reservas, ventas y cancelaciones de un cliente o de una función específica. |

### 2.5 Requerimientos funcionales de reportes
Funcionalidades orientadas al análisis y control de gestión por parte del administrador.

| ID | Descripción |
|----|-------------|
| RF-26 | El sistema debe generar un reporte de ocupación (asientos vendidos/reservados vs. capacidad) por función, sala y fecha. |
| RF-27 | El sistema debe generar un reporte de ventas por período (diario, semanal), discriminando por canal (taquilla/telefónica). |
| RF-28 | El sistema debe generar un reporte de cancelaciones por período, indicando usuario responsable y motivo (si aplica). |
| RF-29 | El sistema debe generar un reporte de funciones con mayor y menor ocupación en un rango de fechas, para apoyo a la toma de decisiones. |
| RF-30 | El sistema debe permitir exportar los reportes generados en un formato estándar (p. ej., PDF o CSV). |

---

## 3. Requerimientos No Funcionales (RNF)

| ID | Categoría | Descripción |
|----|-----------|-------------|
| RNF-01 | Concurrencia | El sistema debe garantizar que, si dos operadores intentan reservar el mismo asiento simultáneamente, solo uno tenga éxito, mediante mecanismos de control de concurrencia a nivel de base de datos (bloqueos, transacciones con aislamiento adecuado o control optimista de versiones). |
| RNF-02 | Consistencia/Atomicidad | Toda operación de reserva o venta debe ejecutarse dentro de una transacción atómica en la base de datos Oracle 21c Express Edition, asegurando que no queden estados intermedios inconsistentes. |
| RNF-03 | Rendimiento | El sistema debe responder las consultas de disponibilidad de asientos en tiempo real (sin necesidad de verificación manual), soportando el volumen de 3 salas de ~100 asientos en operación simultánea. |
| RNF-04 | Disponibilidad | El sistema debe estar operativo durante el horario de funciones y atención al público, minimizando tiempos de caída. |
| RNF-05 | Usabilidad | La interfaz de taquilla debe permitir realizar una reserva/venta en pocos pasos, con el mapa de asientos visualmente claro. |
| RNF-06 | Arquitectura | El sistema debe implementarse como una aplicación cliente-servidor, con Oracle 21c Express Edition como motor de base de datos organizado en al menos 2 esquemas. El lenguaje de programación del cliente/servidor queda a elección del equipo de desarrollo. |
| RNF-07 | Escalabilidad | El diseño de base de datos y transacciones debe soportar el crecimiento en número de funciones y transacciones concurrentes sin degradar el control de sobreventa. |
| RNF-08 | Trazabilidad | Toda reserva, venta y cancelación debe quedar registrada con marca de tiempo y usuario responsable, para auditoría. |
| RNF-09 | Seguridad | El acceso al módulo administrativo debe estar restringido mediante autenticación diferenciada de la terminal de taquilla. |
| RNF-10 | Despliegue/Portabilidad | El sistema (base de datos Oracle 21c Express Edition, servidor de aplicación y cualquier otro componente necesario) debe estar dockerizado, mediante contenedores e imágenes reproducibles (p. ej., Dockerfile y docker-compose), de modo que cualquier integrante del equipo pueda levantar el entorno completo de forma local sin instalaciones manuales adicionales. |

---

## 4. Reglas de Negocio (RN)

| ID | Descripción |
|----|-------------|
| RN-01 | Un asiento no puede pertenecer a más de una reserva activa para la misma función. |
| RN-02 | No se puede confirmar una venta o reserva si el número de asientos ocupados/reservados de la función es igual a la capacidad de la sala. |
| RN-03 | Cada boleto emitido debe tener un código único e irrepetible. |
| RN-04 | Al cancelar una reserva, el asiento vuelve inmediatamente al estado "disponible". |
| RN-05 | No pueden crearse dos funciones en la misma sala cuyos horarios se solapen. |
| RN-06 | Toda cancelación debe registrar obligatoriamente usuario y hora de ejecución. |

---

## 5. Restricciones del Proyecto

| ID | Restricción |
|----|-------------|
| RST-01 | La base de datos debe implementarse obligatoriamente en Oracle 21c Express Edition. |
| RST-02 | La base de datos debe organizarse en al menos 2 esquemas (por ejemplo, separando el dominio operativo/transaccional del dominio administrativo/auditoría o reportes). |
| RST-03 | El lenguaje de programación de la aplicación cliente-servidor es libre, a elección del equipo de desarrollo. |
| RST-04 | Debe garantizarse consistencia en la reserva concurrente de asientos mediante transacciones atómicas en la base de datos. |
| RST-05 | El modelo de cine considera 3 salas de aproximadamente 100 asientos cada una; este volumen debe usarse como referencia en las pruebas. |
| RST-06 | No se contempla integración con pasarelas de pago en línea en esta primera versión. |
| RST-07 | Quedan fuera de alcance los programas de lealtad y la venta de alimentos. |
| RST-08 |Todo el sistema debe entregarse dockerizado (base de datos, servidor/aplicación y demás componentes), de manera que el equipo de trabajo pueda ejecutar y probar el sistema de forma local sin depender de instalaciones manuales del entorno. |

---

## 6. Alcance por Fases

| Fase | Contenido |
|------|-----------|
| Fase 1 | Gestión de cartelera, funciones y reservas básicas (sin control avanzado de concurrencia). |
| Fase 2 | Implementación del control de concurrencia en base de datos y del mapa visual de asientos. |
| Fase 3 | Módulo de cancelaciones, con registro de auditoría (usuario y hora). |

---

## 7. Glosario

- **Función**: proyección de una película en una sala, fecha y horario específicos.
- **Reserva**: apartado de uno o más asientos para una función, sin necesariamente completar el pago.
- **Venta**: confirmación de la reserva con emisión de boleto y código único.
- **Sobreventa**: situación en la que un mismo asiento es asignado a más de una reserva/venta.
- **Concurrencia**: acceso simultáneo de múltiples operadores al mismo recurso (asiento/función).