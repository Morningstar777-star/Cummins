import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/types';
import { api, endpoints, getApiErrorMessage } from '../services/api';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

export function CartScreen({ navigation }: Props) {
  const [cart, setCart] = useState<any>({ items: [] });
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const { contentWidth, pageHorizontalPadding } = useResponsiveLayout();

  const load = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const [cartRes, productsRes] = await Promise.all([api.get(endpoints.cart), api.get(endpoints.allProducts)]);
      setCart(cartRes.data || { items: [] });
      setCatalogProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
    } catch (error) {
      setErrorText(getApiErrorMessage(error, 'Could not load cart.'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const total = useMemo(
    () => (cart.items || []).reduce((sum: number, i: any) => sum + Number(i.qty || 0) * Number(i.price_snapshot_inr || 0), 0),
    [cart.items]
  );

  const recommendations = useMemo(() => {
    const cartItems = Array.isArray(cart.items) ? cart.items : [];
    if (!cartItems.length || !catalogProducts.length) {
      return [];
    }

    const cartSkuSet = new Set(cartItems.map((item: any) => String(item?.product_id || '')));
    const cartProductMap = new Map(catalogProducts.map((p: any) => [String(p?.sku || ''), p]));
    const cartProducts = cartItems
      .map((item: any) => cartProductMap.get(String(item?.product_id || '')))
      .filter(Boolean);

    const likedCategories = new Set(cartProducts.map((p: any) => String(p?.category_id || '')));
    const likedStyles = new Set(cartProducts.map((p: any) => String(p?.attributes?.aesthetic_style || '')));
    const likedMoods = new Set(cartProducts.map((p: any) => String(p?.attributes?.mood_feel || '')));

    const scored = catalogProducts
      .filter((p: any) => !cartSkuSet.has(String(p?.sku || '')))
      .map((p: any) => {
        let score = 0;
        if (likedCategories.has(String(p?.category_id || ''))) {
          score += 4;
        }
        if (likedStyles.has(String(p?.attributes?.aesthetic_style || ''))) {
          score += 3;
        }
        if (likedMoods.has(String(p?.attributes?.mood_feel || ''))) {
          score += 2;
        }
        if (Number(p?.stock || 0) > 0) {
          score += 1;
        }
        return { item: p, score };
      })
      .sort((a: any, b: any) => b.score - a.score);

    return scored.slice(0, 2).map((x: any) => x.item);
  }, [cart.items, catalogProducts]);

  const updateQty = async (productId: string, nextQty: number) => {
    if (nextQty < 1) {
      return;
    }

    setBusyItemId(productId);
    try {
      await api.patch(`${endpoints.cartItems}/${productId}`, { qty: nextQty });
      await load();
    } catch (error) {
      Alert.alert('Update failed', getApiErrorMessage(error, 'Could not update quantity.'));
    } finally {
      setBusyItemId(null);
    }
  };

  const removeItem = async (productId: string) => {
    setBusyItemId(productId);
    try {
      await api.delete(`${endpoints.cartItems}/${productId}`);
      await load();
    } catch (error) {
      Alert.alert('Remove failed', getApiErrorMessage(error, 'Could not remove this item.'));
    } finally {
      setBusyItemId(null);
    }
  };

  const checkout = async () => {
    if (!(cart.items || []).length || checkingOut) {
      return;
    }

    setCheckingOut(true);
    try {
      const response = await api.post(endpoints.checkout);
      navigation.replace('PaymentSuccess', { order: response.data.order });
    } catch (error) {
      Alert.alert('Payment failed', getApiErrorMessage(error, 'Please verify cart details and retry.'));
    } finally {
      setCheckingOut(false);
    }
  };

  const addRecommendedItem = async (productId: string) => {
    setBusyItemId(productId);
    try {
      await api.post(endpoints.cartItems, { product_id: productId, qty: 1 });
      await load();
    } catch (error) {
      Alert.alert('Add failed', getApiErrorMessage(error, 'Could not add this recommendation to cart.'));
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.pageShell, { paddingHorizontal: pageHorizontalPadding }]}>
        <View style={[styles.content, { width: contentWidth }]}>
          <Text style={styles.title}>Your Cart</Text>
          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <FlatList
            data={cart.items || []}
            keyExtractor={(item) => item.product_id}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            refreshing={loading}
            onRefresh={load}
            renderItem={({ item }) => {
              const lineTotal = Number(item.qty || 0) * Number(item.price_snapshot_inr || 0);
              const busy = busyItemId === item.product_id;
              return (
                <View style={styles.row}>
                  <View style={styles.itemMeta}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.meta}>Rs {formatInr(Number(item.price_snapshot_inr || 0))} each</Text>
                    <Text style={styles.price}>Rs {formatInr(lineTotal)}</Text>
                  </View>

                  <View style={styles.itemActions}>
                    <View style={styles.qtyControls}>
                      <Pressable style={styles.qtyBtn} onPress={() => updateQty(item.product_id, Number(item.qty || 1) - 1)} disabled={busy}>
                        <Text style={styles.qtyBtnText}>-</Text>
                      </Pressable>
                      <Text style={styles.qtyText}>{item.qty}</Text>
                      <Pressable style={styles.qtyBtn} onPress={() => updateQty(item.product_id, Number(item.qty || 1) + 1)} disabled={busy}>
                        <Text style={styles.qtyBtnText}>+</Text>
                      </Pressable>
                    </View>
                    <Pressable style={styles.removeBtn} onPress={() => removeItem(item.product_id)} disabled={busy}>
                      <Text style={styles.removeBtnText}>{busy ? 'Updating...' : 'Remove'}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Your cart is empty. Add products from the catalog.</Text>
              </View>
            }
          />

          {!!recommendations.length && (
            <View style={styles.recoSection}>
              <Text style={styles.recoTitle}>You may also like</Text>
              {recommendations.map((item: any) => (
                <View key={`reco-${item?.sku}`} style={styles.recoRow}>
                  <View style={styles.itemMeta}>
                    <Text style={styles.name}>{item?.name}</Text>
                    <Text style={styles.meta}>{String(item?.category_id || '').replace('-', ' ').toUpperCase()}</Text>
                    <Text style={styles.price}>Rs {formatInr(Number(item?.price_inr || 0))}</Text>
                  </View>
                  <View style={styles.recoActions}>
                    <Pressable style={styles.recoGhostBtn} onPress={() => navigation.navigate('ProductDetail', { sku: item.sku })}>
                      <Text style={styles.recoGhostText}>View</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.recoAddBtn, busyItemId === item?.sku && styles.checkoutDisabled]}
                      onPress={() => addRecommendedItem(String(item?.sku || ''))}
                      disabled={busyItemId === item?.sku}
                    >
                      <Text style={styles.recoAddText}>{busyItemId === item?.sku ? 'Adding...' : 'Add to Cart'}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.summary}>
            <Text style={styles.total}>Total: Rs {formatInr(total)}</Text>
            <Pressable
              style={[styles.checkoutBtn, (!(cart.items || []).length || checkingOut) && styles.checkoutDisabled]}
              onPress={checkout}
              disabled={!(cart.items || []).length || checkingOut}
            >
              <Text style={styles.checkoutText}>{checkingOut ? 'Processing...' : 'Confirm Payment'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  pageShell: { flex: 1, alignItems: 'center' },
  content: { flex: 1 },
  title: { fontSize: 30, fontWeight: '800', color: colors.charcoal, marginBottom: 12 },
  errorText: { color: '#A9352A', marginBottom: 8 },
  row: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0CFB2',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  itemMeta: { flex: 1 },
  name: { color: colors.charcoal, fontWeight: '700' },
  meta: { color: '#786D60', marginTop: 3 },
  price: { color: colors.teak, fontWeight: '800', marginTop: 5 },
  itemActions: { alignItems: 'flex-end', gap: 8 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8C5A8',
    backgroundColor: '#F9F1E5',
  },
  qtyBtnText: { color: '#5F5348', fontWeight: '800', fontSize: 15 },
  qtyText: { color: colors.charcoal, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  removeBtn: {
    borderWidth: 1,
    borderColor: '#D5B18A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFF8EE',
  },
  removeBtnText: { color: colors.clay, fontWeight: '700', fontSize: 12 },
  emptyWrap: { paddingVertical: 18 },
  emptyText: { color: '#73695D' },
  recoSection: {
    marginTop: 10,
    marginBottom: 6,
    gap: 8,
  },
  recoTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.charcoal,
  },
  recoRow: {
    backgroundColor: '#FFF9EE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2D0B4',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  recoActions: {
    alignItems: 'flex-end',
    gap: 7,
  },
  recoGhostBtn: {
    borderWidth: 1,
    borderColor: '#D7C2A2',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFDF8',
  },
  recoGhostText: {
    color: '#6B5A4A',
    fontWeight: '700',
    fontSize: 12,
  },
  recoAddBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.teak,
  },
  recoAddText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 12,
  },
  summary: {
    borderTopWidth: 1,
    borderTopColor: '#DDCCB0',
    paddingTop: 12,
    marginTop: 'auto',
    paddingBottom: 8,
  },
  total: { fontSize: 24, fontWeight: '800', color: colors.charcoal, marginBottom: 10 },
  checkoutBtn: {
    backgroundColor: colors.teak,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  checkoutDisabled: { opacity: 0.55 },
  checkoutText: { color: colors.white, fontWeight: '800' },
});
