/**
 * animation.js - Animation playback controller and preview renderer
 */
window.PE = window.PE || {};

(function(PE) {
  'use strict';

  class AnimationPlayer {
    constructor() {
      this.playing = false;
      this.fps = 8;
      this.loop = true;
      this.currentFrame = 0;
      this.totalFrames = 0;
      this.timer = null;
      this.canvas = null;         // animation preview canvas element
      this.ctx = null;
      this.project = null;
      this.canvasManager = null;  // to get composite image data
      this.onFrameChange = null;  // callback(frameIndex)
      this.previewScale = 2;      // scale for preview
      this.sheetIndex = 0;
      this.actionIndex = 0;
    }

    /**
     * Initialize animation player with canvas and managers
     * @param {HTMLCanvasElement} canvas 
     * @param {PE.Project} project 
     * @param {PE.CanvasManager} canvasManager 
     */
    init(canvas, project, canvasManager) {
      this.canvas = canvas;
      this.project = project;
      this.canvasManager = canvasManager;

      if (this.canvas) {
        this.ctx = this.canvas.getContext('2d');
        if (this.ctx) {
          this.ctx.imageSmoothingEnabled = false;
        }
        this.canvas.style.imageRendering = 'pixelated';
      }

      this.sheetIndex = project?.currentSheetIndex || 0;
      this.actionIndex = project?.currentActionIndex || 0;

      const sheet = project?.spriteSheets?.[this.sheetIndex];
      const action = sheet?.actions?.[this.actionIndex];
      this.totalFrames = action?.frames?.length || 0;
      this.currentFrame = 0;

      if (sheet?.fps) {
        this.fps = sheet.fps;
      }

      this._renderPreviewFrame();
    }

    /**
     * Set which action to play
     * @param {number} sheetIndex 
     * @param {number} actionIndex 
     */
    setAction(sheetIndex, actionIndex) {
      this.sheetIndex = Number(sheetIndex) || 0;
      this.actionIndex = Number(actionIndex) || 0;

      const sheet = this.project?.spriteSheets?.[this.sheetIndex];
      const action = sheet?.actions?.[this.actionIndex];
      this.totalFrames = action?.frames?.length || 0;
      this.currentFrame = 0;

      if (sheet?.fps) {
        this.setFPS(sheet.fps);
      }

      this._renderPreviewFrame();

      if (typeof this.onFrameChange === 'function') {
        try {
          this.onFrameChange(this.currentFrame);
        } catch (err) {
          console.error('onFrameChange 回调出错:', err);
        }
      }
    }

    /**
     * Start animation playback
     */
    play() {
      if (this.playing) return;

      // Refresh total frames in case frames were updated
      const action = this.project?.spriteSheets?.[this.sheetIndex]?.actions?.[this.actionIndex];
      this.totalFrames = action?.frames?.length || 0;

      if (this.totalFrames <= 0) return;

      this.playing = true;

      if (this.timer) {
        clearTimeout(this.timer);
      }
      this._schedule();
    }

    /**
     * Pause animation playback
     */
    pause() {
      this.playing = false;
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
    }

    /**
     * Stop animation playback and reset to frame 0
     */
    stop() {
      this.pause();
      this.currentFrame = 0;
      this._renderPreviewFrame();

      if (typeof this.onFrameChange === 'function') {
        try {
          this.onFrameChange(this.currentFrame);
        } catch (err) {
          console.error('onFrameChange 回调出错:', err);
        }
      }
    }

    /**
     * Step to next frame
     */
    nextFrame() {
      this.pause();
      const action = this.project?.spriteSheets?.[this.sheetIndex]?.actions?.[this.actionIndex];
      this.totalFrames = action?.frames?.length || 0;

      if (this.totalFrames <= 0) return;

      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
      this._renderPreviewFrame();

      if (typeof this.onFrameChange === 'function') {
        try {
          this.onFrameChange(this.currentFrame);
        } catch (err) {
          console.error('onFrameChange 回调出错:', err);
        }
      }
    }

    /**
     * Step to previous frame
     */
    prevFrame() {
      this.pause();
      const action = this.project?.spriteSheets?.[this.sheetIndex]?.actions?.[this.actionIndex];
      this.totalFrames = action?.frames?.length || 0;

      if (this.totalFrames <= 0) return;

      this.currentFrame = (this.currentFrame - 1 + this.totalFrames) % this.totalFrames;
      this._renderPreviewFrame();

      if (typeof this.onFrameChange === 'function') {
        try {
          this.onFrameChange(this.currentFrame);
        } catch (err) {
          console.error('onFrameChange 回调出错:', err);
        }
      }
    }

    /**
     * Set playback frame rate
     * @param {number} fps 
     */
    setFPS(fps) {
      this.fps = Math.max(1, Math.min(60, Number(fps) || 8));
      if (this.playing) {
        clearTimeout(this.timer);
        this._schedule();
      }
    }

    /**
     * Set loop mode
     * @param {boolean} loop 
     */
    setLoop(loop) {
      this.loop = Boolean(loop);
    }

    /**
     * Set preview rendering scale
     * @param {number} scale 
     */
    setScale(scale) {
      this.previewScale = Math.max(1, Number(scale) || 1);
      this._renderPreviewFrame();
    }

    /**
     * Timer tick handler, advances frame and updates preview
     * @private
     */
    _schedule() {
      clearTimeout(this.timer);
      if (!this.playing) return;
      const sheet=this.project?.spriteSheets?.[this.sheetIndex];
      const frame=sheet?.actions?.[this.actionIndex]?.frames?.[this.currentFrame];
      const delay=sheet?.useFrameDurations!==false && frame?.duration ? frame.duration : 1000/this.fps;
      this.timer=setTimeout(()=>{this._tick();this._schedule();}, delay);
    }
    _tick() {
      const action = this.project?.spriteSheets?.[this.sheetIndex]?.actions?.[this.actionIndex];
      this.totalFrames = action?.frames?.length || 0;

      if (this.totalFrames <= 0) {
        this.pause();
        return;
      }

      if (this.currentFrame + 1 >= this.totalFrames) {
        if (this.loop) {
          this.currentFrame = 0;
        } else {
          this.currentFrame = this.totalFrames - 1;
          this.pause();
          this._renderPreviewFrame();
          if (typeof this.onFrameChange === 'function') {
            try {
              this.onFrameChange(this.currentFrame);
            } catch (err) {
              console.error('onFrameChange 回调出错:', err);
            }
          }
          return;
        }
      } else {
        this.currentFrame++;
      }

      this._renderPreviewFrame();

      if (typeof this.onFrameChange === 'function') {
        try {
          this.onFrameChange(this.currentFrame);
        } catch (err) {
          console.error('onFrameChange 回调出错:', err);
        }
      }
    }

    /**
     * Render the current frame to the preview canvas
     * @private
     */
    _renderPreviewFrame() {
      if (!this.canvas || !this.ctx) return;

      // 1. Get composite ImageData for current frame
      let imgData = null;
      if (this.canvasManager && typeof this.canvasManager.getCompositeImageData === 'function') {
        imgData = this.canvasManager.getCompositeImageData(this.sheetIndex, this.actionIndex, this.currentFrame);
      }

      // Fallback to frame originalPixels
      if (!imgData) {
        const frame = this.project?.spriteSheets?.[this.sheetIndex]?.actions?.[this.actionIndex]?.frames?.[this.currentFrame];
        imgData = frame?.originalPixels || null;
      }

      if (!imgData || !imgData.width || !imgData.height) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        return;
      }

      const fw = imgData.width;
      const fh = imgData.height;
      const targetW = Math.round(fw * this.previewScale);
      const targetH = Math.round(fh * this.previewScale);

      if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
        this.canvas.width = targetW;
        this.canvas.height = targetH;
      }

      // Offscreen canvas to put ImageData, then draw scaled up
      const offscreen = document.createElement('canvas');
      offscreen.width = fw;
      offscreen.height = fh;
      const offCtx = offscreen.getContext('2d');
      offCtx.imageSmoothingEnabled = false;
      offCtx.putImageData(imgData, 0, 0);

      this.ctx.imageSmoothingEnabled = false;
      this.ctx.clearRect(0, 0, targetW, targetH);
      this.ctx.drawImage(offscreen, 0, 0, fw, fh, 0, 0, targetW, targetH);
    }

    /**
     * Cleanup timer and references
     */
    destroy() {
      this.pause();
      this.canvas = null;
      this.ctx = null;
      this.project = null;
      this.canvasManager = null;
      this.onFrameChange = null;
    }
  }

  // Export to PE namespace
  PE.AnimationPlayer = AnimationPlayer;

})(window.PE);
