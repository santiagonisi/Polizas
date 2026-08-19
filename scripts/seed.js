require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initModels, Usuario, Aseguradora, Obra } = require('../models');

async function seed() {
  await initModels();

  const existente = await Usuario.findOne({ where: { email: 'admin@iarsa.com' } });
  if (!existente) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await Usuario.create({
      nombre: 'Administrador',
      email: 'admin@iarsa.com',
      password: passwordHash,
      rol: 'admin'
    });
    console.log('Usuario admin creado -> email: admin@iarsa.com / password: admin123');
  } else {
    console.log('El usuario admin ya existe.');
  }

  const aseguradoras = ['Aseguradora Federal Argentina', 'Nación Seguros', 'San Cristóbal Seguros'];
  for (const razonSocial of aseguradoras) {
    const existe = await Aseguradora.findOne({ where: { razonSocial } });
    if (!existe) {
      await Aseguradora.create({ razonSocial });
    }
  }

  console.log('Seed finalizado.');
  process.exit(0);
}

seed().catch((error) => {
  console.error('Error al ejecutar el seed:', error);
  process.exit(1);
});
