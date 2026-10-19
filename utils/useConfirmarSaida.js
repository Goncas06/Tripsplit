import { useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation, usePreventRemove } from '@react-navigation/native';

// Pergunta antes de sair de um formulário com alterações por guardar
// (botão voltar, gesto de deslizar no iOS e botão "Cancelar").
// Devolve `permitirSaida()`, para chamar antes de sair de propósito (ex.: depois de guardar).
export function useConfirmarSaida(alterado) {
  const navigation = useNavigation();
  const permitido = useRef(false);

  usePreventRemove(alterado, ({ data }) => {
    if (permitido.current) { navigation.dispatch(data.action); return; }
    Alert.alert('Descartar alterações?', 'Se saíres agora, perdes o que preencheste.', [
      { text: 'Continuar a editar', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  return () => { permitido.current = true; };
}
