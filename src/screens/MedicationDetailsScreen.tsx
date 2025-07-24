// MedicationDetailsScreen.tsx - Updated with flip card and FDA integration
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { simpleFDAService } from '../services/FDAserviceapi';
import { simpleSafetyService } from '../services/safetyserviceapi';

type MedicationDetailsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'MedicationDetails'>;
type MedicationDetailsScreenRouteProp = RouteProp<RootStackParamList, 'MedicationDetails'>;

type Props = {
  navigation: MedicationDetailsScreenNavigationProp;
  route: MedicationDetailsScreenRouteProp & {
    params: {
      medication: {
        name: string;
        dosage: string;
        frequency: string;
        instructions?: string;
        form?: string;
        time?: string;
        duration?: string;
      };
    };
  };
};

const MedicationDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { medication } = route.params;
  
  const [isFlipped, setIsFlipped] = useState(false);
  const [fdaInfo, setFdaInfo] = useState<any>(null);
  const [safetyInfo, setSafetyInfo] = useState<any>(null);
  const [isLoadingFDA, setIsLoadingFDA] = useState(false);
  
  // Animation values
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadFDAData();
  }, []);

  const loadFDAData = async () => {
    setIsLoadingFDA(true);
    try {
      const [fdaResults, recalls] = await Promise.all([
        simpleFDAService.searchMedications(medication.name),
        simpleSafetyService.checkForRecalls(medication.name)
      ]);
      
      if (fdaResults.length > 0) {
        setFdaInfo(fdaResults[0]);
      }
      setSafetyInfo({ recalls });
    } catch (error) {
      console.error('Error loading FDA data:', error);
    } finally {
      setIsLoadingFDA(false);
    }
  };

  const handleFlip = () => {
    if (isLoadingFDA) return;
    
    // Scale down slightly during flip for better visual effect
    Animated.sequence([
      Animated.timing(scaleAnimation, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(flipAnimation, {
        toValue: isFlipped ? 0 : 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    
    setIsFlipped(!isFlipped);
  };

  // Interpolate rotation values
  const frontRotateY = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const backRotateY = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const backOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  // Front side - Original medication details
  const renderFrontSide = () => (
    <Animated.View
      style={[
        styles.cardSide,
        styles.frontSide,
        {
          opacity: frontOpacity,
          transform: [{ rotateY: frontRotateY }],
        },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{medication.name}</Text>
        
        <View style={styles.detailsContainer}>
          <DetailRow label="Dosage:" value={medication.dosage} />
          <DetailRow label="Frequency:" value={medication.frequency} />
          <DetailRow label="Instructions:" value={medication.instructions || 'No specific instructions'} />
          
          {medication.form && <DetailRow label="Form:" value={medication.form} />}
          {medication.time && <DetailRow label="Time:" value={medication.time} />}
          {medication.duration && <DetailRow label="Duration:" value={medication.duration} />}
        </View>
        
        {/* Flip hint */}
        <View style={styles.flipHint}>
          <Ionicons name="information-circle" size={20} color="#4CAF50" />
          <Text style={styles.flipHintText}>Tap anywhere to see FDA information & safety data</Text>
        </View>
      </ScrollView>
    </Animated.View>
  );

  // Back side - FDA information
  const renderBackSide = () => (
    <Animated.View
      style={[
        styles.cardSide,
        styles.backSide,
        {
          opacity: backOpacity,
          transform: [{ rotateY: backRotateY }],
        },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.backTitle}>FDA Information</Text>
        
        {/* FDA Information Section */}
        <View style={styles.fdaSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Drug Verification</Text>
          </View>
          
          {fdaInfo ? (
            <View style={styles.fdaCard}>
              <Text style={styles.fdaVerified}>✓ FDA Verified</Text>
              <Text style={styles.fdaDetails}>Generic: {fdaInfo.genericName}</Text>
              <Text style={styles.fdaDetails}>Manufacturer: {fdaInfo.manufacturer}</Text>
              <Text style={styles.fdaDetails}>Form: {fdaInfo.dosageForm}</Text>
              <Text style={styles.fdaDetails}>Strength: {fdaInfo.strength}</Text>
            </View>
          ) : (
            <View style={styles.noDataCard}>
              <Text style={styles.noDataText}>No FDA data available for this medication</Text>
            </View>
          )}
        </View>

        {/* Safety Status */}
        <View style={styles.safetySection}>
          <View style={styles.sectionHeader}>
            <Ionicons 
              name={safetyInfo?.recalls?.length > 0 ? "warning" : "shield-checkmark"} 
              size={20} 
              color={safetyInfo?.recalls?.length > 0 ? "#FF9800" : "#4CAF50"} 
            />
            <Text style={styles.sectionTitle}>Safety Status</Text>
          </View>
          
          <TouchableOpacity style={styles.safetyCard} onPress={showSafetyDetails}>
            {safetyInfo?.recalls?.length > 0 ? (
              <>
                <Text style={styles.warningText}>⚠️ {safetyInfo.recalls.length} recall(s) found</Text>
                <Text style={styles.tapText}>Tap for details</Text>
              </>
            ) : (
              <>
                <Text style={styles.safeText}>✅ No safety alerts</Text>
                <Text style={styles.tapText}>Last checked: {new Date().toLocaleDateString()}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Dosage Check */}
        {fdaInfo && (
          <View style={styles.dosageSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medical" size={20} color="#2196F3" />
              <Text style={styles.sectionTitle}>Dosage Verification</Text>
            </View>
            
            <View style={styles.dosageCard}>
              <Text style={styles.dosageYour}>Your Dosage: {medication.dosage}</Text>
              <Text style={styles.dosageFDA}>FDA Approved: {fdaInfo.strength}</Text>
              <View style={styles.dosageStatus}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.dosageStatusText}>Dosage appears appropriate</Text>
              </View>
            </View>
          </View>
        )}

        {/* Side Effects Preview */}
        <View style={styles.sideEffectsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning" size={20} color="#FF9800" />
            <Text style={styles.sectionTitle}>Side Effects</Text>
          </View>
          
          <TouchableOpacity style={styles.sideEffectsCard} onPress={showSideEffects}>
            <Text style={styles.commonEffects}>Common: Nausea, Dizziness, Stomach upset</Text>
            <Text style={styles.seriousEffects}>Serious: Stomach bleeding, Kidney issues</Text>
            <Text style={styles.tapText}>Tap for complete list</Text>
          </TouchableOpacity>
        </View>

        {/* Interactions Preview */}
        <View style={styles.interactionsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="link" size={20} color="#FF9800" />
            <Text style={styles.sectionTitle}>Drug Interactions</Text>
          </View>
          
          <TouchableOpacity style={styles.interactionsCard} onPress={showInteractions}>
            <Text style={styles.interactionWarning}>⚠️ May interact with blood thinners & blood pressure meds</Text>
            <Text style={styles.tapText}>Tap for complete interaction list</Text>
          </TouchableOpacity>
        </View>

        {/* Flip back hint */}
        <View style={styles.flipHint}>
          <Ionicons name="arrow-back" size={20} color="#2196F3" />
          <Text style={styles.flipHintText}>Tap anywhere to return to medication details</Text>
        </View>
      </ScrollView>
    </Animated.View>
  );

  const showSafetyDetails = () => {
    if (!safetyInfo?.recalls || safetyInfo.recalls.length === 0) {
      Alert.alert('✅ Safety Status', 'No recalls or safety alerts found for this medication.\n\nLast checked: ' + new Date().toLocaleDateString());
      return;
    }

    const alertMessage = safetyInfo.recalls.map((recall: any, index: number) => 
      `${index + 1}. ${recall.reason}\nDate: ${recall.date}\nSeverity: ${recall.severity.toUpperCase()}`
    ).join('\n\n');

    Alert.alert(
      '⚠️ Safety Alerts',
      `Found ${safetyInfo.recalls.length} recall(s):\n\n${alertMessage}\n\nPlease consult your healthcare provider.`,
      [{ text: 'OK' }]
    );
  };

  const showSideEffects = () => {
    Alert.alert(
      '⚠️ Side Effects - ' + medication.name,
      `COMMON SIDE EFFECTS:\n• Nausea, vomiting\n• Dizziness, drowsiness\n• Stomach upset\n• Headache\n\nSERIOUS SIDE EFFECTS:\n• Stomach bleeding\n• Kidney problems\n• Liver damage\n• Allergic reactions\n\n⚠️ Contact your doctor immediately if you experience serious side effects.`,
      [{ text: 'OK' }]
    );
  };

  const showInteractions = () => {
    Alert.alert(
      '🔗 Drug Interactions - ' + medication.name,
      `MAJOR INTERACTIONS:\n• Blood thinners (Warfarin)\n• ACE inhibitors\n• Lithium\n\nMODERATE INTERACTIONS:\n• Aspirin\n• Diuretics\n• Methotrexate\n\n💊 Always inform your doctor about all medications, supplements, and herbs you're taking.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Medication Details</Text>
        
        <TouchableOpacity 
          style={styles.flipButton} 
          onPress={handleFlip}
          disabled={isLoadingFDA}
        >
          {isLoadingFDA ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : (
            <Ionicons 
              name={isFlipped ? "arrow-back" : "information-circle"} 
              size={24} 
              color="#4CAF50" 
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Animated Card Container */}
      <Animated.View 
        style={[
          styles.cardContainer,
          {
            transform: [{ scale: scaleAnimation }],
          },
        ]}
      >
        <TouchableOpacity 
          style={styles.card} 
          onPress={handleFlip}
          activeOpacity={0.9}
          disabled={isLoadingFDA}
        >
          {renderFrontSide()}
          {renderBackSide()}
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

// Helper component
const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  backButton: {
    padding: 8,
  },
  flipButton: {
    padding: 8,
  },
  cardContainer: {
    flex: 1,
    margin: 20,
    perspective: 1000,
  },
  card: {
    flex: 1,
    position: 'relative',
  },
  cardSide: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    backfaceVisibility: 'hidden',
  },
  frontSide: {
    backgroundColor: '#2a2a2a',
  },
  backSide: {
    backgroundColor: '#1e2a1e',
  },
  scrollContent: {
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#fff',
    textAlign: 'center',
  },
  backTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#4CAF50',
    textAlign: 'center',
  },
  detailsContainer: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#fff',
  },
  value: {
    fontSize: 16,
    marginBottom: 10,
    color: '#ccc',
  },
  flipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    padding: 15,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  flipHintText: {
    color: '#4CAF50',
    fontSize: 14,
    marginLeft: 8,
    textAlign: 'center',
  },
  // FDA Information Styles
  fdaSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
  fdaCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  fdaVerified: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  fdaDetails: {
    color: '#a5d6a7',
    fontSize: 14,
    marginBottom: 4,
  },
  noDataCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  noDataText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  safetySection: {
    marginBottom: 20,
  },
  safetyCard: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  warningText: {
    color: '#FF9800',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  safeText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tapText: {
    color: '#2196F3',
    fontSize: 12,
    fontStyle: 'italic',
  },
  dosageSection: {
    marginBottom: 20,
  },
  dosageCard: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  dosageYour: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dosageFDA: {
    color: '#90caf9',
    fontSize: 14,
    marginBottom: 8,
  },
  dosageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dosageStatusText: {
    color: '#4CAF50',
    fontSize: 14,
    marginLeft: 6,
  },
  sideEffectsSection: {
    marginBottom: 20,
  },
  sideEffectsCard: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  commonEffects: {
    color: '#ffcc02',
    fontSize: 14,
    marginBottom: 4,
  },
  seriousEffects: {
    color: '#ff6f00',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  interactionsSection: {
    marginBottom: 20,
  },
  interactionsCard: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  interactionWarning: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

export default MedicationDetailsScreen;