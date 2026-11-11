import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Writable } from 'node:stream';
import { crc32 } from 'node:zlib';
import { afterAll, describe, expect, it } from 'vitest';
import { parseZip } from '../test/zip.js';
import { writeZip } from './zip.js';

const dir = await mkdtemp(path.join(tmpdir(), 'vyte-zip-'));
afterAll(() => rm(dir, { recursive: true, force: true }));

function collector() {
  const chunks: Buffer[] = [];
  const out = new Writable({
    write(chunk: Buffer, _enc, done) {
      chunks.push(chunk);
      done();
    },
  });
  return { out, result: () => Buffer.concat(chunks) };
}

async function zipOf(files: { name: string; content: Buffer }[]) {
  const entries = [];
  for (const [i, file] of files.entries()) {
    const filePath = path.join(dir, `f${i}-${Math.random().toString(36).slice(2)}`);
    await writeFile(filePath, file.content);
    entries.push({ name: file.name, path: filePath });
  }
  const { out, result } = collector();
  await writeZip(entries, out);
  return result();
}

describe('writeZip', () => {
  it('writes a valid empty archive of just the end record', async () => {
    const zip = await zipOf([]);
    expect(zip).toHaveLength(22);
    expect(parseZip(zip)).toEqual([]);
  });

  it('stores files uncompressed with name, size and CRC, UTF-8 names flagged', async () => {
    const a = Buffer.from('hello world');
    const b = Buffer.from([0, 255, 1, 254, 2, 253]);
    const empty = Buffer.alloc(0);
    const zip = await zipOf([
      { name: 'a.webp', content: a },
      { name: 'Jürgen-1.webp', content: b },
      { name: '日本-1.webp', content: empty },
    ]);
    const entries = parseZip(zip);
    expect(entries.map((e) => e.name)).toEqual(['a.webp', 'Jürgen-1.webp', '日本-1.webp']);
    expect(entries.map((e) => e.data)).toEqual([a, b, empty]);
    for (const entry of entries) {
      expect(entry.method).toBe(0);
      expect(entry.flags & 0x0800).toBe(0x0800);
      expect(entry.size).toBe(entry.compressedSize);
      expect(entry.crc).toBe(crc32(entry.data));
    }
  });

  it('handles a file larger than the stream buffer', async () => {
    const big = Buffer.alloc(3 * 1024 * 1024, 7);
    const entries = parseZip(await zipOf([{ name: 'big.webp', content: big }]));
    expect(entries[0]?.data.equals(big)).toBe(true);
  });
});
