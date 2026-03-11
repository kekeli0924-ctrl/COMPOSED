import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function backupDatabase() {
  const dbPath = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(__dirname, 'data', 'nxtply.db');

  const backupDir = process.env.BACKUP_DIR
    ? path.resolve(process.env.BACKUP_DIR)
    : path.join(__dirname, 'data', 'backups');

  if (!fs.existsSync(dbPath)) {
    console.log('No database file to backup');
    return null;
  }

  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `nxtply-${timestamp}.db`);

  fs.copyFileSync(dbPath, backupPath);
  console.log(`Database backed up to: ${backupPath}`);

  // Keep only the last 7 backups
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith('nxtply-') && f.endsWith('.db'))
    .sort()
    .reverse();

  for (const old of backups.slice(7)) {
    fs.unlinkSync(path.join(backupDir, old));
    console.log(`Removed old backup: ${old}`);
  }

  return backupPath;
}

// Run directly: node server/backup.js
if (process.argv[1] && process.argv[1].includes('backup.js')) {
  backupDatabase();
}
