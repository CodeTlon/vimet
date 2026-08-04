declare module 'gif.js' {
  export type GifOptions = {
    workers?: number
    quality?: number
    width?: number
    height?: number
    workerScript?: string
    repeat?: number
  }

  export type GifFrameOptions = {
    delay?: number
    copy?: boolean
  }

  export default class GIF {
    constructor(options: GifOptions)
    addFrame(element: CanvasImageSource | CanvasRenderingContext2D, options?: GifFrameOptions): void
    on(event: 'finished', callback: (blob: Blob) => void): void
    on(event: 'progress', callback: (progress: number) => void): void
    on(event: 'abort' | 'start', callback: () => void): void
    render(): void
    abort(): void
  }
}
