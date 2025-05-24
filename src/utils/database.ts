import * as SQLite from 'expo-sqlite';

const dbPromise = SQLite.openDatabaseAsync('pillpal.db');

// Initialize the database
export const initializeDatabase = async () => {
  try {
    const db = await dbPromise;
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medications (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        time TEXT NOT NULL,
        instructions TEXT
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        relationship TEXT NOT NULL,
        phoneNumber TEXT NOT NULL,
        email TEXT,
        address TEXT
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        age TEXT,
        email TEXT,
        phoneNumber TEXT,
        bloodType TEXT,
        allergies TEXT,
        medicalConditions TEXT,
        dob TEXT,
        address TEXT,
        gender TEXT
      );
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Generic query function
export const executeQuery = async (sql: string, params: any[] = []): Promise<any> => {
  try {
    const db = await dbPromise;
    
    // Check if it's a SELECT query
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const result = await db.getAllAsync(sql, params);
      return result;
    } 
    // For INSERT, UPDATE, DELETE, etc.
    const result = await db.runAsync(sql, params);
    return result;
  } catch (error) {
    console.error('Error executing query:', sql, 'Params:', params, 'Error:', error);
    throw error;
  }
};

// Get first row from a query result
export const getFirstRow = async (sql: string, params: any[] = []) => {
  try {
    const result = await executeQuery(sql, params);
    return Array.isArray(result) && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error in getFirstRow:', error);
    throw error;
  }
};

// Get all rows from a query
export const getAllRows = async (sql: string, params: any[] = []) => {
  try {
    const result = await executeQuery(sql, params);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Error in getAllRows:', error);
    throw error;
  }
};

export default dbPromise;
