const { frameMap, boundsOf, loadProject, childLayer } = require('./pix.cjs');

const project = loadProject(process.argv[2] || 'main.json');
for (let si = 0; si < project.spriteSheets.length; si++) {
  const sheet = project.spriteSheets[si];
  sheet.actions.forEach((action, ai) => {
    const head = childLayer(project, si, action.direction, 'head');
    const body = childLayer(project, si, action.direction, 'body');
    action.frames.forEach((fr, fi) => {
      const key = `${si}_${ai}_${fi}`;
      const h = head && frameMap(head, key, fr.width, fr.height);
      const b = body && frameMap(body, key, fr.width, fr.height);
      const hb = h ? boundsOf(h.map, h.w) : null;
      const bb = b ? boundsOf(b.map, b.w) : null;
      console.log(`si${si} ${action.direction} f${fi} ${fr.width}x${fr.height} head ${hb ? `${hb.x0},${hb.y0}-${hb.x1},${hb.y1} (${hb.w}x${hb.h})` : 'none'} body ${bb ? `${bb.x0},${bb.y0}-${bb.x1},${bb.y1}` : 'none'}`);
    });
  });
}
