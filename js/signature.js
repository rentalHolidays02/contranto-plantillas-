/**
 * signature.js
 * Manejo de firma digital en Canvas con soporte para ratón y pantallas táctiles
 */

class SignaturePad {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.isDrawing = false;
    this.hasDrawn = false;
    this.strokeColor = options.color || '#000000';
    this.lineWidth = options.lineWidth || 2.5;
    this.onChange = options.onChange || null;

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.start(e));
    this.canvas.addEventListener('mousemove', (e) => this.draw(e));
    window.addEventListener('mouseup', () => this.stop());

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.start(touch);
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      this.draw(touch);
      e.preventDefault();
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      this.stop();
      e.preventDefault();
    }, { passive: false });
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Guardar trazo actual si existe
    let currentImage = null;
    if (this.hasDrawn) {
      currentImage = this.canvas.toDataURL();
    }

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    this.canvas.width = rect.width * ratio;
    this.canvas.height = rect.height * ratio;
    this.ctx.scale(ratio, ratio);

    this.ctx.strokeStyle = this.strokeColor;
    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    if (currentImage) {
      const img = new Image();
      img.onload = () => {
        this.ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = currentImage;
    }
  }

  getCoordinates(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0)) - rect.left,
      y: (e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0)) - rect.top
    };
  }

  start(e) {
    this.isDrawing = true;
    const { x, y } = this.getCoordinates(e);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  draw(e) {
    if (!this.isDrawing) return;
    const { x, y } = this.getCoordinates(e);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.hasDrawn = true;
  }

  stop() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.ctx.beginPath();
      if (this.onChange && this.hasDrawn) {
        this.onChange(this.toDataURL());
      }
    }
  }

  clear() {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.beginPath();
    this.hasDrawn = false;
    if (this.onChange) {
      this.onChange(null);
    }
  }

  isEmpty() {
    return !this.hasDrawn;
  }

  toDataURL(format = 'image/png') {
    if (!this.hasDrawn) return null;
    return this.canvas.toDataURL(format);
  }
}
