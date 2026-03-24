import { randomInt } from 'crypto';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const NUMBERS = '23456789';
const SPECIAL = '@$!%*?&';

function pick(charset: string): string {
  return charset[randomInt(0, charset.length)];
}

function shuffle(value: string): string {
  const chars = value.split('');

  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    [chars[index], chars[swapIndex]] = [chars[swapIndex], chars[index]];
  }

  return chars.join('');
}

export function generateTemporaryPassword(length = 12): string {
  const safeLength = Math.max(length, 8);
  const all = `${UPPER}${LOWER}${NUMBERS}${SPECIAL}`;

  const seed = [pick(UPPER), pick(LOWER), pick(NUMBERS), pick(SPECIAL)];

  for (let index = seed.length; index < safeLength; index += 1) {
    seed.push(pick(all));
  }

  return shuffle(seed.join(''));
}
