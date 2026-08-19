'use strict';

/**
 * Acquires a MediaStream for audio analysis.
 * Electron path: desktopCapturer → getUserMedia with chromeMediaSource:'desktop'
 * Browser fallback: getDisplayMedia (screen share with audio)
 */

export async function captureSystemAudio() {
  if (window.electronAPI) {
    return _electronLoopback();
  }
  // Browser: ask the user to share a screen/tab and tick "Share system audio"
  return navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
}

export async function captureMicrophone() {
  return navigator.mediaDevices.getUserMedia({ audio: true, video: false });
}

async function _electronLoopback() {
  const sources = await window.electronAPI.getDesktopSources();
  if (!sources.length) throw new Error('No desktop capture sources found');

  // Prefer "Entire screen" / "Screen 1" over individual windows
  const source = sources.find(s => /screen|entire/i.test(s.name)) ?? sources[0];

  return navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource:   'desktop',
        chromeMediaSourceId: source.id,
      },
    },
    video: {
      mandatory: {
        chromeMediaSource:   'desktop',
        chromeMediaSourceId: source.id,
        maxWidth: 1, maxHeight: 1, maxFrameRate: 1,
      },
    },
  });
}
