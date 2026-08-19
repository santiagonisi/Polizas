require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const session = require('express-session');
const methodOverride = require('method-override');
const expressLayouts = require('express-ejs-layouts');

const { initModels } = require('./models');
const { loadUser, requireAuth } = require('./middleware/auth');

const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');
const polizaRoutes = require('./routes/polizaRoutes');
const obraRoutes = require('./routes/obraRoutes');
const aseguradoraRoutes = require('./routes/aseguradoraRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middlewares generales
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Sesión
// Nota: se usa el MemoryStore por defecto para esta etapa inicial (desarrollo).
// Antes de producción, reemplazar por un store persistente (Redis, Postgres, etc).
app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto-dev',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8, // 8 horas
    httpOnly: true,
    sameSite: 'lax'
  }
}));

app.use(loadUser);

// Rutas
app.use('/auth', authRoutes);
app.use('/', requireAuth, dashboardRoutes);
app.use('/polizas', requireAuth, polizaRoutes);
app.use('/obras', requireAuth, obraRoutes);
app.use('/aseguradoras', requireAuth, aseguradoraRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Página no encontrada', layout: 'layout' });
});

async function start() {
  try {
    await initModels();
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

start();
