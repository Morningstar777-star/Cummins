const CATEGORY_THUMBNAILS: Record<string, string> = {
  'living-room': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600',
  bedroom: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=600',
  kitchen: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600',
  decor: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600',
  classroom:
    'https://github.com/Morningstar777-star/Images/blob/main/classroom-interior-with-school-desks-chairs-and-green-board-empty-school-classroom-photo.webp',
};

function normalize(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeImageUrl(url: string): string {
  if (url.includes('github.com') && url.includes('/blob/')) {
    return url.replace('https://github.com/', 'https://raw.githubusercontent.com/').replace('/blob/', '/');
  }
  return url;
}

export function getCategoryThumbnailUrl(categoryId?: string | null, thumbnailUrl?: string | null): string {
  const categoryKey = normalize(categoryId);
  if (categoryKey && CATEGORY_THUMBNAILS[categoryKey]) {
    return normalizeImageUrl(CATEGORY_THUMBNAILS[categoryKey]);
  }

  const explicitUrl = normalizeImageUrl(String(thumbnailUrl || '').trim());
  if (explicitUrl) {
    return explicitUrl;
  }

  return 'https://placehold.co/600x600/F4E8D6/6B5B4C?text=Category';
}
