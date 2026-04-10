import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { api, endpoints, getApiErrorMessage } from '../services/api';
import { colors } from '../theme/colors';
import { useResponsiveLayout } from '../theme/layout';

function formatInr(value: number) {
  return new Intl.NumberFormat('en-IN').format(value || 0);
}

export function AdminProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('living-room');
  const [imageUrl, setImageUrl] = useState('https://placehold.co/600x400?text=Product');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const { contentWidth, pageHorizontalPadding } = useResponsiveLayout();

  const load = async () => {
    setLoading(true);
    try {
      const [productsRes, metricsRes] = await Promise.all([
        api.get(endpoints.adminProducts),
        api.get(endpoints.adminProductsMetrics),
      ]);

      setProducts(productsRes.data || []);
      const map: Record<string, any> = {};
      for (const item of metricsRes.data || []) {
        map[item.sku] = item;
      }
      setMetrics(map);
    } catch (error) {
      Alert.alert('Admin', getApiErrorMessage(error, 'Could not load admin products.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addProduct = async () => {
    if (saving) {
      return;
    }

    setSaving(true);
    try {
      await api.post(endpoints.adminProducts, {
        sku,
        name,
        description,
        category_id: category,
        price_inr: Number(price || 0),
        stock: Number(stock || 0),
        is_active: true,
        media: { image_url: imageUrl, glb_url: '' },
        attributes: {
          aesthetic_style: 'Modern',
          mood_feel: 'Serene & Calm',
          price_tier: Number(price || 0) > 8000 ? 'luxury' : 'premium',
          dominant_colors: [],
          materials: [],
        },
      });

      setSku('');
      setName('');
      setPrice('');
      setStock('');
      setDescription('');
      Alert.alert('Success', 'Product created.');
      await load();
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to create product.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item: any) => {
    try {
      await api.patch(endpoints.adminProductStatus(item.sku), { is_active: !item.is_active });
      await load();
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Could not update product status.'));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.pageShell, { paddingHorizontal: pageHorizontalPadding }]}>
        <View style={[styles.content, { width: contentWidth }]}>
          <Text style={styles.title}>Product Control</Text>

          <View style={styles.form}>
            <Text style={styles.formTitle}>Add Product</Text>
            <TextInput style={styles.input} placeholder="SKU" value={sku} onChangeText={setSku} />
            <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} />
            <TextInput
              style={styles.input}
              placeholder="Category (living-room/bedroom/kitchen/decor/classroom)"
              value={category}
              onChangeText={setCategory}
            />
            <TextInput style={styles.input} placeholder="Price" keyboardType="numeric" value={price} onChangeText={setPrice} />
            <TextInput style={styles.input} placeholder="Stock" keyboardType="numeric" value={stock} onChangeText={setStock} />
            <TextInput style={styles.input} placeholder="Image URL" value={imageUrl} onChangeText={setImageUrl} />
            <TextInput
              style={[styles.input, { height: 72 }]}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Pressable style={[styles.addBtn, saving && { opacity: 0.65 }]} onPress={addProduct} disabled={saving}>
              <Text style={styles.addBtnText}>{saving ? 'Saving...' : 'Create Product'}</Text>
            </Pressable>
          </View>

          <FlatList
            data={products}
            keyExtractor={(item) => item.sku}
            refreshing={loading}
            onRefresh={load}
            contentContainerStyle={{ gap: 10, paddingBottom: 20 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>SKU: {item.sku}</Text>
                <Text style={styles.meta}>Stock: {item.stock}</Text>
                <Text style={styles.meta}>Status: {item.is_active ? 'active' : 'inactive'}</Text>
                <Text style={styles.meta}>Sold: {metrics[item.sku]?.sold_units || 0}</Text>
                <Text style={styles.meta}>Revenue: Rs {formatInr(Number(metrics[item.sku]?.revenue_inr || 0))}</Text>

                <Pressable style={styles.toggleBtn} onPress={() => toggleStatus(item)}>
                  <Text style={styles.toggleBtnText}>{item.is_active ? 'Disable Product' : 'Enable Product'}</Text>
                </Pressable>
              </View>
            )}
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
  title: { fontSize: 28, fontWeight: '800', color: colors.charcoal, marginBottom: 8 },
  form: {
    backgroundColor: '#FFF8EC',
    borderWidth: 1,
    borderColor: '#E4D1B6',
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
  },
  formTitle: { fontWeight: '800', color: colors.charcoal, marginBottom: 8 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#DBC8AB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 7,
  },
  addBtn: { backgroundColor: colors.teak, borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  addBtnText: { color: colors.white, fontWeight: '700' },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#E0CEB2',
    borderRadius: 12,
    padding: 10,
  },
  name: { color: colors.charcoal, fontWeight: '800' },
  meta: { color: '#655A4F', marginTop: 3 },
  toggleBtn: {
    marginTop: 8,
    backgroundColor: colors.moss,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleBtnText: { color: colors.white, fontWeight: '700' },
});
