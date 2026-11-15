export interface ImageInfo {
  width: number;
  height: number;
  mimeType: string;
  isSquare: boolean;
}

export interface SanitizedImage {
  buffer: Uint8Array;
  mimeType: string;
  width: number;
  height: number;
  wasProcessed: boolean;
}

/**
 * Tabla CRC32 estándar para chunks PNG
 */
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  CRC_TABLE[n] = c >>> 0;
}

function crc32(buf: Uint8Array, offset: number, length: number): number {
  let c = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Descompresión de bloques zlib/deflate usando la Web Streams API nativa de Cloudflare Workers
 */
async function decompressDeflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate');
  const writer = ds.writable.getWriter();
  writer.write(data);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    result.set(c, pos);
    pos += c.length;
  }
  return result;
}

/**
 * Compresión deflate usando la Web Streams API nativa de Cloudflare Workers
 */
async function compressDeflate(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate');
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();

  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) {
    result.set(c, pos);
    pos += c.length;
  }
  return result;
}

/**
 * Lee las dimensiones y tipo de imagen directamente desde las cabeceras binarias
 * sin descomprimir en memoria (Protección DoS y bombas de píxeles).
 */
export function probeImageHeader(buffer: Uint8Array): ImageInfo {
  if (buffer.length < 16) {
    throw new Error('invalid_image: file too small to be a valid image');
  }

  // 1. PNG (Magic: 89 50 4E 47 0D 0A 1A 0A)
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
    buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A
  ) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return { width, height, mimeType: 'image/png', isSquare: width === height };
  }

  // 2. JPEG (Magic: FF D8 FF)
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    let offset = 2;
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xFF) {
        offset++;
        continue;
      }
      const marker = buffer[offset + 1];
      // Marcadores SOF0 (0xC0), SOF1 (0xC1), SOF2 (0xC2)
      if (marker >= 0xC0 && marker <= 0xC3 && marker !== 0xC4) {
        const height = view.getUint16(offset + 5, false);
        const width = view.getUint16(offset + 7, false);
        return { width, height, mimeType: 'image/jpeg', isSquare: width === height };
      }
      const length = view.getUint16(offset + 2, false);
      offset += 2 + length;
    }
    throw new Error('invalid_jpeg: SOF marker not found');
  }

  // 3. WebP (RIFF .... WEBP)
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    // VP8
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) {
      const width = view.getUint16(26, true) & 0x3fff;
      const height = view.getUint16(28, true) & 0x3fff;
      return { width, height, mimeType: 'image/webp', isSquare: width === height };
    }
    // VP8L (Lossless)
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x4C) {
      const b1 = buffer[21], b2 = buffer[22], b3 = buffer[23], b4 = buffer[24];
      const width = 1 + (((b2 & 0x3f) << 8) | b1);
      const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
      return { width, height, mimeType: 'image/webp', isSquare: width === height };
    }
    // VP8X (Extended)
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) {
      const width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
      const height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));
      return { width, height, mimeType: 'image/webp', isSquare: width === height };
    }
    return { width: 512, height: 512, mimeType: 'image/webp', isSquare: true };
  }

  throw new Error('unsupported_image_format: only PNG, JPEG and WebP are allowed');
}

/**
 * Algoritmo Paeth para desfiltrado de PNG
 */
function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Decodificador PNG puro en TypeScript
 */
async function decodePng(buffer: Uint8Array): Promise<{ width: number; height: number; rgba: Uint8Array }> {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  const bitDepth = buffer[24];
  const colorType = buffer[25];

  if (bitDepth !== 8) {
    throw new Error('unsupported_png_bit_depth: only 8-bit depth supported');
  }

  // Recolectar bloques IDAT y PLTE
  const idatParts: Uint8Array[] = [];
  let palette: Uint8Array | null = null;
  let offset = 8;

  while (offset < buffer.length - 4) {
    const length = view.getUint32(offset, false);
    const type = String.fromCharCode(
      buffer[offset + 4], buffer[offset + 5], buffer[offset + 6], buffer[offset + 7]
    );

    if (type === 'PLTE') {
      palette = buffer.subarray(offset + 8, offset + 8 + length);
    } else if (type === 'IDAT') {
      idatParts.push(buffer.subarray(offset + 8, offset + 8 + length));
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }

  // Unir IDATs
  const totalIdatLen = idatParts.reduce((acc, p) => acc + p.length, 0);
  const combinedIdat = new Uint8Array(totalIdatLen);
  let idatPos = 0;
  for (const part of idatParts) {
    combinedIdat.set(part, idatPos);
    idatPos += part.length;
  }

  // Descomprimir deflate
  const inflated = await decompressDeflate(combinedIdat);

  let bytesPerPixel = 4;
  if (colorType === 6) bytesPerPixel = 4; // RGBA
  else if (colorType === 2) bytesPerPixel = 3; // RGB
  else if (colorType === 3) bytesPerPixel = 1; // Indexed
  else if (colorType === 0) bytesPerPixel = 1; // Grayscale
  else if (colorType === 4) bytesPerPixel = 2; // Grayscale + Alpha

  const rawRgba = new Uint8Array(width * height * 4);
  const prevScanline = new Uint8Array(width * bytesPerPixel);
  const currScanline = new Uint8Array(width * bytesPerPixel);

  let rawOffset = 0;

  for (let y = 0; y < height; y++) {
    const filterType = inflated[rawOffset++];
    const lineStart = rawOffset;
    rawOffset += width * bytesPerPixel;

    for (let x = 0; x < width * bytesPerPixel; x++) {
      const xByte = inflated[lineStart + x];
      const a = x >= bytesPerPixel ? currScanline[x - bytesPerPixel] : 0;
      const b = prevScanline[x];
      const c = x >= bytesPerPixel ? prevScanline[x - bytesPerPixel] : 0;

      let val = 0;
      switch (filterType) {
        case 0:
          val = xByte;
          break;
        case 1:
          val = (xByte + a) & 0xff;
          break;
        case 2:
          val = (xByte + b) & 0xff;
          break;
        case 3:
          val = (xByte + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4:
          val = (xByte + paethPredictor(a, b, c)) & 0xff;
          break;
        default:
          val = xByte;
      }
      currScanline[x] = val;
    }

    // Convertir scanline a RGBA 32-bit
    const destYOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const srcIdx = x * bytesPerPixel;
      const dstIdx = destYOffset + x * 4;

      if (colorType === 6) {
        rawRgba[dstIdx] = currScanline[srcIdx];
        rawRgba[dstIdx + 1] = currScanline[srcIdx + 1];
        rawRgba[dstIdx + 2] = currScanline[srcIdx + 2];
        rawRgba[dstIdx + 3] = currScanline[srcIdx + 3];
      } else if (colorType === 2) {
        rawRgba[dstIdx] = currScanline[srcIdx];
        rawRgba[dstIdx + 1] = currScanline[srcIdx + 1];
        rawRgba[dstIdx + 2] = currScanline[srcIdx + 2];
        rawRgba[dstIdx + 3] = 255;
      } else if (colorType === 3 && palette) {
        const paletteIdx = currScanline[srcIdx] * 3;
        rawRgba[dstIdx] = palette[paletteIdx] || 0;
        rawRgba[dstIdx + 1] = palette[paletteIdx + 1] || 0;
        rawRgba[dstIdx + 2] = palette[paletteIdx + 2] || 0;
        rawRgba[dstIdx + 3] = 255;
      } else {
        const g = currScanline[srcIdx];
        rawRgba[dstIdx] = g;
        rawRgba[dstIdx + 1] = g;
        rawRgba[dstIdx + 2] = g;
        rawRgba[dstIdx + 3] = bytesPerPixel === 2 ? currScanline[srcIdx + 1] : 255;
      }
    }

    prevScanline.set(currScanline);
  }

  return { width, height, rgba: rawRgba };
}

/**
 * Recorte central a 1:1 cuadrado de un buffer RGBA
 */
function cropToSquare(
  srcRgba: Uint8Array,
  srcW: number,
  srcH: number
): { rgba: Uint8Array; size: number } {
  if (srcW === srcH) return { rgba: srcRgba, size: srcW };

  const size = Math.min(srcW, srcH);
  const startX = Math.floor((srcW - size) / 2);
  const startY = Math.floor((srcH - size) / 2);

  const cropped = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y++) {
    const srcRow = (startY + y) * srcW * 4 + startX * 4;
    const dstRow = y * size * 4;
    cropped.set(srcRgba.subarray(srcRow, srcRow + size * 4), dstRow);
  }

  return { rgba: cropped, size };
}

/**
 * Redimensiona un buffer RGBA cuadrado a max 512x512.
 * Si el tamaño es <= 512 (ej: 32x32, 64x64 pixel art), ¡se mantiene nativo sin reescalar!
 */
function resizeSquareRgba(
  srcRgba: Uint8Array,
  srcSize: number,
  maxSize: number = 512
): { rgba: Uint8Array; size: number } {
  if (srcSize <= maxSize) {
    // Mantener tamaño original nativo (ej: 32x32 se queda 32x32)
    return { rgba: srcRgba, size: srcSize };
  }

  const targetSize = maxSize;
  const dstRgba = new Uint8Array(targetSize * targetSize * 4);
  const scale = srcSize / targetSize;

  for (let y = 0; y < targetSize; y++) {
    const srcY = Math.min(Math.floor(y * scale), srcSize - 1);
    for (let x = 0; x < targetSize; x++) {
      const srcX = Math.min(Math.floor(x * scale), srcSize - 1);

      const srcIdx = (srcY * srcSize + srcX) * 4;
      const dstIdx = (y * targetSize + x) * 4;

      dstRgba[dstIdx] = srcRgba[srcIdx];
      dstRgba[dstIdx + 1] = srcRgba[srcIdx + 1];
      dstRgba[dstIdx + 2] = srcRgba[srcIdx + 2];
      dstRgba[dstIdx + 3] = srcRgba[srcIdx + 3];
    }
  }

  return { rgba: dstRgba, size: targetSize };
}

/**
 * Codificador PNG puro con compresión Web Streams
 */
async function encodePng(rgba: Uint8Array, size: number): Promise<Uint8Array> {
  const scanlines = new Uint8Array(size * (1 + size * 4));
  let scanOffset = 0;

  for (let y = 0; y < size; y++) {
    scanlines[scanOffset++] = 0; // Filter: None
    const rowStart = y * size * 4;
    scanlines.set(rgba.subarray(rowStart, rowStart + size * 4), scanOffset);
    scanOffset += size * 4;
  }

  const compressedIdat = await compressDeflate(scanlines);

  const totalLength = 8 + 25 + (12 + compressedIdat.length) + 12;
  const png = new Uint8Array(totalLength);
  const view = new DataView(png.buffer);

  // PNG Signature
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

  // IHDR chunk
  let pos = 8;
  view.setUint32(pos, 13, false);
  png.set([0x49, 0x48, 0x44, 0x52], pos + 4);
  view.setUint32(pos + 8, size, false);
  view.setUint32(pos + 12, size, false);
  png[pos + 16] = 8;
  png[pos + 17] = 6;
  png[pos + 18] = 0;
  png[pos + 19] = 0;
  png[pos + 20] = 0;
  const ihdrCrc = crc32(png, pos + 4, 17);
  view.setUint32(pos + 21, ihdrCrc, false);
  pos += 25;

  // IDAT chunk
  view.setUint32(pos, compressedIdat.length, false);
  png.set([0x49, 0x44, 0x41, 0x54], pos + 4);
  png.set(compressedIdat, pos + 8);
  const idatCrc = crc32(png, pos + 4, 4 + compressedIdat.length);
  view.setUint32(pos + 8 + compressedIdat.length, idatCrc, false);
  pos += 12 + compressedIdat.length;

  // IEND chunk
  view.setUint32(pos, 0, false);
  png.set([0x49, 0x45, 0x4e, 0x44], pos + 4);
  const iendCrc = crc32(png, pos + 4, 4);
  view.setUint32(pos + 8, iendCrc, false);

  return png;
}

/**
 * Función Maestra: Valida, Recorta 1:1, Redimensiona a máx 512x512 y Comprime la imagen en el servidor.
 * Protege contra ataques DoS, payloads gigantes (ej. 2GB) y bombas de píxeles.
 */
export async function sanitizeAndProcessImage(
  rawBuffer: ArrayBuffer,
  declaredMimeType: string = 'image/png'
): Promise<SanitizedImage> {
  const bytes = new Uint8Array(rawBuffer);

  // 1. Blindaje contra ataques de tamaño (Payloads gigantes como 2GB)
  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error('payload_too_large: Image exceeds maximum allowed size of 5 MB');
  }

  // 2. Leer cabecera binaria rápida
  const info = probeImageHeader(bytes);

  // 3. Blindaje contra bombas de píxeles (pixel flood attack)
  if (info.width > 4096 || info.height > 4096) {
    throw new Error(`dimensions_too_large: Image dimensions ${info.width}x${info.height} exceed safe limit of 4096px`);
  }
  if (info.width < 16 || info.height < 16) {
    throw new Error('image_too_small: Image dimensions must be at least 16x16 px');
  }

  // 4. Si es PNG, procesar completamente (recorte 1:1, resize max 512, re-compresión zlib level 9)
  if (info.mimeType === 'image/png') {
    if (info.isSquare && info.width <= 512 && bytes.length < 350 * 1024) {
      return {
        buffer: bytes,
        mimeType: 'image/png',
        width: info.width,
        height: info.height,
        wasProcessed: false
      };
    }

    try {
      const decoded = await decodePng(bytes);
      const cropped = cropToSquare(decoded.rgba, decoded.width, decoded.height);
      const resized = resizeSquareRgba(cropped.rgba, cropped.size, 512);
      const encoded = await encodePng(resized.rgba, resized.size);

      return {
        buffer: encoded,
        mimeType: 'image/png',
        width: resized.size,
        height: resized.size,
        wasProcessed: true
      };
    } catch (err: any) {
      console.warn('[ImageSanitizer] PNG decode fallback:', err.message);
      if (info.isSquare && info.width <= 512) {
        return { buffer: bytes, mimeType: 'image/png', width: info.width, height: info.height, wasProcessed: false };
      }
      throw new Error(`image_processing_failed: ${err.message}`);
    }
  }

  // 5. Para JPEG o WebP:
  if (info.isSquare && info.width <= 512 && bytes.length <= 500 * 1024) {
    return {
      buffer: bytes,
      mimeType: info.mimeType,
      width: info.width,
      height: info.height,
      wasProcessed: false
    };
  }

  if (!info.isSquare || info.width > 512) {
    throw new Error('image_not_square_or_too_large: Images must be square (1:1) and at most 512x512 px');
  }

  return {
    buffer: bytes,
    mimeType: info.mimeType,
    width: info.width,
    height: info.height,
    wasProcessed: false
  };
}
