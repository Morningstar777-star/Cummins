import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import { resolveBundledGlbFileName } from '../components/glbAssets';

export type OpenArParams = {
  title: string;
  glbUrl?: string | null;
  usdzUrl?: string | null;
  webViewerUrl?: string | null;
};

type ResolveArModelParams = {
  glbUrlValue?: string | null;
  usdzUrlValue?: string | null;
  categoryId?: string | null;
};

export type ResolvedArModelUrls = {
  glbUrl: string | null;
  usdzUrl: string | null;
  webViewerUrl: string | null;
};

const envGlbBaseUrl =
  ((globalThis as any)?.process?.env?.EXPO_PUBLIC_GLB_BASE_URL as string | undefined) ||
  ((Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_GLB_BASE_URL as string | undefined);
const envUsdzBaseUrl =
  ((globalThis as any)?.process?.env?.EXPO_PUBLIC_USDZ_BASE_URL as string | undefined) ||
  ((Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_USDZ_BASE_URL as string | undefined);

function normalize(value?: string | null): string {
  return String(value || '').trim();
}

function sceneViewerIntentUrl(title: string, glbUrl: string): string {
  return (
    `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glbUrl)}` +
    `&mode=ar_preferred&title=${encodeURIComponent(title)}` +
    '#Intent;scheme=https;action=android.intent.action.VIEW;' +
    'package=com.google.android.googlequicksearchbox;' +
    'end;'
  );
}

function sceneViewerHttpsUrl(title: string, glbUrl: string): string {
  return (
    `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(glbUrl)}` +
    `&mode=ar_preferred&title=${encodeURIComponent(title)}`
  );
}

function isHttpUrl(value?: string | null): boolean {
  const text = normalize(value).toLowerCase();
  return text.startsWith('http://') || text.startsWith('https://');
}

function getFileName(value?: string | null): string {
  const text = normalize(value);
  if (!text) {
    return '';
  }
  const noQuery = text.split('?')[0];
  const parts = noQuery.split('/');
  return parts[parts.length - 1] || '';
}

function joinUrl(baseUrl: string, fileName: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const name = fileName.replace(/^\/+/, '');
  return `${base}/${name}`;
}

function normalizeBaseUrl(value?: string): string {
  return String(value || '').trim().replace(/\/+$/, '');
}

function parseHost(value?: string): string {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  if (text.startsWith('http://') || text.startsWith('https://')) {
    try {
      return new URL(text).hostname;
    } catch {
      return '';
    }
  }

  return text.split(':')[0] || '';
}

function inferApiHostBaseUrl(): string {
  const constantsAny = Constants as any;
  const candidates = [
    Constants.expoConfig?.hostUri,
    constantsAny?.expoGoConfig?.debuggerHost,
    constantsAny?.manifest?.debuggerHost,
    constantsAny?.manifest?.hostUri,
    constantsAny?.manifest2?.extra?.expoClient?.hostUri,
    constantsAny?.manifest2?.extra?.expoGo?.debuggerHost,
    constantsAny?.manifest2?.launchAsset?.url,
  ];

  for (const candidate of candidates) {
    const host = parseHost(candidate);
    if (host) {
      return `http://${host}:8000/static/glb`;
    }
  }

  return '';
}

function buildWebViewerUrl(glbUrl: string): string {
  return `https://gltf-viewer.donmccurdy.com/#model=${encodeURIComponent(glbUrl)}`;
}

function isPlaceholderRemoteUrl(value: string): boolean {
  if (!isHttpUrl(value)) {
    return false;
  }

  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === 'example.com' || host.endsWith('.example.com') || host === 'placehold.co';
  } catch {
    return false;
  }
}

function resolveHostedAssetUrl(rawValue: string, explicitBaseUrl?: string): string | null {
  if (!rawValue) {
    return null;
  }
  if (isHttpUrl(rawValue)) {
    return rawValue;
  }

  const baseUrl = normalizeBaseUrl(explicitBaseUrl) || normalizeBaseUrl(envGlbBaseUrl) || inferApiHostBaseUrl();
  if (!baseUrl) {
    return null;
  }

  return joinUrl(baseUrl, getFileName(rawValue));
}

async function tryOpenUrl(url: string): Promise<boolean> {
  if (!url) {
    return false;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function resolveArModelUrls(params: ResolveArModelParams): Promise<ResolvedArModelUrls> {
  const { glbUrlValue, usdzUrlValue, categoryId } = params;

  const rawGlb = normalize(glbUrlValue);
  const rawUsdz = normalize(usdzUrlValue);

  const bundledGlbFile = resolveBundledGlbFileName(categoryId, rawGlb || null);
  const useBundledFirst = Boolean(bundledGlbFile) && (!isHttpUrl(rawGlb) || isPlaceholderRemoteUrl(rawGlb));
  const resolvedGlb = useBundledFirst
    ? resolveHostedAssetUrl(bundledGlbFile!, envGlbBaseUrl) || resolveHostedAssetUrl(rawGlb, envGlbBaseUrl)
    : resolveHostedAssetUrl(rawGlb, envGlbBaseUrl) ||
      (bundledGlbFile ? resolveHostedAssetUrl(bundledGlbFile, envGlbBaseUrl) : null);

  const usdzBase = normalizeBaseUrl(envUsdzBaseUrl) || normalizeBaseUrl(envGlbBaseUrl);
  const resolvedUsdz = resolveHostedAssetUrl(rawUsdz, usdzBase);

  return {
    glbUrl: resolvedGlb,
    usdzUrl: resolvedUsdz,
    webViewerUrl: resolvedGlb ? buildWebViewerUrl(resolvedGlb) : null,
  };
}

export async function openModelInAr(params: OpenArParams): Promise<void> {
  const { title, glbUrl, usdzUrl } = params;

  if (Platform.OS === 'android') {
    const androidGlbUrl = isHttpUrl(glbUrl) ? glbUrl : null;
    if (!androidGlbUrl) {
      throw new Error('Android ARCore needs a publicly accessible HTTPS GLB URL. Set EXPO_PUBLIC_GLB_BASE_URL.');
    }

    if (await tryOpenUrl(sceneViewerIntentUrl(title, androidGlbUrl))) {
      return;
    }
    if (await tryOpenUrl(sceneViewerHttpsUrl(title, androidGlbUrl))) {
      return;
    }
    if (params.webViewerUrl && (await tryOpenUrl(params.webViewerUrl))) {
      return;
    }
    throw new Error('Could not launch ARCore Scene Viewer or the web 3D viewer on this Android device.');
  }

  if (Platform.OS === 'ios') {
    if (isHttpUrl(usdzUrl) && (await tryOpenUrl(usdzUrl!))) {
      return;
    }
    if (params.webViewerUrl && (await tryOpenUrl(params.webViewerUrl))) {
      return;
    }
    throw new Error('ARKit Quick Look needs a USDZ URL. Provide media.usdz_url or EXPO_PUBLIC_USDZ_BASE_URL.');
  }

  if (params.webViewerUrl && (await tryOpenUrl(params.webViewerUrl))) {
    return;
  }

  throw new Error('Could not open a web 3D viewer for this model.');
}

export async function resolveArModelUrl(glbUrlValue?: string | null, categoryId?: string | null): Promise<string | null> {
  const resolved = await resolveArModelUrls({ glbUrlValue, categoryId });
  return resolved.glbUrl;
}
