import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetInfo from '@react-native-community/netinfo';
import { StatusBar } from 'expo-status-bar';

import { useAuthStore } from './store/storeAuth';
import { useThemeStore, useTheme } from './store/storeTheme';

import SplashScreen from './screens/SplashScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import CriarViagemScreen from './screens/CriarViagemScreen';
import DetalhesViagemScreen from './screens/DetalhesViagemScreen';
import AdicionarParticipanteScreen from './screens/AdicionarParticipanteScreen';
import AdicionarDespesaScreen from './screens/AdicionarDespesaScreen';
import SaldosScreen from './screens/SaldosScreen';
import ResumoScreen from './screens/ResumoScreen';
import RelatorioScreen from './screens/RelatorioScreen';

const Stack = createNativeStackNavigator();

function NetworkBanner() {
  const [isConnected, setIsConnected] = useState(true);
  const c = useTheme();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const unsub = NetInfo.addEventListener(s => setIsConnected(s.isConnected ?? true));
    return unsub;
  }, []);
  if (isConnected) return null;
  return (
    <View style={{ backgroundColor: c.danger, paddingTop: 8, paddingBottom: 8 + insets.bottom, paddingHorizontal: 16, alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
        ⚠️  Sem ligação à internet — algumas funções podem não estar disponíveis
      </Text>
    </View>
  );
}


function AuthNavigator() {
  const [showSignUp, setShowSignUp] = useState(false);
  if (showSignUp) return <SignUpScreen onGoLogin={() => setShowSignUp(false)} />;
  return <LoginScreen onGoSignUp={() => setShowSignUp(true)} />;
}

function AppNavigator() {
  const c = useTheme();
  const screenOptions = {
    animationDuration: 220,
    animation: 'slide_from_right',
    headerStyle: { backgroundColor: c.bg },
    headerTintColor: c.accent,
    headerShadowVisible: false,
    headerTitleStyle: { fontWeight: '600', fontSize: 17, color: c.text },
    contentStyle: { backgroundColor: c.bg },
  };
  // Ecrãs com título grande no conteúdo: o "title" serve só de texto do botão voltar (iOS)
  const semTitulo = { headerTitle: () => null };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Viagens', ...semTitulo }} />
      <Stack.Screen name="CriarViagem" component={CriarViagemScreen} options={{ title: 'Nova viagem' }} />
      <Stack.Screen name="DetalhesViagem" component={DetalhesViagemScreen} options={{ title: 'Viagem', ...semTitulo }} />
      <Stack.Screen name="AdicionarParticipante" component={AdicionarParticipanteScreen} options={{ title: 'Participante' }} />
      <Stack.Screen name="AdicionarDespesa" component={AdicionarDespesaScreen}
        options={({ route }) => ({ title: route.params?.expenseId ? 'Editar despesa' : 'Nova despesa' })} />
      <Stack.Screen name="Saldos" component={SaldosScreen} options={{ title: 'Acertos' }} />
      <Stack.Screen name="Resumo" component={ResumoScreen} options={{ title: 'Resumo final' }} />
      <Stack.Screen name="Relatorio" component={RelatorioScreen} options={{ title: 'Relatório' }} />
    </Stack.Navigator>
  );
}

export default function App() {
  const { user, loading, initAuth } = useAuthStore();
  const loadTheme = useThemeStore(s => s.loadTheme);
  const themeLoaded = useThemeStore(s => s.themeLoaded);
  const isDark = useThemeStore(s => s.isDark);
  const c = useTheme();

  useEffect(() => {
    loadTheme();
    const unsubscribe = initAuth();
    return unsubscribe;
  }, []);

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, primary: c.accent, background: c.bg, card: c.bg, text: c.text, border: c.sep } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: c.accent, background: c.bg, card: c.bg, text: c.text, border: c.sep } };

  // Aguarda tanto o auth como o tema antes de mostrar a app
  if (loading || !themeLoaded) return <SplashScreen />;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.background }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {user ? (
          <NavigationContainer theme={navTheme}>
            <AppNavigator />
          </NavigationContainer>
        ) : (
          <AuthNavigator />
        )}
        {/* Em baixo, para não ficar escondido atrás do notch/Dynamic Island */}
        <NetworkBanner />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

