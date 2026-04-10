import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlbPreview } from '../components/GlbPreview';
import { RootStackParamList } from '../navigation/types';
import { openModelInAr, resolveArModelUrl } from '../services/ar';
import { api, endpoints, getApiErrorMessage } from '../services/api';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../theme/layout';
import { webPremium, WEB_FONT_IMPORT } from '../theme/webPremium';

const CATEGORY_ORDER = ['living-room', 'bedroom', 'kitchen', 'decor', 'classroom'];
const CLASSROOM_FALLBACK = {
  id: 'classroom',
  title: 'Classroom',
  glb_url: 'whiteboard_low-poly.glb',
  thumbnail_url:
    'https://github.com/Morningstar777-star/Images/blob/main/classroom-interior-with-school-desks-chairs-and-green-board-empty-school-classroom-photo.webp',
};

function normalizeCategoryId(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function sortCategory(a: any, b: any) {
  const aId = normalizeCategoryId(a?.id);
  const bId = normalizeCategoryId(b?.id);
  const aIndex = CATEGORY_ORDER.indexOf(aId);
  const bIndex = CATEGORY_ORDER.indexOf(bId);
  const safeA = aIndex === -1 ? CATEGORY_ORDER.length : aIndex;
  const safeB = bIndex === -1 ? CATEGORY_ORDER.length : bIndex;
  if (safeA !== safeB) {
    return safeA - safeB;
  }
  return String(a?.title || '').localeCompare(String(b?.title || ''));
}

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type ChatRecommendation = {
  sku: string;
  name: string;
  price_inr: number;
  media?: { image_url?: string };
};

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  recommendations?: ChatRecommendation[];
};

const DEFAULT_CHAT_PROMPTS = [
  'Show me modern living room ideas',
  'Recommend pet-friendly materials',
  'Suggest premium bedroom picks',
];

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Desktop-only premium CSS — injected into <head> via useEffect.
   Wrapped in @media (min-width: 1024px) so it has ZERO effect on mobile.
   ═══════════════════════════════════════════════════════════════════════════ */
function generateStarsCSS(count: number) {
  let shadows = [];
  for (let i = 0; i < count; i++) {
    shadows.push(`${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px #FFF`);
  }
  return shadows.join(', ');
}

const stars1 = generateStarsCSS(700);
const stars2 = generateStarsCSS(200);
const stars3 = generateStarsCSS(100);

const PREMIUM_DESKTOP_CSS = `
${WEB_FONT_IMPORT}

@media (min-width: 1024px) {

  /* ── Global font ── */
  [data-testid="premium-home-root"],
  [data-testid="premium-home-root"] * {
    font-family: ${webPremium.fontFamily} !important;
  }

  /* ── Hero banner starry background overlay ── */
  [data-testid="premium-hero"] {
    background: radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%) !important;
    border-radius: 24px !important;
    padding: 64px 56px !important;
    position: relative !important;
    overflow: hidden !important;
    border: none !important;
    box-shadow: 0 20px 60px rgba(9, 10, 15, 0.4) !important;
    margin-bottom: 40px !important;
    animation: heroSlideIn 0.8s cubic-bezier(0.4, 0, 0.2, 1) both !important;
  }

  /* Star Layers */
  [data-testid="premium-stars1"] {
    width: 1px;
    height: 1px;
    background: transparent;
    position: absolute;
    top: 0;
    left: 0;
    box-shadow: ${stars1};
    animation: animStar 50s linear infinite;
    z-index: 0;
  }
  [data-testid="premium-stars1"]:after {
    content: " ";
    position: absolute;
    top: 2000px;
    width: 1px;
    height: 1px;
    background: transparent;
    box-shadow: ${stars1};
  }

  [data-testid="premium-stars2"] {
    width: 2px;
    height: 2px;
    background: transparent;
    position: absolute;
    top: 0;
    left: 0;
    box-shadow: ${stars2};
    animation: animStar 100s linear infinite;
    z-index: 0;
  }
  [data-testid="premium-stars2"]:after {
    content: " ";
    position: absolute;
    top: 2000px;
    width: 2px;
    height: 2px;
    background: transparent;
    box-shadow: ${stars2};
  }

  [data-testid="premium-stars3"] {
    width: 3px;
    height: 3px;
    background: transparent;
    position: absolute;
    top: 0;
    left: 0;
    box-shadow: ${stars3};
    animation: animStar 150s linear infinite;
    z-index: 0;
  }
  [data-testid="premium-stars3"]:after {
    content: " ";
    position: absolute;
    top: 2000px;
    width: 3px;
    height: 3px;
    background: transparent;
    box-shadow: ${stars3};
  }

  @keyframes animStar {
    from { transform: translateY(0px); }
    to { transform: translateY(-2000px); }
  }

  @keyframes heroSlideIn {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── Navigation bar ── */
  [data-testid="premium-nav-bar"] {
    background: rgba(255,255,255,0.7) !important;
    backdrop-filter: blur(20px) saturate(1.5) !important;
    -webkit-backdrop-filter: blur(20px) saturate(1.5) !important;
    border: 1px solid rgba(255,255,255,0.5) !important;
    border-radius: 18px !important;
    padding: 12px 20px !important;
    box-shadow: 0 4px 30px rgba(0,0,0,0.06) !important;
    margin-bottom: 32px !important;
    animation: fadeUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both !important;
  }

  [data-testid="premium-nav-btn"] {
    transition: all 280ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
    border-radius: 12px !important;
  }
  [data-testid="premium-nav-btn"]:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(0,0,0,0.08) !important;
    background: #ffffff !important;
  }
  [data-testid="premium-nav-btn"]:active {
    transform: translateY(0) scale(0.97) !important;
  }

  [data-testid="premium-nav-quiz"] {
    transition: all 280ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
  }
  [data-testid="premium-nav-quiz"]:hover {
    box-shadow: 0 8px 28px rgba(138,90,68,0.25) !important;
    transform: translateY(-2px) !important;
    filter: brightness(1.1) !important;
  }

  /* ── Search ── */
  [data-testid="premium-search"] {
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    animation: fadeUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both !important;
  }
  [data-testid="premium-search"]:focus {
    border-color: rgba(83, 52, 131, 0.4) !important;
    box-shadow: 0 0 0 4px rgba(83, 52, 131, 0.08), 0 4px 20px rgba(0,0,0,0.04) !important;
    outline: none !important;
  }

  /* ── Section titles ── */
  [data-testid="premium-section-title"] {
    letter-spacing: -0.03em !important;
    position: relative !important;
    padding-bottom: 12px !important;
    display: inline-block !important;
    animation: fadeUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both !important;
  }
  [data-testid="premium-section-title"]::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 40px;
    height: 3px;
    background: linear-gradient(90deg, #533483, #0f3460, transparent);
    border-radius: 3px;
  }

  /* ── Category cards ── */
  [data-testid="premium-cat-card"] {
    transition: all 400ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
    animation: fadeUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) both !important;
  }
  [data-testid="premium-cat-card"]:nth-child(1) { animation-delay: 0.1s !important; }
  [data-testid="premium-cat-card"]:nth-child(2) { animation-delay: 0.15s !important; }
  [data-testid="premium-cat-card"]:nth-child(3) { animation-delay: 0.2s !important; }
  [data-testid="premium-cat-card"]:nth-child(4) { animation-delay: 0.25s !important; }
  [data-testid="premium-cat-card"]:nth-child(5) { animation-delay: 0.3s !important; }

  [data-testid="premium-cat-card"]:hover {
    transform: translateY(-10px) scale(1.02) !important;
    box-shadow: 0 24px 48px rgba(0,0,0,0.12) !important;
  }
  [data-testid="premium-cat-card"]:hover img {
    transform: scale(1.08) !important;
  }

  /* Category card images */
  [data-testid="premium-cat-card"] img {
    transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  [data-testid="premium-cat-open"],
  [data-testid="premium-cat-ar"] {
    transition: all 240ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
  }
  [data-testid="premium-cat-open"]:hover {
    background: #f0f0f5 !important;
    transform: scale(1.06) !important;
  }
  [data-testid="premium-cat-ar"]:hover {
    filter: brightness(1.15) !important;
    transform: scale(1.06) !important;
    box-shadow: 0 4px 16px rgba(138,90,68,0.25) !important;
  }

  /* ── Product cards ── */
  [data-testid="premium-product-card"] {
    transition: all 360ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
    overflow: hidden !important;
  }
  [data-testid="premium-product-card"]:hover {
    transform: translateY(-8px) !important;
    box-shadow: 0 20px 50px rgba(0,0,0,0.1) !important;
  }
  [data-testid="premium-product-card"] img {
    transition: transform 600ms cubic-bezier(0.4, 0, 0.2, 1) !important;
  }
  [data-testid="premium-product-card"]:hover img {
    transform: scale(1.08) !important;
  }

  [data-testid="premium-product-btn"] {
    transition: all 260ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
  }
  [data-testid="premium-product-btn"]:hover {
    transform: scale(1.04) !important;
    filter: brightness(1.1) !important;
    box-shadow: 0 0 0 3px rgba(110,127,101,0.15) !important;
  }

  /* ── Chat FAB ── */
  [data-testid="premium-chat-fab"] {
    transition: all 320ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
    background: linear-gradient(135deg, #533483 0%, #0f3460 100%) !important;
  }
  [data-testid="premium-chat-fab"]:hover {
    transform: scale(1.12) !important;
    box-shadow:
      0 0 0 6px rgba(83, 52, 131, 0.15),
      0 14px 44px rgba(0,0,0,0.18) !important;
  }
  [data-testid="premium-chat-fab"]:active {
    transform: scale(0.94) !important;
  }

  /* ── Chat panel ── */
  [data-testid="premium-chat-panel"] {
    backdrop-filter: blur(24px) saturate(1.6) !important;
    -webkit-backdrop-filter: blur(24px) saturate(1.6) !important;
    background: rgba(255,255,255,0.88) !important;
    border: 1px solid rgba(229,231,235,0.5) !important;
    box-shadow: 0 24px 64px rgba(0,0,0,0.12) !important;
    border-radius: 22px !important;
    animation: fadeUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) both !important;
  }

  [data-testid="premium-quick-chip"] {
    transition: all 220ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
  }
  [data-testid="premium-quick-chip"]:hover {
    background: #f0f0f5 !important;
    border-color: #D1D5DB !important;
    transform: translateY(-1px) !important;
  }

  [data-testid="premium-chat-send"] {
    transition: all 220ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
    background: linear-gradient(135deg, #533483 0%, #0f3460 100%) !important;
  }
  [data-testid="premium-chat-send"]:hover {
    transform: scale(1.06) !important;
    box-shadow: 0 4px 16px rgba(83,52,131,0.3) !important;
  }

  [data-testid="premium-chat-ghost"] {
    transition: all 220ms cubic-bezier(0.4, 0, 0.2, 1) !important;
    cursor: pointer !important;
  }
  [data-testid="premium-chat-ghost"]:hover {
    background: #f0f0f5 !important;
    border-color: #D1D5DB !important;
  }

  /* ── Fade-up entrance animation ── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }
}
`;


export function HomeScreen({ navigation }: Props) {
  const [payload, setPayload] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingError, setLoadingError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [visualBusy, setVisualBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [addingCartSku, setAddingCartSku] = useState<string | null>(null);
  const [quickPrompts, setQuickPrompts] = useState<string[]>(DEFAULT_CHAT_PROMPTS);
  const [previewCategory, setPreviewCategory] = useState<any | null>(null);
  const chatListRef = useRef<FlatList<ChatMessage> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { contentWidth, pageHorizontalPadding, productColumns, isDesktop } = useResponsiveLayout();
  const isWeb = Platform.OS === 'web';
  const isPremiumDesktop = isWeb && isDesktop;

  /* ── Inject desktop-only premium CSS into <head> (web only) ── */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const styleId = 'olive-oak-premium-desktop-css';
    if (document.getElementById(styleId)) return;
    const el = document.createElement('style');
    el.id = styleId;
    el.textContent = PREMIUM_DESKTOP_CSS;
    document.head.appendChild(el);
    return () => { document.getElementById(styleId)?.remove(); };
  }, []);

  const loadHome = async () => {
    setLoading(true);
    setLoadingError('');
    try {
      const res = await api.get(endpoints.personalizedHome);
      setPayload(res.data);
    } catch (error) {
      setLoadingError(getApiErrorMessage(error, 'Could not load your personalized home right now.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHome();
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const products = useMemo(() => payload?.products || [], [payload]);
  const glbObjects = useMemo(() => {
    const incoming = Array.isArray(payload?.glb_objects) ? payload.glb_objects : [];
    const normalizedMap = new Map<string, any>();

    for (const item of incoming) {
      const id = normalizeCategoryId(item?.id);
      if (!id) {
        continue;
      }
      normalizedMap.set(id, { ...item, id });
    }

    if (!normalizedMap.has('classroom')) {
      normalizedMap.set('classroom', CLASSROOM_FALLBACK);
    }

    return Array.from(normalizedMap.values()).sort(sortCategory);
  }, [payload]);

  const webCategoryCardWidth = useMemo(() => {
    if (!isWeb) {
      return undefined;
    }
    const cards = Math.max(1, glbObjects.length);
    const gap = isPremiumDesktop ? 24 : 16;
    const totalGap = gap * (cards - 1);
    const scrollbarSafety = 8;
    return Math.max(128, Math.floor((contentWidth - totalGap - scrollbarSafety) / cards));
  }, [contentWidth, glbObjects.length, isWeb, isPremiumDesktop]);

  const filteredProducts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) {
      return products;
    }

    return products.filter((item: any) => {
      const name = String(item?.name || '').toLowerCase();
      const desc = String(item?.description || '').toLowerCase();
      const category = String(item?.category_id || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || category.includes(q);
    });
  }, [products, searchText]);

  const searchSuggestions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) {
      return [];
    }

    const tokens = new Set<string>();

    for (const item of glbObjects) {
      const parts = [item?.title, item?.id];
      for (const part of parts) {
        for (const token of String(part || '').split(/[^a-zA-Z0-9-]+/)) {
          const n = token.trim().toLowerCase();
          if (n.length < 2) {
            continue;
          }
          if (n.includes(q)) {
            tokens.add(String(token));
          }
        }
      }
    }

    for (const item of products) {
      const parts = [
        item?.name,
        item?.category_id,
        item?.attributes?.aesthetic_style,
        item?.attributes?.mood_feel,
        item?.attributes?.price_tier,
      ];
      for (const part of parts) {
        for (const token of String(part || '').split(/[^a-zA-Z0-9-]+/)) {
          const n = token.trim().toLowerCase();
          if (n.length < 2) {
            continue;
          }
          if (n.includes(q)) {
            tokens.add(String(token));
          }
        }
      }
      if (tokens.size >= 10) {
        break;
      }
    }

    return Array.from(tokens).slice(0, 10);
  }, [glbObjects, products, searchText]);

  useEffect(() => {
    if (!chatOpen) {
      return;
    }
    if (!chatMessages.length) {
      setChatMessages([
        {
          role: 'assistant',
          text: 'Welcome to Olive Assistant. I can recommend products based on your style, mood, and budget. What are you designing today?',
        },
      ]);
    }
  }, [chatOpen, chatMessages.length]);

  useEffect(() => {
    if (!chatOpen) {
      return;
    }
    const timer = setTimeout(() => {
      chatListRef.current?.scrollToEnd({ animated: true });
    }, 40);
    return () => clearTimeout(timer);
  }, [chatMessages, chatBusy, chatOpen]);

  const askBot = async (rawMessage?: string) => {
    const message = (rawMessage ?? chatInput).trim();
    if (!message || chatBusy) {
      return;
    }

    if (!rawMessage) {
      setChatInput('');
    }
    setChatBusy(true);
    setChatMessages((prev) => [...prev, { role: 'user', text: message }]);

    try {
      const res = await api.post(endpoints.chat, { message });
      const botText = String(res.data?.response || 'I could not generate a response right now.');
      const recommendations = Array.isArray(res.data?.recommendations)
        ? res.data.recommendations
            .map((item: any) => ({
              sku: String(item?.sku || '').trim(),
              name: String(item?.name || '').trim(),
              price_inr: Number(item?.price_inr || 0),
              media: item?.media,
            }))
            .filter((item: ChatRecommendation) => !!item.sku && !!item.name)
            .slice(0, 3)
        : [];

      setChatMessages((prev) => [...prev, { role: 'assistant', text: botText, recommendations }]);

      const suggestions = Array.isArray(res.data?.suggestions)
        ? res.data.suggestions
            .map((item: unknown) => String(item || '').trim())
            .filter((item: string) => !!item)
            .slice(0, 3)
        : [];
      setQuickPrompts(suggestions.length ? suggestions : DEFAULT_CHAT_PROMPTS);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: getApiErrorMessage(error, 'I am having trouble right now. Please retry shortly.') },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  const uploadAndAnalyzeImage = async () => {
    if (chatBusy || visualBusy) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Please allow photo library access so I can analyze your room and recommend products.' },
      ]);
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (picked.canceled || !picked.assets?.length || !picked.assets[0]?.base64) {
      return;
    }

    setVisualBusy(true);
    setChatMessages((prev) => [...prev, { role: 'user', text: 'Analyze this image and recommend what I should buy.' }]);

    try {
      const base64 = picked.assets[0].base64;
      const res = await api.post(endpoints.visualRecommendations, { image_base64: base64 });
      const responseText = String(res.data?.response || 'I analyzed your image but could not generate recommendations right now.');
      const recommendations = Array.isArray(res.data?.recommendations)
        ? res.data.recommendations
            .map((item: any) => ({
              sku: String(item?.sku || '').trim(),
              name: String(item?.name || '').trim(),
              price_inr: Number(item?.price_inr || 0),
              media: item?.media,
            }))
            .filter((item: ChatRecommendation) => !!item.sku && !!item.name)
            .slice(0, 4)
        : [];

      setChatMessages((prev) => [...prev, { role: 'assistant', text: responseText, recommendations }]);

      const suggestions = Array.isArray(res.data?.suggestions)
        ? res.data.suggestions
            .map((item: unknown) => String(item || '').trim())
            .filter((item: string) => !!item)
            .slice(0, 3)
        : [];
      setQuickPrompts(suggestions.length ? suggestions : DEFAULT_CHAT_PROMPTS);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: getApiErrorMessage(error, 'Image analysis is unavailable right now. Please try another image in a moment.'),
        },
      ]);
    } finally {
      setVisualBusy(false);
    }
  };

  const openCategory = (item: any) => {
    navigation.navigate('Catalog', { categoryId: item.id, title: item.title });
  };

  const openArForCategory = async (item: any) => {
    const modelUrl = await resolveArModelUrl(item?.glb_url || item?.glbUrl, item?.id);
    if (!modelUrl) {
      Alert.alert(
        'AR Not Ready',
        'Native AR needs an HTTPS GLB URL. Add EXPO_PUBLIC_GLB_BASE_URL and keep GLB filenames mapped in assets/GLB.',
      );
      return;
    }

    try {
      await openModelInAr({
        title: String(item?.title || 'Olive & Oak Model'),
        glbUrl: modelUrl,
      });
    } catch (error) {
      const detail = error instanceof Error && error.message ? error.message : 'Could not open AR viewer on this device right now.';
      Alert.alert('AR Launch Failed', detail);
    }
  };

  const toggleChat = () => {
    setChatOpen((prev) => !prev);
  };

  const clearChat = () => {
    if (chatBusy) {
      return;
    }
    setChatMessages([]);
    setQuickPrompts(DEFAULT_CHAT_PROMPTS);
    setChatInput('');
  };

  const addRecommendedToCart = async (item: ChatRecommendation) => {
    if (!item?.sku || addingCartSku) {
      return;
    }

    setAddingCartSku(item.sku);
    try {
      await api.post(endpoints.cartItems, { product_id: item.sku, qty: 1 });
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Added ${item.name} to your cart. You can open Cart to checkout.` },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', text: getApiErrorMessage(error, 'Could not add that item to cart right now.') },
      ]);
    } finally {
      setAddingCartSku(null);
    }
  };

  return (
    <LinearGradient
      colors={isPremiumDesktop ? ['#f8f9fc', '#f0f1f5', '#eef0f5'] : [colors.ivory, '#F7EFE2', '#F4E7D3']}
      style={styles.gradient}
      testID="premium-home-root"
    >
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.pageShell, { paddingHorizontal: pageHorizontalPadding }]}> 
          <View style={[styles.content, { width: contentWidth }]}> 
            <FlatList
              data={filteredProducts}
              key={`home-grid-${productColumns}`}
              numColumns={productColumns}
              columnWrapperStyle={productColumns > 1 ? [styles.gridRow, isPremiumDesktop && styles.gridRowPremium] : undefined}
              contentContainerStyle={[
                styles.productsContent,
                isPremiumDesktop && styles.productsContentDesktop,
              ]}
              refreshing={loading}
              onRefresh={loadHome}
              keyExtractor={(item) => item.sku}
              renderItem={({ item }) => (
                <Pressable
                  testID="premium-product-card"
                  style={[
                    styles.productCard,
                    isDesktop && styles.productCardDesktop,
                    isPremiumDesktop && styles.productCardPremium,
                  ]}
                  onPress={() => navigation.navigate('ProductDetail', { sku: item.sku })}
                >
                  <View style={isPremiumDesktop ? styles.productImageWrapPremium : undefined}>
                    <Image source={{ uri: item.media?.image_url }} style={[
                      styles.productImage,
                      isPremiumDesktop && styles.productImagePremium,
                    ]} />
                  </View>
                  <Text
                    testID="premium-product-name"
                    style={[styles.productName, isPremiumDesktop && styles.productNamePremium]}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <Text
                    testID="premium-product-price"
                    style={[styles.productPrice, isPremiumDesktop && styles.productPricePremium]}
                  >
                    ₹{formatInr(Number(item.price_inr || 0))}
                  </Text>
                  <Text style={[styles.productScore, isPremiumDesktop && styles.productScorePremium]}>
                    Match: {Math.round(Number(item.personalization_score || 0) * 100)}%
                  </Text>
                  <Pressable
                    testID="premium-product-btn"
                    style={[styles.addBtn, isPremiumDesktop && styles.addBtnPremium]}
                    onPress={() => navigation.navigate('ProductDetail', { sku: item.sku })}
                  >
                    <Text style={[styles.addBtnText, isPremiumDesktop && styles.addBtnTextPremium]}>View Details</Text>
                  </Pressable>
                </Pressable>
              )}
              ListHeaderComponent={
                <>
                  {/* ── Hero banner ── */}
                  <Animated.View
                    testID="premium-hero"
                    style={[
                      { opacity: fadeAnim },
                      isPremiumDesktop && styles.heroPremium,
                    ]}
                  >
                    {isPremiumDesktop && (
                      <>
                        <View testID="premium-stars1" />
                        <View testID="premium-stars2" />
                        <View testID="premium-stars3" />
                      </>
                    )}
                    <Text style={[styles.brand, isPremiumDesktop && styles.brandPremium]}>
                      {payload?.brand?.name || 'Olive & Oak'}
                    </Text>
                    <Text style={[styles.tagline, isPremiumDesktop && styles.taglinePremium]}>
                      {payload?.brand?.tagline || 'Design that feels like home.'}
                    </Text>
                    {isPremiumDesktop && (
                      <Text style={styles.heroSubtext}>
                        Discover personalized furniture & decor curated for your style
                      </Text>
                    )}
                  </Animated.View>

                  {/* ── Navigation bar ── */}
                  <View
                    testID="premium-nav-bar"
                    style={[styles.topActions, isPremiumDesktop && styles.topActionsPremium]}
                  >
                    <Pressable
                      testID="premium-nav-btn"
                      style={[styles.topActionBtn, isPremiumDesktop && styles.topActionBtnPremium]}
                      onPress={() => navigation.navigate('AllProducts')}
                    >
                      <Text style={[styles.topActionText, isPremiumDesktop && styles.topActionTextPremium]}>All Products</Text>
                    </Pressable>
                    <Pressable
                      testID="premium-nav-btn"
                      style={[styles.topActionBtn, isPremiumDesktop && styles.topActionBtnPremium]}
                      onPress={() => navigation.navigate('Profile')}
                    >
                      <Text style={[styles.topActionText, isPremiumDesktop && styles.topActionTextPremium]}>Profile</Text>
                    </Pressable>
                    <Pressable
                      testID="premium-nav-btn"
                      style={[styles.topActionBtn, isPremiumDesktop && styles.topActionBtnPremium]}
                      onPress={() => navigation.navigate('Orders')}
                    >
                      <Text style={[styles.topActionText, isPremiumDesktop && styles.topActionTextPremium]}>My Orders</Text>
                    </Pressable>
                    <Pressable
                      testID="premium-nav-btn"
                      style={[styles.topActionBtn, isPremiumDesktop && styles.topActionBtnPremium]}
                      onPress={() => navigation.navigate('Cart')}
                    >
                      <Text style={[styles.topActionText, isPremiumDesktop && styles.topActionTextPremium]}>Cart</Text>
                    </Pressable>
                    <Pressable
                      testID="premium-nav-btn"
                      style={[styles.topActionBtn, isPremiumDesktop && styles.topActionBtnPremium]}
                      onPress={() => navigation.navigate('ArModels')}
                    >
                      <Text style={[styles.topActionText, isPremiumDesktop && styles.topActionTextPremium]}>All AR Models</Text>
                    </Pressable>
                    <Pressable
                      testID="premium-nav-quiz"
                      style={[styles.topActionBtn, styles.quizAgainBtn, isPremiumDesktop && styles.quizAgainBtnPremium]}
                      onPress={() => navigation.navigate('QuizAesthetic')}
                    >
                      <Text style={[styles.topActionText, styles.quizAgainText, isPremiumDesktop && styles.quizAgainTextPremium]}>
                        ✦ Retake Style Quiz
                      </Text>
                    </Pressable>
                  </View>

                  {/* ── Search ── */}
                  <TextInput
                    testID="premium-search"
                    value={searchText}
                    onChangeText={setSearchText}
                    placeholder={isPremiumDesktop ? '🔍  Search your personalized picks...' : 'Search your personalized picks...'}
                    placeholderTextColor={isPremiumDesktop ? '#9CA3AF' : '#8B7D70'}
                    style={[styles.searchInput, isPremiumDesktop && styles.searchInputPremium]}
                  />
                  {!!searchSuggestions.length && (
                    <View style={styles.searchSuggestionDropdown}>
                      {searchSuggestions.slice(0, 8).map((item) => (
                        <Pressable key={`home-suggest-${item}`} style={styles.searchSuggestionItem} onPress={() => setSearchText(String(item))}>
                          <Text style={styles.searchSuggestionText}>{item}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* ── Categories section ── */}
                  <Text
                    testID="premium-section-title"
                    style={[
                      styles.sectionTitle,
                      isWeb && styles.sectionTitleWeb,
                      isPremiumDesktop && styles.sectionTitlePremium,
                    ]}
                  >
                    Explore Rooms
                  </Text>
                  {isWeb ? (
                    <View style={[styles.glbGrid, isPremiumDesktop && styles.glbGridPremium]}>
                      {glbObjects.map((item: any) => (
                        <View
                          testID="premium-cat-card"
                          key={item.id}
                          style={[
                            styles.glbCard,
                            styles.glbCardWeb,
                            webCategoryCardWidth ? { width: webCategoryCardWidth } : null,
                            isPremiumDesktop && styles.glbCardPremium,
                          ]}
                        >
                          <View style={[styles.glbImageWeb, isPremiumDesktop && styles.glbImagePremium]}>
                            <GlbPreview categoryId={item.id} thumbnailUrl={item.thumbnail_url} />
                          </View>
                          <Text
                            style={[styles.glbText, styles.glbTextWeb, isPremiumDesktop && styles.glbTextPremium]}
                            numberOfLines={1}
                          >
                            {item.title}
                          </Text>
                          <View style={[styles.glbActionRow, styles.glbActionRowWeb]}>
                            <Pressable
                              testID="premium-cat-open"
                              style={[styles.glbActionBtn, styles.glbActionBtnWeb, isPremiumDesktop && styles.glbActionBtnPremium]}
                              onPress={() => openCategory(item)}
                            >
                              <Text style={[styles.glbActionText, isPremiumDesktop && styles.glbActionTextPremium]}>Browse</Text>
                            </Pressable>
                            <Pressable
                              testID="premium-cat-ar"
                              style={[styles.glbActionBtn, styles.glbActionAr, styles.glbActionBtnWeb, isPremiumDesktop && styles.glbActionArPremium]}
                              onPress={() => openArForCategory(item)}
                            >
                              <Text style={[styles.glbActionText, styles.glbActionTextAr]}>AR View</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <FlatList
                      horizontal
                      data={glbObjects}
                      keyExtractor={(item) => item.id}
                      contentContainerStyle={styles.glbList}
                      showsHorizontalScrollIndicator={false}
                      renderItem={({ item }) => (
                        <View style={styles.glbCard}>
                          <View style={styles.glbImage}>
                            <GlbPreview categoryId={item.id} thumbnailUrl={item.thumbnail_url} />
                          </View>
                          <Text style={styles.glbText}>{item.title}</Text>
                          <View style={styles.glbActionRow}>
                            <Pressable style={styles.glbActionBtn} onPress={() => openCategory(item)}>
                              <Text style={styles.glbActionText}>Open</Text>
                            </Pressable>
                            <Pressable style={[styles.glbActionBtn, styles.glbActionAr]} onPress={() => openArForCategory(item)}>
                              <Text style={[styles.glbActionText, styles.glbActionTextAr]}>AR</Text>
                            </Pressable>
                          </View>
                        </View>
                      )}
                    />
                  )}

                  {/* ── Personalized Picks section ── */}
                  <View style={[styles.picksHeader, isPremiumDesktop && styles.picksHeaderPremium]}>
                    <Text
                      testID="premium-section-title"
                      style={[styles.sectionTitle, isPremiumDesktop && styles.sectionTitlePremium]}
                    >
                      Personalized Picks
                    </Text>
                    <Text style={[styles.picksCount, isPremiumDesktop && styles.picksCountPremium]}>
                      {filteredProducts.length} items
                    </Text>
                  </View>

                  {!!loadingError && <Text style={styles.errorText}>{loadingError}</Text>}
                </>
              }
              ListEmptyComponent={
                loading ? (
                  <View style={styles.emptyWrap}>
                    <ActivityIndicator color={colors.teak} />
                  </View>
                ) : (
                  <Text style={styles.emptyState}>No products found for this filter right now.</Text>
                )
              }
            />
          </View>
        </View>

        {/* ── Chat FAB ── */}
        <Pressable
          testID="premium-chat-fab"
          style={[styles.chatFab, isPremiumDesktop && styles.chatFabPremium]}
          onPress={toggleChat}
        >
          <Text style={[styles.chatFabText, isPremiumDesktop && styles.chatFabTextPremium]}>AI</Text>
        </Pressable>

        {/* ── Chat panel ── */}
        {chatOpen && (
          <KeyboardAvoidingView
            testID="premium-chat-panel"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[
              styles.chatPanel,
              { width: Math.min(isPremiumDesktop ? 560 : 420, Math.max(300, contentWidth - 8)) },
              isPremiumDesktop && styles.chatPanelPremium,
            ]}
          >
            <View style={styles.chatHeader}>
              <View style={styles.chatTitleWrap}>
                <Text style={[styles.chatTitle, isPremiumDesktop && styles.chatTitlePremium]}>Olive Assistant</Text>
                <Text style={[styles.chatSubtitle, isPremiumDesktop && styles.chatSubtitlePremium]}>Smart design help with instant cart actions</Text>
              </View>
              <View style={styles.chatHeaderActions}>
                <Pressable testID="premium-chat-ghost" style={[styles.chatGhostBtn, isPremiumDesktop && styles.chatGhostBtnPremium]} onPress={uploadAndAnalyzeImage}>
                  <Text style={[styles.chatGhostText, isPremiumDesktop && styles.chatGhostTextPremium]}>{visualBusy ? 'Analyzing...' : '📷 Upload'}</Text>
                </Pressable>
                <Pressable testID="premium-chat-ghost" style={[styles.chatGhostBtn, isPremiumDesktop && styles.chatGhostBtnPremium]} onPress={clearChat}>
                  <Text style={[styles.chatGhostText, isPremiumDesktop && styles.chatGhostTextPremium]}>Clear</Text>
                </Pressable>
                <Pressable testID="premium-chat-ghost" style={[styles.chatGhostBtn, isPremiumDesktop && styles.chatGhostBtnPremium]} onPress={toggleChat}>
                  <Text style={[styles.chatGhostText, isPremiumDesktop && styles.chatGhostTextPremium]}>✕</Text>
                </Pressable>
              </View>
            </View>

            <FlatList
              ref={chatListRef}
              data={chatMessages}
              keyExtractor={(_, idx) => `msg-${idx}`}
              style={styles.chatList}
              contentContainerStyle={{ gap: 6, paddingBottom: 8 }}
              renderItem={({ item }) => (
                <View style={[
                  styles.chatBubble,
                  item.role === 'user' ? styles.chatBubbleUser : styles.chatBubbleBot,
                  isPremiumDesktop && (item.role === 'user' ? styles.chatBubbleUserPremium : styles.chatBubbleBotPremium),
                ]}>
                  <Text
                    style={[
                      styles.chatBubbleText,
                      item.role === 'user' ? styles.chatBubbleTextUser : styles.chatBubbleTextBot,
                    ]}
                  >
                    {item.text}
                  </Text>
                  {item.role === 'assistant' && !!item.recommendations?.length && (
                    <View style={styles.chatRecoWrap}>
                      <Text style={styles.chatRecoHeading}>Suggested products</Text>
                      {item.recommendations.map((rec) => (
                        <View key={`chat-rec-${rec.sku}`} style={styles.chatRecoCard}>
                          <View style={styles.chatRecoTextWrap}>
                            <Text style={styles.chatRecoName} numberOfLines={1}>{rec.name}</Text>
                            <Text style={styles.chatRecoPrice}>₹{formatInr(Number(rec.price_inr || 0))}</Text>
                          </View>
                          <View style={styles.chatRecoActions}>
                            <Pressable style={styles.chatRecoSecondaryBtn} onPress={() => navigation.navigate('ProductDetail', { sku: rec.sku })}>
                              <Text style={styles.chatRecoSecondaryText}>View</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.chatRecoPrimaryBtn, addingCartSku === rec.sku && { opacity: 0.6 }]}
                              onPress={() => addRecommendedToCart(rec)}
                              disabled={addingCartSku === rec.sku}
                            >
                              <Text style={styles.chatRecoPrimaryText}>{addingCartSku === rec.sku ? 'Adding...' : 'Add to Cart'}</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
              ListFooterComponent={
                chatBusy || visualBusy ? (
                  <View style={[styles.chatBubble, styles.chatBubbleBot, isPremiumDesktop && styles.chatBubbleBotPremium]}>
                    <Text style={[styles.chatBubbleText, styles.chatBubbleTextBot]}>
                      {visualBusy ? 'Analyzing your image...' : 'Thinking...'}
                    </Text>
                  </View>
                ) : null
              }
            />

            <FlatList
              horizontal
              data={quickPrompts}
              keyExtractor={(item, idx) => `${item}-${idx}`}
              contentContainerStyle={styles.quickPromptRow}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable testID="premium-quick-chip" style={[styles.quickPromptChip, isPremiumDesktop && styles.quickPromptChipPremium]} onPress={() => askBot(item)} disabled={chatBusy}>
                  <Text style={[styles.quickPromptText, isPremiumDesktop && styles.quickPromptTextPremium]}>{item}</Text>
                </Pressable>
              )}
            />

            <View style={styles.chatComposer}>
              <TextInput
                value={chatInput}
                onChangeText={setChatInput}
                style={[styles.chatInput, isPremiumDesktop && styles.chatInputPremium]}
                placeholder="Ask for design suggestions..."
                placeholderTextColor={isPremiumDesktop ? '#9CA3AF' : '#8E7F72'}
                onSubmitEditing={() => askBot()}
                returnKeyType="send"
              />
              <Pressable
                testID="premium-chat-send"
                style={[styles.chatSend, chatBusy && { opacity: 0.6 }, isPremiumDesktop && styles.chatSendPremium]}
                onPress={() => askBot()}
                disabled={chatBusy}
              >
                <Text style={styles.chatSendText}>Ask</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        )}

        {/* ── 3D preview modal ── */}
        <Modal visible={!!previewCategory} transparent animationType="fade" onRequestClose={() => setPreviewCategory(null)}>
          <View style={styles.previewOverlay}>
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{previewCategory?.title}</Text>
              <View style={styles.previewModelWrap}>
                {previewCategory && (
                  <GlbPreview categoryId={previewCategory.id} thumbnailUrl={previewCategory.thumbnail_url} />
                )}
              </View>
              <Pressable style={styles.previewClose} onPress={() => setPreviewCategory(null)}>
                <Text style={styles.previewCloseText}>Close Preview</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   StyleSheet — original mobile styles preserved, premium desktop variants added.
   ═══════════════════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  /* ── Base (mobile — unchanged) ── */
  gradient: { flex: 1 },
  safe: { flex: 1 },
  pageShell: { flex: 1, alignItems: 'center' },
  content: { flex: 1 },
  brand: { fontSize: 36, fontWeight: '800', color: colors.charcoal },
  tagline: { color: '#61554A', marginBottom: 10 },
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  topActionBtn: {
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#E0CCAF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  topActionText: { color: colors.teak, fontWeight: '700' },
  quizAgainBtn: {
    backgroundColor: colors.teak,
    borderColor: colors.teak,
  },
  quizAgainText: {
    color: colors.white,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#DECCB1',
    borderRadius: 12,
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  searchSuggestionDropdown: {
    borderWidth: 1,
    borderColor: '#E1CFB2',
    borderRadius: 12,
    backgroundColor: '#FFFDF8',
    marginTop: -2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  searchSuggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E3CF',
  },
  searchSuggestionText: { color: '#6A5543', fontSize: 11, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.charcoal, marginTop: 8 },
  sectionTitleWeb: { marginTop: 14, marginBottom: 8 },
  glbList: { gap: 14, paddingVertical: 8 },
  glbGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
    gap: 16,
    paddingVertical: 10,
  },
  glbCard: {
    width: 124,
    borderRadius: 18,
    backgroundColor: '#FFF9EF',
    borderWidth: 1,
    borderColor: '#E6D4B9',
    padding: 8,
    alignItems: 'center',
  },
  glbCardWeb: {
    width: 180,
    padding: 12,
    borderRadius: 22,
    backgroundColor: '#FFFDF8',
    shadowColor: '#C3A680',
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    shadowOpacity: 0.22,
    elevation: 4,
    minHeight: 300,
  },
  glbImage: { width: 94, height: 94, borderRadius: 47, marginBottom: 6 },
  glbImageWeb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 28,
    marginBottom: 10,
    overflow: 'hidden',
  },
  glbText: { fontSize: 12, fontWeight: '700', color: colors.teak },
  glbTextWeb: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 2,
  },
  glbActionRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  glbActionRowWeb: { width: '100%', justifyContent: 'center', marginTop: 8 },
  glbActionBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDC9A8',
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  glbActionBtnWeb: {
    minWidth: 54,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  glbActionAr: {
    backgroundColor: colors.teak,
    borderColor: colors.teak,
  },
  glbActionText: { fontSize: 10, fontWeight: '700', color: '#6B5B4C' },
  glbActionTextAr: { color: colors.white },
  picksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  picksCount: { color: '#7A6D61', fontWeight: '600', marginTop: 8 },
  productsContent: { paddingBottom: 100 },
  gridRow: { gap: 12 },
  productCard: {
    flex: 1,
    backgroundColor: '#FFFDF8',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E8D8BF',
    marginTop: 12,
  },
  productCardDesktop: {
    minHeight: 260,
  },
  productImage: { height: 118, borderRadius: 12, marginBottom: 6 },
  productName: { color: colors.charcoal, fontWeight: '700', fontSize: 13 },
  productPrice: { color: colors.teak, fontWeight: '800', marginVertical: 3 },
  productScore: { color: '#75685D', fontSize: 11, marginBottom: 6 },
  addBtn: {
    backgroundColor: colors.moss,
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
  },
  addBtnText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  emptyWrap: { paddingVertical: 24, alignItems: 'center' },
  emptyState: { color: '#6F645A', marginTop: 10, marginBottom: 24 },
  errorText: { color: '#AB2D24', marginTop: 6, marginBottom: 4 },
  chatFab: {
    position: 'absolute',
    right: 16,
    bottom: 30,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.teak,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  chatFabText: { color: colors.white, fontWeight: '800' },
  chatPanel: {
    position: 'absolute',
    right: 14,
    bottom: 98,
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2D0B3',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    shadowOpacity: 1,
    elevation: 5,
    maxHeight: 650,
  },
  chatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  chatTitleWrap: { flex: 1, paddingRight: 8 },
  chatHeaderActions: { flexDirection: 'row', gap: 8 },
  chatSubtitle: { fontSize: 10, color: '#8A7766', marginTop: 2, fontWeight: '600' },
  chatGhostBtn: {
    borderWidth: 1,
    borderColor: '#DFC8A5',
    backgroundColor: '#FFF9ED',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chatGhostText: { color: '#7B6248', fontWeight: '700', fontSize: 11 },
  chatTitle: { fontWeight: '800', color: colors.charcoal, marginBottom: 8 },
  chatList: { maxHeight: 390, marginBottom: 8 },
  chatBubble: { borderRadius: 12, padding: 10, maxWidth: '96%' },
  chatBubbleUser: { backgroundColor: colors.teak, alignSelf: 'flex-end' },
  chatBubbleBot: { backgroundColor: '#F3E6D3', alignSelf: 'flex-start' },
  chatBubbleText: { fontSize: 12.5, lineHeight: 19 },
  chatBubbleTextUser: { color: colors.white },
  chatBubbleTextBot: { color: '#5B4F44' },
  chatRecoWrap: { marginTop: 9, gap: 7 },
  chatRecoHeading: { fontSize: 11, fontWeight: '700', color: '#6A5543' },
  chatRecoCard: {
    borderWidth: 1,
    borderColor: '#E2CFB2',
    borderRadius: 12,
    backgroundColor: '#FFF9F1',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  chatRecoTextWrap: { gap: 2 },
  chatRecoName: { color: '#4D3D31', fontWeight: '800', fontSize: 12.5 },
  chatRecoPrice: { color: '#7A6656', fontWeight: '700', fontSize: 11.5 },
  chatRecoActions: { flexDirection: 'row', gap: 6 },
  chatRecoSecondaryBtn: {
    borderWidth: 1,
    borderColor: '#D4B892',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFFDF8',
  },
  chatRecoSecondaryText: { color: '#6C5644', fontSize: 11, fontWeight: '800' },
  chatRecoPrimaryBtn: {
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.teak,
  },
  chatRecoPrimaryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  quickPromptRow: { gap: 8, paddingBottom: 8 },
  quickPromptChip: {
    backgroundColor: '#FFF9EE',
    borderWidth: 1,
    borderColor: '#E1CFB2',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  quickPromptText: { color: '#6A5543', fontSize: 11, fontWeight: '600' },
  chatComposer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DCC9AA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chatSend: {
    backgroundColor: colors.teak,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  chatSendText: { color: colors.white, fontWeight: '700' },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 18,
  },
  previewCard: {
    backgroundColor: colors.ivory,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DFCDB2',
    padding: 12,
  },
  previewTitle: { fontSize: 22, fontWeight: '800', color: colors.charcoal, marginBottom: 8 },
  previewModelWrap: { width: '100%', height: 260, borderRadius: 14, overflow: 'hidden' },
  previewClose: {
    marginTop: 10,
    backgroundColor: colors.teak,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  previewCloseText: { color: colors.white, fontWeight: '700' },

  /* ═══════════════════════════════════════════════════════════════════════
     DESKTOP PREMIUM — only applied when isPremiumDesktop === true.
     ═══════════════════════════════════════════════════════════════════════ */

  /* Hero banner */
  heroPremium: {
    borderRadius: 24,
    marginBottom: 4,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  brandPremium: {
    fontSize: 52,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -1.5,
    zIndex: 1,
  },
  taglinePremium: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 0,
    letterSpacing: -0.2,
    zIndex: 1,
  },
  heroSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 8,
    letterSpacing: 0.2,
    zIndex: 1,
  },

  /* Navigation */
  topActionsPremium: {
    gap: 10,
    marginBottom: 24,
    alignItems: 'center',
  },
  topActionBtnPremium: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 11,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 1,
  },
  topActionTextPremium: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 13.5,
  },
  quizAgainBtnPremium: {
    backgroundColor: '#533483',
    borderColor: '#533483',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  quizAgainTextPremium: {
    fontWeight: '700',
    fontSize: 13.5,
    letterSpacing: 0.3,
  },

  /* Search */
  searchInputPremium: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 24,
    fontSize: 15,
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    shadowOpacity: 1,
  },

  /* Section title */
  sectionTitlePremium: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a2e',
    marginTop: 12,
    marginBottom: 14,
    letterSpacing: -0.5,
  },

  /* Category grid */
  glbGridPremium: {
    gap: 24,
    paddingVertical: 8,
    marginBottom: 12,
  },
  glbCardPremium: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 22,
    padding: 14,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 24,
    shadowOpacity: 1,
    minHeight: 280,
  },
  glbImagePremium: {
    borderRadius: 16,
  },
  glbTextPremium: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  glbActionBtnPremium: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  glbActionTextPremium: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  glbActionArPremium: {
    backgroundColor: '#533483',
    borderColor: '#533483',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },

  /* Product grid */
  productsContentDesktop: {
    paddingBottom: 120,
  },
  gridRowPremium: {
    gap: 20,
  },
  productCardPremium: {
    backgroundColor: '#ffffff',
    borderColor: '#E5E7EB',
    borderRadius: 20,
    padding: 14,
    marginTop: 20,
    shadowColor: 'rgba(0,0,0,0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    shadowOpacity: 1,
    minHeight: 320,
  },
  productImageWrapPremium: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 4,
  },
  productImagePremium: {
    height: 180,
    borderRadius: 14,
    marginBottom: 0,
  },
  productNamePremium: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a2e',
    marginTop: 12,
    lineHeight: 21,
  },
  productPricePremium: {
    fontSize: 18,
    fontWeight: '800',
    color: '#533483',
    marginVertical: 6,
  },
  productScorePremium: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  addBtnPremium: {
    borderRadius: 14,
    paddingVertical: 12,
    backgroundColor: '#0f3460',
  },
  addBtnTextPremium: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /* Picks header */
  picksHeaderPremium: {
    marginTop: 16,
    marginBottom: 4,
    paddingBottom: 4,
  },
  picksCountPremium: {
    color: '#9CA3AF',
    fontWeight: '500',
    fontSize: 13,
    letterSpacing: 0.3,
  },

  /* Chat FAB */
  chatFabPremium: {
    width: 64,
    height: 64,
    borderRadius: 32,
    right: 32,
    bottom: 32,
  },
  chatFabTextPremium: {
    fontSize: 17,
    fontWeight: '800',
  },

  /* Chat panel */
  chatPanelPremium: {
    right: 32,
    bottom: 108,
    padding: 18,
    maxHeight: 720,
  },
  chatTitlePremium: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: -0.3,
  },
  chatGhostBtnPremium: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chatGhostTextPremium: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  chatSubtitlePremium: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 3,
  },
  chatBubbleUserPremium: {
    backgroundColor: '#533483',
    borderRadius: 14,
  },
  chatBubbleBotPremium: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
  },
  chatInputPremium: {
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#F9FAFB',
  },
  chatSendPremium: {
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  quickPromptChipPremium: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickPromptTextPremium: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
});
