import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Image,
  Animated,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { createUser, findUserByEmail } from '../utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetLoginAttempts } from '../utils/authLimiter';
import { checkPasswordStrength, generateSecurePassword, isPasswordExposed, isPasswordSimilar, PasswordStrengthResult } from '../utils/passwordUtils';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

type RegisterScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Register'>;

interface RegisterScreenProps {
  navigation: RegisterScreenNavigationProp;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null);
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsError, setTermsError] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (text.length > 0) {
      const strength = checkPasswordStrength(text);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  };

  const renderPasswordStrengthMeter = () => {
    if (!passwordStrength) return null;
    
    // The score is already 0-100 from checkPasswordStrength
    const strengthPercentage = Math.min(100, Math.max(0, passwordStrength.score));
    
    // Determine strength level and color
    let strengthLabel = 'Very Weak';
    let strengthColor = '#FF3B30';
    
    if (strengthPercentage < 20) {
      strengthLabel = 'Very Weak';
      strengthColor = '#FF3B30';
    } else if (strengthPercentage < 40) {
      strengthLabel = 'Weak';
      strengthColor = '#FF9500';
    } else if (strengthPercentage < 60) {
      strengthLabel = 'Fair';
      strengthColor = '#FFCC00';
    } else if (strengthPercentage < 80) {
      strengthLabel = 'Strong';
      strengthColor = '#34C759';
    } else {
      strengthLabel = 'Very Strong';
      strengthColor = '#1a8cff';
    }
    
    const mainSuggestion = passwordStrength.suggestions?.[0];

    return (
      <View style={styles.passwordFeedback}>
        <View style={styles.strengthMeter}>
          <View 
            style={[
              styles.strengthMeterFill, 
              { 
                width: `${strengthPercentage}%`,
                backgroundColor: strengthColor
              }
            ]} 
          />
        </View>
        <Text style={[styles.strengthText, { color: strengthColor }]}>
          {strengthLabel}
        </Text>
        {mainSuggestion && (
          <Text style={styles.suggestionText}>
            {mainSuggestion}
          </Text>
        )}
      </View>
    );
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!acceptedTerms) {
      setTermsError('You must accept the terms and conditions');
      return;
    }

    // Check password strength
    const strengthCheck = checkPasswordStrength(password);
    if (!strengthCheck.valid) {
      Alert.alert('Weak Password', strengthCheck.message);
      return;
    }

    // Check if password is exposed in breaches
    const isExposed = await isPasswordExposed(password);
    if (isExposed) {
      Alert.alert(
        'Security Risk',
        'This password has been exposed in data breaches. Please choose a different password.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);
    try {
      // Check if user already exists
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        Alert.alert('Error', 'An account with this email already exists');
        return;
      }

      // Create new user in SQLite
      const newUser = await createUser(name, email, password);
      
      if (!newUser) {
        throw new Error('Failed to create user');
      }

      // Store user session
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('currentUser', JSON.stringify({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }));

      if (newUser) {
        // Reset any existing login attempts for this email
        await resetLoginAttempts();
        
        // Navigate to VerifyHash screen with fromRegistration flag
        navigation.replace('VerifyHash', { 
          email, 
          password,
          fromRegistration: true 
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#000000', '#000000']}
          style={styles.gradient}
        >
          <ScrollView 
            contentContainerStyle={[
              styles.scrollContent,
              keyboardVisible && styles.scrollContentKeyboardOpen
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <Animated.View 
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }]
                }
              ]}
            >
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/testt.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.tagline}>Your Pill, On Time, Every Time</Text>
            </Animated.View>

            <View style={styles.formContainer}>
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Ionicons name="person-outline" size={20} color="#FF0000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Full Name"
                    placeholderTextColor="#666"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Ionicons name="mail-outline" size={20} color="#FF0000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor="#666"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View>
                  <View style={styles.inputGroup}>
                    <Ionicons name="lock-closed-outline" size={20} color="#FF0000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Password"
                      placeholderTextColor="#666"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={handlePasswordChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      autoComplete="new-password"
                      importantForAutofill="no"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons 
                        name={showPassword ? 'eye-off' : 'eye'} 
                        size={20} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                  </View>
                  {password && (
                    <View style={styles.passwordFeedback}>
                      {renderPasswordStrengthMeter()}
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Ionicons name="lock-closed-outline" size={20} color="#FF0000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#666"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    importantForAutofill="no"
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? 'eye-off' : 'eye'} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.termsContainer}>
                  <TouchableOpacity 
                    style={styles.checkboxContainer}
                    onPress={() => {
                      setAcceptedTerms(!acceptedTerms);
                      setTermsError('');
                    }}
                  >
                    <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                      {acceptedTerms && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={styles.termsText}>
                      I agree to the 
                      <Text 
                        style={styles.termsLink}
                        onPress={() => navigation.navigate('TermsAndConditions')}
                      >
                        {' '}Terms and Conditions
                      </Text>
                    </Text>
                  </TouchableOpacity>
                  {termsError ? <Text style={styles.errorText}>{termsError}</Text> : null}
                </View>

                <TouchableOpacity
                  style={[styles.registerButton, (isLoading || !acceptedTerms) && styles.registerButtonDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading || !acceptedTerms}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#000000" />
                  ) : (
                    <Text style={styles.registerButtonText}>Create Account</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.loginLink}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Text style={styles.loginLinkText}>
                    Already have an account? <Text style={styles.loginLinkTextBold}>Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 20,
  },
  scrollContentKeyboardOpen: {
    paddingBottom: 300, // Extra space when keyboard is open
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoContainer: {
    width: 250,
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 240,
    height: 240,
  },
  tagline: {
    fontSize: 18,
    color: '#C5A14E',
    fontWeight: '400',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 15,
    fontFamily: Platform.OS === 'ios' ? 'Futura' : 'sans-serif-medium',
    textTransform: 'uppercase',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#121212',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    shadowColor: '#FF0000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  form: {
    flex: 1,
    marginTop: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  inputIcon: {
    marginRight: 10,
    color: '#FF0000',
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#FFFFFF',
  },
  eyeIcon: {
    padding: 10,
  },

  registerButton: {
    backgroundColor: '#FF0000',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#FF0000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  registerButtonDisabled: {
    backgroundColor: '#4D0000',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 30,
  },
  loginLinkText: {
    color: '#666',
    fontSize: 16,
  },
  loginLinkTextBold: {
    color: '#FF0000',
    fontWeight: 'bold',
  },
  passwordFeedback: {
    marginTop: 8,
    marginBottom: 12,
  },
  strengthMeter: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginBottom: 4,
    overflow: 'hidden',
  },
  strengthMeterFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 12,
    color: '#FF9500',
    fontStyle: 'italic',
  },
  termsContainer: {
    marginTop: 15,
    marginBottom: 20,
    width: '100%',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FF0000',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF0000',
  },
  termsText: {
    color: '#CCCCCC',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    color: '#FF0000',
    textDecorationLine: 'underline',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 30,
  },
});

export default RegisterScreen;