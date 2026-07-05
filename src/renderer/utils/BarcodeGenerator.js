export function generateBarcodeSVG(code, options = {}) {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  document.body.appendChild(div);

  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('id', 'barcode-svg');
    div.appendChild(svg);

    const JsBarcode = require('jsbarcode');
    JsBarcode(svg, code, {
      format: 'CODE128',
      width: 1.5,
      height: 40,
      displayValue: true,
      fontSize: 12,
      margin: 2,
      ...options
    });

    const serializer = new XMLSerializer();
    return serializer.serializeToString(svg);
  } finally {
    document.body.removeChild(div);
  }
}

export function generateBarcodeDataURL(code, options = {}) {
  try {
    const JsBarcode = require('jsbarcode');
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, code, {
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
    console.error('Barcode generation error:', e);
    return '';
  }
}
