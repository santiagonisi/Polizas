# Pólizas Vial

Sistema de gestión y control de pólizas de caución para obras de construcción vial.

## Stack

- **Backend:** Node.js + Express (arquitectura MVC)
- **Vistas:** EJS + Bootstrap 5 (responsive)
- **Base de datos:** SQLite + Sequelize ORM
- **Autenticación:** Sesiones (express-session) + bcryptjs
- **Scripts auxiliares:** Python para reportes y exportaciones

## Estructura del proyecto

```
Polizas/
├── config/            # Configuración de base de datos
├── controllers/       # Lógica de negocio por módulo
├── middleware/        # Autenticación y subida de archivos
├── models/            # Modelos Sequelize
├── routes/            # Rutas Express por módulo
├── views/             # Plantillas EJS y parciales
├── public/            # CSS, JavaScript e imágenes estáticas
├── uploads/           # PDFs de pólizas subidos
├── database/          # Archivo SQLite local
├── scripts/           # Semillas y utilidades
└── server.js          # Punto de entrada de la aplicación
```

## Módulos

- **Pólizas:** alta, edición, baja, carga de PDF y control de vencimientos.
- **Obras:** comitentes, montos de contrato y estado de ejecución.
- **Aseguradoras:** compañías emisoras de pólizas.
- **Usuarios:** autenticación y gestión de roles.
- **Panel de control:** indicadores y pólizas próximas a vencer.
