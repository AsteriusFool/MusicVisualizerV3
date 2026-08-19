'use strict';

export class BabyViz {
  constructor(_scene, _freqTex) {
    this._img     = document.getElementById('baby-gif');
    this._canvas  = document.getElementById('baby-canvas');
    this._ctx     = this._canvas.getContext('2d');
    this._playing = null;
  }

  setTheme() {}

  update(_time, energy, _beat) {
    const playing = energy > 0.015;
    if (playing === this._playing) return;
    this._playing = playing;

    if (playing) {
      this._canvas.style.display = 'none';
      this._img.src              = 'Dancing Baby.gif';
      this._img.style.display    = 'block';
    } else {
      // Freeze current GIF frame onto canvas, then swap
      this._canvas.width  = this._img.naturalWidth  || 320;
      this._canvas.height = this._img.naturalHeight || 320;
      this._ctx.drawImage(this._img, 0, 0);
      this._img.style.display    = 'none';
      this._canvas.style.display = 'block';
    }
  }

  dispose() {
    this._img.src              = '';
    this._img.style.display    = 'none';
    this._canvas.style.display = 'none';
    this._playing              = null;
  }
}


