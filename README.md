# 🛣️ Pólizas Vial

Sistema de gestión y control de pólizas de caución para obras de construcción vial.

## Stack

- **Backend:** Node.js + Express (arquitectura MVC)
- **Vistas:** EJS + Bootstrap 5 (responsive)
- **Base de datos:** SQLite + Sequelize ORM (escalable a PostgreSQL/MySQL sin reescribir modelos)
- **Autenticación:** Sesiones (express-session) + bcrypt
- **Scripts auxiliares:** Python (reportes/exportaciones en `scripts/python`)

## Estructura del proyecto

```
Polizas/
├── config/            # Configuración de base de datos
├── controllers/        # Lógica de negocio (dashboard, polizas, obras, aseguradoras, auth)
├── middleware/          # Autenticación, subida de archivos
├── models/              # Modelos Sequelize (Usuario, Poliza, Obra, Aseguradora)
├── routes/              # Rutas Express por módulo
├── views/                # Plantillas EJS (layout, partials, módulos)
├── public/               # CSS, JS e imágenes estáticas
├── uploads/              # PDFs de pólizas subidos (no versionado)
├── database/             # Archivo SQLite (no versionado)
├── scripts/
│   ├── seed.js           # Usuario admin y datos iniciales
│   └── python/            # Reportes y utilidades en Python
└── server.js             # Punto de entrada de la aplicación
```

## Módulos actuales

- **Pólizas:** alta, edición, baja, carga de PDF, control de vencimientos.
- **Obras:** comitente, montos de contrato, estado de ejecución.
- **Aseguradoras:** compañías emisoras de pólizas.
- **Usuarios:** login con roles (admin / usuario).
- **Panel de Control:** indicadores y pólizas próximas a vencer (30 días).

## Puesta en marcha

```bash
npm install
copy .env.example .env
npm run seed      # crea usuario admin@iarsa.com / admin123
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Roadmap (próximos pasos)

- Notificaciones automáticas de vencimiento de pólizas.
- Exportación a Excel/PDF desde la interfaz web.
- Gestión de usuarios desde la UI (alta/edición de roles).
- Auditoría de cambios (historial de pólizas).
