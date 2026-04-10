import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/types';
import { api, endpoints, getApiErrorMessage } from '../services/api';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Catalog'>;
type SortBy = 'featured' | 'price-asc' | 'price-desc';

function normalize(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

export function CatalogScreen({ route, navigation }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('featured');
  const { contentWidth, pageHorizontalPadding, productColumns } = useResponsiveLayout();

  const load = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const res = await api.get(endpoints.categoryProducts(route.params.categoryId));
      setItems(res.data || []);
    } catch (error) {
      setErrorText(getApiErrorMessage(error, 'Could not load this category right now.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [route.params.categoryId]);

  const visibleItems = useMemo(() => {
    const q = normalize(query);
    let next = [...items];

    if (q) {
      next = next.filter((item) => {
        const name = String(item?.name || '').toLowerCase();
        const desc = String(item?.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (sortBy === 'price-asc') {
      next.sort((a, b) => Number(a?.price_inr || 0) - Number(b?.price_inr || 0));
    } else if (sortBy === 'price-desc') {
      next.sort((a, b) => Number(b?.price_inr || 0) - Number(a?.price_inr || 0));
    }

    return next;
  }, [items, query, sortBy]);

  const searchSuggestions = useMemo(() => {
    const q = normalize(query);
    if (!q) {
      return [];
    }

    const tokens = new Set<string>();
    for (const item of items) {
      const parts = [item?.name, item?.description, item?.category_id, item?.attributes?.aesthetic_style, item?.attributes?.mood_feel];
      for (const part of parts) {
        for (const token of String(part || '').split(/[^a-zA-Z0-9-]+/)) {
          const n = normalize(token);
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
  }, [items, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.pageShell, { paddingHorizontal: pageHorizontalPadding }]}>
        <View style={[styles.content, { width: contentWidth }]}>
          <Text style={styles.title}>{route.params.title} Catalog</Text>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${route.params.title.toLowerCase()} products...`}
            placeholderTextColor="#8A7C6F"
            style={styles.searchInput}
          />
          {!!searchSuggestions.length && (
            <View style={styles.suggestionDropdown}>
              {searchSuggestions.slice(0, 8).map((item) => (
                <Pressable key={`catalog-suggest-${item}`} style={styles.suggestionItem} onPress={() => setQuery(String(item))}>
                  <Text style={styles.suggestionText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.sortRow}>
            <Pressable style={[styles.chip, sortBy === 'featured' && styles.chipActive]} onPress={() => setSortBy('featured')}>
              <Text style={[styles.chipText, sortBy === 'featured' && styles.chipTextActive]}>Featured</Text>
            </Pressable>
            <Pressable style={[styles.chip, sortBy === 'price-asc' && styles.chipActive]} onPress={() => setSortBy('price-asc')}>
              <Text style={[styles.chipText, sortBy === 'price-asc' && styles.chipTextActive]}>Price Low-High</Text>
            </Pressable>
            <Pressable style={[styles.chip, sortBy === 'price-desc' && styles.chipActive]} onPress={() => setSortBy('price-desc')}>
              <Text style={[styles.chipText, sortBy === 'price-desc' && styles.chipTextActive]}>Price High-Low</Text>
            </Pressable>
          </View>

          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <FlatList
            data={visibleItems}
            key={`catalog-grid-${productColumns}`}
            numColumns={productColumns}
            columnWrapperStyle={productColumns > 1 ? styles.gridRow : undefined}
            contentContainerStyle={styles.listContent}
            keyExtractor={(item) => item.sku}
            refreshing={loading}
            onRefresh={load}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Pressable onPress={() => navigation.navigate('ProductDetail', { sku: item.sku })}>
                  <Image source={{ uri: item.media?.image_url }} style={styles.image} />
                </Pressable>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.price}>Rs {formatInr(Number(item.price_inr || 0))}</Text>
                <Pressable style={styles.button} onPress={() => navigation.navigate('ProductDetail', { sku: item.sku })}>
                  <Text style={styles.buttonText}>View Details</Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No products in this category yet.</Text>}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  pageShell: { flex: 1, alignItems: 'center' },
  content: { flex: 1 },
  title: { fontSize: 30, fontWeight: '800', color: colors.charcoal, marginBottom: 10 },
  searchInput: {
    borderWidth: 1,
    borderColor: '#DDCCB2',
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
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
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#D7C2A2',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFF9EF',
  },
  chipActive: {
    backgroundColor: colors.teak,
    borderColor: colors.teak,
  },
  chipText: { color: '#6B5F54', fontWeight: '600', fontSize: 12 },
  chipTextActive: { color: colors.white },
  errorText: { color: '#AF3227', marginBottom: 8 },
  listContent: { paddingBottom: 22 },
  gridRow: { gap: 12 },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E4D3B8',
    padding: 10,
    marginTop: 10,
  },
  image: { height: 170, borderRadius: 10, marginBottom: 8 },
  name: { fontWeight: '700', color: colors.charcoal },
  price: { marginTop: 4, marginBottom: 8, color: colors.teak, fontWeight: '700' },
  button: {
    backgroundColor: colors.teak,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 9,
  },
  buttonText: { color: colors.white, fontWeight: '700' },
  empty: { color: '#75695D', marginTop: 12 },
});
