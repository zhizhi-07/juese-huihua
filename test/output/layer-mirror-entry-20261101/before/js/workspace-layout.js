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
  menu('辅助工具', auxiliary, actions);
  if (zoom) actions.append(zoom);

  const layers = $('#layer-list')?.closest('section');
  const layerActions = layers?.querySelector('.layer-header-actions');
  if (layerActions) {
    layers.querySelector('.section-header').after(layerActions);
    menu('更多', [...layerActions.children].filter(control => control.id !== 'add-layer-btn' && !control.classList.contains('layer-move')), layerActions);
  }

  const timing = $('.timeline-timing');
  if (timing) menu('帧设置', [timing], $('.timeline-header'));
  const hands = $('#show-hands')?.closest('label');
  if (hands) $('.canvas-options')?.append(hands);
  const caption = $('.section-caption');
  if (caption) caption.hidden = true;

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
