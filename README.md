# FFmpeg ASCII Video Player

A lightweight, performant Node.js CLI application that plays videos as colored ASCII art in your terminal using ffmpeg/ffplay.

## Features

- 🎨 **Colored ASCII art** - Full color output using ANSI 256 colors
- 📐 **Aspect ratio preservation** - Maintains original video proportions
- 📏 **Dynamic terminal scaling** - Automatically adjusts to your terminal size
- ⚡ **Original FPS** - Plays at the video's native frame rate
- 🖥️ **Cross-platform** - Works on both Windows and Linux

## Requirements

- Node.js 14 or higher
- FFmpeg installed and available in PATH
  - Windows: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
  - Linux: `sudo apt install ffmpeg` or `sudo yum install ffmpeg`

## Installation

### Local Usage

```bash
npm install
```

### Global Installation

```bash
npm install -g .
```

After global installation, you can use the `ascii-play` command anywhere.

## Usage

### Direct execution:
```bash
node main.js path/to/video.mp4
```

### If installed globally:
```bash
ascii-play path/to/video.mp4
```

### Examples:
```bash
# Play a local video file
node main.js myvideo.mp4

# Play a video with path
node main.js C:\Videos\example.mp4

# Linux example
node main.js /home/user/videos/example.mp4
```

## Controls

- **Ctrl+C** - Stop playback

## How It Works

1. Uses `ffprobe` to extract video metadata (resolution, FPS)
2. Calculates optimal ASCII dimensions based on terminal size while preserving aspect ratio
3. Uses `ffmpeg` to decode video frames as raw RGB24 data
4. Converts each pixel to:
   - An ASCII character based on brightness
   - ANSI 256 color code based on RGB values
5. Renders frames at the original video FPS

## Technical Details

- **Character set**: ` .:-=+*#%@` (darkest to brightest)
- **Color mapping**: RGB to ANSI 256 color palette
- **Aspect ratio correction**: Accounts for character height/width ratio (typically 2:1)
- **Performance**: Minimal dependencies, direct ffmpeg pipe processing

## Limitations

- Audio is not played (this is a visual-only ASCII renderer)
- Performance depends on terminal emulator capabilities
- Very large terminals may impact performance
- Works best with smaller video resolutions or larger ASCII character sets

## Troubleshooting

**"ffprobe not found" or "ffmpeg not found":**
- Make sure FFmpeg is installed and in your system PATH
- Test by running `ffmpeg -version` in your terminal

**Video doesn't play smoothly:**
- Try a smaller terminal window
- Use a video with lower resolution
- Check your CPU usage

**Colors look wrong:**
- Ensure your terminal supports 256 colors
- Try a different terminal emulator (e.g., Windows Terminal, iTerm2, Alacritty)

## License

MIT
