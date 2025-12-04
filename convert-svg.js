const fs = require('fs');
const https = require('https');

// Read the SVG file
const svg = fs.readFileSync('public/favicon.svg', 'utf8');

// Function to convert SVG to PNG using cloudconvert API alternative
// Since we can't use external APIs easily, we'll create a simple HTML file
// that can be opened in a browser to manually save the PNG

const html192 = `
<!DOCTYPE html>
<html>
<head><title>Convert to 192x192</title></head>
<body style="margin:0;background:#000">
<canvas id="canvas" width="192" height="192"></canvas>
<script>
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const svg = \`${svg}\`;
const img = new Image();
const blob = new Blob([svg], {type: 'image/svg+xml'});
const url = URL.createObjectURL(blob);
img.onload = function() {
  ctx.drawImage(img, 0, 0, 192, 192);
  canvas.toBlob(function(blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pwa-192x192.png';
    a.click();
  });
};
img.src = url;
</script>
</body>
</html>
`;

const html512 = html192.replace(/192/g, '512');

fs.writeFileSync('convert-192.html', html192);
fs.writeFileSync('convert-512.html', html512);

console.log('Created convert-192.html and convert-512.html');
console.log('Open these files in a browser to download the PNG files');
