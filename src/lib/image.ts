// Client-side image downscaling before base64 + upload. Phone photos are
// 3–12 MB; Anthropic downsamples anything past ~1568px on the long edge server
// side anyway, so shrinking here is a big upload + token win on kitchen wifi.

export type EncodedImage = {
  mediaType: 'image/jpeg'
  base64: string
  /** data: URL — used for the on-screen thumbnail. */
  dataUrl: string
}

const JPEG_QUALITY = 0.85

/**
 * Decode `file`, resize so its longest edge is at most `maxEdge`px, and
 * re-encode as JPEG. Throws a clear error if the file can't be decoded
 * (e.g. HEIC on a browser without support) so one bad photo doesn't sink
 * the whole batch.
 */
export async function downscaleToBase64(
  file: File,
  maxEdge = 1568,
): Promise<EncodedImage> {
  const { source, width, height, done } = await decode(file)
  try {
    const scale = Math.min(1, maxEdge / Math.max(width, height))
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Your browser blocked image processing.')
    ctx.drawImage(source, 0, 0, w, h)

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    return { mediaType: 'image/jpeg', base64, dataUrl }
  } finally {
    done()
  }
}

type Decoded = {
  source: CanvasImageSource
  width: number
  height: number
  done: () => void
}

/** Decode via createImageBitmap, falling back to an <img> element. */
async function decode(file: File): Promise<Decoded> {
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
            `Couldn't read "${file.name || 'that image'}" — try a JPEG or PNG.`,
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
