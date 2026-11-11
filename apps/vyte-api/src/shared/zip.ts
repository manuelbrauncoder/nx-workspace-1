import { readFile } from 'node:fs/promises';
import type { Writable } from 'node:stream';
import { crc32 } from 'node:zlib';

export interface ZipEntry {
  /** Name inside the archive; UTF-8, no folders. */
  name: string;
  path: string;
}

// a fixed date, so the archive says nothing about when a photo was taken (MS-DOS format)
const DOS_TIME = 0;
const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;
// bit 11: the names are UTF-8
const FLAGS = 0x0800;

/**
 * Waits until the stream takes more data, so a slow client does not fill the memory. A client
 * that goes away ends the wait with an error, so the request does not hang.
 */
function write(out: Writable, chunk: Buffer) {
  if (out.destroyed) return Promise.reject(new Error('Client went away'));
  if (out.write(chunk)) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const done = (error?: Error) => {
      out.off('drain', onDrain);
      out.off('close', onClose);
      out.off('error', done);
      if (error) reject(error);
      else resolve();
    };
    const onDrain = () => done();
    const onClose = () => done(new Error('Client went away'));
    out.once('drain', onDrain);
    out.once('close', onClose);
    out.once('error', done);
  });
}

/**
 * Writes a ZIP archive of the files to `out`, one file at a time, without compression (the photos
 * are WebP already). No ZIP64: an archive above 4 GiB is refused, which the photo limits keep far
 * away.
 */
export async function writeZip(entries: ZipEntry[], out: Writable): Promise<void> {
  if (entries.length > 0xffff) throw new Error('Too many entries for ZIP without ZIP64');
  const central: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    if (out.destroyed) throw new Error('Client went away');
    // a photo deleted while the archive is written is left out
    const data = await readFile(entry.path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined;
      throw error;
    });
    if (!data) continue;
    const name = Buffer.from(entry.name, 'utf8');
    const crc = crc32(data);
    if (offset + data.length + 30 + name.length > 0xffffffff) {
      throw new Error('Archive too large for ZIP without ZIP64');
    }

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(FLAGS, 6);
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4); // version made by
    header.writeUInt16LE(20, 6); // version needed
    header.writeUInt16LE(FLAGS, 8);
    header.writeUInt16LE(0, 10);
    header.writeUInt16LE(DOS_TIME, 12);
    header.writeUInt16LE(DOS_DATE, 14);
    header.writeUInt32LE(crc, 16);
    header.writeUInt32LE(data.length, 20);
    header.writeUInt32LE(data.length, 24);
    header.writeUInt16LE(name.length, 28);
    // extra, comment, disk, internal and external attributes stay 0
    header.writeUInt32LE(offset, 42);
    central.push(header, name);

    await write(out, local);
    await write(out, name);
    await write(out, data);
    offset += local.length + name.length + data.length;
  }

  const directory = Buffer.concat(central);
  if (offset + directory.length + 22 > 0xffffffff) {
    throw new Error('Archive too large for ZIP without ZIP64');
  }
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(central.length / 2, 8);
  end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  await write(out, directory);
  await write(out, end);
}
