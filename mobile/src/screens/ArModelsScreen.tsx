import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlbPreview } from '../components/GlbPreview';
import { RootStackParamList } from '../navigation/types';
import { openModelInAr, resolveArModelUrls } from '../services/ar';
import { api, endpoints, getApiErrorMessage } from '../services/api';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'ArModels'>;

type ArModelItem = {
  key: string;
  title: string;
  categoryId?: string;
  thumbnailUrl?: string;
  glbUrlValue?: string | null;
  usdzUrlValue?: string | null;
  sourceType: 'category' | 'product' | 'library';
  productSku?: string;
  usesFallbackModel?: boolean;
};

const FALLBACK_LIBRARY: Array<{ title: string; categoryId: string; glbUrl: string }> = [
  { title: 'Kitchen Gas Stove', categoryId: 'kitchen', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/gas_stove.glb' },
  { title: 'Kitchen Gas Stove KG67', categoryId: 'kitchen', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/gas_stove_kg67mtl.glb' },
  { title: 'Kitchen Accessories', categoryId: 'kitchen', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/kitchen_accessories_v1.glb' },
  { title: 'Kitchen Blender', categoryId: 'kitchen', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/low_poly_blender_red.glb' },
  { title: 'Kitchen Stand Mixer', categoryId: 'kitchen', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/low_poly_stand_mixer_red.glb' },
  { title: 'Kitchen Toaster', categoryId: 'kitchen', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/low_poly_toaster_red.glb' },
  { title: 'Living Room Sofa', categoryId: 'living-room', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/sofa_01.glb' },
  { title: 'Bedroom Cosy Bed', categoryId: 'bedroom', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/cosy_bed.glb' },
  { title: 'Bedroom Bed 06', categoryId: 'bedroom', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/bed_06.glb' },
  { title: 'Classroom Whiteboard', categoryId: 'classroom', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/whiteboard_low-poly.glb' },
  { title: 'Classroom Computer Desk', categoryId: 'classroom', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/computer_desk.glb' },
  { title: 'Classroom High School Desk', categoryId: 'classroom', glbUrl: 'https://radiant-sherbet-aa1f57.netlify.app/high_school_desk.glb' },
];

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function pickRandomFallback(seed: string) {
  let sum = 0;
  for (const c of seed) {
    sum += c.charCodeAt(0);
  }
  return FALLBACK_LIBRARY[sum % FALLBACK_LIBRARY.length];
}

export function ArModelsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [models, setModels] = useState<ArModelItem[]>([]);
  const [query, setQuery] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const { contentWidth, pageHorizontalPadding, isDesktop } = useResponsiveLayout();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorText('');

      try {
        const res = await api.get(endpoints.personalizedHome);
        const categories = Array.isArray(res.data?.glb_objects) ? res.data.glb_objects : [];
        const products = Array.isArray(res.data?.products) ? res.data.products : [];

        const nextModels: ArModelItem[] = [];

        for (const item of categories) {
          const categoryId = String(item?.id || '').trim();
          if (!categoryId) {
            continue;
          }

          nextModels.push({
            key: `category-${categoryId}`,
            title: String(item?.title || categoryId),
            categoryId,
            thumbnailUrl: item?.thumbnail_url,
            glbUrlValue: item?.glb_url || item?.glbUrl || null,
            usdzUrlValue: item?.usdz_url || item?.usdzUrl || null,
            sourceType: 'category',
          });
        }

        for (const item of products) {
          const sku = String(item?.sku || '').trim();
          if (!sku) {
            continue;
          }

          const itemName = String(item?.name || sku);
          const categoryId = String(item?.category_id || '').trim();
          const productGlb = item?.media?.glb_url || item?.glb_url || null;
          const productUsdz = item?.media?.usdz_url || item?.usdz_url || null;
          const fallback = !productGlb ? pickRandomFallback(itemName + sku) : null;

          nextModels.push({
            key: `product-${sku}`,
            title: itemName,
            categoryId: categoryId || fallback?.categoryId,
            thumbnailUrl: item?.media?.image_url,
            glbUrlValue: productGlb || fallback?.glbUrl || null,
            usdzUrlValue: productUsdz,
            sourceType: 'product',
            productSku: sku,
            usesFallbackModel: Boolean(!productGlb && fallback),
          });
        }

        const seenUrls = new Set(nextModels.map((x) => String(x.glbUrlValue || '').trim()).filter(Boolean));
        for (const lib of FALLBACK_LIBRARY) {
          if (seenUrls.has(lib.glbUrl)) {
            continue;
          }
          nextModels.push({
            key: `library-${lib.glbUrl}`,
            title: lib.title,
            categoryId: lib.categoryId,
            glbUrlValue: lib.glbUrl,
            sourceType: 'library',
          });
        }

        setModels(nextModels);
      } catch (error) {
        setErrorText(getApiErrorMessage(error, 'Could not load AR models right now.'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const numColumns = useMemo(() => {
    if (!isDesktop) {
      return 2;
    }
    return 3;
  }, [isDesktop]);

  const filteredModels = useMemo(() => {
    const q = normalize(query);
    if (!q) {
      return models;
    }

    return models.filter((item) => {
      const title = normalize(item.title);
      const category = normalize(item.categoryId);
      const source = normalize(item.sourceType);
      const sku = normalize(item.productSku);
      return title.includes(q) || category.includes(q) || source.includes(q) || sku.includes(q);
    });
  }, [models, query]);

  const suggestions = useMemo(() => {
    const q = normalize(query);
    if (!q) {
      return [];
    }

    const words = new Set<string>();
    for (const item of models) {
      const text = `${item.title} ${item.categoryId || ''} ${item.productSku || ''}`;
      for (const token of text.split(/[^a-zA-Z0-9-]+/)) {
        const normalized = normalize(token);
        if (normalized.length < 3) {
          continue;
        }
        if (normalized.includes(q)) {
          words.add(token);
        }
      }
      if (words.size >= 8) {
        break;
      }
    }

    return Array.from(words).slice(0, 8);
  }, [models, query]);

  const openAr = async (item: ArModelItem) => {
    const itemId = item.key;
    if (openingId) {
      return;
    }

    setOpeningId(itemId);
    try {
      const resolved = await resolveArModelUrls({
        glbUrlValue: item?.glbUrlValue,
        usdzUrlValue: item?.usdzUrlValue,
        categoryId: item?.categoryId,
      });

      if (!resolved.glbUrl) {
        Alert.alert(
          'AR Not Ready',
          'No hosted GLB URL is available for this model. Set EXPO_PUBLIC_GLB_BASE_URL or provide glb_url in backend category data.',
        );
        return;
      }

      await openModelInAr({
        title: String(item?.title || 'Olive & Oak Model'),
        glbUrl: resolved.glbUrl,
        usdzUrl: resolved.usdzUrl,
        webViewerUrl: resolved.webViewerUrl,
      });
    } catch (error) {
      Alert.alert('AR Launch Failed', getApiErrorMessage(error, 'Could not open this model in AR right now.'));
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.pageShell, { paddingHorizontal: pageHorizontalPadding }]}>
        <View style={[styles.content, { width: contentWidth }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>All AR Models</Text>
            <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>Browse every available model and launch AR from one page.</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search model, category, or SKU"
            placeholderTextColor="#8B7D70"
            style={styles.searchInput}
          />
          {!!suggestions.length && (
            <View style={styles.suggestionDropdown}>
              {suggestions.slice(0, 8).map((item) => (
                <Pressable key={`suggest-${item}`} style={styles.suggestionItem} onPress={() => setQuery(String(item))}>
                  <Text style={styles.suggestionText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.teak} />
            </View>
          ) : (
            <FlatList
              data={filteredModels}
              key={`ar-grid-${numColumns}`}
              numColumns={numColumns}
              keyExtractor={(item) => item.key}
              columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
              contentContainerStyle={styles.gridContent}
              renderItem={({ item }) => {
                const itemId = item.key;
                const isOpening = openingId === itemId;

                return (
                  <View style={styles.card}>
                    <View style={styles.previewWrap}>
                      <GlbPreview categoryId={item?.categoryId} thumbnailUrl={item?.thumbnailUrl} />
                    </View>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item?.title || item?.categoryId || 'Model'}
                    </Text>
                    <Text style={styles.metaText} numberOfLines={1}>
                      {item.sourceType === 'product' ? `Product${item.productSku ? ` • ${item.productSku}` : ''}` : item.sourceType === 'category' ? 'Category' : 'Model Library'}
                      {item.usesFallbackModel ? ' • Random AR fallback' : ''}
                    </Text>
                    <View style={styles.actionsRow}>
                      <Pressable
                        style={[styles.secondaryBtn, !item?.categoryId && styles.disabledBtn]}
                        disabled={!item?.categoryId}
                        onPress={() =>
                          item?.categoryId
                            ? navigation.navigate('Catalog', {
                                categoryId: item.categoryId,
                                title: item?.title || 'Category',
                              })
                            : null
                        }
                      >
                        <Text style={styles.secondaryBtnText}>Open</Text>
                      </Pressable>
                      <Pressable style={[styles.arBtn, isOpening && styles.disabledBtn]} disabled={isOpening} onPress={() => openAr(item)}>
                        <Text style={styles.arBtnText}>{isOpening ? 'Opening...' : 'AR'}</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={styles.emptyState}>No AR models found for this search.</Text>}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  pageShell: { flex: 1, alignItems: 'center' },
  content: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, fontWeight: '800', color: colors.charcoal },
  subtitle: { color: '#675B50', marginTop: 4, marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#DECCB1',
    borderRadius: 12,
    backgroundColor: '#FFFDF8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  suggestionDropdown: {
    borderWidth: 1,
    borderColor: '#E1CFB2',
    borderRadius: 12,
    backgroundColor: '#FFFDF8',
    marginTop: -2,
    marginBottom: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E3CF',
  },
  suggestionText: { color: '#6A5543', fontSize: 11, fontWeight: '600' },
  backBtn: {
    borderWidth: 1,
    borderColor: '#DDC9A8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF9EE',
  },
  backBtnText: { color: colors.teak, fontWeight: '700' },
  errorText: { color: '#A92F26', marginTop: 6, marginBottom: 8 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gridContent: { paddingBottom: 26, paddingTop: 4 },
  gridRow: { gap: 12 },
  card: {
    flex: 1,
    backgroundColor: '#FFF9EF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6D4B9',
    padding: 10,
    marginTop: 12,
  },
  previewWrap: { width: '100%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F4E8D6' },
  cardTitle: { marginTop: 8, fontWeight: '700', color: colors.charcoal },
  metaText: { marginTop: 2, color: '#726457', fontSize: 11 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  secondaryBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDC9A8',
    backgroundColor: colors.white,
    paddingVertical: 7,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#6B5B4C', fontWeight: '700', fontSize: 12 },
  arBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.teak,
    backgroundColor: colors.teak,
    paddingVertical: 7,
    alignItems: 'center',
  },
  arBtnText: { color: colors.white, fontWeight: '700', fontSize: 12 },
  disabledBtn: { opacity: 0.55 },
  emptyState: { color: '#6F645A', marginTop: 14, textAlign: 'center' },
});
