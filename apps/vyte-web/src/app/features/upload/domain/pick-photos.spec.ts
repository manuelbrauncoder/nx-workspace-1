import { pickPhotos } from './pick-photos';
import { PHOTO_TYPES } from './upload';

const file = (name: string, type = 'image/jpeg') => new File(['x'], name, { type });
const names = (files: File[]) => files.map((item) => item.name);

describe('pickPhotos', () => {
  it('accepts photos of an allowed type in the order chosen', () => {
    const picked = pickPhotos([file('b.jpg'), file('a.png', 'image/png')], 5, PHOTO_TYPES);

    expect(names(picked.accepted)).toEqual(['b.jpg', 'a.png']);
    expect(picked.wrongType).toEqual([]);
    expect(picked.overLimit).toEqual([]);
  });

  it('leaves out files of another type, HEIC included', () => {
    const picked = pickPhotos(
      [
        file('a.jpg'),
        file('b.heic', 'image/heic'),
        file('c.pdf', 'application/pdf'),
        file('d.txt', ''),
      ],
      5,
      PHOTO_TYPES,
    );

    expect(names(picked.accepted)).toEqual(['a.jpg']);
    expect(names(picked.wrongType)).toEqual(['b.heic', 'c.pdf', 'd.txt']);
    expect(picked.overLimit).toEqual([]);
  });

  it('leaves out photos beyond the free places and keeps the first ones', () => {
    const picked = pickPhotos([file('1.jpg'), file('2.jpg'), file('3.jpg')], 2, PHOTO_TYPES);

    expect(names(picked.accepted)).toEqual(['1.jpg', '2.jpg']);
    expect(names(picked.overLimit)).toEqual(['3.jpg']);
  });

  it('does not count files of the wrong type against the free places', () => {
    const picked = pickPhotos(
      [file('x.gif', 'image/gif'), file('1.jpg'), file('2.jpg')],
      1,
      PHOTO_TYPES,
    );

    expect(names(picked.accepted)).toEqual(['1.jpg']);
    expect(names(picked.wrongType)).toEqual(['x.gif']);
    expect(names(picked.overLimit)).toEqual(['2.jpg']);
  });

  it.each([0, -3])('accepts nothing when %s places are free', (free) => {
    const picked = pickPhotos([file('1.jpg'), file('2.jpg')], free, PHOTO_TYPES);

    expect(picked.accepted).toEqual([]);
    expect(names(picked.overLimit)).toEqual(['1.jpg', '2.jpg']);
  });

  it('handles an empty choice', () => {
    expect(pickPhotos([], 3, PHOTO_TYPES)).toEqual({ accepted: [], wrongType: [], overLimit: [] });
  });
});
