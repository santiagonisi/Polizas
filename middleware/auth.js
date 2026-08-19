function requireAuth(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }
  return res.redirect('/auth/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.rol === 'admin') {
    return next();
  }
  req.session.flash = { type: 'danger', msg: 'No tenés permisos para acceder a esta sección.' };
  return res.redirect('/');
}

// Deja disponible el usuario logueado en todas las vistas
function loadUser(req, res, next) {
  res.locals.usuario = req.session.usuario || null;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
}

module.exports = { requireAuth, requireAdmin, loadUser };
