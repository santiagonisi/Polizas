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
- **Carga asistida:** importación `.xlsx` con plantilla, validación y bandeja de revisión; lectura de PDF con extracción de texto y OCR opcional.

## Carga asistida de pólizas

Desde **Carga asistida** se puede descargar la plantilla Excel o cargar hasta diez PDF por lote. Las filas Excel y los campos extraídos de PDF quedan pendientes y no crean pólizas hasta que una persona los revise y confirme. La importación valida fechas, moneda, tipo, obra, aseguradora y números duplicados; las filas observadas se pueden descargar para corregirlas y volver a importar.

Los PDF con texto seleccionable se leen directamente. En documentos escaneados se aplica OCR en español sobre las primeras cinco páginas; el texto de las primeras doce páginas se conserva para revisión. Tesseract descarga el modelo de idioma la primera vez, por lo que ese primer procesamiento necesita acceso a Internet. La extracción automática es una sugerencia, no una verificación del documento.

Las etiquetas particulares de cada aseguradora se configuran en **Aseguradoras > Editar > Etiquetas de extracción PDF**. Se pueden escribir varias etiquetas separadas por comas, por ejemplo `Número de póliza, Póliza N°`.
