const fs = require('fs');
const path = require('path');

function searchRecent(dir) {
  if (!fs.existsSync(dir)) return;
  const now = Date.now();
  for (const n of fs.readdirSync(dir)) {
    const full = path.join(dir, n);
    try {
      const s = fs.statSync(full);
      if (s.isFile() && (now - s.mtimeMs < 4 * 3600 * 1000)) {
        console.log('Recent file:', full, s.mtime.toLocaleTimeString(), s.size);
      }
    } catch {}
  }
}

searchRecent('C:/Users/Administrator/Desktop');
searchRecent('C:/Users/Administrator/Downloads');
searchRecent('C:/Users/Administrator/Desktop/角色绘画/自检记录');
searchRecent('C:/Users/Administrator/Desktop/角色绘画/data');
searchRecent('C:/Users/Administrator/Desktop/角色绘画/data/projects');
