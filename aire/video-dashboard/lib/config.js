'use strict';
// All settings come from env. Storage always lives outside the git repo.
const path = require('path');

const env = process.env;
const num = (v, d) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);

const config = {
  host: env.VX_HOST || '127.0.0.1',
  allowedHosts: (env.VX_ALLOWED_HOSTS || '').split(',').map((s) => s.trim()).filter(Boolean),
  port: num(env.VX_PORT, 4848),
  root: path.resolve(env.VX_STORAGE_ROOT || '/workspace/video'),
  ffmpeg: env.VX_FFMPEG || 'ffmpeg',
  ffprobe: env.VX_FFPROBE || 'ffprobe',
  ytdlp: env.VX_YTDLP || 'yt-dlp',
  python: env.VX_PYTHON || 'python3',
  tesseract: env.VX_TESSERACT || 'tesseract',
  actor: env.VX_ACTOR || '',
  sceneThreshold: num(env.VX_SCENE_THRESHOLD, 0.3),
  minShotSeconds: num(env.VX_MIN_SHOT_SECONDS, 0.2),
  maxUploadBytes: num(env.VX_MAX_UPLOAD_MB, 8192) * 1024 * 1024,
  // "off" disables the transcript step. Otherwise a faster-whisper model name or folder.
  whisper: env.VX_WHISPER || 'auto',
  whisperModel: env.VX_WHISPER_MODEL || 'base',
  whisperDir: env.VX_WHISPER_DIR || '',
  ocr: env.VX_OCR || 'auto',
  fontDir: env.VX_FONT_DIR || '/usr/share/fonts/truetype/sand-box/google',
};

// Optional Python tools (local whisper) live in a venv under the storage root, never in the repo.
if (!env.VX_PYTHON) {
  const venvPython = path.join(config.root, '_tools', 'venv', 'bin', 'python3');
  if (require('fs').existsSync(venvPython)) config.python = venvPython;
}

config.inbox = () => path.join(config.root, 'inbox');
config.queueDir = () => path.join(config.root, '_queue');
config.modelsDir = () => config.whisperDir || path.join(config.root, '_models', 'whisper');

module.exports = config;
