import { CODE_ALPHABET, CODE_LENGTH } from '@url-shortener/shared';
import { customAlphabet } from 'nanoid';

/**
 * Random codes from a cryptographically secure source. Sequential ids would let anyone enumerate
 * every link; nanoid also avoids the modulo bias of a naive `randomBytes() % alphabet.length`.
 * 57^7 ≈ 1.9 × 10^12 possible codes.
 */
export const generateCode = customAlphabet(CODE_ALPHABET, CODE_LENGTH);
