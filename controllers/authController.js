const bcrypt = require('bcryptjs');
const { Usuario } = require('../models');

exports.mostrarLogin = (req, res) => {
  res.render('auth/login', { title: 'Iniciar Sesión', layout: false });
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const usuario = await Usuario.findOne({ where: { email, estado: 'Activo' } });

    if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
      req.session.flash = { type: 'danger', msg: 'Credenciales inválidas.' };
      return res.redirect('/auth/login');
    }

    req.session.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol
    };
    return res.redirect('/');
  } catch (error) {
    console.error(error);
    req.session.flash = { type: 'danger', msg: 'Error al iniciar sesión.' };
    return res.redirect('/auth/login');
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/auth/login');
  });
};
