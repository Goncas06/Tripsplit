import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Share, Alert, TextInput, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../store/storeTheme';
import { useAuthStore } from '../store/storeAuth';
import { useAmigosStore, separarLigacoes } from '../store/storeAmigos';
import Botao from '../components/ui/Botao';
import Cartao from '../components/ui/Cartao';
import { Avatar, TituloSecao, Separador, FolhaInferior } from '../components/ui';
import { eCodigoCurto } from '../utils/codigoViagem';

// Cor estável do avatar a partir do uid
const CORES = ['#F43F6B', '#10B3A3', '#A855F7', '#F59E0B', '#0EA5E9', '#FF6B3D', '#22C55E', '#EC4899'];
const corDe = (uid = '') => CORES[[...uid].reduce((s, ch) => s + ch.charCodeAt(0), 0) % CORES.length];

export default function AmigosScreen() {
  const c = useTheme();
  const s = useMemo(() => mk(c), [c]);
  const user = useAuthStore(st => st.user);
  const { meuCodigo, ligacoes, carregado, obterMeuCodigo, enviarPedido, aceitar, remover } = useAmigosStore();
  const { amigos, recebidos, enviados } = useMemo(() => separarLigacoes(ligacoes, user?.id), [ligacoes, user?.id]);

  const [erroCodigo, setErroCodigo] = useState(false);
  const [addVisivel, setAddVisivel] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [aEnviar, setAEnviar] = useState(false);

  useEffect(() => {
    obterMeuCodigo(user?.name).catch(() => setErroCodigo(true));
  }, []);

  const partilharCodigo = () => Share.share({
    message: `Adiciona-me como amigo no TripSplit! Abre Amigos → "Adicionar amigo" e escreve o código: ${meuCodigo}`,
  });

  const fecharAdd = () => { setAddVisivel(false); setCodigo(''); };

  const handleEnviar = async () => {
    if (!eCodigoCurto(codigo)) { Alert.alert('Código inválido', 'O código de amigo tem 6 caracteres.'); return; }
    setAEnviar(true);
    try {
      const r = await enviarPedido(codigo, user?.name);
      const msg = {
        enviado: ['Pedido enviado', 'Quando o teu amigo aceitar, aparece na tua lista.'],
        aceite: ['Agora são amigos!', 'Essa pessoa já te tinha enviado um pedido — foi aceite.'],
        'ja-amigos': ['Já são amigos'],
        'ja-enviado': ['Pedido já enviado', 'Estás à espera que essa pessoa aceite.'],
        proprio: ['Esse é o teu código', 'Pede o código ao teu amigo.'],
        invalido: ['Código não encontrado', 'Confirma que escreveste bem os 6 caracteres.'],
      }[r];
      if (r !== 'invalido' && r !== 'proprio') fecharAdd();
      Alert.alert(...msg);
    } catch (e) {
      Alert.alert('Não foi possível enviar', 'Verifica a ligação à internet e tenta de novo.');
    } finally {
      setAEnviar(false);
    }
  };

  const confirmarRemover = (a) => Alert.alert('Remover amigo', `Remover ${a.name} dos teus amigos? As viagens que já partilham continuam iguais.`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: () => remover(a.id).catch(() => {}) },
  ]);

  const Linha = ({ pessoa, children, ultima }) => (
    <>
      <View style={s.linha}>
        <Avatar nome={pessoa.name} cor={corDe(pessoa.uid)} tamanho={40} />
        <Text style={s.nome} numberOfLines={1}>{pessoa.name}</Text>
        {children}
      </View>
      {!ultima && <Separador inset={68} />}
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={s.content}>
        {/* O meu código */}
        <Cartao padded style={s.codigoCartao}>
          <Text style={s.codigoLabel}>O teu código de amigo</Text>
          {meuCodigo ? (
            <Text style={s.codigo} selectable accessibilityLabel={`O teu código: ${meuCodigo.split('').join(' ')}`}>{meuCodigo}</Text>
          ) : erroCodigo ? (
            <Text style={s.codigoErro}>Precisas de internet para criar o teu código.</Text>
          ) : (
            <ActivityIndicator color={c.accent} style={{ marginVertical: 14 }} />
          )}
          <View style={s.codigoBotoes}>
            <Botao title="Partilhar" icon="share-outline" height={48} style={{ flex: 1 }} disabled={!meuCodigo} onPress={partilharCodigo} />
            <Botao title="Adicionar amigo" icon="person-add-outline" variant="secondary" height={48} style={{ flex: 1.3 }}
              onPress={() => setAddVisivel(true)} />
          </View>
        </Cartao>

        {/* Pedidos recebidos */}
        {recebidos.length > 0 && (
          <View style={s.secao}>
            <TituloSecao>Pedidos recebidos</TituloSecao>
            <Cartao clip>
              {recebidos.map((p, i) => (
                <Linha key={p.id} pessoa={p} ultima={i === recebidos.length - 1}>
                  <Pressable onPress={() => remover(p.id).catch(() => {})} style={[s.acaoBtn, { backgroundColor: c.field }]}
                    accessibilityRole="button" accessibilityLabel={`Recusar pedido de ${p.name}`}>
                    <Ionicons name="close" size={20} color={c.text2} />
                  </Pressable>
                  <Pressable onPress={() => aceitar(p.id).catch(() => {})} style={[s.acaoBtn, { backgroundColor: c.accent }]}
                    accessibilityRole="button" accessibilityLabel={`Aceitar pedido de ${p.name}`}>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </Pressable>
                </Linha>
              ))}
            </Cartao>
          </View>
        )}

        {/* Amigos */}
        <View style={s.secao}>
          <TituloSecao>Amigos{amigos.length ? ` · ${amigos.length}` : ''}</TituloSecao>
          {!carregado ? (
            <ActivityIndicator color={c.accent} />
          ) : amigos.length === 0 ? (
            <Cartao padded style={s.vazio}>
              <Ionicons name="people-outline" size={28} color={c.text3} />
              <Text style={s.vazioTexto}>Ainda não tens amigos. Partilha o teu código ou adiciona o de alguém.</Text>
            </Cartao>
          ) : (
            <Cartao clip>
              {amigos.map((a, i) => (
                <Linha key={a.id} pessoa={a} ultima={i === amigos.length - 1}>
                  <Pressable onPress={() => confirmarRemover(a)} hitSlop={8} style={s.mais}
                    accessibilityRole="button" accessibilityLabel={`Remover ${a.name}`}>
                    <Ionicons name="person-remove-outline" size={20} color={c.text3} />
                  </Pressable>
                </Linha>
              ))}
            </Cartao>
          )}
        </View>

        {/* Pedidos enviados */}
        {enviados.length > 0 && (
          <View style={s.secao}>
            <TituloSecao>À espera de resposta</TituloSecao>
            <Cartao clip>
              {enviados.map((p, i) => (
                <Linha key={p.id} pessoa={p} ultima={i === enviados.length - 1}>
                  <Pressable onPress={() => remover(p.id).catch(() => {})} hitSlop={8}
                    accessibilityRole="button" accessibilityLabel={`Cancelar pedido a ${p.name}`}>
                    <Text style={s.cancelar}>Cancelar</Text>
                  </Pressable>
                </Linha>
              ))}
            </Cartao>
          </View>
        )}
      </ScrollView>

      <FolhaInferior visible={addVisivel} onClose={fecharAdd}>
        <View style={{ gap: 4 }}>
          <Text style={s.folhaTitulo}>Adicionar amigo</Text>
          <Text style={s.folhaTexto}>Escreve o código de amigo de 6 caracteres. A pessoa recebe um pedido para aceitar.</Text>
        </View>
        <TextInput
          style={s.input} placeholder="Ex: K7XB9Q" placeholderTextColor={c.text3}
          value={codigo} onChangeText={setCodigo} autoCapitalize="characters" autoCorrect={false}
          selectionColor={c.accent} returnKeyType="send" onSubmitEditing={handleEnviar}
          accessibilityLabel="Código de amigo" maxLength={10}
        />
        <View style={{ gap: 6 }}>
          <Botao title="Enviar pedido" icon="paper-plane-outline" onPress={handleEnviar} loading={aEnviar} disabled={!codigo.trim() || aEnviar} />
          <Botao title="Cancelar" variant="text" textColor={c.text2} onPress={fecharAdd} />
        </View>
      </FolhaInferior>
    </View>
  );
}

const mk = (c) => StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48, gap: 26 },
  codigoCartao: { alignItems: 'center', gap: 6 },
  codigoLabel: { fontSize: 13, fontWeight: '600', color: c.text2 },
  codigo: { fontSize: 36, fontWeight: '800', letterSpacing: 6, color: c.accentText,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
  codigoErro: { fontSize: 15, color: c.negText, marginVertical: 12, textAlign: 'center' },
  codigoBotoes: { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 8 },
  secao: { gap: 12 },
  linha: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  nome: { flex: 1, fontSize: 17, fontWeight: '600', color: c.text },
  acaoBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mais: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cancelar: { fontSize: 15, fontWeight: '600', color: c.text2 },
  vazio: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vazioTexto: { flex: 1, fontSize: 15, lineHeight: 21, color: c.text2 },
  folhaTitulo: { fontSize: 20, fontWeight: '700', color: c.text },
  folhaTexto: { fontSize: 15, color: c.text2 },
  input: { height: 64, borderRadius: 14, borderWidth: 1, borderColor: c.fieldBorder, backgroundColor: c.field,
    paddingHorizontal: 16, fontSize: 26, fontWeight: '700', letterSpacing: 6, textAlign: 'center', color: c.text,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) },
});
