import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  Platform,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

type HelpSupportScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'HelpSupport'>;

interface HelpSupportScreenProps {
  navigation: HelpSupportScreenProps;
}

const HelpSupportScreen: React.FC<HelpSupportScreenProps> = ({ navigation }) => {
  const faqs = [
    {
      question: 'How do I add a new medication?',
      answer: 'To add a new medication:\n1. Go to the Medications tab\n2. Tap the "+" button in the bottom right corner\n3. Fill in the medication details (name, dosage, frequency, etc.)\n4. Set up reminders if needed\n5. Tap "Save" to add the medication to your list\n\nYou can also scan the medication barcode if available for automatic information input.'
    },
    {
      question: 'How do I set up medication reminders?',
      answer: 'To set up reminders:\n1. When adding or editing a medication, find the "Reminders" section\n2. Tap "Add Reminder"\n3. Set the time for your reminder\n4. Choose the days of the week for this reminder\n5. Tap "Save"\n\nYou can set multiple reminders per medication and customize the alert tone in the app settings.'
    },
    {
      question: 'Is my health data secure and private?',
      answer: 'Your privacy and data security are our top priorities. We:\n• Use bank-level 256-bit encryption for all stored data\n• Never sell or share your personal health information\n• Allow you to export or delete your data at any time\n• Comply with healthcare data protection regulations\n\nYou can manage your privacy settings in the Privacy & Security section of the app.'
    },
    {
      question: 'How do I update my profile and emergency contacts?',
      answer: 'To update your information:\n1. Go to the Profile tab\n2. Tap "Personal Information" for profile details\n3. Tap "Emergency Contacts" to manage contacts\n4. Make your changes and tap "Save"\n\nEmergency contacts will be displayed on your lock screen and can be called directly from there in case of emergencies.'
    },
    {
      question: 'What should I do if I miss a dose?',
      answer: 'If you miss a dose:\n1. Take it as soon as you remember, unless it\'s close to the time for your next dose\n2. Never take a double dose to make up for a missed one\n3. Check the medication information or consult your pharmacist if you\'re unsure\n4. You can tap the "Snooze" button on the reminder if you need to be reminded again soon\n\nIf you frequently miss doses, consider setting additional reminders or adjusting your schedule.'
    },
    {
      question: 'How do I share my medication list with my doctor?',
      answer: 'To share your medication list:\n1. Go to the Medications tab\n2. Tap the share icon in the top right corner\n3. Choose to generate a PDF or share via email/message\n4. Select the information you want to include\n5. Choose the sharing method (email, message, etc.)\n\nYou can also print your medication list directly from the app.'
    },
    {
      question: 'How do I report a bug or suggest a feature?',
      answer: 'We appreciate your feedback! You can:\n1. Email us at support@tumana.com with "Bug Report" or "Feature Request" in the subject\n2. Use the in-app feedback form (Settings > Help & Support > Send Feedback)\n3. Call our support line at 0945-3258-777\n\nPlease include as much detail as possible about the issue or suggestion.'
    },
    {
      question: 'How do I back up my medication data?',
      answer: 'Your data is automatically backed up to our secure cloud servers. To manually back up or restore:\n1. Go to Settings > Backup & Restore\n2. Tap "Backup Now" to create a new backup\n3. To restore, tap "Restore from Backup" and select the desired backup\n\nYou can also export your data as a PDF or CSV file from the Backup & Restore menu.'
    }
  ];

  const handleContactSupport = () => {
    const email = 'support@pillpal.com';
    const subject = 'PillPal App Support';
    const body = 'Please describe your issue or question here:\n\n';
    
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    Linking.openURL(mailtoUrl).catch(err => {
      Alert.alert('Error', 'Could not open email client');
    });
  };

  const handleCallSupport = () => {
    const phoneNumber = '09453258777'; // Removed hyphens for better compatibility
    const url = Platform.OS === 'android' 
      ? `tel:${phoneNumber}` 
      : `telprompt:${phoneNumber}`;
    
    Linking.openURL(url).catch(err => {
      Alert.alert('Error', 'Could not open phone app');
    });
  };

  const handleOpenFAQ = (question: string, answer: string) => {
    // In a real app, you might navigate to a detailed FAQ screen
    Alert.alert(question, answer, [
      { text: 'OK' }
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.faqItem}
              onPress={() => handleOpenFAQ(faq.question, faq.answer)}
            >
              <Text style={styles.faqQuestion}>{faq.question}</Text>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={handleContactSupport}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="mail" size={24} color="#FF3A44" />
            </View>
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Email Us</Text>
              <Text style={styles.contactSubtitle}>support@tumana.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={handleCallSupport}
          >
            <View style={styles.contactIcon}>
              <Ionicons name="call" size={24} color="#FF3A44" />
            </View>
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Call Us</Text>
              <Text style={styles.contactSubtitle}>0945-3258-777</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>May 30, 2025</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
    paddingTop: 10,
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3A44',
    padding: 16,
    paddingBottom: 12,
    backgroundColor: '#0D0D0D',
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
    marginRight: 10,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 58, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactText: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 13,
    color: '#AAAAAA',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  infoLabel: {
    fontSize: 15,
    color: '#CCCCCC',
  },
  infoValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});

export default HelpSupportScreen;
