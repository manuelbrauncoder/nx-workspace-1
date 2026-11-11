import { crc32 } from 'node:zlib';

export interface ParsedZipEntry {
  name: string;
  data: Buffer;
  /** CRC-32 stored in the central directory. */
  crc: number;
  method: number;
  flags: number;
  /** The size fields of the central directory. */
  compressedSize: number;
  size: number;
}

/**
 * Reads a ZIP the way an unzip tool does: from the end-of-central-directory record to the central
 * directory to each local header. Throws on anything inconsistent (signatures, offsets, sizes,
 * CRC), so a test only needs to read the result.
 */
export function parseZip(buffer: Buffer): ParsedZipEntry[] {
  if (buffer.length < 22) throw new Error('Too short for a ZIP');
  const end = buffer.length - 22;
  if (buffer.readUInt32LE(end) !== 0x06054b50) throw new Error('No end-of-central-directory');
  const count = buffer.readUInt16LE(end + 10);
  if (buffer.readUInt16LE(end + 8) !== count) throw new Error('Entry counts differ');
  const size = buffer.readUInt32LE(end + 12);
  const offset = buffer.readUInt32LE(end + 16);
  if (offset + size !== end) throw new Error('Central directory does not end at the record');

  const entries: ParsedZipEntry[] = [];
  let pos = offset;
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) throw new Error('Bad central header');
    const flags = buffer.readUInt16LE(pos + 8);
    const method = buffer.readUInt16LE(pos + 10);
    const crc = buffer.readUInt32LE(pos + 16);
    const compressedSize = buffer.readUInt32LE(pos + 20);
    const uncompressedSize = buffer.readUInt32LE(pos + 24);
    const nameLength = buffer.readUInt16LE(pos + 28);
    const extraLength = buffer.readUInt16LE(pos + 30);
    const commentLength = buffer.readUInt16LE(pos + 32);
    const localOffset = buffer.readUInt32LE(pos + 42);
    const name = buffer.subarray(pos + 46, pos + 46 + nameLength).toString('utf8');
    pos += 46 + nameLength + extraLength + commentLength;

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error('Bad local header');
    const localName = buffer.readUInt16LE(localOffset + 26);
    const localExtra = buffer.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + localName + localExtra;
    const data = buffer.subarray(start, start + compressedSize);
    if (crc32(data) !== crc) throw new Error(`CRC mismatch for ${name}`);
    entries.push({ name, data, crc, method, flags, compressedSize, size: uncompressedSize });
  }
  if (pos !== end) throw new Error('Central directory has trailing bytes');
  return entries;
}
