<div align="center">

<img src="public/icon.png" alt="MOP-SG Logo" width="120" style="border-radius: 18%; box-shadow: 0 10px 30px rgba(0,0,0,0.25);" />

# MOP-SG · Mi Operación Personal — Seamos Genios

> **Sistema Operativo Ejecutivo de Decisión y Control del Tiempo para Seamos Genios.**  
> Elimina la incertidumbre operativa y le dice al equipo fundador exactamente qué hacer ahora mismo.

[![Next.js 16](https://img.shields.io/badge/Next.js-16_(App_Router)-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![pnpm 11](https://img.shields.io/badge/Package_Manager-pnpm_11-F69220?style=for-the-badge&logo=pnpm)](https://pnpm.io/)
[![Dexie.js](https://img.shields.io/badge/Storage-Local--First_(Dexie/IndexedDB)-00A86B?style=for-the-badge)](https://dexie.org/)
[![Status](https://img.shields.io/badge/Status-Playtest_Nov_2026-BB271A?style=for-the-badge)](#hacia-el-playtest-noviembre-2026)

</div>

---

## 1. La Tesis del Sistema: ¿Por qué MOP-SG?

Los equipos fundadores de startups en etapas intensivas enfrentan una sobrecarga cognitiva constante:
* **Entregables y tareas dispersas:** Notas de WhatsApp, chats de Discord, repositorios y tableros.
* **Hitos críticos inminentes:** Fechas de lanzamiento inamovibles (como el **Playtest de mediados de noviembre**).
* **Múltiples socios con frentes distintos:** Diseño, video, marketing, arquitectura de software, soporte y pedagogía.
* **Tiempo libre real:** Rara vez se calcula contrastando la disponibilidad real de cada socio contra las horas requeridas.

La pregunta que responde **MOP-SG** cada minuto no es *«¿Qué tareas tengo en la lista?»*, sino:

> **«Son las 3:15 p.m., faltan 18 días para el Playtest y tengo un hueco libre de 2 horas. ¿Qué entregable crítico debo ejecutar ya mismo para evitar que mi área colapse el cronograma del equipo?»**

---

## 2. Los Socios Fundadores & Áreas Operativas

MOP-SG integra asignación y filtrado por responsable en todas las vistas (Tareas, Hitos, Radar de Atrasos y Dashboard):

| Socio | ID | Especialidad & Roles Operativos | Color Avatar |
| :--- | :--- | :--- | :--- |
| **Leon** | `member-leon` | Administración, Marketing, Diseño & Video | Grafito (`#3F3F46`) |
| **Dani** | `member-dani` | Desarrollo, Administración & Soporte | Piedra (`#78716C`) |
| **Ángel** | `member-angel` | Administración & Docencia / Pedagogía | Pizarra (`#475569`) |

Los avatares usan una paleta sobria neutra para evitar colisiones visuales con los estados de semáforo del sistema.

---

## 3. Principios de Diseño: "SG con Calma"

* **Una Sola Respuesta:** El panel de inicio evita la saturación visual. Destaca un único centro de decisión operativo claro.
* **El Único Botón Rojo:** El color de marca rojo (`#BB271A` en modo claro, `#DC382D` en modo oscuro) está reservado **exclusivamente** para el botón de acción principal (*"Empezar"*) y para estados de riesgo crítico comprobado.
* **Estados en Atención:** Se representan en tono ámbar (`var(--warn)`), garantizando una jerarquía visual armónica.
* **Modo Oscuro Auténtico:** Negro cálido (`#0A0A0A` / `#161616`), optimizado para largas jornadas de trabajo enfocado.

---

## 4. Módulos y Capacidades

### 4.1. Buzón de Captura Rápida (`QuickCaptureBar`)
* **Experiencia Conversacional:** Permite pegar texto informal de WhatsApp o notas rápidas.
* **Inferencia Dinámica:** Detecta automáticamente qué socio es responsable comparando el texto con los nombres de la tabla `members` (eliminando mayúsculas y tildes mediante normalización `NFD`).
* **Diseño Responsive:**
  * En **móvil (`< md`)**: Barra fija en la parte inferior (`fixed bottom-0`) adaptada a la barra de inicio del iPhone (`env(safe-area-inset-bottom)`).
  * En **escritorio (`md:`)**: Integrada en la parte superior del dashboard.
* **Confirmación Previa:** Antes de persistir, muestra una tarjeta de validación para ajustar título, socio, área, fecha límite y minutos estimados.

### 4.2. Centro de Decisión Operativa (`DecisionHeroCard`)
* Identifica en tiempo real si te encuentras en un compromiso programado o en una franja libre.
* Recomienda con explicaciones auditables la acción inmediata de mayor impacto.
* Sub-tira ejecutiva con:
  1. *Siguiente en cola:* Segundo entregable prioritario y su responsable.
  2. *Cuenta regresiva al Playtest:* Conectada dinámicamente al hito cuyo título contenga *"Playtest"*.
  3. *Radar resumido:* Resumen de áreas al día o en atención sin fricción.

### 4.3. Radar de Atrasos Recalibrado
* **Desacoplado de Asistencia:** Se eliminó la presión por faltas académicas.
* **Comparación de Horas Reales vs Estimadas:**
  * En **vista individual**: Compara las horas estimadas de los entregables del socio contra sus huecos libres reales antes de la fecha del hito. Si las horas estimadas superan el tiempo disponible, activa alerta crítica.
  * En **vista de equipo**: Evalúa la inminencia de hitos compartidos (≤ 3 días) sin contrastar las tareas colectivas contra el calendario de una sola persona.

---

## 5. Arquitectura Técnica

```text
MOP-SG
├── src/
│   ├── app/                    # Rutas Next.js 16 (App Router)
│   │   ├── dashboard/          # Panel principal "Una Sola Respuesta"
│   │   ├── schedule/           # Horario semanal & disponibilidad
│   │   ├── tasks/              # Entregables por área y socio
│   │   ├── exams/              # Hitos & lanzamiento Playtest
│   │   ├── radar/              # Radar de Atrasos
│   │   ├── timeline/           # Cronología y semanas
│   │   └── globals.css         # Tokens de diseño Seamos Genios
│   ├── components/
│   │   ├── dashboard/          # DecisionHeroCard, widgets de horario y radar
│   │   ├── inbox/              # QuickCaptureBar (Buzón móvil y desktop)
│   │   └── layout/             # Sidebar y navegación sobria
│   ├── hooks/                  # useSemesterData (gestión de estado y Dexie)
│   ├── lib/
│   │   ├── academic-engine/    # Motor de cálculo: franjas libres y radar
│   │   ├── labels.ts           # Vocabulario operativo centralizado
│   │   └── storage/            # Base de datos local Dexie (MopSgDB)
│   └── types/                  # Contratos TypeScript
```

### Aislamiento de Almacenamiento
* **Dexie Database:** `MopSgDB` (completamente aislada de `MiSemestreDB`).
* **Prefijos de Configuración:** `mopsg_*` en `localStorage`.

---

## 6. Puesta en Marcha Local

### Prerrequisitos
* Node.js 20+
* pnpm 11 (`npm install -g pnpm`)

### Instalación y Ejecución
```bash
# 1. Clonar el repositorio
git clone https://github.com/luisrodriguez-rgb/MOP-SG.git
cd MOP-SG

# 2. Instalar dependencias
pnpm install

# 3. Iniciar el servidor de desarrollo
pnpm dev
```
La aplicación estará disponible en:
* `http://localhost:3000` (escritorio)
* `http://192.168.1.149:3000` (dispositivos móviles en la misma red Wi-Fi, habilitado vía `allowedDevOrigins`).

### Comprobaciones de Calidad
```bash
# Verificación estricta de TypeScript
pnpm exec tsc --noEmit

# Ejecutar suite de pruebas completa
pnpm test

# Compilación de producción
pnpm run build
```

---

## 7. Políticas de Desarrollo y Commits Atómicos

Este repositorio se rige bajo la regla de **Commits Profesionales, Atómicos y Descriptivos**:
* **1 commit = 1 cambio lógico:** Nunca se mezclan refactors, estilos y dependencias en un solo commit.
* **Conventional Commits:** Uso estricto de prefijos (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, `style:`).
* **Protección del Upstream:** El remoto original (`Mi-Semestre`) tiene la URL de push configurada en `DISABLED` para evitar sobrescrituras accidentales.
