module.exports = async function globalTeardown() {
  const mjpegServer = global.__MJPEG_SERVER__;

  if (mjpegServer) {
    console.log('Stopping MJPEG test server...');
    mjpegServer.kill();
    // Wait for the process to exit so port 8900 is released before the next run.
    await new Promise(resolve => {
      mjpegServer.on('exit', resolve);
      // Fallback: resolve after 3s if exit event never fires
      setTimeout(resolve, 3000);
    });
    console.log('MJPEG test server stopped');
  }
};
