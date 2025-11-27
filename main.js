#!/usr/bin/env node

import { spawn } from 'node:child_process';
import fs from 'node:fs';

// ASCII characters from darkest to brightest - extended set for more detail
const ASCII_CHARS = ' .:-=+*#%@';

// Optionally: Using Unicode block elements and various characters for better gradation
//const ASCII_CHARS = ' ·.`\'^",:;~-_+<>i!lI?/\\|()1{}[]rcvunxzjftLCJUYXZO0Qoahkbdpqwm*WMB8&%$#@';

// ANSI color codes
const RESET = '\x1b[0m';

function rgbToAnsi256(r, g, b) {
  // Convert RGB to ANSI 256 color code
  if (r === g && g === b) {
    // Grayscale
    if (r < 8) return 16;
    if (r > 248) return 231;
    return Math.round(((r - 8) / 247) * 24) + 232;
  }
  // Color
  const ansi = 16 +
    (36 * Math.round(r / 255 * 5)) +
    (6 * Math.round(g / 255 * 5)) +
    Math.round(b / 255 * 5);
  return ansi;
}

function getTerminalSize() {
  return {
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24
  };
}

function calculateAspectRatioDimensions(videoWidth, videoHeight) {
  const term = getTerminalSize();
  // Reserve some lines for shell prompt
  const maxHeight = term.height - 2;
  const maxWidth = term.width;
  
  // Account for character aspect ratio (chars are typically ~2x taller than wide)
  const charAspectRatio = 0.5;
  
  const videoAspectRatio = videoWidth / videoHeight;
  
  let width = maxWidth;
  let height = Math.floor((width * charAspectRatio) / videoAspectRatio);
  
  if (height > maxHeight) {
    height = maxHeight;
    width = Math.floor((height * videoAspectRatio) / charAspectRatio);
  }
  
  return { width, height };
}

async function getVideoInfo(inputFile) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate',
      '-of', 'json',
      inputFile
    ]);
    
    let output = '';
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('Failed to get video info'));
        return;
      }
      try {
        const info = JSON.parse(output);
        const stream = info.streams[0];
        const [num, den] = stream.r_frame_rate.split('/').map(Number);
        const fps = num / den;
        resolve({
          width: stream.width,
          height: stream.height,
          fps: fps
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

async function playVideo(inputFile) {
  // Get video information
  const videoInfo = await getVideoInfo(inputFile);
  const dimensions = calculateAspectRatioDimensions(videoInfo.width, videoInfo.height);
  
  console.log(`Playing: ${inputFile}`);
  console.log(`Video: ${videoInfo.width}x${videoInfo.height} @ ${videoInfo.fps.toFixed(2)} fps`);
  console.log(`ASCII: ${dimensions.width}x${dimensions.height}`);
  console.log('Press Ctrl+C to stop\n');
  
  // Hide cursor
  process.stdout.write('\x1b[?25l');
  
  // Clear screen
  console.clear();
  
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', inputFile,
      '-vf', `scale=${dimensions.width}:${dimensions.height}`,
      '-f', 'rawvideo',
      '-pix_fmt', 'rgb24',
      '-',
    ], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    const frameSize = dimensions.width * dimensions.height * 3; // RGB = 3 bytes per pixel
    let buffer = Buffer.alloc(0);
    const frameInterval = 1000 / videoInfo.fps;
    const frameQueue = [];
    let isPlaying = false;
    
    // Frame playback loop
    function playNextFrame() {
      if (frameQueue.length > 0) {
        const frameBuffer = frameQueue.shift();
        renderFrame(frameBuffer, dimensions.width, dimensions.height);
        setTimeout(playNextFrame, frameInterval);
      } else {
        isPlaying = false;
      }
    }
    
    ffmpeg.stdout.on('data', (data) => {
      buffer = Buffer.concat([buffer, data]);
      
      while (buffer.length >= frameSize) {
        const frameBuffer = buffer.slice(0, frameSize);
        buffer = buffer.slice(frameSize);
        
        // Add frame to queue
        frameQueue.push(frameBuffer);
        
        // Start playback if not already playing
        if (!isPlaying && frameQueue.length > 0) {
          isPlaying = true;
          playNextFrame();
        }
      }
    });
    
    ffmpeg.stderr.on('data', (data) => {
      // Suppress ffmpeg output
    });
    
    ffmpeg.on('close', (code) => {
      // Show cursor
      process.stdout.write('\x1b[?25h');
      console.log('\nPlayback finished');
      resolve();
    });
    
    ffmpeg.on('error', (err) => {
      process.stdout.write('\x1b[?25h');
      reject(err);
    });
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      ffmpeg.kill('SIGTERM');
      process.stdout.write('\x1b[?25h');
      console.log('\n\nStopped by user');
      process.exit(0);
    });
  });
}

function renderFrame(frameBuffer, width, height) {
  // Move cursor to top-left
  process.stdout.write('\x1b[H');
  
  let output = '';
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 3;
      const r = frameBuffer[index];
      const g = frameBuffer[index + 1];
      const b = frameBuffer[index + 2];
      
      // Calculate brightness
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const charIndex = Math.floor(brightness * (ASCII_CHARS.length - 1));
      const char = ASCII_CHARS[charIndex];
      
      // Apply color
      const colorCode = rgbToAnsi256(r, g, b);
      output += `\x1b[38;5;${colorCode}m${char}`;
    }
    output += RESET + '\n';
  }
  
  process.stdout.write(output);
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node main.js <video-file>');
  console.error('   or: ascii-play <video-file>');
  process.exit(1);
}

const inputFile = args[0];

if (!fs.existsSync(inputFile)) {
  console.error(`Error: File not found: ${inputFile}`);
  process.exit(1);
}

try {
  await playVideo(inputFile);
} catch (err) {
  console.error('Error:', err.message);
  process.stdout.write('\x1b[?25h'); // Show cursor
  process.exit(1);
}
