import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';
import { findUserByEmail, updateUserPassword } from '../utils/database';
import { checkPasswordStrength, isPasswordExposed, isPasswordSimilar, PasswordStrengthResult } from '../utils/passwordUtils';

interface ForgotPasswordScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthResult | null>(null);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState('');
  const [verificationCode, setVerificationCode] = useState(
    Math.floor(100000 + Math.random() * 900000).toString()
  );

  const handlePasswordChange = (password: string) => {
    setNewPassword(password);
    if (password.length > 0) {
      const strength = checkPasswordStrength(password);
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
    
    const mainSuggestion = passwordStrength.suggestions?.[0] || '';

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
        {mainSuggestion ? (
          <Text style={styles.suggestionText}>
            {mainSuggestion}
          </Text>
        ) : null}
      </View>
    );
  };

  const handleSendCode = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const user = await findUserByEmail(email);
      if (!user) {
        Alert.alert('Error', 'No account found with this email');
        return;
      }
      
      // In a real app, you would send this code to the user's email
      console.log('Verification code:', verificationCode);
      Alert.alert('Verification Sent', 'Check your email for the verification code');
      setStep(2);
    } catch (error) {
      console.error('Error sending verification code:', error);
      Alert.alert('Error', 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Check password strength
    const strengthCheck = checkPasswordStrength(newPassword);
    if (!strengthCheck.valid) {
      Alert.alert('Weak Password', strengthCheck.message);
      return;
    }

    // Check if password is exposed in breaches
    const isExposed = await isPasswordExposed(newPassword);
    if (isExposed) {
      Alert.alert(
        'Security Risk',
        'This password has been exposed in data breaches. Please choose a different password.'
      );
      return;
    }

    if (code !== verificationCode) {
      Alert.alert('Error', 'Invalid verification code');
      return;
    }

    setIsLoading(true);
    try {
      await updateUserPassword(email, newPassword);
      Alert.alert(
        'Success',
        'Your password has been reset successfully. You can now log in with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error) {
      console.error('Error resetting password:', error);
      Alert.alert('Error', 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>Reset Password</Text>
            
            {step === 1 ? (
              <>
                <Text style={styles.subtitle}>
                  Enter your email address and we'll send you a verification code
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#FF0000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#666"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSendCode}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Verification Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.subtitle}>
                  Enter the verification code sent to your email and set a new password
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="key-outline" size={20} color="#FF0000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Verification Code"
                    placeholderTextColor="#666"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ marginBottom: 12 }}>
                  <View style={styles.inputGroup}>
                    <Ionicons name="lock-closed-outline" size={20} color="#FF0000" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="New Password"
                      placeholderTextColor="#666"
                      value={newPassword}
                      onChangeText={handlePasswordChange}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      autoComplete="new-password"
                      importantForAutofill="no"
                    />
                    <TouchableOpacity
                      style={styles.eyeIcon}
                      onPress={() => setShowNewPassword(!showNewPassword)}
                    >
                      <Ionicons 
                        name={showNewPassword ? 'eye-off' : 'eye'} 
                        size={20} 
                        color="#666" 
                      />
                    </TouchableOpacity>
                  </View>
                  {newPassword ? (
                    <View style={styles.passwordFeedback}>
                      {renderPasswordStrengthMeter()}
                    </View>
                  ) : null}
                </View>

                <View style={styles.inputGroup}>
                  <Ionicons name="lock-closed-outline" size={20} color="#FF0000" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#666"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
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
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#FF0000" />
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
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
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  eyeIcon: {
    padding: 10,
    position: 'absolute',
    right: 0,
  },
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2c',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#FF0000',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  backButtonText: {
    color: '#FF0000',
    marginLeft: 5,
    fontSize: 14,
  },
});

export default ForgotPasswordScreen;
