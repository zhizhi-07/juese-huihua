/* Photoshop-style dockable panels: tear a panel off its sidebar, drag it anywhere,
   and drop it back into either sidebar. Layout is remembered per browser. */
window.PE = window.PE || {};

(() => {
  'use strict';

  const STORAGE_KEY = 'pixel-panel-layout-v2';
  const DRAG_THRESHOLD = 5;
  const MIN_FLOAT_WIDTH = 180;
  const MAX_FLOAT_WIDTH = 520;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  document.addEventListener('DOMContentLoaded', () => {
    const left = document.getElementById('left-sidebar');
    const right = document.getElementById('right-sidebar');
    if (!left || !right) return;

    const panels = new Map();
    let dragging = null;

    const panelId = (section, index) => {
      if (section.querySelector('#sheet-list')) return 'sheets';
      if (section.querySelector('#action-list')) return 'actions';
      if (section.querySelector('#palette-container')) return 'palette';
      if (section.querySelector('#layer-list')) return 'layers';
      if (section.classList.contains('preview-card')) return 'preview';
      return section.id || `panel-${index}`;
    };

    const headerOf = section => section.style ? section.querySelector(':scope > .section-header') : null;

    function ensureHeader(section) {
      let header = headerOf(section);
      if (header) return header;
      header = document.createElement('div');
      header.className = 'section-header dock-synth-header';
      const title = document.createElement('strong');
      title.textContent = section.querySelector('h3')?.textContent?.trim() || '预览';
      header.append(title);
      section.prepend(header);
      return header;
    }

    function attach(section, id) {
      if (section.dataset.dockId) return;
      section.dataset.dockId = id;
      section.classList.add('dock-panel');

      const header = ensureHeader(section);
      header.classList.add('dock-handle');
      section.__dockHeader = header;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dock-float-btn';
      button.textContent = '⤢';
      button.title = '浮动 / 收回（也可以直接拖标题）';
      button.addEventListener('pointerdown', event => event.stopPropagation());
      button.addEventListener('click', event => {
        event.stopPropagation();
        if (section.classList.contains('is-floating')) dockInto(section, left.dataset.fallbackSide === 'left' ? left : (section.dataset.dockSide === 'left' ? left : right), Infinity);
        else floatPanel(section);
        save();
      });
      header.append(button);

      header.addEventListener('pointerdown', event => startDrag(event, section));
      panels.set(id, section);
    }

    function startDrag(event, section) {
      if (event.button !== 0) return;
      if (event.target.closest('button, input, select, textarea, a, summary')) return;
      const rect = section.getBoundingClientRect();
      dragging = {
        section,
        header: event.currentTarget,
        startX: event.clientX,
        startY: event.clientY,
        dx: event.clientX - rect.left,
        dy: event.clientY - rect.top,
        moved: false
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.addEventListener('pointermove', onDragMove);
      event.currentTarget.addEventListener('pointerup', onDragEnd);
      event.currentTarget.addEventListener('pointercancel', onDragEnd);
      event.preventDefault();
    }

    function onDragMove(event) {
      const drag = dragging;
      if (!drag) return;
      if (!drag.moved) {
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD) return;
        drag.moved = true;
        if (!drag.section.classList.contains('is-floating')) floatPanel(drag.section, drag.dx, drag.dy);
        drag.section.classList.add('is-dragging');
      }
      const x = clamp(event.clientX - drag.dx, 0, window.innerWidth - 120);
      const y = clamp(event.clientY - drag.dy, 0, window.innerHeight - 48);
      drag.section.style.left = `${x}px`;
      drag.section.style.top = `${y}px`;
      highlightDock(event.clientX, event.clientY);
    }

    function onDragEnd(event) {
      const drag = dragging;
      dragging = null;
      if (!drag) return;
      drag.header.removeEventListener('pointermove', onDragMove);
      drag.header.removeEventListener('pointerup', onDragEnd);
      drag.header.removeEventListener('pointercancel', onDragEnd);
      drag.section.classList.remove('is-dragging');
      clearDockHighlight();
      if (drag.moved) {
        const side = sideAt(event.clientX, event.clientY);
        if (side) dockInto(drag.section, side, event.clientY);
      }
      save();
    }

    function floatPanel(section, offsetX, offsetY) {
      if (section.classList.contains('is-floating')) return;
      const rect = section.getBoundingClientRect();
      const width = clamp(rect.width || 260, MIN_FLOAT_WIDTH, MAX_FLOAT_WIDTH);
      section.dataset.dockSide = section.dataset.dockSide || (left.contains(section) ? 'left' : 'right');
      section.classList.add('is-floating');
      document.body.append(section);
      section.style.width = `${width}px`;
      section.style.left = `${clamp(rect.left, 0, window.innerWidth - 120)}px`;
      section.style.top = `${clamp(rect.top, 0, window.innerHeight - 48)}px`;
      // 拖出来时鼠标相对标题的位置保持不变，避免窗口跳一下
      if (offsetX === undefined) return;
      const button = section.__dockHeader?.querySelector('.dock-float-btn');
      if (button) { button.textContent = '⇤'; button.title = '收回侧栏'; }
    }

    function dockInto(section, sidebar, clientY) {
      section.classList.remove('is-floating', 'is-dragging');
      section.style.left = '';
      section.style.top = '';
      section.style.width = '';
      const button = section.__dockHeader?.querySelector('.dock-float-btn');
      if (button) { button.textContent = '⤢'; button.title = '浮动 / 收回（也可以直接拖标题）'; }

      const siblings = [...sidebar.children].filter(el => el.classList?.contains('dock-panel') && el !== section);
      const anchor = siblings.find(el => {
        const rect = el.getBoundingClientRect();
        return clientY < rect.top + rect.height / 2;
      });
      if (anchor) sidebar.insertBefore(section, anchor);
      else sidebar.append(section);
      section.dataset.dockSide = sidebar === left ? 'left' : 'right';
    }

    function sidesAt() {
      return [
        { sidebar: right, rect: right.getBoundingClientRect() },
        { sidebar: left, rect: left.getBoundingClientRect() }
      ];
    }

    function sideAt(x, y) {
      for (const { sidebar, rect } of sidesAt()) {
        if (x >= rect.left - 8 && x <= rect.right + 8 && y >= rect.top && y <= rect.bottom) return sidebar;
      }
      return null;
    }

    function highlightDock(x, y) {
      const target = sideAt(x, y);
      for (const { sidebar } of sidesAt()) sidebar.classList.toggle('dock-hover', sidebar === target);
    }

    function clearDockHighlight() {
      left.classList.remove('dock-hover');
      right.classList.remove('dock-hover');
    }

    function save() {
      const data = { order: { left: [], right: [] }, float: {} };
      for (const sidebar of [left, right]) {
        const side = sidebar === left ? 'left' : 'right';
        for (const child of sidebar.children) {
          if (child.dataset?.dockId) data.order[side].push(child.dataset.dockId);
        }
      }
      for (const section of document.querySelectorAll('.dock-panel.is-floating')) {
        const rect = section.getBoundingClientRect();
        data.float[section.dataset.dockId] = { left: Math.round(rect.left), top: Math.round(rect.top), width: Math.round(rect.width) };
      }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (error) { /* 隐私模式下存不了，不影响使用 */ }
    }

    function restore() {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (error) { data = null; }

      if (!data || !data.order) {
        // 首次使用：按你的要求把图层放到左栏
        const layers = panels.get('layers');
        if (layers && left.contains(layers)) {
          const guide = [...left.children].find(el => !el.classList?.contains('dock-panel') && el !== layers);
          left.insertBefore(layers, guide || null);
          layers.dataset.dockSide = 'left';
        }
        for (const section of panels.values()) {
          if (!section.dataset.dockSide) section.dataset.dockSide = left.contains(section) ? 'left' : 'right';
        }
        return;
      }

      for (const [side, ids] of Object.entries(data.order || {})) {
        const sidebar = side === 'left' ? left : right;
        for (const id of ids) {
          const section = panels.get(id);
          if (!section) continue;
          sidebar.append(section);
          section.dataset.dockSide = side;
        }
      }
      for (const [id, position] of Object.entries(data.float || {})) {
        const section = panels.get(id);
        if (!section) continue;
        section.dataset.dockSide = section.dataset.dockSide || 'right';
        floatPanel(section);
        section.style.left = `${clamp(position.left, 0, window.innerWidth - 120)}px`;
        section.style.top = `${clamp(position.top, 0, window.innerHeight - 48)}px`;
        section.style.width = `${clamp(position.width || 260, MIN_FLOAT_WIDTH, MAX_FLOAT_WIDTH)}px`;
      }
    }

    let index = 0;
    for (const sidebar of [left, right]) {
      for (const section of [...sidebar.children]) {
        const isPanel = section.classList?.contains('panel-section') || section.classList?.contains('preview-card');
        if (!isPanel) continue;
        attach(section, panelId(section, index++));
      }
    }

    restore();

    window.addEventListener('resize', () => {
      for (const section of document.querySelectorAll('.dock-panel.is-floating')) {
        const rect = section.getBoundingClientRect();
        section.style.left = `${clamp(rect.left, 0, window.innerWidth - 120)}px`;
        section.style.top = `${clamp(rect.top, 0, window.innerHeight - 48)}px`;
      }
    });

    PE.resetPanelLayout = () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* ignore */ }
      location.reload();
    };

    const viewbar = document.querySelector('#center-viewport .canvas-viewbar .view-actions');
    if (viewbar) {
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'subtle-button';
      reset.textContent = '重置面板';
      reset.title = '把所有面板摆回默认位置';
      reset.onclick = () => PE.resetPanelLayout();
      viewbar.append(reset);
    }
  });
})();
