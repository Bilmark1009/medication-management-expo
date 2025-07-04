import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { Ionicons } from '@expo/vector-icons';

type TermsAndConditionsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'TermsAndConditions'
>;

interface TermsAndConditionsScreenProps {
  navigation: TermsAndConditionsScreenNavigationProp;
}

const TermsAndConditionsScreen: React.FC<TermsAndConditionsScreenProps> = ({ navigation }) => {
  const handleAccept = () => {
    // Navigate back to Register screen
    navigation.goBack();
  };

  const openPrivacyPolicy = () => {
    // Replace with your actual privacy policy URL
    Linking.openURL('https://your-app-domain.com/privacy-policy');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#1a1a1a', '#000000']}
        style={styles.container}
      >

        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.lastUpdated}>Last updated: May 25, 2024</Text>
          
          <Text style={styles.sectionTitle}>1. Introduction</Text>
          <Text style={styles.paragraph}>
            Welcome to Tumara ("we," "our," or "us"). These Terms and Conditions ("Terms") govern your access to and use of the Tumara mobile application (the "App") and any related services (collectively, the "Services"). By accessing or using our Services, you agree to be bound by these Terms and all applicable laws and regulations. If you do not agree with any part of these Terms, you are prohibited from using our Services.
          </Text>

          <Text style={styles.sectionTitle}>2. Medical Disclaimer</Text>
          <Text style={styles.paragraph}>
            THE APP IS NOT INTENDED TO PROVIDE MEDICAL ADVICE, DIAGNOSIS, OR TREATMENT. The contents of the App, including but not limited to text, graphics, images, and other material ("Content") are for informational purposes only. The Content is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read on the App.
          </Text>

          <Text style={styles.sectionTitle}>3. User Account and Security</Text>
          <Text style={styles.paragraph}>
            3.1. To access certain features of the App, you must create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.
          </Text>
          <Text style={styles.paragraph}>
            3.2. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use of your account or any other breach of security.
          </Text>

          <Text style={styles.sectionTitle}>4. Data Privacy</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. Our Privacy Policy, which is incorporated into these Terms by reference, explains how we collect, use, and disclose your personal information. Please review our 
            <Text style={styles.link} onPress={openPrivacyPolicy}>
              {' '}Privacy Policy
            </Text>
            to understand our practices.
          </Text>

          <Text style={styles.sectionTitle}>5. Intellectual Property Rights</Text>
          <Text style={styles.paragraph}>
            5.1. The App and its original content, features, and functionality are and will remain the exclusive property of Tumara and its licensors. The App is protected by copyright, trademark, and other laws of both the Philippines and foreign countries.
          </Text>
          <Text style={styles.paragraph}>
            5.2. You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the material on our App, except as permitted by these Terms.
          </Text>

          <Text style={styles.sectionTitle}>6. User Conduct</Text>
          <Text style={styles.paragraph}>
            You agree not to:
            {'\n•'} Use the App in any way that violates any applicable law or regulation
            {'\n•'} Engage in any conduct that restricts or inhibits anyone's use or enjoyment of the App
            {'\n•'} Use the App to transmit any advertising or promotional material
            {'\n•'} Attempt to gain unauthorized access to any portion of the App
            {'\n•'} Introduce any viruses, trojan horses, or other harmful material
          </Text>

          <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            7.1. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TUMARA, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO THE USE OF, OR INABILITY TO USE, THE SERVICE.
          </Text>
          <Text style={styles.paragraph}>
            7.2. IN NO EVENT SHALL TUMARA'S TOTAL LIABILITY TO YOU FOR ALL DAMAGES, LOSSES, AND CAUSES OF ACTION EXCEED THE AMOUNT YOU HAVE PAID PILLPAL IN THE LAST SIX (6) MONTHS, OR, IF GREATER, ONE HUNDRED DOLLARS (USD $100).
          </Text>

          <Text style={styles.sectionTitle}>8. Indemnification</Text>
          <Text style={styles.paragraph}>
            You agree to defend, indemnify, and hold harmless Tumara and its licensee and licensors, and their employees, contractors, agents, officers, and directors, from and against any claims, damages, obligations, losses, liabilities, costs, or debt, and expenses (including but not limited to attorney's fees) arising from your use of and access to the App, or from the violation of these Terms or applicable laws, rules, or regulations.
          </Text>

          <Text style={styles.sectionTitle}>9. Modifications to Terms</Text>
          <Text style={styles.paragraph}>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by updating the "Last updated" date at the top of these Terms. Your continued use of the App after any such changes constitutes your acceptance of the new Terms.
          </Text>

          <Text style={styles.sectionTitle}>10. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law provisions. Any legal action or proceeding arising under these Terms will be brought exclusively in the courts located in the Philippines, and the parties hereby consent to personal jurisdiction and venue therein.
          </Text>

          <Text style={styles.sectionTitle}>11. Contact Information</Text>
          <Text style={[styles.paragraph, { marginBottom: 20 }]}>
            If you have any questions about these Terms, please contact us at:
            {'\n\n'}Email: support@tumara.com
            {'\n'}Address: Agujo Daanbantayan Cebu, Philippines
            {'\n'}Phone: 0945-325-8777
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={handleAccept}
          >
            <Text style={styles.acceptButtonText}>I Understand</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  // Header styles removed as we're using the navigation header
  content: {
    flex: 1,
    padding: 20,
  },
  lastUpdated: {
    color: '#888888',
    fontSize: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#FF0000',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    textAlign: 'justify',
  },
  link: {
    color: '#FF0000',
    textDecorationLine: 'underline',
  },
  contactText: {
    color: '#888888',
    fontSize: 14,
    marginTop: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  acceptButton: {
    backgroundColor: '#FF0000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TermsAndConditionsScreen;
