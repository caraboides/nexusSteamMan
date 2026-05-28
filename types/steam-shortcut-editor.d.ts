declare module 'steam-shortcut-editor' {
  export interface ParseOptions {
    autoConvertBooleans?: boolean
    autoConvertArrays?: boolean
    dateProperties?: string[]
  }

  export function parseFile(
    filePath: string,
    callback: (err: Error | null, result?: Record<string, any>, inputBuffer?: Buffer) => void,
  ): void
  export function parseFile(
    filePath: string,
    opts: ParseOptions,
    callback: (err: Error | null, result?: Record<string, any>, inputBuffer?: Buffer) => void,
  ): void

  export function parseBuffer(buffer: Buffer, opts?: ParseOptions): Record<string, any>

  export function writeFile(
    filePath: string,
    obj: Record<string, any>,
    callback: (err: Error | null) => void,
  ): void
  export function writeFile(
    filePath: string,
    obj: Record<string, any>,
    opts: object | null,
    callback: (err: Error | null) => void,
  ): void

  export function writeBuffer(obj: Record<string, any>): Buffer
}

declare module 'steam-shortcut-editor/lib' {
  export { parseFile, parseBuffer, writeFile, writeBuffer, ParseOptions } from 'steam-shortcut-editor'
}
