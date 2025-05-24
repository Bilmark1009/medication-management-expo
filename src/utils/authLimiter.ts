import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const ATTEMPTS_KEY = 'login_attempts';
const LOCKOUT_UNTIL_KEY = 'lockout_until';

export const checkLoginAttempts = async (): Promise<{ isLockedOut: boolean; remainingTime?: number }> => {
  try {
    // Check if account is locked
    const lockoutUntil = await AsyncStorage.getItem(LOCKOUT_UNTIL_KEY);
    if (lockoutUntil) {
      const lockoutTime = parseInt(lockoutUntil, 10);
      const currentTime = Date.now();
      
      if (currentTime < lockoutTime) {
        // Still locked out
        return { 
          isLockedOut: true, 
          remainingTime: Math.ceil((lockoutTime - currentTime) / 1000) // in seconds
        };
      } else {
        // Lockout period has ended, reset attempts
        await AsyncStorage.multiRemove([LOCKOUT_UNTIL_KEY, ATTEMPTS_KEY]);
      }
    }
    return { isLockedOut: false };
  } catch (error) {
    console.error('Error checking login attempts:', error);
    // In case of error, don't block login attempts
    return { isLockedOut: false };
  }
};

export const recordFailedLoginAttempt = async (): Promise<{ isLockedOut: boolean; remainingAttempts: number }> => {
  try {
    const attempts = parseInt((await AsyncStorage.getItem(ATTEMPTS_KEY)) || '0', 10) + 1;
    await AsyncStorage.setItem(ATTEMPTS_KEY, attempts.toString());

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockoutTime = Date.now() + LOCKOUT_DURATION;
      await AsyncStorage.setItem(LOCKOUT_UNTIL_KEY, lockoutTime.toString());
      return { 
        isLockedOut: true, 
        remainingAttempts: 0 
      };
    }

    return { 
      isLockedOut: false, 
      remainingAttempts: MAX_LOGIN_ATTEMPTS - attempts 
    };
  } catch (error) {
    console.error('Error recording failed login attempt:', error);
    return { isLockedOut: false, remainingAttempts: MAX_LOGIN_ATTEMPTS };
  }
};

export const resetLoginAttempts = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([ATTEMPTS_KEY, LOCKOUT_UNTIL_KEY]);
  } catch (error) {
    console.error('Error resetting login attempts:', error);
  }
};
