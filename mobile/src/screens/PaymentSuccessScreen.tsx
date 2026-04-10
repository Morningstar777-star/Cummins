import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../theme/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentSuccess'>;

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

export function PaymentSuccessScreen({ route, navigation }: Props) {
  const order = route.params.order;
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { contentWidth, pageHorizontalPadding } = useResponsiveLayout();

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.pageShell, { paddingHorizontal: pageHorizontalPadding }]}>
        <Animated.View style={[styles.container, { width: contentWidth, opacity, transform: [{ scale }] }]}>
          <Text style={styles.icon}>SUCCESS</Text>
          <Text style={styles.title}>Payment Successful</Text>
          <Text style={styles.subtitle}>Your order has been confirmed.</Text>

          <View style={styles.card}>
            <Text style={styles.row}>Order ID: {order?._id || '-'}</Text>
            <Text style={styles.row}>Status: {order?.order_status || '-'}</Text>
            <Text style={styles.row}>Total: Rs {formatInr(Number(order?.total_inr || 0))}</Text>
          </View>

          <Pressable style={styles.button} onPress={() => navigation.replace('Orders')}>
            <Text style={styles.buttonText}>View My Orders</Text>
          </Pressable>

          <Pressable style={[styles.button, styles.secondary]} onPress={() => navigation.replace('Home')}>
            <Text style={[styles.buttonText, styles.secondaryText]}>Continue Shopping</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ivory },
  pageShell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    backgroundColor: colors.ivory,
    maxWidth: 560,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 28,
    color: '#2E8B57',
    fontWeight: '900',
    letterSpacing: 1.4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 22,
    backgroundColor: '#E5F4E8',
    borderWidth: 1,
    borderColor: '#BBD9C0',
  },
  title: { fontSize: 30, color: colors.charcoal, fontWeight: '800', marginTop: 12 },
  subtitle: { color: '#6E6258', marginTop: 6, marginBottom: 14 },
  card: {
    width: '100%',
    backgroundColor: '#FFF9EE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5D3B7',
    padding: 12,
    marginBottom: 14,
  },
  row: { color: '#5D5147', marginTop: 4 },
  button: {
    width: '100%',
    backgroundColor: colors.teak,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.white, fontWeight: '700' },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: '#D9C7AA' },
  secondaryText: { color: colors.teak },
});
