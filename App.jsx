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
import { useTripStore } from './store/storeViagens';
import { useAmigosStore } from './store/storeAmigos';

import * as SplashScreen from 'expo-splash-screen';
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
import AmigosScreen from './screens/AmigosScreen';

const Stack = createNativeStackNavigator();

// Mantém o ecrã de arranque nativo até a app estar pronta; ao sair, fade de 250 ms
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 250, fade: true });

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
  // (um componente vazio, e não null: no iOS 26 o null faz o cabeçalho mostrar o título na mesma)
  const semTitulo = { headerTitle: () => <View /> };

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Viagens', ...semTitulo }} />
      <Stack.Screen name="CriarViagem" component={CriarViagemScreen}
        options={({ route }) => ({ title: route.params?.viagemId ? 'Editar viagem' : 'Nova viagem' })} />
      <Stack.Screen name="DetalhesViagem" component={DetalhesViagemScreen} options={{ title: 'Viagem', ...semTitulo }} />
      <Stack.Screen name="AdicionarParticipante" component={AdicionarParticipanteScreen} options={{ title: 'Participante' }} />
      <Stack.Screen name="AdicionarDespesa" component={AdicionarDespesaScreen}
        options={({ route }) => ({ title: route.params?.expenseId ? 'Editar despesa' : 'Nova despesa' })} />
      <Stack.Screen name="Saldos" component={SaldosScreen} options={{ title: 'Acertos' }} />
      <Stack.Screen name="Resumo" component={ResumoScreen} options={{ title: 'Resumo final' }} />
      <Stack.Screen name="Relatorio" component={RelatorioScreen} options={{ title: 'Relatório' }} />
      <Stack.Screen name="Amigos" component={AmigosScreen} options={{ title: 'Amigos' }} />
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

  // O ecrã de arranque nativo fica visível até a sessão e o tema estarem prontos,
  // e sai com um fade curto — sem ecrãs intermédios nem "flash" de cores
  const pronto = !loading && themeLoaded;

  // Viagens em tempo real enquanto houver sessão (pára ao sair ou mudar de conta)
  const subscreverViagens = useTripStore(s => s.subscreverViagens);
  const subscreverAmigos = useAmigosStore(s => s.subscrever);
  useEffect(() => {
    if (!user?.id) return;
    const pararViagens = subscreverViagens();
    const pararAmigos = subscreverAmigos();
    return () => { pararViagens(); pararAmigos(); };
  }, [user?.id]);
  useEffect(() => {
    if (pronto) SplashScreen.hideAsync().catch(() => {});
  }, [pronto]);

  const navTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, primary: c.accent, background: c.bg, card: c.bg, text: c.text, border: c.sep } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: c.accent, background: c.bg, card: c.bg, text: c.text, border: c.sep } };

  // Enquanto não está pronto, o ecrã de arranque nativo continua por cima
  if (!pronto) return null;

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

