import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

// Define types for better type safety
interface User {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  created_at: string;
}

interface PersonalInfo {
  id: number;
  user_id: number;
  full_name: string;
  date_of_birth: string;
  blood_type: string;
  allergies: string;
  medical_condition: string;
  created_at: string;
  updated_at: string;
}

const dbPromise = SQLite.openDatabaseAsync('pillpal.db');

// Initialize the database
// **FIXED DATABASE INITIALIZATION** - Replace your initializeDatabase function
export const initializeDatabase = async () => {
  try {
    const db = await dbPromise;
    
    // First, create users table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // **FIXED: Single medication table definition with ALL columns**
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        form TEXT,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        time TEXT NOT NULL,
        instructions TEXT,
        duration TEXT,
        notification_id TEXT,
        notification_enabled BOOLEAN DEFAULT 1,
        timezone_offset INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);
    
    // Check if we need to migrate the users schema
    try {
      const tableInfo = await db.getAllAsync("PRAGMA table_info(users)");
      const hasSaltColumn = tableInfo.some((column: any) => column.name === 'password_salt');
      
      if (!hasSaltColumn) {
        // Create a new users table with the updated schema
        await db.execAsync(`
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            password_salt TEXT NOT NULL DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        // Migrate existing data
        await db.execAsync(`
          INSERT INTO users_new (id, name, email, password_hash, created_at)
          SELECT id, name, email, password_hash, created_at FROM users;
        `);
        
        // Drop the old table and rename the new one
        await db.execAsync('DROP TABLE users;');
        await db.execAsync('ALTER TABLE users_new RENAME TO users;');
        
        console.log('Migrated users table to include password_salt column');
      }
    } catch (error) {
      console.error('Error during users table migration:', error);
      throw error;
    }

    // **FIXED: Check and add missing columns to medications table**
    const columns = await db.getAllAsync(`PRAGMA table_info(medications);`);
    console.log('Current medication table columns:', columns.map((col: any) => col.name));
    
    // Check for each required column and add if missing
    const requiredColumns = [
      { name: 'notification_id', type: 'TEXT', defaultValue: null },
      { name: 'notification_enabled', type: 'BOOLEAN', defaultValue: '1' },
      { name: 'duration', type: 'TEXT', defaultValue: null },
      { name: 'form', type: 'TEXT', defaultValue: null },
      { name: 'timezone_offset', type: 'INTEGER', defaultValue: null },
      { name: 'created_at', type: 'DATETIME', defaultValue: 'CURRENT_TIMESTAMP' }
    ];

    for (const column of requiredColumns) {
      const hasColumn = columns.some((col: any) => col.name === column.name);
      
      if (!hasColumn) {
        try {
          const alterQuery = column.defaultValue 
            ? `ALTER TABLE medications ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.defaultValue};`
            : `ALTER TABLE medications ADD COLUMN ${column.name} ${column.type};`;
          
          await db.execAsync(alterQuery);
          console.log(`Added ${column.name} column to medications table`);
        } catch (e) {
          console.log(`Column ${column.name} migration error:`, e);
        }
      }
    }

    // **REMOVED: The duplicate medication table creation that was overwriting the first one**
    
    // Create emergency_contacts table
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

    // Create personal_information table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_information (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        full_name TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        blood_type TEXT,
        allergies TEXT,
        medical_condition TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE (user_id) ON CONFLICT REPLACE
      );
    `);
    
    console.log('✅ Database initialized successfully with fixed schema');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

// Generate a random salt
export const generateSalt = async (): Promise<string> => {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  // Convert Uint8Array to hex string without using Buffer
  return Array.from(saltBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Hash password with salting
export const hashPassword = async (password: string, salt?: string): Promise<{ hash: string; salt: string }> => {
  // If salt is not provided, generate a new one
  const saltToUse = salt || await generateSalt();
  
  // Use expo-crypto's digest method for hashing
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + saltToUse
  );
  
  // Return the hash and salt
  return {
    hash,
    salt: saltToUse
  };
};

// Verify password against stored hash and salt
export const verifyPassword = async (password: string, storedHash: string, salt: string): Promise<boolean> => {
  try {
    const { hash } = await hashPassword(password, salt);
    return hash === storedHash;
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
};

// User functions
export const createUser = async (name: string, email: string, password: string): Promise<Omit<User, 'password_hash' | 'password_salt' | 'created_at'>> => {
  try {
    const { hash: passwordHash, salt } = await hashPassword(password);
    const db = await dbPromise;
    
    // Insert the user
    await db.runAsync(
      'INSERT INTO users (name, email, password_hash, password_salt) VALUES (?, ?, ?, ?)',
      [name, email, passwordHash, salt]
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
    const { hash: passwordHash, salt } = await hashPassword(newPassword);
    await executeQuery(
      'UPDATE users SET password_hash = ?, password_salt = ? WHERE email = ?',
      [passwordHash, salt, email]
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
): Promise<Omit<User, 'password_hash' | 'password_salt' | 'created_at'> | null> => {
  try {
    const user = await findUserByEmail(email);
    if (!user) return null;
    
    if (!user.password_salt) {
      // Handle legacy hashes (no salt)
      const legacyHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password,
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      if (user.password_hash !== legacyHash) return null;
      
      // Migrate to salted hash
      const { hash: newHash, salt } = await hashPassword(password);
      const db = await dbPromise;
      await db.runAsync(
        'UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?',
        [newHash, salt, user.id]
      );
      user.password_hash = newHash;
    } else {
      // Verify with salted hash
      const isValid = await verifyPassword(password, user.password_hash, user.password_salt);
      if (!isValid) return null;
    }
    
    // Don't return the password hash or salt
    const { password_hash, password_salt, ...userWithoutPassword } = user;
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

// Personal Information CRUD operations
export const verifyPersonalInfoTable = async (): Promise<boolean> => {
  try {
    const db = await dbPromise;
    await db.getFirstAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='personal_information'");
    return true;
  } catch (error) {
    console.error('Personal info table verification failed:', error);
    return false;
  }
};

export const savePersonalInfo = async (userId: number, data: Omit<PersonalInfo, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<PersonalInfo> => {
  try {
    const db = await dbPromise;
    
    // Verify table exists
    const tableExists = await verifyPersonalInfoTable();
    if (!tableExists) {
      console.error('Personal information table does not exist');
      throw new Error('Personal information table does not exist');
    }
    
    // Check if personal info already exists for this user
    const existingInfo = await getFirstRow(
      'SELECT id FROM personal_information WHERE user_id = ?',
      [userId]
    );

    if (existingInfo) {
      // Update existing record
      await db.runAsync(
        `UPDATE personal_information 
         SET full_name = ?, date_of_birth = ?, blood_type = ?, 
             allergies = ?, medical_condition = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [data.full_name, data.date_of_birth, data.blood_type, 
         data.allergies, data.medical_condition, userId]
      );
      return { ...data, id: existingInfo.id, user_id: userId } as PersonalInfo;
    } else {
      // Insert new record
      const result = await db.runAsync(
        `INSERT INTO personal_information 
         (user_id, full_name, date_of_birth, blood_type, allergies, medical_condition)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, data.full_name, data.date_of_birth, data.blood_type, 
         data.allergies, data.medical_condition]
      );
      return { ...data, id: result.lastInsertRowId, user_id: userId } as PersonalInfo;
    }
  } catch (error) {
    console.error('Error saving personal information:', error);
    throw error;
  }
};

export const getPersonalInfoByUserId = async (userId: number): Promise<PersonalInfo | null> => {
  try {
    console.log('Fetching personal info for user ID:', userId);
    const result = await getFirstRow(
      'SELECT * FROM personal_information WHERE user_id = ?',
      [userId]
    );
    console.log('Personal info query result:', result);
    return result;
  } catch (error) {
    console.error('Error fetching personal information:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw error;
  }
};

export const deletePersonalInfo = async (userId: number): Promise<boolean> => {
  try {
    const db = await dbPromise;
    const result = await db.runAsync(
      'DELETE FROM personal_information WHERE user_id = ?',
      [userId]
    );
    console.log(`Deleted ${result.changes} personal info records for user ${userId}`);
    return result.changes > 0;
  } catch (error) {
    console.error('Error deleting personal information:', error);
    throw error;
  }
};

// Test function to debug personal info storage
export const testPersonalInfoStorage = async (userId: number) => {
  try {
    console.log('--- Testing Personal Info Storage ---');
    
    // 1. Check if table exists
    const tableExists = await verifyPersonalInfoTable();
    console.log('1. Table exists:', tableExists);
    
    if (!tableExists) {
      console.error('Error: personal_information table does not exist!');
      return false;
    }
    
    // 2. Try to save test data
    const testData = {
      full_name: 'Test User',
      date_of_birth: '1990-01-01',
      blood_type: 'O+',
      allergies: 'None',
      medical_condition: 'None',
    };
    
    console.log('2. Saving test data:', testData);
    const savedInfo = await savePersonalInfo(userId, testData);
    console.log('3. Save result:', savedInfo ? 'Success' : 'Failed');
    
    // 3. Try to retrieve the data
    const retrievedInfo = await getPersonalInfoByUserId(userId);
    console.log('4. Retrieved data:', retrievedInfo);
    
    // 4. Clean up
    await deletePersonalInfo(userId);
    console.log('5. Cleanup complete');
    
    return !!retrievedInfo;
  } catch (error) {
    console.error('Test failed with error:', error);
    return false;
  }
};

export default dbPromise;
