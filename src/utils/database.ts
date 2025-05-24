import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

// Define types for better type safety
interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

const dbPromise = SQLite.openDatabaseAsync('pillpal.db');

// Initialize the database
export const initializeDatabase = async () => {
  try {
    const db = await dbPromise;
    
    // Users table for authentication
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medications (
        id TEXT PRIMARY KEY NOT NULL,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        time TEXT NOT NULL,
        instructions TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        relationship TEXT NOT NULL,
        phoneNumber TEXT NOT NULL,
        email TEXT,
        address TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        age TEXT,
        email TEXT,
        phoneNumber TEXT,
        bloodType TEXT,
        allergies TEXT,
        medicalConditions TEXT,
        dob TEXT,
        address TEXT,
        gender TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

// Hash password using expo-crypto
export const hashPassword = async (password: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
};

// User functions
export const createUser = async (name: string, email: string, password: string): Promise<Omit<User, 'password_hash' | 'created_at'> | null> => {
  try {
    const passwordHash = await hashPassword(password);
    const db = await dbPromise;
    
    // Insert the user
    await db.runAsync(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, passwordHash]
    );
    
    // Get the last inserted row ID
    const lastIdResult = await db.getFirstAsync<{ 'last_insert_rowid()': number }>(
      'SELECT last_insert_rowid()'
    );
    
    if (lastIdResult && lastIdResult['last_insert_rowid()']) {
      const userId = lastIdResult['last_insert_rowid()'];
      
      // Fetch the newly created user
      const user = await findUserByEmail(email);
      if (user) {
        // Remove password_hash from the returned object
        const { password_hash, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
    }
    
    throw new Error('Failed to create user');
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const findUserByEmail = async (email: string): Promise<User | null> => {
  try {
    const result = await executeQuery(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as User[];
    return result && result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
};

export const updateUserPassword = async (email: string, newPassword: string): Promise<boolean> => {
  try {
    const passwordHash = await hashPassword(newPassword);
    await executeQuery(
      'UPDATE users SET password_hash = ? WHERE email = ?',
      [passwordHash, email]
    );
    return true;
  } catch (error) {
    console.error('Error updating user password:', error);
    throw error;
  }
};

export const verifyUser = async (
  email: string, 
  password: string
): Promise<Omit<User, 'password_hash' | 'created_at'> | null> => {
  try {
    const user = await findUserByEmail(email);
    if (!user) return null;
    
    const passwordHash = await hashPassword(password);
    if (user.password_hash !== passwordHash) return null;
    
    // Don't return the password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error('Error verifying user:', error);
    throw error;
  }
};

// Generic query function
export const executeQuery = async (sql: string, params: any[] = []): Promise<any> => {
  try {
    const db = await dbPromise;
    
    // Check if it's a SELECT query
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return await db.getAllAsync(sql, params);
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
