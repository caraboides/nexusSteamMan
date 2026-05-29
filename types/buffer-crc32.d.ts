declare module 'buffer-crc32' {
  function crc32(input: string | Buffer, partialCrc?: Buffer | number): Buffer

  namespace crc32 {
    function signed(buffer: string | Buffer, partialCrc?: Buffer | number): number
    function unsigned(buffer: string | Buffer, partialCrc?: Buffer | number): number
  }

  export default crc32
}
