/**
 * 共享图层剪贴板 (Shared Clipboard)
 * 让“复制”可以在其他窗口 / 其他工程标签页粘贴：
 *   1. 同一浏览器的所有窗口共享 localStorage 里的剪贴板内容（主通道，立即生效）。
 *   2. 同时写入系统文本剪贴板（带前缀），供粘贴事件与其它浏览器实例使用（兜底）。
 *   3. BroadcastChannel 通知其它窗口刷新提示文字。
 * 剪贴板内容只保存像素数据与来源信息，不含任何工程文件内容。
 */
window.PE = window.PE || {};

(() => {
  'use strict';

  const STORAGE_KEY = 'pixel-studio-shared-clipboard';
  const CHANNEL_NAME = 'pixel-studio-clipboard';
  const KIND = 'pe-frame-clip';
  const VERSION = 1;
  const TEXT_PREFIX = 'pixel-studio-clip:';
  // 共享剪贴板的有效期：超过 30 分钟视为过期，避免几天前的旧内容被误粘贴。
  const MAX_AGE = 30 * 60 * 1000;

  const listeners = new Set();
  let channel = null;

  // 每个窗口一个编号，用来判断“这条剪贴板消息是不是我自己产生的”。
  const WINDOW_ID = 'w-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);

  function storage() {
    try { if (typeof localStorage !== 'undefined' && localStorage) return localStorage; } catch (error) { /* 隐私模式等 */ }
    return null;
  }

  function bytesToBase64(bytes) {
    if (typeof btoa === 'function') {
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
      return btoa(binary);
    }
    return Buffer.from(bytes).toString('base64');
  }

  function base64ToBytes(text) {
    if (typeof atob === 'function') {
      const binary = atob(text);
      const bytes = new Uint8ClampedArray(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    return new Uint8ClampedArray(Buffer.from(text, 'base64'));
  }

  function notify(payload) {
    for (const listener of listeners) {
      try { listener(payload); } catch (error) { console.warn('共享剪贴板回调失败', error); }
    }
  }

  function broadcast(message) {
    if (!channel) {
      try { channel = new BroadcastChannel(CHANNEL_NAME); } catch (error) { channel = null; }
      if (channel) {
        channel.onmessage = event => {
          const message = event.data || {};
          if (message.from === WINDOW_ID) return;
          if (message.type === 'clipboard-updated') notify(message.payload || null);
        };
      }
    }
    try { channel?.postMessage({ ...message, from: WINDOW_ID }); } catch (error) { /* 通道已关闭 */ }
  }

  function parseText(text) {
    if (typeof text !== 'string' || !text) return null;
    const raw = text.startsWith(TEXT_PREFIX) ? text.slice(TEXT_PREFIX.length) : text;
    try {
      const payload = JSON.parse(raw);
      return payload && payload.kind === KIND ? payload : null;
    } catch (error) { return null; }
  }

  const SharedClipboard = {
    KIND,
    VERSION,
    TEXT_PREFIX,
    WINDOW_ID,

    /**
     * 把内部剪贴板对象编码成可跨窗口传输的纯数据。
     * @param {{pixels:ImageData,x:number,y:number,pixelCount:number,partial?:boolean}} clip
     * @param {object} meta 来源信息（图层名、素材表、动作、帧）
     */
    encodeClip(clip, meta = {}) {
      const pixels = clip.pixels;
      if (!pixels || !pixels.width || !pixels.height) return null;      let data = pixels.data, width = pixels.width, height = pixels.height;
      let x = clip.x, y = clip.y;
      if (!pixels.placement) {
        // 普通像素选区裁掉透明外框，体积更小、粘贴位置更贴近原处。
        let left = width, top = height, right = -1, bottom = -1;
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            if (pixels.data[(row * width + col) * 4 + 3]) {
              if (col < left) left = col;
              if (col > right) right = col;
              if (row < top) top = row;
              if (row > bottom) bottom = row;
            }
          }
        }
        if (right < 0) return null;
        const w = right - left + 1, h = bottom - top + 1;
        const trimmed = new Uint8ClampedArray(w * h * 4);
        for (let row = 0; row < h; row++) {
          const start = ((row + top) * width + left) * 4;
          trimmed.set(pixels.data.subarray(start, start + w * 4), row * w * 4);
        }
        data = trimmed; width = w; height = h; x += left; y += top;
      }
      return {
        kind: KIND,
        version: VERSION,
        createdAt: Date.now(),
        x, y, width, height,
        placement: pixels.placement ? { ...pixels.placement } : null,
        partial: !!clip.partial,
        pixelCount: clip.pixelCount || 0,
        source: {
          layerName: meta.layerName || '',
          layerIndex: Number.isSafeInteger(meta.layerIndex) ? meta.layerIndex : -1,
          layerSheetIndex: Number.isSafeInteger(meta.layerSheetIndex) ? meta.layerSheetIndex : -1,
          sheetIndex: Number.isSafeInteger(meta.sheetIndex) ? meta.sheetIndex : -1,
          actionIndex: Number.isSafeInteger(meta.actionIndex) ? meta.actionIndex : -1,
          frameIndex: Number.isSafeInteger(meta.frameIndex) ? meta.frameIndex : -1,
          opacity: typeof meta.opacity === 'number' ? meta.opacity : 1,
          projectId: meta.projectId || null
        },
        data: bytesToBase64(data)
      };
    },

    /**
     * 解码跨窗口传来的剪贴板数据，返回与 FrameEditing 一致的像素结构。
     * @param {object} payload
     */
    decodePayload(payload) {
      if (!payload || payload.kind !== KIND || payload.version > VERSION) return null;
      if (payload.createdAt && Date.now() - payload.createdAt > MAX_AGE) return null;
      const width = payload.width, height = payload.height;
      if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) return null;
      let bytes;
      try { bytes = base64ToBytes(payload.data || ''); } catch (error) { return null; }
      if (bytes.length !== width * height * 4) return null;
      const pixels = new ImageData(width, height);
      pixels.data.set(bytes);
      if (payload.placement && ['x', 'y', 'w', 'h'].every(k => Number.isFinite(payload.placement[k]))) {
        pixels.placement = { ...payload.placement };
      }
      return {
        detached: true,
        project: null,
        ref: null,
        pixels,
        x: payload.x || 0,
        y: payload.y || 0,
        pixelCount: payload.pixelCount || 0,
        partial: !!payload.partial,
        createdAt: payload.createdAt || 0,
        source: payload.source || {}
      };
    },

    /**
     * 保存剪贴板内容并广播给其它窗口。
     * @param {object} payload
     */
    save(payload) {
      if (!payload) return false;
      const text = TEXT_PREFIX + JSON.stringify(payload);
      const store = storage();
      if (store) {
        try { store.setItem(STORAGE_KEY, text); } catch (error) { console.warn('共享剪贴板写入失败', error); }
      }
      // 只通知别的窗口；本窗口自己知道刚复制了什么。
      broadcast({ type: 'clipboard-updated', payload, at: payload.createdAt });
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
      } catch (error) { /* 系统剪贴板不可用 */ }
      return true;
    },

    /** 读取当前共享剪贴板内容（同步）。 */
    load() {
      const payload = this.loadPayload();
      return payload ? this.decodePayload(payload) : null;
    },

    /** 读取原始负载对象（不解码像素）；过期的内容视为不存在。 */
    loadPayload() {
      const store = storage();
      if (!store) return null;
      let payload = null;
      try { payload = parseText(store.getItem(STORAGE_KEY)); } catch (error) { return null; }
      if (!payload) return null;
      if (!payload.createdAt || Date.now() - payload.createdAt > MAX_AGE) return null;
      return payload;
    },

    /** 从系统文本剪贴板读取（需要用户手势，异步）。 */
    async loadFromSystem() {
      try {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) return null;
        const text = await navigator.clipboard.readText();
        return this.decodePayload(parseText(text));
      } catch (error) { return null; }
    },

    /** 解析粘贴事件里的文本。 */
    decodeText(text) {
      return this.decodePayload(parseText(text));
    },

    clear() {
      const store = storage();
      try { store?.removeItem(STORAGE_KEY); } catch (error) { /* 忽略 */ }
      broadcast({ type: 'clipboard-updated', payload: null, at: Date.now() });
    },

    /** 注册提示回调：其它窗口有新的复制内容时通知。 */
    onUpdate(listener) {
      if (typeof listener === 'function') listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };

  PE.SharedClipboard = SharedClipboard;
})();
