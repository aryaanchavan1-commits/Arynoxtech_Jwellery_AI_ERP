import JsBarcode from 'jsbarcode';

export function generateBarcodeSVG(code, options = {}) {
  try {
    if (!code || code === 'N/A') code = 'N/A';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    JsBarcode(svg, String(code), {
      format: 'CODE128',
      width: 1.5,
      height: 40,
      displayValue: true,
      fontSize: 12,
      margin: 2,
      ...options
    });
    return new XMLSerializer().serializeToString(svg);
  } catch (e) {
    console.error('Barcode SVG error:', e, 'code:', code);
    return fallbackSvg(code);
  }
}

export function generateBarcodeDataURL(code, options = {}) {
  try {
    if (!code || code === 'N/A') code = code || 'N/A';
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, String(code), {
      format: 'CODE128',
      width: 1.5,
      height: 40,
      displayValue: true,
      fontSize: 12,
      margin: 2,
      ...options
    });
    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error('Barcode DataURL error:', e, 'code:', code);
    return '';
  }
}

export function generateBarcodeSVGDataURL(code, options = {}) {
  const svgStr = generateBarcodeSVG(code, options);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
}

export function generateBarcodeHTML(code, options = {}) {
  const svgStr = generateBarcodeSVG(code, options);
  return svgStr;
}

function fallbackSvg(code) {
  const c = String(code || 'N/A');
  const w = 150;
  const h = 50;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="white"/>
    <line x1="10" y1="10" x2="30" y2="40" stroke="black" stroke-width="2"/>
    <line x1="20" y1="10" x2="40" y2="40" stroke="black" stroke-width="3"/>
    <line x1="35" y1="10" x2="15" y2="40" stroke="black" stroke-width="2"/>
    <line x1="45" y1="10" x2="55" y2="40" stroke="black" stroke-width="4"/>
    <line x1="60" y1="10" x2="70" y2="40" stroke="black" stroke-width="2"/>
    <line x1="75" y1="10" x2="65" y2="40" stroke="black" stroke-width="3"/>
    <line x1="85" y1="10" x2="95" y2="40" stroke="black" stroke-width="2"/>
    <line x1="100" y1="10" x2="110" y2="40" stroke="black" stroke-width="4"/>
    <text x="${w / 2}" y="${h - 5}" text-anchor="middle" font-size="8" fill="black">${c}</text>
  </svg>`;
}
