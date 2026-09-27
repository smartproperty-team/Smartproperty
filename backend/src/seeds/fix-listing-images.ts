// ===========================================
// SmartProperty - Fix seeded listing photos in place
// ===========================================
//
// Brings listings created by an older seed in line with seed-properties.ts
// without re-seeding, which would change their ids and break favourites,
// applications and leases. Only the `images` of seeded listings change.
//
//   npm run seed:fix-images                       dry run: show the changes
//   npm run seed:fix-images -- --apply            write them, saving a backup
//   npm run seed:fix-images -- --restore <file>   put a backup back

import { requireEnv } from './load-env';
import * as fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';

/**
 * Icons of a few hundred bytes that had been seeded as photos, replaced by
 * real photos: listing title -> image position -> new file and caption.
 */
const REPLACEMENTS: Record<
  string,
  Record<number, { file: string; caption: string }>
> = {
  'Contemporary Palm Villa': {
    1: { file: 'tq_zli_mi6kgi-62r4-1500h.webp', caption: 'Villa exterior' },
  },
  'Sidi Bou Said Sea House': {
    1: { file: 'tq_kacx_subrj-k4pl-1500h.webp', caption: 'Living room' },
  },
  'Ariana Family Garden Home': {
    1: { file: 'tq_nolfwamtip-r06-700h.webp', caption: 'Front of the house' },
  },
  'Nabeul Designer Studio': {
    0: {
      file: 'tq_n3wuetzgxm-8cio-1500h.webp',
      caption: 'Living and dining area',
    },
  },
};

/** Seed photos that have a WebP version in frontend/public. */
const WEBP_TWINS = new Set([
  'tq_4mbtfjfs1k-qkmj-1500h',
  'tq_a7h2f2xeaz-7bp-1500h',
  'tq_b4rcqm58py-gcw-1500h',
  'tq_brzn8uwaca-vatm-1500h',
  'tq_eg61ro6xoc-8z2e-1500h',
  'tq_ev3u-afbuo-tv-1500h',
  'tq_fqz__chb9i-7br-1500h',
]);

export interface StoredImage {
  url: string;
  key?: string;
  caption?: string;
  order?: number;
  [field: string]: unknown;
}

const withFile = (value: string, file: string) =>
  value.slice(0, value.lastIndexOf('/') + 1) + file;

/** The corrected images for one listing; untouched images stay as they are. */
export function fixImages(title: string, images: StoredImage[]): StoredImage[] {
  const replacements = REPLACEMENTS[title] ?? {};
  return images.map((image, index) => {
    const position = typeof image.order === 'number' ? image.order : index;
    const replacement = replacements[position];
    if (replacement) {
      return {
        ...image,
        url: withFile(image.url, replacement.file),
        key: `seed/${replacement.file}`,
        caption: replacement.caption,
      };
    }

    const name = image.url.match(/\/(tq_[^/]+)\.png$/)?.[1];
    if (name && WEBP_TWINS.has(name)) {
      return {
        ...image,
        url: withFile(image.url, `${name}.webp`),
        key: image.key && withFile(image.key, `${name}.webp`),
      };
    }
    return image;
  });
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const restoreIndex = args.indexOf('--restore');

  const client = new MongoClient(requireEnv('MONGODB_URI'), {
    retryWrites: process.env.MONGODB_RETRY_WRITES !== 'false',
  });
  await client.connect();
  const properties = client
    .db(process.env.MONGODB_DATABASE || 'smartproperty')
    .collection<{ title: string; images?: StoredImage[] }>('properties');

  try {
    if (restoreIndex >= 0) {
      const file = args[restoreIndex + 1];
      if (!file) throw new Error('--restore needs a backup file');
      const backup = JSON.parse(fs.readFileSync(file, 'utf8')) as Array<{
        _id: string;
        images: StoredImage[];
      }>;
      for (const entry of backup) {
        await properties.updateOne(
          { _id: new ObjectId(entry._id) },
          { $set: { images: entry.images } },
        );
      }
      console.log(`Restored images on ${backup.length} listings.`);
      return;
    }

    const listings = await properties
      .find({ 'images.url': { $regex: /\/tq_[^/]+\.png$/ } })
      .toArray();

    const changes = listings
      .map((listing) => ({
        listing,
        fixed: fixImages(listing.title, listing.images ?? []),
      }))
      .filter(
        ({ listing, fixed }) =>
          JSON.stringify(fixed) !== JSON.stringify(listing.images),
      );

    for (const { listing, fixed } of changes) {
      const files = (images: StoredImage[] = []) =>
        images.map((i) => i.url.slice(i.url.lastIndexOf('/') + 1)).join(', ');
      console.log(
        `${listing.title}\n  ${files(listing.images)}\n  -> ${files(fixed)}`,
      );
    }

    if (!apply) {
      console.log(
        `\nDry run: ${changes.length} listings would change. Add --apply to write.`,
      );
      return;
    }

    const backupFile = `listing-images-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(
      backupFile,
      JSON.stringify(
        changes.map(({ listing }) => ({
          _id: listing._id.toHexString(),
          title: listing.title,
          images: listing.images,
        })),
        null,
        2,
      ),
    );
    for (const { listing, fixed } of changes) {
      await properties.updateOne(
        { _id: listing._id },
        { $set: { images: fixed } },
      );
    }
    console.log(`\nUpdated ${changes.length} listings. Backup: ${backupFile}`);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
