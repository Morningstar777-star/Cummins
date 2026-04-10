import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, endpoints, getApiErrorMessage } from '../services/api';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'Admin'>;

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

export function AdminScreen({ navigation }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [snapshot, setSnapshot] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorText, setErrorText] = useState('');
  const logout = useAuthStore((s) => s.logout);
  const { contentWidth, pageHorizontalPadding } = useResponsiveLayout();

  const load = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const [ordersRes, snapshotRes] = await Promise.all([
        api.get(endpoints.adminOrders),
        api.get(endpoints.adminDbSnapshot),
      ]);
      setOrders(ordersRes.data || []);
      setSnapshot(snapshotRes.data || null);
    } catch (error) {
      setErrorText(getApiErrorMessage(error, 'Could not load admin dashboard.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onLogout = async () => {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    try {
      await logout();
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.pageShell, { paddingHorizontal: pageHorizontalPadding }]}>
        <View style={[styles.content, { width: contentWidth }]}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Live orders, product and database monitoring.</Text>
          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <View style={styles.actionsRow}>
            <Pressable style={styles.actionBtn} onPress={() => navigation.navigate('AdminProducts')}>
              <Text style={styles.actionText}>Manage Products</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={load}>
              <Text style={[styles.actionText, styles.actionTextSecondary]}>{loading ? 'Refreshing...' : 'Refresh'}</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.actionBtnDanger]} onPress={onLogout}>
              <Text style={styles.actionText}>{loggingOut ? 'Logging out...' : 'Logout'}</Text>
            </Pressable>
          </View>

          {snapshot && (
            <View style={styles.statsCard}>
              <Text style={styles.statsTitle}>Database Snapshot</Text>
              <Text style={styles.statsText}>Users: {snapshot.users?.length || 0}</Text>
              <Text style={styles.statsText}>Preferences: {snapshot.user_preferences?.length || 0}</Text>
              <Text style={styles.statsText}>Categories: {snapshot.categories?.length || 0}</Text>
              <Text style={styles.statsText}>Products: {snapshot.products?.length || 0}</Text>
              <Text style={styles.statsText}>Carts: {snapshot.carts?.length || 0}</Text>
              <Text style={styles.statsText}>Orders: {snapshot.orders?.length || 0}</Text>
              <Text style={styles.statsText}>Payments: {snapshot.payments?.length || 0}</Text>
            </View>
          )}

          <FlatList
            data={orders}
            keyExtractor={(item) => item._id}
            refreshing={loading}
            onRefresh={load}
            contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.orderId}>{item._id}</Text>
                <Text style={styles.meta}>User: {item.user_id}</Text>
                <Text style={styles.meta}>Status: {item.order_status}</Text>
                <Text style={styles.amount}>Rs {formatInr(Number(item.total_inr || 0))}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No orders yet.</Text>}
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
  title: { fontSize: 30, fontWeight: '800', color: colors.charcoal },
  subtitle: { color: '#6D6257', marginTop: 4, marginBottom: 12 },
  errorText: { color: '#A9352A', marginBottom: 8 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  actionBtn: {
    backgroundColor: colors.teak,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionBtnSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D7C1A0',
  },
  actionBtnDanger: {
    backgroundColor: colors.clay,
  },
  actionText: { color: colors.white, fontWeight: '700' },
  actionTextSecondary: { color: colors.teak },
  statsCard: {
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#E3D3BA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  statsTitle: { color: colors.charcoal, fontWeight: '800', marginBottom: 6 },
  statsText: { color: '#675B50', marginTop: 2 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E1CEAF',
    borderRadius: 14,
    padding: 12,
  },
  orderId: { fontWeight: '700', color: colors.charcoal },
  meta: { color: '#665A4F', marginTop: 3 },
  amount: { color: colors.teak, fontWeight: '800', marginTop: 6 },
  empty: { color: '#7D7063' },
});
