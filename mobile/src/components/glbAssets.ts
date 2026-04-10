import { Asset } from 'expo-asset';

export const glbCategoryModules: Record<string, number> = {
  'living-room': require('../../assets/GLB/gray_sofa.glb'),
  bedroom: require('../../assets/GLB/bed_06.glb'),
  kitchen: require('../../assets/GLB/low_poly_toaster_red.glb'),
  decor: require('../../assets/GLB/disco_ball.glb'),
  classroom: require('../../assets/GLB/whiteboard_low-poly.glb'),
};

const glbFileModules: Record<string, number> = {
  'gray_sofa.glb': require('../../assets/GLB/gray_sofa.glb'),
  'bed_06.glb': require('../../assets/GLB/bed_06.glb'),
  'low_poly_toaster_red.glb': require('../../assets/GLB/low_poly_toaster_red.glb'),
  'disco_ball.glb': require('../../assets/GLB/disco_ball.glb'),
  'whiteboard_low-poly.glb': require('../../assets/GLB/whiteboard_low-poly.glb'),
};

const glbCategoryFileNames: Record<string, string> = {
  'living-room': 'gray_sofa.glb',
  bedroom: 'bed_06.glb',
  kitchen: 'low_poly_toaster_red.glb',
  decor: 'disco_ball.glb',
  classroom: 'whiteboard_low-poly.glb',
};

function normalize(value?: string | null): string {
  return String(value || '').trim().toLowerCase();
}

function getFileName(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }
  const withoutQuery = raw.split('?')[0];
  const parts = withoutQuery.split('/');
  return normalize(parts[parts.length - 1]);
}

export function resolveBundledGlbFileName(categoryId?: string | null, glbUrlValue?: string | null): string | null {
  const categoryKey = normalize(categoryId);
  if (categoryKey && glbCategoryFileNames[categoryKey]) {
    return glbCategoryFileNames[categoryKey];
  }

  const fileKey = getFileName(glbUrlValue);
  if (fileKey && glbFileModules[fileKey]) {
    return fileKey;
  }

  return null;
}

export function resolveBundledGlbModule(categoryId?: string | null, glbUrlValue?: string | null): number | null {
  const categoryKey = normalize(categoryId);
  if (categoryKey && glbCategoryModules[categoryKey]) {
    return glbCategoryModules[categoryKey];
  }

  const fileKey = getFileName(glbUrlValue);
  if (fileKey && glbFileModules[fileKey]) {
    return glbFileModules[fileKey];
  }

  return null;
}

export async function resolveBundledGlbUri(categoryId?: string | null, glbUrlValue?: string | null): Promise<string | null> {
  const moduleId = resolveBundledGlbModule(categoryId, glbUrlValue);
  if (!moduleId) {
    return null;
  }

  try {
    const asset = Asset.fromModule(moduleId);
    await asset.downloadAsync();
    return asset.localUri || asset.uri || null;
  } catch {
    return null;
  }
}

export async function resolveGlbUri(categoryId: string): Promise<string | null> {
  return resolveBundledGlbUri(categoryId, null);
}
