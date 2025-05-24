import * as Crypto from 'expo-crypto';

// Enhanced list of common passwords and patterns
const COMMON_PASSWORDS = new Set([
  // Top 1000 most common passwords
  '123456', 'password', '123456789', '12345', '12345678',
  '1234567', '1234567890', 'qwerty', 'abc123', 'password1',
  // Common patterns
  'qwerty123', '1q2w3e4r', 'admin123', 'welcome1', 'letmein',
  'monkey', 'dragon', 'baseball', 'football', 'iloveyou',
  // Add more patterns as needed
]);

// Password strength requirements
interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxConsecutiveChars: number;
  minUniqueChars: number;
  maxPasswordAgeDays: number;
  passwordHistorySize: number;
}

// Default password requirements
const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxConsecutiveChars: 2,
  minUniqueChars: 8,
  maxPasswordAgeDays: 90,
  passwordHistorySize: 5,
};

// Common keyboard patterns to detect
const KEYBOARD_PATTERNS = [
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1qaz2wsx', '1q2w3e4r',
  'qazwsxedc', '!@#$%^&*()_+', '1234567890-=', 'qwerasdfzxcv',
];

// Check if password contains common patterns
const containsCommonPatterns = (password: string): string | null => {
  const lowerPass = password.toLowerCase();
  
  // Check for common passwords
  if (COMMON_PASSWORDS.has(lowerPass)) {
    return 'This password is too common. Please choose a stronger one.';
  }
  
  // Check for keyboard patterns
  for (const pattern of KEYBOARD_PATTERNS) {
    if (lowerPass.includes(pattern)) {
      return 'Password contains a common keyboard pattern.';
    }
  }
  
  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    return 'Password contains repeated characters.';
  }
  
  // Check for sequential characters (e.g., 1234, abcd)
  if (/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789|890)/.test(lowerPass)) {
    return 'Password contains sequential characters.';
  }
  
  return null;
};

// Calculate password entropy in bits
const calculateEntropy = (password: string): number => {
  const charSetSize = (
    (/[a-z]/.test(password) ? 26 : 0) +
    (/[A-Z]/.test(password) ? 26 : 0) +
    (/[0-9]/.test(password) ? 10 : 0) +
    (/[^a-zA-Z0-9]/.test(password) ? 32 : 0)
  );
  
  return Math.log2(Math.pow(charSetSize, password.length));
};

// Check password strength with detailed analysis
export interface PasswordStrengthResult {
  valid: boolean;
  score: number; // 0-100
  message: string;
  suggestions: string[];
  entropy: number;
  crackTime: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
    notCommon: boolean;
    notSequential: boolean;
  };
}

export const checkPasswordStrength = (password: string): PasswordStrengthResult => {
  const result: PasswordStrengthResult = {
    valid: false,
    score: 0,
    message: '',
    suggestions: [],
    entropy: 0,
    crackTime: 'instantly',
    requirements: {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialChar: false,
      notCommon: true,
      notSequential: true,
    },
  };

  // Calculate entropy
  result.entropy = calculateEntropy(password);
  
  // Calculate crack time (simplified)
  const guessesPerSecond = 1e10; // 10 billion guesses/second (modern GPU)
  const secondsToCrack = Math.pow(2, result.entropy) / guessesPerSecond;
  
  if (secondsToCrack < 1) result.crackTime = 'less than a second';
  else if (secondsToCrack < 60) result.crackTime = 'seconds';
  else if (secondsToCrack < 3600) result.crackTime = 'minutes';
  else if (secondsToCrack < 86400) result.crackTime = 'hours';
  else if (secondsToCrack < 2592000) result.crackTime = 'days';
  else if (secondsToCrack < 31536000) result.crackTime = 'months';
  else result.crackTime = 'years';

  // Check requirements
  result.requirements.minLength = password.length >= DEFAULT_REQUIREMENTS.minLength;
  result.requirements.hasUppercase = /[A-Z]/.test(password);
  result.requirements.hasLowercase = /[a-z]/.test(password);
  result.requirements.hasNumber = /[0-9]/.test(password);
  result.requirements.hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
  
  // Check for common patterns
  const patternMessage = containsCommonPatterns(password);
  if (patternMessage) {
    result.requirements.notCommon = false;
    result.suggestions.push(patternMessage);
  }
  
  // Check for sequential patterns
  if (/(abc|bcd|123|234|345|456|567|678|789|890|qwe|wer|ert|rty|tyu|yui|uio|iop|asd|sdf|dfg|fgh|ghj|hjk|jkl|zxc|xcv|cvb|vbn|bnm)/i.test(password)) {
    result.requirements.notSequential = false;
    result.suggestions.push('Avoid using sequential characters (e.g., 123, abc).');
  }

  // Calculate score (0-100)
  let score = 0;
  if (result.requirements.minLength) score += 20;
  if (result.requirements.hasUppercase) score += 15;
  if (result.requirements.hasLowercase) score += 15;
  if (result.requirements.hasNumber) score += 15;
  if (result.requirements.hasSpecialChar) score += 15;
  if (result.requirements.notCommon) score += 10;
  if (result.requirements.notSequential) score += 10;
  
  // Adjust score based on length and entropy
  const lengthBonus = Math.min(10, (password.length - 8) * 2); // Up to 10 points for length > 12
  const entropyBonus = Math.min(10, Math.floor(result.entropy / 4)); // Up to 10 points for high entropy
  score = Math.min(100, score + lengthBonus + entropyBonus);
  
  result.score = score;
  
  // Set validity and message
  if (score < 60) {
    result.valid = false;
    result.message = 'Weak password';
  } else if (score < 80) {
    result.valid = true;
    result.message = 'Moderate password';
  } else {
    result.valid = true;
    result.message = 'Strong password';
  }
  
  // Add suggestions for improvement
  if (!result.requirements.minLength) {
    result.suggestions.push(`Use at least ${DEFAULT_REQUIREMENTS.minLength} characters.`);
  }
  if (!result.requirements.hasUppercase) {
    result.suggestions.push('Add uppercase letters (A-Z).');
  }
  if (!result.requirements.hasLowercase) {
    result.suggestions.push('Add lowercase letters (a-z).');
  }
  if (!result.requirements.hasNumber) {
    result.suggestions.push('Add numbers (0-9).');
  }
  if (!result.requirements.hasSpecialChar) {
    result.suggestions.push('Add special characters (!@#$%^&*).');
  }
  if (password.length < 16) {
    result.suggestions.push('Consider using a longer passphrase.');
  }
  if (result.entropy < 50) {
    result.suggestions.push('Use a more complex password with varied characters.');
  }

  return result;
};

// Check if password has been exposed in a data breach using k-anonymity
export const isPasswordExposed = async (password: string): Promise<boolean> => {
  try {
    // Hash the password using SHA-1
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA1,
      password,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    const prefix = hash.substring(0, 5).toUpperCase();
    const suffix = hash.substring(5).toUpperCase();
    
    // In a real app, you would call the HIBP API here
    // const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    // const hashes = await response.text();
    // return hashes.includes(suffix);
    
    // For demo purposes, we'll just check against common passwords
    return COMMON_PASSWORDS.has(password.toLowerCase());
  } catch (error) {
    console.error('Error checking password exposure:', error);
    return false; // Fail safe - don't block on error
  }
};

// Check if new password is too similar to old password
export const isPasswordSimilar = (newPassword: string, oldPassword: string): boolean => {
  if (!oldPassword || !newPassword) return false;
  
  const minLength = Math.min(newPassword.length, oldPassword.length);
  if (minLength < 4) return false;
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(newPassword, oldPassword);
  const maxAllowedDistance = Math.floor(minLength * 0.7); // 70% similarity threshold
  
  return distance <= maxAllowedDistance;
};

// Levenshtein distance algorithm for string similarity
const levenshteinDistance = (a: string, b: string): number => {
  const matrix: number[][] = [];

  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }


  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }


  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }


  return matrix[b.length][a.length];
};

// Generate a secure random password
export const generateSecurePassword = (length = 16): string => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]\\:;?><,./-';
  const charsetLength = charset.length;
  
  // Generate secure random bytes using expo-crypto
  const array = new Uint8Array(length * 2);
  Crypto.getRandomValues(array);
  
  let result = '';
  for (let i = 0; i < length; i++) {
    // Use modulo to get a random index within the charset length
    const randomIndex = array[i] % charsetLength;
    result += charset[randomIndex];
  }
  
  // Ensure the generated password meets all requirements
  const strength = checkPasswordStrength(result);
  if (!strength.valid) {
    // If the password doesn't meet requirements, generate a new one
    // (this should be rare since we're using a good character set)
    return generateSecurePassword(length);
  }
  
  return result;
};
