'use strict';
/**
 * Copies three.module.js into renderer/lib/ so the renderer can import it
 * as a relative ES-module path without a bundler.
 */
const fs   = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const src  = path.join(root, 'node_modules', 'three', 'build', 'three.module.js');
const dest = path.join(root, 'renderer', 'lib', 'three.module.js');

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(src, dest);
console.log('[postinstall] Copied three.module.js → renderer/lib/');
