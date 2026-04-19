# Sports-Dashcam

A lightweight IP camera monitoring and recording application that runs entirely in your browser. Monitor multiple camera streams, record full sessions or short clips - no backend required.

## Features

- **Multi-Camera Support** - Monitor multiple IP cameras simultaneously in a responsive grid layout
- **Circular Buffer Recording** - Continuously buffer video in memory to save the last 5-120 seconds
- **Quick Clip Saving** - Tag and save important moments with a single click
- **Full Video Recording** - Record complete sessions from any camera
- **Offline Support** - Works completely offline using browser storage
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Hotkey support** - Control the app via remote control
- **Screen Lock** - Lock the screen and keep screen active
- **Video Controls** - Playback, pause, mirror, rotate, and fullscreen support


## Quick Start

For CORS proxy support and better compatibility:

```bash
# Using Python
python3 server.py
```
Then open `http://localhost:8888` in your browser.

Or using the convenience script:

```bash
./serve.sh
```
Then open `http://localhost:8000` in your browser.


## Supported Stream Types

- **MJPEG Streams** - Motion JPEG (mjpeg) streams
- **IP Camera Streams** - HTTP/HTTPS video streams (not tested yet)
- **MP4 Videos** - Direct MP4 file URLs (not tested yet)

### Using Your Smartphone as a Camera

Turn your Android phone into an IP camera using the **IP Webcam** app:

1. Install [IP Webcam from Google Play](https://play.google.com/store/apps/details?id=com.pas.webcam)
2. Launch the app and scroll to the bottom
3. Tap **Start server**
4. Note the IP address shown (e.g., `http://192.168.1.100:8080`)

## Usage

### Adding a Camera

1. Click the **+ Add Camera** button
2. Enter camera details:
   - **Name** - Friendly name for the camera
   - **URL** - Stream URL (see examples below)
3. Click **Add Camera**
4. Enter stream url, e.g. `http://192.168.1.100:8080` (see above)

### Recording Full Videos

1. Enable one or more cameras and start recording.
2. Click the **Start Recording** button
3. Click **Stop Recording** when done
4. View recordings in the **Full Videos** tab


### Saving Video Clips

1. Start recording (see above).
2. When something interesting happens, click **Tag** button
3. The last X seconds will be saved (X is configurable in Settings)
4. View saved clips in the **Video Tags** tab


### Settings

Access settings via the gear icon:

- **Tag durations** - When does the clip start before Tag button was clicked and how many seconds after the click it will end
- **Hotkeys** - Configure Hotkeys for specific actions (e.g. Tagging). A button or gesture can be specified or detected.

## Troubleshooting

### Stream Won't Load

- Verify camera URL works in VLC Media Player
- Check camera is on the same network
- Check browser console (F12) for errors

### High Memory Usage

- Reduce buffer duration in Settings
- Remove unused cameras
- Clean old recordings regularly
- Monitor fewer cameras simultaneously

## Development

The application uses vanilla JavaScript with a modular architecture:

- **No build step required** - Edit and reload
- **No dependencies** - Pure HTML/CSS/JS
- **Class-based modules** - CameraManager, VideoRecorder, etc.
- **Event-driven** - Uses custom events for component communication

## Privacy & Security

- **100% Client-Side** - No data leaves your browser
- **No Analytics** - No tracking or telemetry
- **No External Dependencies** - All code runs locally
- **No Cloud Storage** - Data stored in browser only

## License

This project is available as open source. See the repository for license details.

## Contributing

Contributions welcome! Please submit pull requests or open issues for bugs and feature requests.

## Support

For issues or questions, please check the troubleshooting section or file an issue on GitHub.
