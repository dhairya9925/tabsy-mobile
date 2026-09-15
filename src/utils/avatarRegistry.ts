import { ImageSourcePropType } from 'react-native';

// Polyfill for Node.js / test environments where Metro's asset loader is not active
if (typeof require !== 'undefined' && (require as any).extensions && !(require as any).extensions['.png']) {
  (require as any).extensions['.png'] = (module: any, filename: string) => {
    module.exports = filename;
  };
}

export const AVATAR_MAP: Record<string, ImageSourcePropType> = {
  'avatar-1': require('../../assets/avatars/avatar-1.png'),
  'avatar-2': require('../../assets/avatars/avatar-2.png'),
  'avatar-3': require('../../assets/avatars/avatar-3.png'),
  'avatar-4': require('../../assets/avatars/avatar-4.png'),
  'avatar-5': require('../../assets/avatars/avatar-5.png'),
  'avatar-6': require('../../assets/avatars/avatar-6.png'),
  'avatar-7': require('../../assets/avatars/avatar-7.png'),
  'avatar-8': require('../../assets/avatars/avatar-8.png'),
  'avatar-9': require('../../assets/avatars/avatar-9.png'),
  'avatar-10': require('../../assets/avatars/avatar-10.png'),
  'avatar-11': require('../../assets/avatars/avatar-11.png'),
  'avatar-12': require('../../assets/avatars/avatar-12.png'),
  'avatar-13': require('../../assets/avatars/avatar-13.png'),
  'avatar-14': require('../../assets/avatars/avatar-14.png'),
  'avatar-15': require('../../assets/avatars/avatar-15.png'),
};

export const AVATAR_KEYS = Object.keys(AVATAR_MAP) as string[];

export const AVATAR_URL_PREFIX = 'https://avatar.tabsy.app/';

/**
 * Converts a bare avatar key (e.g. 'avatar-1') to a canonical URL string
 * that passes HttpUrl validation across all backend versions (both deployed VPS and local).
 */
export function avatarKeyToUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  return `${AVATAR_URL_PREFIX}${key}`;
}

/**
 * Extracts a normalized avatar key (e.g. 'avatar-1') from a URL or key string,
 * or returns null if it does not match any known avatar.
 */
export function extractAvatarKey(avatarKeyOrUrl: string | null | undefined): string | null {
  if (!avatarKeyOrUrl) return null;
  const match = avatarKeyOrUrl.match(/avatar-(\d+)/);
  if (match) {
    const key = `avatar-${match[1]}`;
    if (AVATAR_MAP[key]) return key;
  }
  return null;
}

/**
 * Resolves an avatar identifier or URL (e.g. 'avatar-1' or 'https://avatar.tabsy.app/avatar-1')
 * to a bundled image source, or returns null if not recognized.
 */
export function resolveAvatar(avatarKeyOrUrl: string | null | undefined): ImageSourcePropType | null {
  if (!avatarKeyOrUrl) return null;
  const key = extractAvatarKey(avatarKeyOrUrl);
  if (key && AVATAR_MAP[key]) {
    return AVATAR_MAP[key];
  }
  return null;
}
