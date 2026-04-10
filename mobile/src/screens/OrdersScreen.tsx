import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, endpoints, getApiErrorMessage } from '../services/api';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../theme/layout';

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

export function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const { contentWidth, pageHorizontalPadding } = useResponsiveLayout();

  const load = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const res = await api.get(endpoints.myOrders);
      setOrders(res.data || []);
    } catch (error) {
      setErrorText(getApiErrorMessage(error, 'Could not fetch your orders.'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.pageShell, { paddingHorizontal: pageHorizontalPadding }]}>
        <View style={[styles.content, { width: contentWidth }]}>
          <Text style={styles.title}>My Orders</Text>
          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <FlatList
            data={orders}
            keyExtractor={(item) => item._id}
            refreshing={loading}
            onRefresh={load}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.orderId}>{item._id}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{item.order_status}</Text>
                  </View>
                  <View style={styles.paymentBadge}>
                    <Text style={styles.paymentText}>{item.payment_status}</Text>
                  </View>
                </View>
                <Text style={styles.meta}>Items: {(item.items || []).length}</Text>
                <Text style={styles.meta}>Placed: {String(item.created_at || '-').slice(0, 10)}</Text>
                <Text style={styles.total}>Rs {formatInr(Number(item.total_inr || 0))}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No orders found yet.</Text>}
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
  title: { fontSize: 30, fontWeight: '800', color: colors.charcoal, marginBottom: 12 },
  errorText: { color: '#A9352A', marginBottom: 8 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E2D0B4',
    borderRadius: 14,
    padding: 12,
  },
  orderId: { color: colors.charcoal, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  statusBadge: {
    backgroundColor: '#E7F4E6',
    borderWidth: 1,
    borderColor: '#BFD8BC',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  paymentBadge: {
    backgroundColor: '#F1E8DA',
    borderWidth: 1,
    borderColor: '#DDC8AA',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { color: '#2F6E3D', fontWeight: '700', fontSize: 12 },
  paymentText: { color: '#6A5A4D', fontWeight: '700', fontSize: 12 },
  meta: { color: '#685C51', marginTop: 6 },
  total: { color: colors.teak, fontWeight: '800', marginTop: 8, fontSize: 16 },
  empty: { color: '#7A6E62' },
});
