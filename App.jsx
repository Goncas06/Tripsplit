import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NetInfo from '@react-native-community/netinfo';

import { useAuthStore } from './store/storeAuth';

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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  if (isConnected) return null;

  return (
    <View style={bannerStyles.banner}>
      <Text style={bannerStyles.text}>⚠️  Sem ligação à internet — algumas funções podem não estar disponíveis</Text>
    </View>
  );
}

function AuthNavigator() {
  const [showSignUp, setShowSignUp] = useState(false);
  if (showSignUp) {
    return <SignUpScreen onGoLogin={() => setShowSignUp(false)} />;
  }
  return <LoginScreen onGoSignUp={() => setShowSignUp(true)} />;
}

function LogoutButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel="Sair da conta">
      <Text style={{ color: '#FF3B30', fontWeight: '600', fontSize: 15, marginRight: 4 }}>Sair</Text>
    </TouchableOpacity>
  );
}

function AppNavigator() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'TripSplit',
          headerRight: () => (
            <View>
              <LogoutButton onPress={logout} />
            </View>
          ),
        }}
      />
      <Stack.Screen name="CriarViagem" component={CriarViagemScreen} options={{ title: 'Nova Viagem' }} />
      <Stack.Screen name="DetalhesViagem" component={DetalhesViagemScreen} options={{ title: 'Viagem' }} />
      <Stack.Screen name="AdicionarParticipante" component={AdicionarParticipanteScreen} options={{ title: 'Adicionar Participante' }} />
      <Stack.Screen name="AdicionarDespesa" component={AdicionarDespesaScreen}
        options={({ route }) => ({ title: route.params?.expenseId ? 'Editar Despesa' : 'Adicionar Despesa' })} />
      <Stack.Screen name="Saldos" component={SaldosScreen} options={{ title: 'Saldos' }} />
      <Stack.Screen name="Resumo" component={ResumoScreen} options={{ title: 'Resumo Final' }} />
      <Stack.Screen name="Relatorio" component={RelatorioScreen}
        options={({ route }) => ({ title: `Relatório de ${route.params?.personName ?? ''}` })} />
    </Stack.Navigator>
  );
}

export default function App() {
  const { user, loading, initAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <NetworkBanner />
        {user ? (
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        ) : (
          <AuthNavigator />
        )}
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const bannerStyles = StyleSheet.create({
  banner: {
    backgroundColor: '#cc3300',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
