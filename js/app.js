/**
 * Pixel Art Editor - Application Controller (PE.App)
 * 主应用控制器，负责整合管理所有模块、绑定界面事件及状态更新
 */

window.PE = window.PE || {};

(function() {
  'use strict';

  class App {
    constructor() {
      this.project = new PE.Project();
      this.history = new PE.HistoryManager();
      this.canvasManager = null;
      this.toolManager = new PE.ToolManager();
      this.sheetManager = new PE.SpriteSheetManager();
      this.animationPlayer = new PE.AnimationPlayer();
      this.inspectionManager = new PE.InspectionManager();
      this.exportManager = new PE.ExportManager();

      // 交互与拖拽状态
      this.isPanning = false;
      this.panStartX = 0;
      this.panStartY = 0;
      this.isSpacePressed = false;
    }

    init() {
      // 1. 获取主画布和预览画布元素
      const mainCanvas = document.getElementById('main-canvas');
      const previewCanvas = document.getElementById('preview-canvas');

      if (!mainCanvas) {
        console.error('未找到 #main-canvas 画布元素');
        return;
      }

      // 2. 若为全新空项目，初始化默认结构与色板
      this.setupDefaultProjectIfEmpty();

      // 3. 初始化画布管理器并绑定项目
      this.canvasManager = new PE.CanvasManager(mainCanvas);
      this.canvasManager.setProject(this.project);

      // 4. 初始化并注入各个管理器
      this.toolManager.init(this.project, this.canvasManager, this.history);
      if (previewCanvas) {
        this.animationPlayer.init(previewCanvas, this.project, this.canvasManager);
      }
      this.inspectionManager.init(this.project, this.canvasManager);
      this.exportManager.init(this.project, this.canvasManager);

      // 5. 回调与事件联动
      this.history.onChange = () => {
        this.updateHistoryButtons();
        this.updateStatusBar();
      };

      this.toolManager.onColorPick = (color) => {
        this.setPrimaryColor(color);
      };

      // 6. 绑定 DOM 事件
      this.bindCanvasEvents(mainCanvas);
      this.bindToolbarEvents();
      this.bindLayerEvents();
      this.bindPaletteEvents();
      this.bindSheetConfigEvents();
      this.bindActionConfigEvents();
      this.bindFramePropertiesEvents();
      this.bindAnimationEvents();
      this.bindInspectionEvents();
      this.bindKeyboardShortcuts();
      this.bindResizeObserver(mainCanvas);

      // 7. 初始状态同步与渲染
      this.updateAll();
      this.canvasManager.centerView();
      this.canvasManager.render();
    }

    /**
     * 初始化空项目结构（默认素材表、默认图层与经典调色板）
     */
    setupDefaultProjectIfEmpty() {
      // 默认调色板 (DawnBringer 16 色调色板)
      if (!this.project.palette || this.project.palette.length === 0) {
        this.project.palette = [
          { r: 20, g: 12, b: 28, a: 255, name: '暗黑' },
          { r: 68, g: 36, b: 52, a: 255, name: '深紫红' },
          { r: 48, g: 52, b: 109, a: 255, name: '海军蓝' },
          { r: 78, g: 74, b: 78, a: 255, name: '深灰' },
          { r: 133, g: 76, b: 48, a: 255, name: '棕褐' },
          { r: 52, g: 101, b: 36, a: 255, name: '暗绿' },
          { r: 208, g: 70, b: 72, a: 255, name: '朱红' },
          { r: 117, g: 113, b: 97, a: 255, name: '浅灰' },
          { r: 89, g: 125, b: 206, a: 255, name: '湖蓝' },
          { r: 210, g: 125, b: 44, a: 255, name: '橙黄' },
          { r: 133, g: 149, b: 161, a: 255, name: '灰蓝' },
          { r: 109, g: 170, b: 44, a: 255, name: '青绿' },
          { r: 218, g: 212, b: 94, a: 255, name: '亮黄' },
          { r: 222, g: 158, b: 65, a: 255, name: '暖皮' },
          { r: 255, g: 255, b: 255, a: 255, name: '纯白' }
        ];
      }

      // 如果没有图层，添加默认原始图层并锁定
      if (!this.project.layers || this.project.layers.length === 0) {
        const defaultLayer = this.project.addLayer('原始图层');
        if (defaultLayer) defaultLayer.locked = true;
      }

      if (this.project.layers.length===1 && !this.project.layers[0].frameData.size) this.project.layers[0].sheetIndex=0;
      // 如果没有素材表，添加一个 32x32 的默认空素材表
      if (!this.project.spriteSheets || this.project.spriteSheets.length === 0) {
        const defaultSheet = new PE.SpriteSheet('默认素材表');
        defaultSheet.frameWidth = 32;
        defaultSheet.frameHeight = 32;
        defaultSheet.columns = 1;
        defaultSheet.rows = 1;
        defaultSheet.fps = 8;

        const defaultAction = new PE.Action('idle', 'down');

        const defaultFrame = new PE.Frame(0, 0, 0, 32, 32);
        defaultFrame.status = 'pending';
        defaultFrame.notes = '';

        defaultAction.frames = [defaultFrame];
        defaultSheet.actions = [defaultAction];
        this.project.spriteSheets = [defaultSheet];

        this.project.currentSheetIndex = 0;
        this.project.currentActionIndex = 0;
        this.project.currentFrameIndex = 0;
      }
    }

    // ==========================================
    // 画布鼠标与触控事件
    // ==========================================
    bindCanvasEvents(canvas) {
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      const resizeHandleAt=e=>{
        const s=this.toolManager.selection,cm=this.canvasManager;if(!s)return false;
        const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*canvas.width/r.width,y=(e.clientY-r.top)*canvas.height/r.height;
        return Math.abs(x-cm.offsetX-(s.x+s.w)*cm.zoom)<=4&&Math.abs(y-cm.offsetY-(s.y+s.h)*cm.zoom)<=4;
      };

      canvas.addEventListener('mousedown', (e) => {
        // 中键或按住空格时为平移
        if (e.button === 1 || this.isSpacePressed) {
          this.isPanning = true;
          this.panStartX = e.clientX;
          this.panStartY = e.clientY;
          canvas.style.cursor = 'grabbing';
          return;
        }

        const pixel = this.canvasManager.screenToPixel(e.clientX, e.clientY);
        if(this.toolManager.currentTool==='move')this.animationPlayer.pause();
        this.toolManager.onMouseDown(pixel.x, pixel.y, e.button, resizeHandleAt(e));
        if(this.toolManager.currentTool==='move')this.updateLayerList();
        this.canvasManager.render();
      });

      window.addEventListener('mousemove', (e) => {
        if (this.isPanning) {
          const dx = e.clientX - this.panStartX;
          const dy = e.clientY - this.panStartY;
          this.panStartX = e.clientX;
          this.panStartY = e.clientY;
          this.canvasManager.pan(dx, dy);
          this.canvasManager.render();
          return;
        }

        const rect = canvas.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom || this.toolManager._transform
        ) {
          const pixel = this.canvasManager.screenToPixel(e.clientX, e.clientY);
          if(this.toolManager.currentTool==='move'){
            canvas.style.cursor=resizeHandleAt(e)?'nwse-resize':'move';
          }else canvas.style.cursor=this.isSpacePressed?'grab':'crosshair';
          this.toolManager.onMouseMove(pixel.x, pixel.y);
          this.canvasManager.render();
          this.updateCursorStatus(pixel.x, pixel.y);
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (this.isPanning) {
          this.isPanning = false;
          canvas.style.cursor = this.isSpacePressed ? 'grab' : 'crosshair';
          return;
        }
        const wasDrawing=this.toolManager.isDrawing;
        const pixel = this.canvasManager.screenToPixel(e.clientX, e.clientY);
        this.toolManager.onMouseUp(pixel.x, pixel.y);
        this.canvasManager.render();
        if(wasDrawing){this.updateFrameList();this.updatePalette();}
      });

      // 滚轮缩放
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
          this.canvasManager.zoomIn();
        } else {
          this.canvasManager.zoomOut();
        }
        this.canvasManager.render();
        this.updateZoomDisplay();
      }, { passive: false });
    }

    bindResizeObserver(canvas) {
      const container = canvas.parentElement;
      if (!container) return;

      const resizeHandler = () => {
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
          canvas.width = w;
          canvas.height = h;
          if (this.canvasManager) this.canvasManager.centerView();
          if (this.canvasManager) {
            this.canvasManager.render();
          }
        }
      };

      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => resizeHandler());
        ro.observe(container);
      } else {
        window.addEventListener('resize', resizeHandler);
      }
      resizeHandler();
    }

    // ==========================================
    // 顶部工具栏与视图控制
    // ==========================================
    bindToolbarEvents() {
      // 工具选择
      const tools = ['pencil', 'eraser', 'eyedropper', 'fill', 'select', 'move'];
      tools.forEach(toolName => {
        const btn = document.getElementById(`tool-${toolName}`);
        if (btn) {
          btn.addEventListener('click', () => {
            this.toolManager.setTool(toolName);
            this.updateToolbar();
          });
        }
      });

      // 笔刷大小
      const brushInput = document.getElementById('brush-size');
      const brushVal = document.getElementById('brush-size-val');
      if (brushInput) {
        brushInput.addEventListener('input', (e) => {
          const val = parseInt(e.target.value, 10) || 1;
          this.toolManager.setBrushSize(val);
          if (brushVal) brushVal.textContent = `${val}px`;
        });
      }

      // 主颜色选择器
      const colorInput = document.getElementById('color-primary');
      if (colorInput) {
        colorInput.addEventListener('input', (e) => {
          const hex = e.target.value;
          const rgb = this.hexToRgb(hex);
          if (rgb) {
            this.toolManager.setColor(rgb.r, rgb.g, rgb.b, 255);
          }
        });
      }

      // 缩放按钮
      const zoomInBtn = document.getElementById('zoom-in');
      const zoomOutBtn = document.getElementById('zoom-out');
      if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
          this.canvasManager.zoomIn();
          this.canvasManager.render();
          this.updateZoomDisplay();
        });
      }
      if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
          this.canvasManager.zoomOut();
          this.canvasManager.render();
          this.updateZoomDisplay();
        });
      }

      // 视图开关 (网格 / 洋葱皮 / 变更对比)
      const gridToggle = document.getElementById('grid-toggle');
      if (gridToggle) {
        gridToggle.addEventListener('click', () => {
          this.canvasManager.showGrid = !this.canvasManager.showGrid;
          gridToggle.classList.toggle('active', this.canvasManager.showGrid);
          this.canvasManager.render();
        });
      }

      const onionToggle = document.getElementById('onion-toggle');
      if (onionToggle) {
        onionToggle.addEventListener('click', () => {
          this.canvasManager.showOnionSkin = !this.canvasManager.showOnionSkin;
          onionToggle.classList.toggle('active', this.canvasManager.showOnionSkin);
          this.canvasManager.render();
        });
      }

      const diffToggle = document.getElementById('diff-toggle');
      if (diffToggle) {
        diffToggle.addEventListener('click', () => {
          this.canvasManager.showChanges = !this.canvasManager.showChanges;
          diffToggle.classList.toggle('active', this.canvasManager.showChanges);
          this.canvasManager.render();
        });
      }

      // 撤销 / 重做
      const undoBtn = document.getElementById('undo-btn');
      const redoBtn = document.getElementById('redo-btn');
      if (undoBtn) {
        undoBtn.addEventListener('click', () => {
          if (this.history.canUndo()) {
            this.history.undo(this.project);
            this.canvasManager.render();
            this.updateFrameList();
            this.updateHistoryButtons();
          }
        });
      }
      if (redoBtn) {
        redoBtn.addEventListener('click', () => {
          if (this.history.canRedo()) {
            this.history.redo(this.project);
            this.canvasManager.render();
            this.updateFrameList();
            this.updateHistoryButtons();
          }
        });
      }

      // 导入相关
      const importBtn = document.getElementById('import-btn');
      const importInput = document.getElementById('import-file-input');
      const loadSampleBtn = document.getElementById('load-sample-btn');
      if (importBtn && importInput) {
        importBtn.addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            await this.handleImport(e.target.files);
            importInput.value = '';
          }
        });
      }

      if (loadSampleBtn) {
        loadSampleBtn.addEventListener('click', async () => {
          try {
            const resp = await fetch('assets/sample_character.png');
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const file = new File([blob], 'sample_character.png', { type: 'image/png' });
            await this.handleImport([file]);
            // 自动配置为 32x32 4列1行
            const sheet = this.project.getCurrentSheet();
            if (sheet) {
              sheet.frameWidth = 32;
              sheet.frameHeight = 32;
              sheet.columns = 4;
              sheet.rows = 1;
              this.sheetManager.cutFrames(this.project, this.project.currentSheetIndex);
              this.updateAll();
              this.canvasManager.centerView();
              this.canvasManager.render();
            }
          } catch (err) {
            console.error('加载示例素材失败:', err);
            alert('加载示例素材失败: ' + err.message);
          }
        });
      }

      // 导出按钮
      const exportFrameBtn = document.getElementById('export-frame-btn');
      if (exportFrameBtn) {
        exportFrameBtn.addEventListener('click', async () => {
          await this.exportManager.exportFrame(
            this.project.currentSheetIndex,
            this.project.currentActionIndex,
            this.project.currentFrameIndex
          );
        });
      }

      const exportSheetBtn = document.getElementById('export-sheet-btn');
      if (exportSheetBtn) {
        exportSheetBtn.addEventListener('click', async () => {
          await this.exportManager.exportSpriteSheet(this.project.currentSheetIndex);
        });
      }

      const exportAllBtn = document.getElementById('export-all-btn');
      if (exportAllBtn) {
        exportAllBtn.addEventListener('click', async () => {
          await this.exportManager.exportAllAsZip();
        });
      }

      const exportProjectBtn = document.getElementById('export-project-btn');
      if (exportProjectBtn) {
        exportProjectBtn.addEventListener('click', async () => {
          await this.exportManager.exportProject();
        });
      }

      const importProjectBtn = document.getElementById('import-project-btn');
      const importProjectInput = document.getElementById('import-project-input');
      if (importProjectBtn && importProjectInput) {
        importProjectBtn.addEventListener('click', () => importProjectInput.click());
        importProjectInput.addEventListener('change', async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            await this.exportManager.importProject(e.target.files[0]);
            this.updateAll();
            this.canvasManager.centerView();
            this.canvasManager.render();
            importProjectInput.value = '';
          }
        });
      }
    }

    // ==========================================
    // 图层管理与调色板
    // ==========================================
    bindLayerEvents() {
      const addLayerBtn = document.getElementById('add-layer-btn');
      if (addLayerBtn) {
        addLayerBtn.addEventListener('click', () => {
          const nextIndex = (this.project.layers ? this.project.layers.length : 0) + 1;
          this.project.addLayer(`图层 ${nextIndex}`);
          this.project.currentLayerIndex = this.project.layers.length - 1;
          this.updateLayerList();
          this.canvasManager.render();
        });
      }
    }

    bindPaletteEvents() {
      const addColorBtn = document.getElementById('add-palette-color-btn');
      const customColorInput = document.getElementById('custom-color-input');
      if (addColorBtn && customColorInput) {
        addColorBtn.addEventListener('click', () => {
          const rgb = this.hexToRgb(customColorInput.value);
          if (rgb) {
            window.pixelAPI.addColor(rgb.r, rgb.g, rgb.b, 255, '');
          }
        });
      }
    }

    // ==========================================
    // 素材切帧与动作配置
    // ==========================================
    bindSheetConfigEvents() {
      const applyBtn = document.getElementById('cfg-apply-btn');
      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          this.handleCutFrames();
        });
      }
    }

    bindActionConfigEvents() {
      const applyBtn = document.getElementById('cfg-action-apply-btn');
      const nameInput = document.getElementById('cfg-action-name');
      const dirSelect = document.getElementById('cfg-action-direction');

      if (applyBtn) {
        applyBtn.addEventListener('click', () => {
          const action = this.project.getCurrentAction();
          if (action) {
            if (nameInput) action.name = nameInput.value.trim() || action.name;
            if (dirSelect) action.direction = dirSelect.value;
            this.updateActionList();
            this.updateStatusBar();
          }
        });
      }
    }

    bindFramePropertiesEvents() {
      const statusSelect = document.getElementById('frame-status');
      const notesText = document.getElementById('frame-notes');

      if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
          const frame = this.project.getCurrentFrame();
          if (frame) {
            frame.status = e.target.value;
            this.updateFrameList();
          }
        });
      }

      if (notesText) {
        notesText.addEventListener('input', (e) => {
          const frame = this.project.getCurrentFrame();
          if (frame) {
            frame.notes = e.target.value;
          }
        });
      }
    }

    // ==========================================
    // 动画播放器事件
    // ==========================================
    bindAnimationEvents() {
      const playBtn = document.getElementById('play-btn');
      const pauseBtn = document.getElementById('pause-btn');
      const stopBtn = document.getElementById('stop-btn');
      const prevBtn = document.getElementById('prev-frame-btn');
      const nextBtn = document.getElementById('next-frame-btn');
      const fpsInput = document.getElementById('fps-input');

      if (playBtn) playBtn.addEventListener('click', () => this.animationPlayer.play());
      if (pauseBtn) pauseBtn.addEventListener('click', () => this.animationPlayer.pause());
      if (stopBtn) stopBtn.addEventListener('click', () => this.animationPlayer.stop());
      if (prevBtn) prevBtn.addEventListener('click', () => this.animationPlayer.prevFrame());
      if (nextBtn) nextBtn.addEventListener('click', () => this.animationPlayer.nextFrame());
      if (fpsInput) {
        fpsInput.addEventListener('change', (e) => {
          const fps = parseInt(e.target.value, 10) || 8;
          this.project.getCurrentSheet().useFrameDurations=false;
          this.project.getCurrentSheet().fps=fps;
          this.animationPlayer.setFPS(fps);
        });
      }
    }

    // ==========================================
    // 检查与对比面板
    // ==========================================
    bindInspectionEvents() {
      const validateBtn = document.getElementById('validate-btn');
      if (validateBtn) {
        validateBtn.addEventListener('click', () => {
          const res = this.inspectionManager.validateFrame(
            this.project,
            this.project.currentSheetIndex,
            this.project.currentActionIndex,
            this.project.currentFrameIndex
          );
          this.showValidationResults(res);
        });
      }

      const validateAllBtn = document.getElementById('validate-all-btn');
      if (validateAllBtn) {
        validateAllBtn.addEventListener('click', () => {
          const res = this.inspectionManager.validateAll(this.project);
          this.showValidationResults(res);
        });
      }

      const showDiffBtn = document.getElementById('show-diff-btn');
      if (showDiffBtn) {
        showDiffBtn.addEventListener('click', () => {
          this.showDiffPanel();
        });
      }

      const showContactBtn = document.getElementById('show-contact-sheet-btn');
      if (showContactBtn) {
        showContactBtn.addEventListener('click', () => {
          this.showContactSheet();
        });
      }
    }

    // ==========================================
    // 键盘快捷键
    // ==========================================
    bindKeyboardShortcuts() {
      window.addEventListener('keydown', (e) => {
        // 如果焦点在输入框内，不拦截快捷键
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
          return;
        }

        // 空格平移
        if (e.code === 'Space' && !this.isSpacePressed) {
          this.isSpacePressed = true;
          const canvas = document.getElementById('main-canvas');
          if (canvas) canvas.style.cursor = 'grab';
          e.preventDefault();
        }

        // 撤销 / 重做 (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z)
        if (e.ctrlKey || e.metaKey) {
          if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            if (e.shiftKey) {
              if (this.history.canRedo()) {
                this.history.redo(this.project);
                this.canvasManager.render();
                this.updateFrameList();
              }
            } else {
              if (this.history.canUndo()) {
                this.history.undo(this.project);
                this.canvasManager.render();
                this.updateFrameList();
              }
            }
            this.updateHistoryButtons();
            return;
          }
          if (e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            if (this.history.canRedo()) {
              this.history.redo(this.project);
              this.canvasManager.render();
              this.updateFrameList();
              this.updateHistoryButtons();
            }
            return;
          }
          if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            this.persistence?.saveNow();
            return;
          }
        }

        const selectionStep={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
        if(selectionStep && this.toolManager.selection){
          e.preventDefault();
          this.animationPlayer.pause();
          if(this.toolManager.nudgeSelection(...selectionStep)){
            this.updateFrameList();this.updateHistoryButtons();
          }
          return;
        }

        // 工具快捷键
        switch (e.key.toLowerCase()) {
          case 'b':
          case 'p':
            this.toolManager.setTool('pencil');
            this.updateToolbar();
            break;
          case 'e':
            this.toolManager.setTool('eraser');
            this.updateToolbar();
            break;
          case 'i':
            this.toolManager.setTool('eyedropper');
            this.updateToolbar();
            break;
          case 'g':
            this.toolManager.setTool('fill');
            this.updateToolbar();
            break;
          case 'm':
            this.toolManager.setTool('select');
            this.updateToolbar();
            break;
          case '[': {
            const curSize = this.toolManager.brushSize || 1;
            const newSize = Math.max(1, curSize - 1);
            this.toolManager.setBrushSize(newSize);
            const brushInput = document.getElementById('brush-size');
            const brushVal = document.getElementById('brush-size-val');
            if (brushInput) brushInput.value = newSize;
            if (brushVal) brushVal.textContent = `${newSize}px`;
            break;
          }
          case ']': {
            const curSize = this.toolManager.brushSize || 1;
            const newSize = Math.min(32, curSize + 1);
            this.toolManager.setBrushSize(newSize);
            const brushInput = document.getElementById('brush-size');
            const brushVal = document.getElementById('brush-size-val');
            if (brushInput) brushInput.value = newSize;
            if (brushVal) brushVal.textContent = `${newSize}px`;
            break;
          }
          case 'arrowleft': {
            e.preventDefault();
            const action = this.project.getCurrentAction();
            if (action && action.frames && this.project.currentFrameIndex > 0) {
              this.selectFrame(this.project.currentSheetIndex, this.project.currentActionIndex, this.project.currentFrameIndex - 1);
            }
            break;
          }
          case 'arrowright': {
            e.preventDefault();
            const action = this.project.getCurrentAction();
            if (action && action.frames && this.project.currentFrameIndex < action.frames.length - 1) {
              this.selectFrame(this.project.currentSheetIndex, this.project.currentActionIndex, this.project.currentFrameIndex + 1);
            }
            break;
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
          this.isSpacePressed = false;
          const canvas = document.getElementById('main-canvas');
          if (canvas) canvas.style.cursor = 'crosshair';
        }
      });
    }

    // ==========================================
    // 素材导入与切帧处理
    // ==========================================
    async handleImport(files) {
      if (!files || files.length === 0) return;
      this.animationPlayer.pause();
      try {
        for (let i = 0; i < files.length; i++) {
          const result = await this.sheetManager.importFile(files[i], this.project);
          this.project.currentSheetIndex = result.sheetIndex;
          this.project.currentActionIndex = 0;
          this.project.currentFrameIndex = 0;
          if (!result.layered) {
            this.sheetManager.cutFrames(this.project, result.sheetIndex);
            const overlay=this.project.addLayer('衣服与发型');overlay.sheetIndex=result.sheetIndex;
          }
        }
        this.updateAll();
        this.canvasManager.centerView();
        this.canvasManager.render();
      } catch (err) {
        console.error('导入素材失败:', err);
        alert('导入素材失败: ' + err.message);
      }
    }

    handleCutFrames() {
      const sheet = this.project.getCurrentSheet();
      if (sheet?.sourceFormat === 'aseprite') { alert('源文件已经带有动画帧和图层，无需重新切帧。'); return; }
      if (!sheet) {
        alert('当前没有可操作的素材表');
        return;
      }

      const fw = parseInt(document.getElementById('cfg-frame-width')?.value, 10) || sheet.frameWidth || 32;
      const fh = parseInt(document.getElementById('cfg-frame-height')?.value, 10) || sheet.frameHeight || 32;
      const cols = parseInt(document.getElementById('cfg-columns')?.value, 10) || sheet.columns || 1;
      const rows = parseInt(document.getElementById('cfg-rows')?.value, 10) || sheet.rows || 1;
      const sx = parseInt(document.getElementById('cfg-spacing-x')?.value, 10) || 0;
      const sy = parseInt(document.getElementById('cfg-spacing-y')?.value, 10) || 0;
      const ox = parseInt(document.getElementById('cfg-offset-x')?.value, 10) || 0;
      const oy = parseInt(document.getElementById('cfg-offset-y')?.value, 10) || 0;

      if (![fw,fh,cols,rows,sx,sy,ox,oy].every(Number.isSafeInteger) || fw<1 || fh<1 || cols<1 || rows<1 || [sx,sy,ox,oy].some(n=>n<0) || ox+cols*fw+(cols-1)*sx>sheet.imageData.width || oy+rows*fh+(rows-1)*sy>sheet.imageData.height) { alert('切帧范围超出原图，请检查帧大小、行列和间距。'); return; }
      if (!confirm('重新切帧会清除这张素材的编辑记录。请先保存工程。继续吗？')) return;
      for (const layer of this.project.layers) for (const key of layer.frameData.keys()) if (key.startsWith(this.project.currentSheetIndex+'_')) layer.frameData.delete(key);
      this.history.clear();
      sheet.frameWidth = fw;
      sheet.frameHeight = fh;
      sheet.columns = cols;
      sheet.rows = rows;
      sheet.spacingX = sx;
      sheet.spacingY = sy;
      sheet.offsetX = ox;
      sheet.offsetY = oy;

      if (this.sheetManager && typeof this.sheetManager.cutFrames === 'function') {
        this.sheetManager.cutFrames(this.project, this.project.currentSheetIndex);
      } else if (typeof sheet.cutFrames === 'function') {
        sheet.cutFrames();
      }

      this.project.currentActionIndex = 0;
      this.project.currentFrameIndex = 0;
      this.updateAll();
      this.canvasManager.centerView();
      this.canvasManager.render();
    }

    // ==========================================
    // 界面同步与刷新 (UI Update Methods)
    // ==========================================
    updateAll() {
      if (this.animationPlayer) {
        const selectedFrame=this.project.currentFrameIndex;
        this.animationPlayer.setAction(this.project.currentSheetIndex, this.project.currentActionIndex);
        this.project.currentFrameIndex=selectedFrame;this.animationPlayer.currentFrame=selectedFrame;this.animationPlayer._renderPreviewFrame();
      }
      this.updateSheetList();
      this.updateActionList();
      this.updateFrameList();
      this.updateLayerList();
      this.updatePalette();
      this.updateToolbar();
      this.updateConfigPanels();
      this.updateStatusBar();
      this.updateZoomDisplay();
      this.updateHistoryButtons();

    }

    updateSheetList() {
      const container = document.getElementById('sheet-list');
      if (!container) return;
      container.innerHTML = '';

      const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const sheets = this.project.spriteSheets || [];
      sheets.forEach((sheet, idx) => {
        const item = document.createElement('div');
        item.className = `sheet-item ${idx === this.project.currentSheetIndex ? 'active' : ''}`;
        item.innerHTML = `
          <div class="sheet-title">${escape(sheet.name || '素材表 ' + (idx + 1))}</div>
          <div class="sheet-meta">${sheet.frameWidth || 0}x${sheet.frameHeight || 0} | ${sheet.actions ? sheet.actions.length : 0} 动作</div>
        `;
        item.addEventListener('click', () => {
          this.selectSheet(idx);
        });
        container.appendChild(item);
      });
    }

    updateActionList() {
      const container = document.getElementById('action-list');
      if (!container) return;
      container.innerHTML = '';

      const sheet = this.project.getCurrentSheet();
      if (!sheet || !sheet.actions) return;

      sheet.actions.forEach((act, idx) => {
        const item = document.createElement('div');
        item.className = `action-item ${idx === this.project.currentActionIndex ? 'active' : ''}`;
        item.innerHTML = `
          <span class="action-name">${String(act.name || '动作 ' + (idx + 1)).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span>
          <span class="action-dir">${String(act.direction || '').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</span>
          <span class="action-frames">${act.frames ? act.frames.length : 0} 帧</span>
        `;
        item.addEventListener('click', () => {
          this.selectAction(idx);
        });
        container.appendChild(item);
      });
    }

    updateFrameList() {
      const container = document.getElementById('frame-list');
      if (!container) return;
      container.innerHTML = '';

      const sheet = this.project.getCurrentSheet();
      const action = this.project.getCurrentAction();
      if (!sheet || !action || !action.frames) return;

      action.frames.forEach((frame, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `frame-thumb ${idx === this.project.currentFrameIndex ? 'active' : ''}`;
        thumb.setAttribute('data-index', idx);

        // 缩略图画布
        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = frame.width || 32;
        miniCanvas.height = frame.height || 32;
        const ctx = miniCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        const compImg = this.canvasManager.getCompositeImageData(this.project.currentSheetIndex, this.project.currentActionIndex, idx);
        if (compImg) {
          ctx.putImageData(compImg, 0, 0);
        }

        // 状态徽标
        const badge = document.createElement('span');
        badge.className = `status-badge status-${frame.status || 'pending'}`;
        badge.title = `状态: ${frame.status || 'pending'}`;

        const label = document.createElement('span');
        label.className = 'frame-number';
        label.textContent = `#${idx + 1}`;

        thumb.appendChild(miniCanvas);
        thumb.appendChild(badge);
        thumb.appendChild(label);

        thumb.addEventListener('click', () => {
          this.selectFrame(this.project.currentSheetIndex, this.project.currentActionIndex, idx);
        });

        container.appendChild(thumb);
      });

      this.updateFrameProperties();
    }

    updateLayerList() {
      const container = document.getElementById('layer-list');
      if (!container) return;
      container.innerHTML = '';

      const layers = this.project.layers || [];
      // 倒序展示，上层图层在上方
      for (let idx = layers.length - 1; idx >= 0; idx--) {
        const layer = layers[idx];
        const row = document.createElement('div');
        row.className = `layer-item ${idx === this.project.currentLayerIndex ? 'active' : ''}`;

        // 选中图层
        row.addEventListener('click', (e) => {
          if (e.target.closest('button') || e.target.closest('input')) return;
          this.project.currentLayerIndex = idx;
          this.updateLayerList();
          this.updateStatusBar();
          this.canvasManager.render();
        });

        // 眼睛按钮 (可见性)
        const visBtn = document.createElement('button');
        visBtn.className = `layer-icon-btn ${layer.visible !== false ? 'visible' : 'hidden'}`;
        visBtn.innerHTML = layer.visible !== false ? '👁' : '🚫';
        visBtn.title = '切换图层显示/隐藏';
        visBtn.addEventListener('click', () => {
          layer.visible = !layer.visible;
          this.persistence?.markDirty();
          visBtn.innerHTML = layer.visible ? '👁' : '🚫';
          this.canvasManager.render();
          this.updatePalette();
        });

        // 锁按钮
        const lockBtn = document.createElement('button');
        lockBtn.className = `layer-icon-btn ${layer.locked ? 'locked' : 'unlocked'}`;
        lockBtn.innerHTML = layer.locked ? '🔒' : '🔓';
        lockBtn.title = '锁定/解锁图层';
        lockBtn.addEventListener('click', () => {
          layer.locked = !layer.locked;
          this.persistence?.markDirty();
          lockBtn.innerHTML = layer.locked ? '🔒' : '🔓';
          this.updateLayerList();
        });

        // 图层名称
        const nameSpan = document.createElement('span');
        nameSpan.className = 'layer-name';
        nameSpan.textContent = layer.name || `图层 ${idx + 1}`;

        // 透明度滑块
        const opacityInput = document.createElement('input');
        opacityInput.type = 'range';
        opacityInput.min = '0';
        opacityInput.max = '100';
        opacityInput.value = Math.round((layer.opacity !== undefined ? layer.opacity : 1.0) * 100);
        opacityInput.className = 'layer-opacity-slider';
        opacityInput.title = `不透明度: ${opacityInput.value}%`;
        opacityInput.addEventListener('input', (e) => {
          layer.opacity = parseInt(e.target.value, 10) / 100;
          this.updatePalette();
          this.canvasManager.render();
        });

        row.appendChild(visBtn);
        row.appendChild(lockBtn);
        row.appendChild(nameSpan);
        row.appendChild(opacityInput);

        container.appendChild(row);
      }
    }

    updatePalette() {
      const container = document.getElementById('palette-container');
      if (!container) return;
      container.innerHTML = '';

      const image = this.canvasManager.getCompositeImageData(undefined,undefined,undefined,!this.canvasManager.hideHands);
      const colors = new Map();
      if(image)for(let i=0;i<image.data.length;i+=4){
        const [r,g,b,a]=image.data.subarray(i,i+4);if(!a)continue;
        const key=[r,g,b,a].join(',');
        const entry=colors.get(key)||{r,g,b,a,count:0};entry.count++;colors.set(key,entry);
      }
      const palette = [...colors.values()].sort((a,b)=>b.count-a.count);
      palette.forEach(col => {
        const swatch = document.createElement('button');
        swatch.type='button';
        swatch.className = 'palette-swatch';
        swatch.style.backgroundColor = `rgba(${col.r}, ${col.g}, ${col.b}, ${(col.a !== undefined ? col.a : 255) / 255})`;
        swatch.title = this.rgbToHex(col.r,col.g,col.b);
        swatch.setAttribute('aria-label','取色 '+swatch.title);

        swatch.addEventListener('click', () => {
          this.setPrimaryColor(col);
        });

        container.appendChild(swatch);
      });
      if(!palette.length)container.textContent='当前画面还没有颜色';
    }

    updateToolbar() {
      const tools = ['pencil', 'eraser', 'eyedropper', 'fill', 'select', 'move'];
      const cur = this.toolManager.currentTool || 'pencil';
      tools.forEach(t => {
        const btn = document.getElementById(`tool-${t}`);
        if (btn) {
          btn.classList.toggle('active', t === cur);
        }
      });
    }

    updateConfigPanels() {
      const sheet = this.project.getCurrentSheet();
      if (sheet) {
        const setVal = (id, val) => {
          const el = document.getElementById(id);
          if (el && val !== undefined) el.value = val;
        };
        setVal('cfg-frame-width', sheet.frameWidth || 32);
        setVal('cfg-frame-height', sheet.frameHeight || 32);
        setVal('cfg-columns', sheet.columns || 1);
        setVal('cfg-rows', sheet.rows || 1);
        setVal('cfg-spacing-x', sheet.spacingX || 0);
        setVal('cfg-spacing-y', sheet.spacingY || 0);
        setVal('cfg-offset-x', sheet.offsetX || 0);
        setVal('cfg-offset-y', sheet.offsetY || 0);
      }

      const action = this.project.getCurrentAction();
      if (action) {
        const nameInput = document.getElementById('cfg-action-name');
        const dirSelect = document.getElementById('cfg-action-direction');
        if (nameInput) nameInput.value = action.name || '';
        if (dirSelect) dirSelect.value = action.direction || 'none';
      }
    }

    updateFrameProperties() {
      const frame = this.project.getCurrentFrame();
      const statusSelect = document.getElementById('frame-status');
      const notesText = document.getElementById('frame-notes');

      if (frame) {
        if (statusSelect) statusSelect.value = frame.status || 'pending';
        if (notesText) notesText.value = frame.notes || '';
      }
    }

    updateStatusBar() {
      const bar = document.getElementById('status-bar');
      if (!bar) return;

      const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const p = this.project;
      const sheet = p.getCurrentSheet();
      const action = p.getCurrentAction();
      const frame = p.getCurrentFrame();
      const layer = p.getCurrentLayer();

      const sheetName = sheet ? (sheet.name || `素材表 ${p.currentSheetIndex + 1}`) : '无素材表';
      const actionName = action ? `${action.name} (${action.direction || '默认'})` : '无动作';
      const frameText = frame ? `第 ${p.currentFrameIndex + 1}/${action ? action.frames.length : 1} 帧 [${frame.width}x${frame.height}]` : '无帧';
      const layerText = layer ? `图层: ${layer.name}` : '无图层';
      const zoomText = `缩放: ${Math.round(this.canvasManager ? this.canvasManager.zoom * 100 : 100)}%`;

      bar.innerHTML = `
        <span class="status-item">${escape(p.name || '角色绘画编辑器')}</span>
        <span class="status-sep">|</span>
        <span class="status-item">${escape(sheetName)}</span>
        <span class="status-sep">|</span>
        <span class="status-item">${escape(actionName)}</span>
        <span class="status-sep">|</span>
        <span class="status-item">${escape(frameText)}</span>
        <span class="status-sep">|</span>
        <span class="status-item">${escape(layerText)}</span>
        <span class="status-sep">|</span>
        <span class="status-item">${zoomText}</span>
        <span class="status-sep">|</span>
        <span class="status-item" id="cursor-coords">坐标: (0, 0)</span>
      `;
    }

    updateCursorStatus(px, py) {
      const el = document.getElementById('cursor-coords');
      if (el) {
        el.textContent = `坐标: (${px}, ${py})`;
      }
    }

    updateZoomDisplay() {
      const zoomEl = document.getElementById('zoom-level');
      if (zoomEl && this.canvasManager) {
        zoomEl.textContent = `${Math.round(this.canvasManager.zoom * 100)}%`;
      }
    }

    updateHistoryButtons() {
      const undoBtn = document.getElementById('undo-btn');
      const redoBtn = document.getElementById('redo-btn');
      if (undoBtn) undoBtn.disabled = !this.history.canUndo();
      if (redoBtn) redoBtn.disabled = !this.history.canRedo();
    }

    // ==========================================
    // 动作选择与切换
    // ==========================================
    selectSheet(si) {
      this.toolManager.clearSelection();
      if (this.project.spriteSheets && this.project.spriteSheets[si]) {
        this.project.currentSheetIndex = si;
        this.project.currentActionIndex = 0;
        this.project.currentFrameIndex = 0;
        this.updateAll();
        this.canvasManager.centerView();
        this.canvasManager.render();
      }
    }

    selectAction(ai) {
      this.toolManager.clearSelection();
      const sheet = this.project.getCurrentSheet();
      if (sheet && sheet.actions && sheet.actions[ai]) {
        this.project.currentActionIndex = ai;
        this.project.currentFrameIndex = 0;
        this.updateActionList();
        this.updateFrameList();
        this.updateLayerList();
        this.updatePalette();
        this.updateConfigPanels();
        this.updateStatusBar();
        if (this.animationPlayer) {
          this.animationPlayer.setAction(this.project.currentSheetIndex, ai);
        }
        this.canvasManager.render();
      }
    }

    selectFrame(si, ai, fi) {
      this.toolManager.clearSelection();
      this.animationPlayer.pause();
      this.project.selectFrame(si, ai, fi);
      this.updateAll();
      this.canvasManager.render();
    }

    // ==========================================
    // 颜色与通用工具
    // ==========================================
    setPrimaryColor(col) {
      const r = col.r;
      const g = col.g;
      const b = col.b;
      const a = col.a !== undefined ? col.a : 255;
      this.toolManager.setColor(r, g, b, a);

      const colorInput = document.getElementById('color-primary');
      if (colorInput) {
        colorInput.value = this.rgbToHex(r, g, b);
      }
    }

    rgbToHex(r, g, b) {
      const toHex = (n) => {
        const hex = Math.max(0, Math.min(255, n)).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      };
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    hexToRgb(hex) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    }

    // ==========================================
    // 检查、对比与校验展示
    // ==========================================
    showValidationResults(results) {
      const panel = document.getElementById('validation-panel');
      if (!panel) return;

      panel.style.display = 'block';
      let html = '<div class="panel-header"><h4>校验结果报告</h4><button class="close-btn" onclick="this.parentElement.parentElement.style.display=\'none\'">×</button></div>';

      if (!results) {
        html += '<p>暂无校验结果</p>';
      } else if (Array.isArray(results)) {
        html += `<div class="panel-body"><p>共检验 ${results.length} 帧</p><ul class="validation-list">`;
        results.forEach(item => {
          const isOk = !item.errors || item.errors.length === 0;
          const statusClass = isOk ? 'valid-pass' : 'valid-fail';
          html += `
            <li class="${statusClass}">
              <strong>${item.frameKey || `帧 (${item.sheetIndex}_${item.actionIndex}_${item.frameIndex})`}</strong>: 
              ${isOk ? '通过' : item.errors.join('; ')}
              ${item.warnings && item.warnings.length ? `<span class="warning-text">(${item.warnings.join('; ')})</span>` : ''}
            </li>
          `;
        });
        html += '</ul></div>';
      } else {
        const isOk = results.valid !== false && (!results.errors || results.errors.length === 0);
        html += `
          <div class="panel-body">
            <div class="${isOk ? 'valid-pass' : 'valid-fail'}">
              <strong>${isOk ? '✔ 校验通过' : '✖ 发现问题'}</strong>
            </div>
            ${results.errors && results.errors.length ? `<div class="error-msg">错误: ${results.errors.join('<br>')}</div>` : ''}
            ${results.warnings && results.warnings.length ? `<div class="warning-msg">警告: ${results.warnings.join('<br>')}</div>` : ''}
          </div>
        `;
      }
      panel.innerHTML = html;
    }

    showDiffPanel() {
      const panel = document.getElementById('diff-panel');
      if (!panel) return;

      const p = this.project;
      const diffData = window.pixelAPI.getFrameDiff(p.currentSheetIndex, p.currentActionIndex, p.currentFrameIndex);
      const comparison = window.pixelAPI.getComparisonPreview(p.currentSheetIndex, p.currentActionIndex, p.currentFrameIndex, 4);

      panel.style.display = 'block';
      let html = '<div class="panel-header"><h4>原图 vs 当前修改 对比</h4><button class="close-btn" onclick="this.parentElement.parentElement.style.display=\'none\'">×</button></div>';
      html += '<div class="panel-body">';

      if (diffData.success) {
        html += `<p>修改像素总数: <strong>${diffData.data.changedPixels || 0}</strong></p>`;
      }
      if (comparison.success && comparison.data.dataURL) {
        html += `<div class="diff-img-wrapper"><img src="${comparison.data.dataURL}" alt="Comparison Diff" class="pixelated-img" /></div>`;
      } else {
        html += `<p>此帧尚无原始像素记录或无法生成对比图</p>`;
      }
      html += '</div>';

      panel.innerHTML = html;
    }

    showContactSheet() {
      const panel = document.getElementById('contact-sheet-panel');
      if (!panel) return;

      const p = this.project;
      const res = window.pixelAPI.getActionPreview(p.currentSheetIndex, p.currentActionIndex, 3);

      panel.style.display = 'block';
      let html = '<div class="panel-header"><h4>动作 Contact Sheet 连环预览</h4><button class="close-btn" onclick="this.parentElement.parentElement.style.display=\'none\'">×</button></div>';
      html += '<div class="panel-body">';
      if (res.success && res.data.dataURL) {
        html += `<div class="contact-sheet-wrapper"><img src="${res.data.dataURL}" alt="Contact Sheet" class="pixelated-img" /></div>`;
      } else {
        html += '<p>无法生成 Contact Sheet 预览图</p>';
      }
      html += '</div>';

      panel.innerHTML = html;
    }
  }

  PE.App = App;

  // 页面加载完成后实例化应用
  document.addEventListener('DOMContentLoaded', () => {
    PE.app = new PE.App();
    PE.app.init();

    // 绑定全局别名
    PE.project = PE.app.project;
    PE.canvasManager = PE.app.canvasManager;
    PE.history = PE.app.history;
  });
})();
