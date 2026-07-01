// Script to generate bcrypt hashes for seed users
// Run: node generate-hashes.js
const bcrypt = require('bcryptjs');

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const operadorHash = await bcrypt.hash('operador123', 10);

  console.log('Admin hash:', adminHash);
  console.log('Operador hash:', operadorHash);
}

main();
