import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let db = null;

const getDB = async () => {
  if (db) return db;
  db = await SQLite.openDatabase({ name: 'tripsplit.db', location: 'default' });
  await createTables(db);
  return db;
};

const createTables = async (database) => {
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `);
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS sessions (
      key TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      user_email TEXT
    )
  `);
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      destination TEXT NOT NULL,
      dates TEXT
    )
  `);
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      name TEXT NOT NULL
    )
  `);
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      value REAL NOT NULL,
      category TEXT NOT NULL,
      paid_by TEXT NOT NULL,
      note TEXT
    )
  `);
  await database.executeSql(`
    CREATE TABLE IF NOT EXISTS expense_shared_with (
      expense_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      PRIMARY KEY (expense_id, participant_id)
    )
  `);
};

const rowsToArray = (rows) => {
  const result = [];
  for (let i = 0; i < rows.length; i++) result.push(rows.item(i));
  return result;
};

// ── Users ────────────────────────────────────────────────────────────────────

export const getUsers = async () => {
  const database = await getDB();
  const [res] = await database.executeSql('SELECT * FROM users');
  return rowsToArray(res.rows);
};

export const saveUsers = async (users) => {
  const database = await getDB();
  await database.executeSql('DELETE FROM users');
  for (const u of users) {
    await database.executeSql(
      'INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [u.id, u.name, u.email, u.password]
    );
  }
};

// ── Session ──────────────────────────────────────────────────────────────────

export const saveSession = async (user) => {
  const database = await getDB();
  await database.executeSql(
    'INSERT OR REPLACE INTO sessions (key, user_id, user_name, user_email) VALUES (?, ?, ?, ?)',
    ['current', user.id, user.name, user.email]
  );
};

export const loadSession = async () => {
  const database = await getDB();
  const [res] = await database.executeSql(
    'SELECT * FROM sessions WHERE key = ?', ['current']
  );
  if (res.rows.length === 0) return null;
  const row = res.rows.item(0);
  return { id: row.user_id, name: row.user_name, email: row.user_email };
};

export const clearSession = async () => {
  const database = await getDB();
  await database.executeSql('DELETE FROM sessions WHERE key = ?', ['current']);
};

// ── Trips ─────────────────────────────────────────────────────────────────────

export const loadTrips = async () => {
  const database = await getDB();
  const [tripsRes] = await database.executeSql('SELECT * FROM trips');
  const trips = [];

  for (const trip of rowsToArray(tripsRes.rows)) {
    const [partsRes] = await database.executeSql(
      'SELECT * FROM participants WHERE trip_id = ?', [trip.id]
    );
    const participants = rowsToArray(partsRes.rows);

    const [expsRes] = await database.executeSql(
      'SELECT * FROM expenses WHERE trip_id = ?', [trip.id]
    );
    const expenses = [];
    for (const exp of rowsToArray(expsRes.rows)) {
      const [sharedRes] = await database.executeSql(
        'SELECT participant_id FROM expense_shared_with WHERE expense_id = ?', [exp.id]
      );
      const sharedWith = rowsToArray(sharedRes.rows).map(r => r.participant_id);
      expenses.push({ ...exp, paidBy: exp.paid_by, sharedWith });
    }

    trips.push({ ...trip, participants, expenses });
  }

  return trips;
};

export const saveTrips = async (trips) => {
  const database = await getDB();
  await database.executeSql('DELETE FROM expense_shared_with');
  await database.executeSql('DELETE FROM expenses');
  await database.executeSql('DELETE FROM participants');
  await database.executeSql('DELETE FROM trips');

  for (const trip of trips) {
    await database.executeSql(
      'INSERT INTO trips (id, name, destination, dates) VALUES (?, ?, ?, ?)',
      [trip.id, trip.name, trip.destination || '', trip.dates || null]
    );

    for (const p of trip.participants || []) {
      await database.executeSql(
        'INSERT INTO participants (id, trip_id, name) VALUES (?, ?, ?)',
        [p.id, trip.id, p.name]
      );
    }

    for (const exp of trip.expenses || []) {
      await database.executeSql(
        'INSERT INTO expenses (id, trip_id, value, category, paid_by, note) VALUES (?, ?, ?, ?, ?, ?)',
        [exp.id, trip.id, exp.value, exp.category, exp.paidBy || exp.paid_by, exp.note || null]
      );
      for (const participantId of exp.sharedWith || []) {
        await database.executeSql(
          'INSERT INTO expense_shared_with (expense_id, participant_id) VALUES (?, ?)',
          [exp.id, participantId]
        );
      }
    }
  }
};
