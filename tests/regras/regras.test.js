// Testes das regras do Firestore da TripSplit (corre dentro de `firebase emulators:exec`)
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs,
  arrayUnion, arrayRemove, Timestamp, writeBatch,
} = require('firebase/firestore');

// Lê as regras do projeto (../../firestore.rules)
const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
let ok = 0, falhas = 0;
async function t(nome, fn) {
  try { await fn(); ok++; console.log('  ✓', nome); }
  catch (e) { falhas++; console.log('  ✗', nome, '\n     ', e.message.split('\n')[0]); }
}

(async () => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-tripsplit',
    firestore: { rules, host: '127.0.0.1', port: 8080 },
  });
  const A = env.authenticatedContext('ana').firestore();
  const B = env.authenticatedContext('bruno').firestore();
  const C = env.authenticatedContext('carla').firestore();
  const anon = env.unauthenticatedContext().firestore();
  const futuro = Timestamp.fromMillis(Date.now() + 29 * 864e5);
  const passado = Timestamp.fromMillis(Date.now() - 1000);
  const viagem = { name: 'Algarve', participants: [], expenses: [], ownerId: 'ana', members: ['ana'], createdAt: 1 };
  const despesa = { id: 'e1', value: 10, category: 'outros', paidBy: 'p1', sharedWith: [] };

  console.log('Viagens');
  await t('dono cria a viagem', () => assertSucceeds(setDoc(doc(A, 'trips/t1'), viagem)));
  await t('não cria com outros membros', () => assertFails(setDoc(doc(A, 'trips/t2'), { ...viagem, members: ['ana', 'bruno'] })));
  await t('não cria em nome de outro', () => assertFails(setDoc(doc(B, 'trips/t3'), viagem)));
  await t('sem sessão não lê', () => assertFails(getDoc(doc(anon, 'trips/t1'))));
  await t('membro lê', () => assertSucceeds(getDoc(doc(A, 'trips/t1'))));
  await t('não-membro não lê', () => assertFails(getDoc(doc(B, 'trips/t1'))));
  await t('lista filtrada pelos membros funciona', () => assertSucceeds(getDocs(query(collection(B, 'trips'), where('members', 'array-contains', 'bruno')))));
  await t('lista sem filtro é recusada', () => assertFails(getDocs(collection(B, 'trips'))));

  console.log('Partilha por código');
  await t('membro define o código na viagem', () => assertSucceeds(updateDoc(doc(A, 'trips/t1'), { shareCode: 'ABCD23', shareExpiresAt: futuro })));
  await t('membro cria o código', () => assertSucceeds(setDoc(doc(A, 'sharedTrips/ABCD23'), { tripId: 't1', ownerId: 'ana', expiresAt: futuro, updatedAt: 1 })));
  await t('código com formato inválido é recusado', () => assertFails(setDoc(doc(A, 'sharedTrips/AAL0O1'), { tripId: 't1', ownerId: 'ana', expiresAt: futuro, updatedAt: 1 })));
  await t('não-membro não cria código para a viagem', () => assertFails(setDoc(doc(C, 'sharedTrips/BBBB22'), { tripId: 't1', ownerId: 'carla', expiresAt: futuro, updatedAt: 1 })));
  await t('validade acima de 31 dias é recusada', () => assertFails(setDoc(doc(A, 'sharedTrips/CCCC33'), { tripId: 't1', ownerId: 'ana', expiresAt: Timestamp.fromMillis(Date.now() + 60 * 864e5), updatedAt: 1 })));
  await t('qualquer utilizador abre um código', () => assertSucceeds(getDoc(doc(B, 'sharedTrips/ABCD23'))));
  await t('código inexistente responde "não existe"', () => assertSucceeds(getDoc(doc(B, 'sharedTrips/ZZZZ99'))));
  await t('ninguém lista os códigos', () => assertFails(getDocs(collection(B, 'sharedTrips'))));

  console.log('Juntar-se');
  await t('código errado não deixa entrar', () => assertFails(updateDoc(doc(B, 'trips/t1'), { members: arrayUnion('bruno'), joinCode: 'XXXX22' })));
  await t('não pode acrescentar outra pessoa', () => assertFails(updateDoc(doc(C, 'trips/t1'), { members: arrayUnion('zeca'), joinCode: 'ABCD23' })));
  await t('não pode mexer noutros campos ao entrar', () => assertFails(updateDoc(doc(B, 'trips/t1'), { members: arrayUnion('bruno'), joinCode: 'ABCD23', name: 'X' })));
  await t('com o código certo entra', () => assertSucceeds(updateDoc(doc(B, 'trips/t1'), { members: arrayUnion('bruno'), joinCode: 'ABCD23' })));
  await t('depois de entrar já lê a viagem', () => assertSucceeds(getDoc(doc(B, 'trips/t1'))));

  console.log('Edição por membros');
  await t('membro acrescenta despesa', () => assertSucceeds(updateDoc(doc(B, 'trips/t1'), { expenses: arrayUnion(despesa), updatedAt: 2 })));
  await t('membro edita despesa (remove + acrescenta em lote)', async () => {
    const b = writeBatch(B);
    b.update(doc(B, 'trips/t1'), { expenses: arrayRemove(despesa) });
    b.update(doc(B, 'trips/t1'), { expenses: arrayUnion({ ...despesa, value: 20 }), updatedAt: 3 });
    await assertSucceeds(b.commit());
  });
  await t('membro não muda o dono', () => assertFails(updateDoc(doc(B, 'trips/t1'), { ownerId: 'bruno' })));
  await t('membro não remove outros membros', () => assertFails(updateDoc(doc(B, 'trips/t1'), { members: arrayRemove('ana') })));
  await t('membro não apaga a viagem', () => assertFails(deleteDoc(doc(B, 'trips/t1'))));
  await t('membro renova o código', () => assertSucceeds(setDoc(doc(B, 'sharedTrips/ABCD23'), { tripId: 't1', ownerId: 'bruno', expiresAt: futuro, updatedAt: 4 })));
  await t('membro não aponta o código para outra viagem', () => assertFails(setDoc(doc(B, 'sharedTrips/ABCD23'), { tripId: 'outra', ownerId: 'bruno', expiresAt: futuro, updatedAt: 5 })));

  console.log('Expiração');
  await t('código expira na viagem', () => assertSucceeds(updateDoc(doc(A, 'trips/t1'), { shareExpiresAt: passado })));
  await t('código expirado não deixa entrar', () => assertFails(updateDoc(doc(C, 'trips/t1'), { members: arrayUnion('carla'), joinCode: 'ABCD23' })));
  await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'sharedTrips/EXPD22'), { tripId: 't1', ownerId: 'ana', expiresAt: passado, updatedAt: 1 }));
  await t('código expirado não se abre', () => assertFails(getDoc(doc(C, 'sharedTrips/EXPD22'))));

  console.log('Sair e apagar');
  await t('membro sai da viagem', () => assertSucceeds(updateDoc(doc(B, 'trips/t1'), { members: arrayRemove('bruno') })));
  await t('depois de sair já não lê', () => assertFails(getDoc(doc(B, 'trips/t1'))));
  await t('membro apaga o código', () => assertSucceeds(deleteDoc(doc(A, 'sharedTrips/ABCD23'))));
  await t('dono apaga a viagem', () => assertSucceeds(deleteDoc(doc(A, 'trips/t1'))));

  console.log('Dados pessoais (users)');
  await t('cada um lê o seu perfil', () => assertSucceeds(getDoc(doc(A, 'users/ana'))));
  await t('não lê o perfil de outro', () => assertFails(getDoc(doc(B, 'users/ana'))));

  console.log('Códigos de amigo');
  await t('cria o próprio código', () => assertSucceeds(setDoc(doc(A, 'friendCodes/ANAA22'), { uid: 'ana', name: 'Ana' })));
  await t('não cria código em nome de outro', () => assertFails(setDoc(doc(B, 'friendCodes/BRUN22'), { uid: 'ana', name: 'Ana' })));
  await t('não ocupa o código de outra pessoa', () => assertFails(setDoc(doc(B, 'friendCodes/ANAA22'), { uid: 'bruno', name: 'Bruno' })));
  await t('qualquer utilizador abre um código de amigo', () => assertSucceeds(getDoc(doc(B, 'friendCodes/ANAA22'))));
  await t('ninguém lista os códigos de amigo', () => assertFails(getDocs(collection(B, 'friendCodes'))));

  console.log('Pedidos de amizade');
  const pedido = (from, to) => ({ users: [from, to], from, to, names: { [from]: from, [to]: to }, status: 'pending', createdAt: 1 });
  await t('envia pedido', () => assertSucceeds(setDoc(doc(B, 'friendships/ana_bruno'), pedido('bruno', 'ana'))));
  await t('não envia pedido já aceite', () => assertFails(setDoc(doc(C, 'friendships/ana_carla'), { ...pedido('carla', 'ana'), status: 'accepted' })));
  await t('não envia pedido em nome de outro', () => assertFails(setDoc(doc(C, 'friendships/ana_bruno'), pedido('bruno', 'ana'))));
  await t('id tem de corresponder ao par', () => assertFails(setDoc(doc(C, 'friendships/x_y'), pedido('carla', 'ana'))));
  await t('quem envia não pode aceitar', () => assertFails(updateDoc(doc(B, 'friendships/ana_bruno'), { status: 'accepted' })));
  await t('terceiros não veem o pedido', () => assertFails(getDoc(doc(C, 'friendships/ana_bruno'))));
  await t('a lista dos meus pedidos funciona', () => assertSucceeds(getDocs(query(collection(A, 'friendships'), where('users', 'array-contains', 'ana')))));

  console.log('Convidar amigos para viagens');
  await t('cria nova viagem', () => assertSucceeds(setDoc(doc(A, 'trips/t9'), { ...viagem })));
  await t('não convida quem ainda não aceitou', () => assertFails(updateDoc(doc(A, 'trips/t9'), { members: arrayUnion('bruno') })));
  await t('quem recebe aceita o pedido', () => assertSucceeds(updateDoc(doc(A, 'friendships/ana_bruno'), { status: 'accepted' })));
  await t('convida um amigo (membro + participante)', () => assertSucceeds(updateDoc(doc(A, 'trips/t9'), {
    members: arrayUnion('bruno'), participants: arrayUnion({ id: 'p9', name: 'Bruno', userId: 'bruno' }), updatedAt: 9,
  })));
  await t('o amigo convidado já lê a viagem', () => assertSucceeds(getDoc(doc(B, 'trips/t9'))));
  await t('não convida quem não é amigo', () => assertFails(updateDoc(doc(A, 'trips/t9'), { members: arrayUnion('carla') })));
  await t('não convida duas pessoas de uma vez', async () => {
    await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'friendships/ana_carla'), { ...pedido('carla', 'ana'), status: 'accepted' }));
    await assertFails(updateDoc(doc(A, 'trips/t9'), { members: arrayUnion('carla', 'zeca') }));
  });
  await t('não-membro não convida', () => assertFails(updateDoc(doc(C, 'trips/t9'), { members: arrayUnion('carla') })));
  await t('remove o amigo', () => assertSucceeds(deleteDoc(doc(B, 'friendships/ana_bruno'))));

  await env.cleanup();
  console.log(`\n${ok} passaram, ${falhas} falharam`);
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
