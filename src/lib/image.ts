// Client-side image downscaling before base64 + upload. Phone photos are
// 3–12 MB (modern phones shoot 48MP+); Anthropic downsamples anything past
// ~1568px on the long edge server-side anyway, so shrinking here is a big upload
// + token win. Crucially, where the browser supports it we decode STRAIGHT to
// the target size (createImageBitmap resize) and never allocate the full-res
// bitmap — that full-res buffer is what OOMs low-RAM phones on a single big
// photo. We read dimensions from the file header first so we never have to
// decode the whole image just to size it.

export type EncodedImage = {
  mediaType: 'image/jpeg'
  base64: string
}

const JPEG_QUALITY = 0.85
const MAX_EDGE = 1568

/**
 * Decode `file`, resize so its longest edge is at most `maxEdge`px, and
 * re-encode as JPEG base64. Fast path (Chrome/Firefox) decodes directly to the
 * downscaled size — low peak memory. Falls back to a full decode + canvas
 * downscale where resize-on-decode isn't supported (Safari) or the header can't
 * be read. Throws a clear error if the file can't be decoded at all (e.g. a raw
 * HEIC on a browser without HEIC support) so one bad photo doesn't sink a batch.
 */
export async function downscaleToBase64(
  file: Blob,
  maxEdge = MAX_EDGE,
): Promise<EncodedImage> {
  const size = await readImageSize(file)
  const target = size && resizeTarget(size.width, size.height, maxEdge)

  // Fast path: decode straight to the downscaled size (never the full bitmap).
  if (target && typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: 'from-image',
        resizeWidth: target.w,
        resizeHeight: target.h,
        resizeQuality: 'high',
      })
      // Some engines (Safari) accept the call but ignore the resize options and
      // hand back a full-size bitmap. If so, bin it and use the fallback so we
      // don't quietly draw a full-res image (and lose the memory win).
      if (Math.max(bitmap.width, bitmap.height) > maxEdge * 1.5) {
        bitmap.close()
      } else {
        try {
          return await encode(bitmap, bitmap.width, bitmap.height)
        } finally {
          bitmap.close()
        }
      }
    } catch {
      // Resize options unsupported or decode failed — fall through.
    }
  }

  // Fallback: full decode, then downscale on a canvas (orientation handled by
  // the decoder). Higher peak memory, but only reached where the fast path
  // can't run — which is not the platform that OOMs.
  const { source, width, height, done } = await decode(file)
  try {
    const { w, h } = resizeTarget(width, height, maxEdge)
    return await encode(source, w, h)
  } finally {
    done()
  }
}

/** Longest-edge-bounded target size, preserving aspect (never upscales). */
function resizeTarget(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    w: Math.max(1, Math.round(width * scale)),
    h: Math.max(1, Math.round(height * scale)),
  }
}

/** Draw `source` into a w×h canvas and return JPEG base64 (no data: prefix). */
async function encode(
  source: CanvasImageSource,
  w: number,
  h: number,
): Promise<EncodedImage> {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser blocked image processing.')
  ctx.drawImage(source, 0, 0, w, h)
  const base64 = await canvasToJpegBase64(canvas)
  // Release the canvas backing store promptly on memory-tight devices.
  canvas.width = 0
  canvas.height = 0
  return { mediaType: 'image/jpeg', base64 }
}

/** toBlob (async, lighter peak than the synchronous toDataURL) -> base64. */
function canvasToJpegBase64(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Your browser blocked image processing.'))
          return
        }
        const reader = new FileReader()
        reader.onload = () => {
          const url = reader.result as string
          resolve(url.slice(url.indexOf(',') + 1))
        }
        reader.onerror = () =>
          reject(reader.error ?? new Error('Image encode failed.'))
        reader.readAsDataURL(blob)
      },
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

/**
 * Read pixel dimensions from the file header WITHOUT decoding pixels — a cheap
 * read of the first chunk. Supports JPEG / PNG / WebP (the formats phone
 * cameras and the picker hand us); returns null for anything else (raw HEIC,
 * GIF, …) so the caller falls back to a measure-by-decode.
 */
export async function readImageSize(
  file: Blob,
): Promise<{ width: number; height: number } | null> {
  const buf = await file.slice(0, 65536).arrayBuffer()
  const v = new DataView(buf)
  if (v.byteLength < 24) return null

  // PNG: 8-byte signature, then IHDR width/height (big-endian) at 16/20.
  if (v.getUint32(0) === 0x89504e47) {
    return { width: v.getUint32(16), height: v.getUint32(20) }
  }

  // JPEG: SOI (FF D8), then walk segments to a Start-Of-Frame marker.
  if (v.getUint16(0) === 0xffd8) {
    let o = 2
    while (o + 9 < v.byteLength) {
      if (v.getUint8(o) !== 0xff) {
        o++
        continue
      }
      const marker = v.getUint8(o + 1)
      if (marker === 0xff) {
        o++ // fill byte
        continue
      }
      // SOF0..SOF15 carry [precision][height][width]; skip DHT/JPG/DAC.
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        return { height: v.getUint16(o + 5), width: v.getUint16(o + 7) }
      }
      // Standalone markers (no length payload): RSTn/SOI/EOI (D0–D9), TEM (01).
      if ((marker >= 0xd0 && marker <= 0xd9) || marker === 0x01) {
        o += 2
        continue
      }
      if (marker === 0xda) return null // hit scan data before any SOF
      const len = v.getUint16(o + 2)
      if (len < 2) return null
      o += 2 + len
    }
    return null
  }

  // WebP: 'RIFF' .... 'WEBP' then a VP8 / VP8L / VP8X chunk.
  if (v.getUint32(0) === 0x52494646 && v.getUint32(8) === 0x57454250) {
    const fourcc = v.getUint32(12)
    if (fourcc === 0x56503820 /* 'VP8 ' */ && v.byteLength >= 30) {
      return {
        width: v.getUint16(26, true) & 0x3fff,
        height: v.getUint16(28, true) & 0x3fff,
      }
    }
    if (fourcc === 0x5650384c /* 'VP8L' */ && v.byteLength >= 25) {
      const bits = v.getUint32(21, true)
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
      }
    }
    if (fourcc === 0x56503858 /* 'VP8X' */ && v.byteLength >= 30) {
      const w = v.getUint8(24) | (v.getUint8(25) << 8) | (v.getUint8(26) << 16)
      const h = v.getUint8(27) | (v.getUint8(28) << 8) | (v.getUint8(29) << 16)
      return { width: w + 1, height: h + 1 }
    }
  }

  return null
}

type Decoded = {
  source: CanvasImageSource
  width: number
  height: number
  done: () => void
}

/** Full decode via createImageBitmap, falling back to an <img> element. */
async function decode(file: Blob): Promise<Decoded> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    })
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      done: () => bitmap.close(),
    }
  } catch {
    // Fall through to the <img> path.
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () =>
        reject(
          new Error(
            `Couldn't read "${(file as File).name || 'that image'}" — try a JPEG or PNG.`,
          ),
        )
      el.src = url
    })
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      done: () => URL.revokeObjectURL(url),
    }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}
