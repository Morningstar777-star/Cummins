import { NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, LogBox, View } from 'react-native';

import { RootStackParamList } from './navigation/types';
import { colors } from './theme/colors';
import { AuthScreen } from './screens/AuthScreen';
import { AdminScreen } from './screens/AdminScreen';
import { AdminProductsScreen } from './screens/AdminProductsScreen';
import { AllProductsScreen } from './screens/AllProductsScreen';
import { ArModelsScreen } from './screens/ArModelsScreen';
import { CartScreen } from './screens/CartScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { HomeScreen } from './screens/HomeScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { PaymentSuccessScreen } from './screens/PaymentSuccessScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { LandingScreen } from './screens/LandingScreen';
import { QuizAestheticScreen } from './screens/QuizAestheticScreen';
import { QuizBudgetScreen } from './screens/QuizBudgetScreen';
import { QuizMoodScreen } from './screens/QuizMoodScreen';
import { useAuthStore } from './store/authStore';

const EXGL_PIXEL_STORE_LOG = "EXGL: gl.pixelStorei() doesn't support this parameter yet!";
const THREE_CLOCK_WARNING = 'THREE.THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.';
const THREE_MULTI_INSTANCE_WARNING = 'THREE.WARNING: Multiple instances of Three.js being imported.';

LogBox.ignoreLogs([EXGL_PIXEL_STORE_LOG, THREE_CLOCK_WARNING, THREE_MULTI_INSTANCE_WARNING]);


const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ivory }}>
        <ActivityIndicator color={colors.teak} />
      </View>
    );
  }

  const initialRouteName: keyof RootStackParamList = token ? (role === 'admin' ? 'Admin' : 'Home') : 'Landing';

  return (
    <NavigationIndependentTree>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: '#F7F1E8' },
            headerTintColor: '#2F2A27',
          }}
        >
          <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminProducts" component={AdminProductsScreen} options={{ title: 'Admin Products' }} />
          <Stack.Screen name="QuizAesthetic" component={QuizAestheticScreen} options={{ headerShown: false }} />
          <Stack.Screen name="QuizMood" component={QuizMoodScreen} options={{ headerShown: false }} />
          <Stack.Screen name="QuizBudget" component={QuizBudgetScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ArModels" component={ArModelsScreen} options={{ title: 'All AR Models' }} />
          <Stack.Screen name="AllProducts" component={AllProductsScreen} options={{ title: 'All Products' }} />
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="Catalog" component={CatalogScreen} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Orders" component={OrdersScreen} options={{ title: 'My Orders' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
