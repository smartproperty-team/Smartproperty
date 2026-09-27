import { fixImages, type StoredImage } from './fix-listing-images';

const base = 'https://smartproperties.tech';
const image = (file: string, order: number, caption = 'x'): StoredImage => ({
  url: `${base}/${file}`,
  key: `seed/${file}`,
  caption,
  order,
  isPrimary: order === 0,
});

describe('fixImages', () => {
  it('replaces an icon seeded as a photo with the chosen photo', () => {
    const fixed = fixImages('Nabeul Designer Studio', [
      image('tq_g0llmth1q9-t1v-200h.png', 0, 'Studio preview'),
    ]);
    expect(fixed[0]).toMatchObject({
      url: `${base}/tq_n3wuetzgxm-8cio-1500h.webp`,
      key: 'seed/tq_n3wuetzgxm-8cio-1500h.webp',
      caption: 'Living and dining area',
      isPrimary: true,
    });
  });

  it('moves photos with a WebP twin to it, keeping everything else', () => {
    const [fixed] = fixImages('Hammamet Poolside Villa', [
      image('tq_brzn8uwaca-vatm-1500h.png', 0, 'Pool'),
    ]);
    expect(fixed).toEqual({
      url: `${base}/tq_brzn8uwaca-vatm-1500h.webp`,
      key: 'seed/tq_brzn8uwaca-vatm-1500h.webp',
      caption: 'Pool',
      order: 0,
      isPrimary: true,
    });
  });

  it('replaces by listing and position: the same icon differs per listing', () => {
    const villa = fixImages('Contemporary Palm Villa', [
      image('tq_4mbtfjfs1k-qkmj-1500h.png', 0),
      image('tq_g0llmth1q9-t1v-200h.png', 1),
    ]);
    expect(villa.map((i) => i.key)).toEqual([
      'seed/tq_4mbtfjfs1k-qkmj-1500h.webp',
      'seed/tq_zli_mi6kgi-62r4-1500h.webp',
    ]);
  });

  it('leaves uploads and images without a WebP twin alone', () => {
    const upload: StoredImage = {
      url: 'https://pub.r2.dev/properties/abc.jpg',
      key: 'properties/abc.jpg',
      order: 0,
    };
    const noTwin = image('tq_zzz-unknown-1500h.png', 1);
    expect(fixImages('Someone else', [upload, noTwin])).toEqual([
      upload,
      noTwin,
    ]);
  });

  it('is idempotent', () => {
    const once = fixImages('Sidi Bou Said Sea House', [
      image('tq_a7h2f2xeaz-7bp-1500h.png', 0),
      image('tq_gbgopwda6u-gudd-200h.png', 1),
    ]);
    expect(fixImages('Sidi Bou Said Sea House', once)).toEqual(once);
  });
});
