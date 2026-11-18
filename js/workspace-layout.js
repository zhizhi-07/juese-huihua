/* Move existing controls, keeping their listeners and the unsaved drawing intact. */
document.addEventListener('DOMContentLoaded', () => {
  const $ = selector => document.querySelector(selector);
  const menus = [];
  function menu(label, controls, host) {
    const details = document.createElement('details');
    details.className = 'workspace-menu';
    const summary = document.createElement('summary');
    summary.textContent = label;
    const content = document.createElement('div');
    content.className = 'workspace-menu-content';
    content.append(...controls.filter(Boolean));
    details.append(summary, content);
    host.append(details);
    details.addEventListener('toggle', () => {
      if (details.open) for (const other of menus) if (other !== details) other.open = false;
    });
    content.addEventListener('click', event => {
      if (event.target.closest('button')) details.open = false;
    });
    menus.push(details);
    return details;
  }

  const actions = $('.canvas-viewbar .view-actions');
  if (!actions) return;
  const controls = [...actions.children];
  const zoom = actions.querySelector('.zoom-control');
  const auxiliary = controls.filter(control => control.matches('.aux-toggle, .perfect-toggle, .plus-selection-toggle, .plus-outline-toggle'));
  const view = controls.filter(control => control !== zoom && !auxiliary.includes(control));
  menu('视图', view, actions);
  actions.append(...auxiliary);
  if (zoom) actions.append(zoom);

  const layers = $('#layer-list')?.closest('section');
  const layerActions = layers?.querySelector('.layer-header-actions');
  if (layerActions) {
    layers.querySelector('.section-header').after(layerActions);
    menu('更多', [...layerActions.children].filter(control => !['add-layer-btn', 'mirror-layer-btn', 'mirror-live-btn'].includes(control.id) && !control.classList.contains('layer-move')), layerActions);
  }

  const caption = $('.section-caption');
  if (caption) caption.hidden = true;

  const imageTools = $('.image-edit-toolbar');
  if (imageTools) {
    const freePlacementLabel = imageTools.querySelector('input[aria-label="无视像素格放置"]')?.closest('label');
    const positionFields = imageTools.querySelector('.image-position-fields');
    const resizeMode = imageTools.querySelector('.image-resize-mode');
    const primary = [...imageTools.children].filter(control =>
      control.tagName === 'STRONG' || control.hasAttribute('data-edit-status') ||
      control.matches('[data-edit-flip-x], [data-edit-flip-y]') ||
      control === freePlacementLabel || control === positionFields || control === resizeMode ||
      ['新建高清画布', '编辑高清画布'].includes(control.textContent.trim()));
    menu('抠图与缩放', [...imageTools.children].filter(control => !primary.includes(control)), imageTools);
  }
  const frameTools = $('.frame-edit-toolbar');
  if (frameTools) {
    menu('帧操作', [...frameTools.children].filter(control => control.tagName === 'BUTTON' &&
      !['copy-cel-btn', 'cut-cel-btn', 'paste-cel-btn', 'copy-next-cel-btn'].includes(control.id)), frameTools);
  }

  document.addEventListener('click', event => {
    for (const details of menus) if (!details.contains(event.target)) details.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    for (const details of menus) if (details.open) {
      details.open = false;
      details.querySelector('summary').focus();
    }
  });
});
