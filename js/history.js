/**
 * Pixel Art Character Editor - History Management (history.js)
 * Command pattern undo/redo system with pixel-level diff snapshots.
 */

window.PE = window.PE || {};

(() => {
  'use strict';

  /**
   * @typedef {Object} PixelChange
   * @property {number} layerIndex
   * @property {string} frameKey
   * @property {number} x
   * @property {number} y
   * @property {number} oldR
   * @property {number} oldG
   * @property {number} oldB
   * @property {number} oldA
   * @property {number} newR
   * @property {number} newG
   * @property {number} newB
   * @property {number} newA
   */

  /**
   * @typedef {Object} HistoryEntry
   * @property {string} description
   * @property {number} timestamp
   * @property {PixelChange[]} changes
   */

  class HistoryManager {
    /**
     * @param {number} [maxSteps=200] 
     */
    constructor(maxSteps = 200) {
      this.undoStack = []; // HistoryEntry[]
      this.redoStack = []; // HistoryEntry[]
      this.maxSteps = maxSteps;
      this.currentBatch = null;
      this._batchMap = new Map();
      this.onChange = null; // Callback when undo/redo state changes
    }

    /**
     * Begin recording a new atomic set of pixel modifications.
     * @param {string} [description='编辑像素'] 
     */
    beginBatch(description = '编辑像素') {
      if (this.currentBatch) {
        this.commitBatch();
      }
      this.currentBatch = {
        description: description || '编辑像素',
        timestamp: Date.now(),
        changes: []
      };
      this._batchMap = new Map();
    }

    /**
     * Record a single pixel change within the active batch.
     * Deduplicates multiple modifications to the same pixel inside the same batch,
     * preserving the original oldRGBA value while updating the target newRGBA value.
     * 
     * @param {number} layerIndex 
     * @param {string} frameKey 
     * @param {number} x 
     * @param {number} y 
     * @param {{r:number, g:number, b:number, a:number}} oldRGBA 
     * @param {{r:number, g:number, b:number, a:number}} newRGBA 
     */
    recordPixelChange(layerIndex, frameKey, x, y, oldRGBA, newRGBA) {
      if (!this.currentBatch) return;

      const key = `${layerIndex}_${frameKey}_${x}_${y}`;
      if (this._batchMap.has(key)) {
        const item = this._batchMap.get(key);
        item.newR = newRGBA.r;
        item.newG = newRGBA.g;
        item.newB = newRGBA.b;
        item.newA = newRGBA.a !== undefined ? newRGBA.a : 255;
      } else {
        const change = {
          layerIndex,
          frameKey,
          x,
          y,
          oldR: oldRGBA.r,
          oldG: oldRGBA.g,
          oldB: oldRGBA.b,
          oldA: oldRGBA.a !== undefined ? oldRGBA.a : 255,
          newR: newRGBA.r,
          newG: newRGBA.g,
          newB: newRGBA.b,
          newA: newRGBA.a !== undefined ? newRGBA.a : 255
        };
        this._batchMap.set(key, change);
        this.currentBatch.changes.push(change);
      }
    }

    /**
     * Finalize and commit the current batch to the undo stack.
     * Clears the redo stack. Returns commit summary or null if no actual changes.
     * @returns {{description: string, pixelCount: number}|null}
     */
    commitBatch() {
      if (!this.currentBatch) return null;

      const batch = this.currentBatch;
      this.currentBatch = null;
      this._batchMap = new Map();

      // Filter out redundant changes where color did not change
      const effectiveChanges = batch.changes.filter(c =>
        c.oldR !== c.newR || c.oldG !== c.newG || c.oldB !== c.newB || c.oldA !== c.newA
      );

      if (effectiveChanges.length === 0) {
        return null;
      }

      const entry = {
        description: batch.description,
        timestamp: batch.timestamp,
        changes: effectiveChanges
      };

      this.undoStack.push(entry);
      if (this.undoStack.length > this.maxSteps) {
        this.undoStack.shift();
      }
      this.redoStack = [];

      this._notifyChange();

      return {
        description: entry.description,
        pixelCount: entry.changes.length
      };
    }

    /**
     * Discard current in-progress batch without recording to undo stack.
     * If project is provided, reverts any pixels touched during this batch.
     * @param {PE.Project} [project] 
     */
    discardBatch(project) {
      if (!this.currentBatch) return;

      if (project && project.layers) {
        for (let i = this.currentBatch.changes.length - 1; i >= 0; i--) {
          const ch = this.currentBatch.changes[i];
          const layer = project.layers[ch.layerIndex];
          if (layer) {
            const frameData = layer.getFrameData(ch.frameKey);
            if (frameData) {
              PE.utils.setPixelInImageData(frameData, ch.x, ch.y, ch.oldR, ch.oldG, ch.oldB, ch.oldA);
            }
          }
        }
      }

      this.currentBatch = null;
      this._batchMap = new Map();
      this._notifyChange();
    }

    /**
     * Undo last action, reversing pixel modifications on project layers.
     * @param {PE.Project} project 
     * @returns {HistoryEntry|null}
     */
    undo(project) {
      if (this.undoStack.length === 0) return null;

      const entry = this.undoStack.pop();
      if (entry.undo) entry.undo();

      if (project && project.layers) {
        for (let i = entry.changes.length - 1; i >= 0; i--) {
          const ch = entry.changes[i];
          const layer = project.layers[ch.layerIndex];
          if (layer) {
            const frameData = layer.getFrameData(ch.frameKey);
            if (frameData) {
              PE.utils.setPixelInImageData(frameData, ch.x, ch.y, ch.oldR, ch.oldG, ch.oldB, ch.oldA);
            }
          }
        }
      }

      this.redoStack.push(entry);
      this._notifyChange();
      return entry;
    }

    /**
     * Redo previously undone action, reapplying pixel modifications on project layers.
     * @param {PE.Project} project 
     * @returns {HistoryEntry|null}
     */
    redo(project) {
      if (this.redoStack.length === 0) return null;

      const entry = this.redoStack.pop();
      if (entry.redo) entry.redo();

      if (project && project.layers) {
        for (let i = 0; i < entry.changes.length; i++) {
          const ch = entry.changes[i];
          const layer = project.layers[ch.layerIndex];
          if (layer) {
            const frameData = layer.getFrameData(ch.frameKey);
            if (frameData) {
              PE.utils.setPixelInImageData(frameData, ch.x, ch.y, ch.newR, ch.newG, ch.newB, ch.newA);
            }
          }
        }
      }

      this.undoStack.push(entry);
      this._notifyChange();
      return entry;
    }

    /**
     * Check if undo is available.
     * @returns {boolean}
     */
    canUndo() {
      return this.undoStack.length > 0;
    }

    /**
     * Check if redo is available.
     * @returns {boolean}
     */
    canRedo() {
      return this.redoStack.length > 0;
    }

    /**
     * Get summary array of history entries for UI presentation.
     * @returns {Array<{description: string, timestamp: number, changeCount: number}>}
     */
    getHistory() {
      return this.undoStack.map(entry => ({
        description: entry.description,
        timestamp: entry.timestamp,
        changeCount: entry.changes.length
      }));
    }

    /**
     * Clear all undo and redo history.
     */
    clear() {
      this.undoStack = [];
      this.redoStack = [];
      this.currentBatch = null;
      this._batchMap = new Map();
      this._notifyChange();
    }

    /**
     * Internal trigger for onChange callback.
     * @private
     */
    _notifyChange() {
      if (typeof this.onChange === 'function') {
        try {
          this.onChange();
        } catch (e) {
          console.error('HistoryManager onChange callback error:', e);
        }
      }
    }
  }

  // Export to window.PE
  PE.HistoryManager = HistoryManager;

})();
