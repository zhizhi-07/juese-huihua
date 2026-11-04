/* Drawing kit: shape tools, symmetry stroke mirroring and a quieter canvas area. */
window.PE = window.PE || {};

(() => {
  'use strict';

  PE.shapeShift = false;

  const SHAPES = [
    { tool: 'line', label: '直线', key: 'L', path: 'M4 20L20 4' },
    { tool: 'rect', label: '矩形', key: 'U', path: 'M4 6h16v12H4z' },
    { tool: 'ellipse', label: '椭圆', key: 'O', path: 'M4 12a8 6 0 1 0 16 0a8 6 0 1 0-16 0' }
  ];

  const SYMMETRY_ORDER = ['none', 'x', 'y', 'both'];
  const SYMMETRY_LABEL = { none: '关', x: '左右', y: '上下', both: '四向' };

  document.addEventListener('DOMContentLoaded', () => {
    const app = PE.app;
    if (!app || !app.toolManager) return;

    const node = (tag, className, text) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text) element.textContent = text;
      return element;
    };

    setTool(app, 'pencil');

    const rail = document.querySelector('.tool-rail');
    const history = rail?.querySelector('.rail-history');

    const shapeButtons = [];
    if (rail) {
      for (const shape of SHAPES) {
        const button = node('button', 'tool-btn shape-tool');
        button.type = 'button';
        button.dataset.tool = shape.tool;
        button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${shape.path}"/></svg><span>${shape.label}</span><kbd>${shape.key}</kbd>`;
        button.title = `${shape.label} (${shape.key}) · 拖动绘制，按住 Shift 锁定角度`;
        button.setAttribute('aria-label', shape.label);
        button.onclick = () => {
          app.toolManager.setTool(shape.tool);
          app.updateToolbar();
        };
        (history ? rail.insertBefore : rail.append).call(rail, button, history || undefined);
        shapeButtons.push(button);
      }

      const symmetry = node('button', 'tool-btn symmetry-tool');
      symmetry.type = 'button';
      symmetry.id = 'symmetry-toggle';
      symmetry.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M8 7L4 12l4 5M16 7l4 5-4 5"/></svg><span>对称</span><kbd>Q</kbd>';
      symmetry.setAttribute('aria-label', '对称绘制');
      symmetry.onclick = () => {
        cycleSymmetry(app, 1);
      };
      (history ? rail.insertBefore : rail.append).call(rail, symmetry, history || undefined);
      symmetry.title = '对称绘制 (Q) · 按住 Shift 反向切换';
      PE.symmetryButton = symmetry;
      refreshSymmetry(app);
    }

    // 修饰键只影响笔触，不参与绘画，所以单独跟踪。
    window.addEventListener('keydown', event => {
      if (event.key === 'Shift') PE.shapeShift = true;
      if (event.key === 'Alt') PE.altPrecision = true;
    });
    window.addEventListener('keyup', event => {
      if (event.key === 'Shift') PE.shapeShift = false;
      if (event.key === 'Alt') PE.altPrecision = false;
    });
    window.addEventListener('blur', () => { PE.shapeShift = false; PE.altPrecision = false; });

    const updateToolbar = app.updateToolbar.bind(app);
    app.updateToolbar = function () {
      updateToolbar();
      const current = app.toolManager.currentTool;
      for (const button of shapeButtons) {
        button.classList.toggle('active', button.dataset.tool === current);
        button.setAttribute('aria-pressed', button.dataset.tool === current ? 'true' : 'false');
      }
    };

    // 形状工具在框选 / 移动之外也要能 Esc 取消，避免画到一半卡住。
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && app.toolManager._shape) {
        event.preventDefault();
        app.toolManager.cancelShape();
      }
      if (event.key.toLowerCase() === 'q' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        event.preventDefault();
        cycleSymmetry(app, event.shiftKey ? -1 : 1);
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      const shape = SHAPES.find(item => item.key.toLowerCase() === event.key.toLowerCase());
      if (!shape) return;
      event.preventDefault();
      app.toolManager.setTool(shape.tool);
      app.updateToolbar();
    });

    buildAuxToggle();
    buildPerfectToggle(app);
  });

  function buildPerfectToggle(app) {
    const viewbar = document.querySelector('#center-viewport .canvas-viewbar .view-actions');
    if (!viewbar) return;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'subtle-button perfect-toggle active';
    toggle.textContent = '像素完美';
    toggle.title = '去双拐角：斜线和弧线不会留下 L 形多余像素（按住 Alt 临时画单像素）';
    toggle.setAttribute('aria-pressed', 'true');
    const sync = on => {
      app.toolManager.pixelPerfect = on;
      // 切换后从新手势起算，否则正在涂抹的笔迹会沿用切换前的拐角状态。
      app.toolManager._perfect = null;
      toggle.classList.toggle('active', on);
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      try { localStorage.setItem('pe-pixel-perfect', on ? '1' : '0'); } catch {}
    };
    toggle.onclick = () => sync(app.toolManager.pixelPerfect === false);
    let saved = null;
    try { saved = localStorage.getItem('pe-pixel-perfect'); } catch {}
    if (saved === '0') sync(false);
    viewbar.append(toggle);
  }

  function setTool(app, name) {
    app.toolManager.setTool(name);
    app.updateToolbar();
  }

  function cycleSymmetry(app, step) {
    const tools = app.toolManager;
    const index = SYMMETRY_ORDER.indexOf(tools.symmetry || 'none');
    const next = SYMMETRY_ORDER[(index + step + SYMMETRY_ORDER.length) % SYMMETRY_ORDER.length];
    tools.symmetry = next;
    refreshSymmetry(app);
    app.canvasManager?.render();
  }

  function refreshSymmetry(app) {
    const button = PE.symmetryButton;
    if (!button) return;
    const mode = app.toolManager.symmetry || 'none';
    button.dataset.mode = mode;
    button.classList.toggle('active', mode !== 'none');
    button.setAttribute('aria-pressed', mode !== 'none' ? 'true' : 'false');
    const label = button.querySelector('span');
    if (label) label.textContent = mode === 'none' ? '对称' : `对称·${SYMMETRY_LABEL[mode]}`;
  }

  // 主画布上下本来堆了三四条常驻工具条，收起来后留给画面。
  function buildAuxToggle() {
    const viewbar = document.querySelector('#center-viewport .canvas-viewbar .view-actions');
    if (!viewbar) return;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'subtle-button aux-toggle';
    toggle.textContent = '图像工具';
    toggle.title = '显示 / 隐藏抠图、帧编辑等辅助工具条';
    toggle.onclick = () => {
      const hidden = document.body.classList.toggle('hide-aux-bars');
      toggle.classList.toggle('active', !hidden);
      toggle.setAttribute('aria-pressed', !hidden ? 'true' : 'false');
      PE.app?.canvasManager?.render();
    };
    toggle.classList.add('active');
    toggle.setAttribute('aria-pressed', 'true');
    viewbar.append(toggle);
  }
})();
