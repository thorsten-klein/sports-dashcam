#!/usr/bin/env python3
"""
Dummy MJPEG Stream Server
Creates a fake MJPEG video stream for testing purposes.

Uses asyncio so all connections share a single event loop — no per-connection
thread creation overhead.  This keeps response latency low even when many
Playwright workers hit the server simultaneously.
"""

import argparse
import asyncio
import io
from urllib.parse import urlparse
from PIL import Image, ImageDraw, ImageFont

# Pre-generated frame pool shared across all connections.
# Frames are generated once at startup so concurrent streams just read from
# memory instead of re-encoding images on every request.
_FRAME_POOL: list[bytes] = []
_FRAME_POOL_SIZE = 30   # smaller pool; frames are tiny so 30 is plenty


def _build_frame_pool(width: int = 1280, height: int = 720):
    """Generate a small pool of JPEG frames at startup with animated colorful background."""
    # Default to 720p (1280x720) for testing modern video applications.
    # Can be customized via command line arguments for different resolutions.
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    except Exception:
        font = ImageFont.load_default()

    import math

    for i in range(_FRAME_POOL_SIZE):
        # Create animated gradient background with fast rectangle drawing
        img = Image.new('RGB', (width, height))
        draw = ImageDraw.Draw(img)

        # Animation phase
        phase = i / _FRAME_POOL_SIZE

        # Draw colorful animated gradient using horizontal stripes (fast)
        stripe_count = 100  # Enough for smooth gradient
        for stripe in range(stripe_count):
            y_start = int((stripe / stripe_count) * height)
            y_end = int(((stripe + 1) / stripe_count) * height)

            # Animated color waves
            pos = stripe / stripe_count
            wave1 = math.sin(pos * 6 + phase * 2 * math.pi) * 0.5 + 0.5
            wave2 = math.sin(pos * 4 + phase * 3 * math.pi) * 0.5 + 0.5
            wave3 = math.sin(pos * 8 - phase * 4 * math.pi) * 0.5 + 0.5

            r = int(60 + wave1 * 120 + wave3 * 50)
            g = int(40 + wave2 * 140 + wave1 * 40)
            b = int(100 + wave3 * 120 + wave2 * 35)

            draw.rectangle([(0, y_start), (width, y_end)], fill=(r, g, b))

        # Add some animated diagonal color bands for variety
        band_count = 5
        for band in range(band_count):
            offset = int((phase + band / band_count) * width * 2 - width)
            band_width = width // 15

            # Colorful bands
            hue_shift = (band / band_count + phase) % 1.0
            if hue_shift < 0.33:
                color = (255, int(hue_shift * 3 * 200), 100)
            elif hue_shift < 0.66:
                color = (100, 255, int((hue_shift - 0.33) * 3 * 200))
            else:
                color = (int((hue_shift - 0.66) * 3 * 200), 100, 255)

            # Draw diagonal band with low opacity effect (by drawing thin lines)
            for dy in range(height):
                x_start = offset + dy - band_width // 2
                x_end = offset + dy + band_width // 2
                if 0 <= x_start < width or 0 <= x_end < width:
                    x_start = max(0, min(width, x_start))
                    x_end = max(0, min(width, x_end))
                    # Blend by drawing with partial coverage
                    if x_end > x_start and dy % 3 == 0:
                        draw.line([(x_start, dy), (x_end, dy)], fill=color, width=1)

        # Simple centered text
        draw.text((width // 2, height // 2), f"Frame {i}", fill=(255, 255, 255),
                  font=font, anchor="mm")

        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=85)
        _FRAME_POOL.append(buf.getvalue())


# ---------------------------------------------------------------------------
# Async HTTP/MJPEG server
# ---------------------------------------------------------------------------

_CRLF = b'\r\n'
_FPS = 5   # 5 fps is plenty for headless tests and keeps I/O load minimal


def _mjpeg_headers() -> bytes:
    return (
        b'HTTP/1.1 200 OK\r\n'
        b'Content-Type: multipart/x-mixed-replace; boundary=frame\r\n'
        b'Cache-Control: no-cache, no-store, must-revalidate\r\n'
        b'Pragma: no-cache\r\n'
        b'Expires: 0\r\n'
        b'Access-Control-Allow-Origin: *\r\n'
        b'\r\n'
    )


def _html_page(port: int) -> bytes:
    body = f"""<!DOCTYPE html>
<html>
<head><title>Dummy MJPEG Stream Test</title></head>
<body style="background:#1a1a1a;color:#fff;font-family:Arial,sans-serif;padding:20px">
  <h1 style="color:#4CAF50">Dummy MJPEG Stream Test</h1>
  <p>Stream URL: <code>http://localhost:{port}/stream</code></p>
  <img src="/stream" alt="MJPEG Stream">
</body>
</html>""".encode()
    return (
        b'HTTP/1.1 200 OK\r\n'
        b'Content-Type: text/html; charset=utf-8\r\n'
        + f'Content-Length: {len(body)}\r\n'.encode()
        + b'\r\n'
        + body
    )


def _not_found() -> bytes:
    return b'HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n'


async def _read_request_line(reader: asyncio.StreamReader) -> str:
    try:
        line = await asyncio.wait_for(reader.readline(), timeout=5.0)
        return line.decode(errors='replace').strip()
    except (asyncio.TimeoutError, ConnectionResetError):
        return ''


async def _drain_headers(reader: asyncio.StreamReader):
    """Read and discard HTTP request headers until blank line."""
    try:
        while True:
            line = await asyncio.wait_for(reader.readline(), timeout=2.0)
            if line in (_CRLF, b'\n', b''):
                break
    except (asyncio.TimeoutError, ConnectionResetError):
        pass


async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    try:
        request_line = await _read_request_line(reader)
        await _drain_headers(reader)

        if not request_line:
            return

        # Parse path
        parts = request_line.split(' ')
        path = urlparse(parts[1] if len(parts) > 1 else '/').path

        port = writer.get_extra_info('sockname', (None, 8900))[1]

        if path in ('/stream', '/video'):
            writer.write(_mjpeg_headers())
            await writer.drain()

            frame_idx = 0
            frame_delay = 1.0 / _FPS
            while True:
                frame = _FRAME_POOL[frame_idx % _FRAME_POOL_SIZE]
                chunk = (
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n'
                    + f'Content-Length: {len(frame)}\r\n'.encode()
                    + b'\r\n'
                    + frame
                    + b'\r\n'
                )
                writer.write(chunk)
                await writer.drain()
                frame_idx += 1
                await asyncio.sleep(frame_delay)

        elif path in ('/', '/test'):
            writer.write(_html_page(port))
            await writer.drain()

        else:
            writer.write(_not_found())
            await writer.drain()

    except (ConnectionResetError, BrokenPipeError, asyncio.IncompleteReadError):
        pass  # Client disconnected — expected for cancelled MJPEG streams
    except Exception as e:
        pass  # Swallow unexpected errors to keep the server running
    finally:
        try:
            writer.close()
            await writer.wait_closed()
        except Exception:
            pass


async def run_server_async(port: int, width: int, height: int):
    server = await asyncio.start_server(handle_client, '', port)
    addr = server.sockets[0].getsockname()
    print(f'')
    print(f'=' * 60)
    print(f'  Dummy MJPEG Stream Server ({width}x{height} @ {_FPS} FPS)')
    print(f'=' * 60)
    print(f'')
    print(f'  Test Page:  http://localhost:{port}/')
    print(f'  Stream URL: http://localhost:{port}/stream')
    print(f'')
    print(f'  Press Ctrl+C to stop')
    print(f'=' * 60)
    print(f'')
    async with server:
        await server.serve_forever()


def main():
    parser = argparse.ArgumentParser(
        description='Dummy MJPEG stream server for testing (defaults to 720p)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  %(prog)s --port 8080
  %(prog)s --port 76931 --width 1920 --height 1080
  %(prog)s -p 9000 -W 640 -H 480
  %(prog)s --port 8080 --fps 10

The stream will be available at:
  http://localhost:PORT/stream
        '''
    )
    parser.add_argument(
        '--port', '-p',
        type=int,
        required=True,
        help='Port number to serve the MJPEG stream'
    )
    parser.add_argument(
        '--width', '-W',
        type=int,
        default=1280,
        help='Video frame width in pixels (default: 1280 for 720p)'
    )
    parser.add_argument(
        '--height', '-H',
        type=int,
        default=720,
        help='Video frame height in pixels (default: 720 for 720p)'
    )
    parser.add_argument(
        '--fps',
        type=int,
        default=5,
        help='Frames per second (default: 5)'
    )

    args = parser.parse_args()

    # Validate port
    if not (1024 <= args.port <= 65535):
        print(f"Warning: Port {args.port} is outside recommended range (1024-65535)")
        response = input("Continue anyway? (y/n): ")
        if response.lower() != 'y':
            return

    # Update global FPS if specified
    global _FPS
    _FPS = args.fps

    print(f"Pre-generating frame pool ({args.width}x{args.height} @ {_FPS} FPS)...")
    _build_frame_pool(args.width, args.height)
    print(f"Frame pool ready ({_FRAME_POOL_SIZE} frames)")

    try:
        asyncio.run(run_server_async(args.port, args.width, args.height))
    except KeyboardInterrupt:
        print("\nShutting down server...")


if __name__ == '__main__':
    main()
