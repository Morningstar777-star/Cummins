import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/types';
import { openModelInAr, resolveArModelUrls } from '../services/ar';
import { api, endpoints, getApiErrorMessage } from '../services/api';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductDetail'>;

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

export function ProductDetailScreen({ route, navigation }: Props) {
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [arOpening, setArOpening] = useState(false);
  const { contentWidth, pageHorizontalPadding, isDesktop } = useResponsiveLayout();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorText('');
      try {
        const res = await api.get(endpoints.productBySku(route.params.sku));
        setProduct(res.data);
      } catch (error) {
        setErrorText(getApiErrorMessage(error, 'Could not load this product.'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [route.params.sku]);

  const maxQty = useMemo(() => Math.max(1, Number(product?.stock || 1)), [product]);
  const isPurchasable = Boolean(product?.is_active) && Number(product?.stock || 0) > 0;

  const changeQty = (delta: number) => {
    setQty((prev) => {
      const next = prev + delta;
      if (next < 1) {
        return 1;
      }
      if (next > maxQty) {
        return maxQty;
      }
      return next;
    });
  };

  const addToCart = async (redirectToCart = false) => {
    if (!isPurchasable || adding) {
      return;
    }

    setAdding(true);
    try {
      await api.post(endpoints.cartItems, { product_id: route.params.sku, qty });
      if (redirectToCart) {
        navigation.navigate('Cart');
      } else {
        Alert.alert('Added to cart', `${qty} item(s) added successfully.`);
      }
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Could not add product to cart.'));
    } finally {
      setAdding(false);
    }
  };

  const openAr = async () => {
    if (!product || arOpening) {
      return;
    }

    setArOpening(true);
    try {
      const resolved = await resolveArModelUrls({
        glbUrlValue: product?.media?.glb_url,
        usdzUrlValue: product?.media?.usdz_url,
        categoryId: product?.category_id,
      });

      if (!resolved.glbUrl) {
        Alert.alert(
          'AR Not Ready',
          'This product has no hosted GLB URL yet. Configure EXPO_PUBLIC_GLB_BASE_URL for bundled models or provide media.glb_url.',
        );
        return;
      }

      await openModelInAr({
        title: String(product?.name || 'Olive & Oak Product'),
        glbUrl: resolved.glbUrl,
        usdzUrl: resolved.usdzUrl,
        webViewerUrl: resolved.webViewerUrl,
      });
    } catch (error) {
      Alert.alert('AR Launch Failed', getApiErrorMessage(error, 'Could not open AR viewer for this product right now.'));
    } finally {
      setArOpening(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.loading}>Loading product...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{errorText || 'Product not found.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.pageShell, { paddingHorizontal: pageHorizontalPadding }]}>
        <View style={[styles.content, { width: contentWidth }]}>
          <ScrollView contentContainerStyle={{ paddingBottom: 28 }}>
            <View style={[styles.layoutRow, isDesktop && styles.layoutRowDesktop]}>
              <Image source={{ uri: product.media?.image_url }} style={[styles.hero, isDesktop && styles.heroDesktop]} />

              <View style={styles.detailColumn}>
                <Text style={styles.name}>{product.name}</Text>
                <Text style={styles.price}>Rs {formatInr(Number(product.price_inr || 0))}</Text>
                <Text style={styles.desc}>{product.description}</Text>

                <View style={styles.metaCard}>
                  <Text style={styles.metaTitle}>Details</Text>
                  <Text style={styles.metaText}>Category: {product.category_id}</Text>
                  <Text style={styles.metaText}>Aesthetic: {product.attributes?.aesthetic_style || '-'}</Text>
                  <Text style={styles.metaText}>Mood: {product.attributes?.mood_feel || '-'}</Text>
                  <Text style={styles.metaText}>Price Tier: {product.attributes?.price_tier || '-'}</Text>
                  <Text style={styles.metaText}>Stock: {product.stock ?? 0}</Text>
                  <Text style={styles.metaText}>Status: {product.is_active ? 'Active' : 'Inactive'}</Text>
                </View>

                <View style={styles.qtyRow}>
                  <Text style={styles.qtyLabel}>Quantity</Text>
                  <View style={styles.qtyControls}>
                    <Pressable style={styles.qtyBtn} onPress={() => changeQty(-1)}>
                      <Text style={styles.qtyBtnText}>-</Text>
                    </Pressable>
                    <Text style={styles.qtyValue}>{qty}</Text>
                    <Pressable style={styles.qtyBtn} onPress={() => changeQty(1)}>
                      <Text style={styles.qtyBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={[styles.button, (!isPurchasable || adding) && styles.disabledButton]}
                  disabled={!isPurchasable || adding}
                  onPress={() => addToCart(false)}
                >
                  <Text style={styles.buttonText}>{adding ? 'Adding...' : 'Add to Cart'}</Text>
                </Pressable>

                <Pressable
                  style={[styles.button, styles.secondaryButton, (!isPurchasable || adding) && styles.disabledButton]}
                  disabled={!isPurchasable || adding}
                  onPress={() => addToCart(true)}
                >
                  <Text style={[styles.buttonText, styles.secondaryButtonText]}>Buy Now</Text>
                </Pressable>

                <Pressable style={[styles.button, styles.arButton, arOpening && styles.disabledButton]} disabled={arOpening} onPress={openAr}>
                  <Text style={styles.buttonText}>{arOpening ? 'Opening AR...' : 'View in AR / 3D'}</Text>
                </Pressable>

                {!isPurchasable && <Text style={styles.unavailable}>This item is currently unavailable.</Text>}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  pageShell: { flex: 1, alignItems: 'center' },
  content: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ivory },
  loading: { color: '#6F6458' },
  errorText: { color: '#AF3227' },
  layoutRow: { gap: 12 },
  layoutRowDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  hero: { width: '100%', height: 290, borderRadius: 18, marginBottom: 8 },
  heroDesktop: { width: '52%', height: 420, marginBottom: 0 },
  detailColumn: { flex: 1 },
  name: { fontSize: 30, fontWeight: '800', color: colors.charcoal },
  price: { fontSize: 24, color: colors.teak, fontWeight: '800', marginTop: 4, marginBottom: 8 },
  desc: { color: '#63584E', lineHeight: 21 },
  metaCard: {
    marginTop: 12,
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#E6D2B5',
    borderRadius: 14,
    padding: 12,
    gap: 5,
  },
  metaTitle: { fontWeight: '800', color: colors.charcoal, marginBottom: 4 },
  metaText: { color: '#5F544A' },
  qtyRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D0B6',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  qtyLabel: { color: colors.charcoal, fontWeight: '700' },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E6D3',
    borderWidth: 1,
    borderColor: '#DEC8A8',
  },
  qtyBtnText: { color: '#5D4F42', fontWeight: '800', fontSize: 16 },
  qtyValue: { color: colors.charcoal, fontWeight: '700', minWidth: 22, textAlign: 'center' },
  button: {
    backgroundColor: colors.teak,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D7C6AB',
  },
  buttonText: { color: colors.white, fontWeight: '800' },
  secondaryButtonText: { color: colors.teak },
  arButton: {
    backgroundColor: colors.moss,
  },
  disabledButton: {
    opacity: 0.5,
  },
  unavailable: {
    marginTop: 10,
    color: '#9D3226',
    fontWeight: '600',
  },
});
