const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
const filename = `backup_${timestamp}.json`;

const backupData = {
  timestamp: new Date().toISOString(),
  tables: {
    users: [{ id: 1, username: '01', isAdmin: 1 }],
    products: [],
    movements: [],
    accounts: []
  }
};

fs.writeFileSync(path.join(backupDir, filename), JSON.stringify(backupData, null, 2));
console.log('✅ Backup criado:', filename);
console.log('📁 Localização:', path.join(backupDir, filename));