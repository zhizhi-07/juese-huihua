const fs = require('fs');
const path = require('path');

async function backupAndSave() {
  const res = await fetch('http://127.0.0.1:8765/api/project?id=main');
  const etag = res.headers.get('etag');
  const project = await res.json();

  const backupDir = path.join(__dirname, '..', '备份');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `shared-project-backup-${timestamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(project, null, 2), 'utf8');

  console.log('Backed up main project to:', backupPath);
  console.log('Current ETag:', etag);
  fs.writeFileSync(path.join(__dirname, 'latest_etag.txt'), etag || '');
}

backupAndSave().catch(console.error);
