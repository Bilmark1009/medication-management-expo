// FlipCardMedicationDetails.tsx - Properly integrated with enhanced safety service
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { enhancedSafetyService, DrugSafetyInfo } from '../services/safetyserviceapi';

interface FlipCardMedicationDetailsProps {
  medication: {
    name: string;
    form: string;
    dosage: string;
    frequency: string;
    time: string;
    duration: string;
    status: string;
    lastTaken: string;
    notes: string;
  };
  // Add this to get other medications for interaction checking
  allMedications?: string[];
  onClose: () => void;
}

const FlipCardMedicationDetails: React.FC<FlipCardMedicationDetailsProps> = ({ 
  medication, 
  allMedications = [],
  onClose 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [drugSafetyInfo, setDrugSafetyInfo] = useState<DrugSafetyInfo | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataSource, setDataSource] = useState<string>('');
  
  // Animation values
  const flipAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadComprehensiveSafetyData();
  }, []);

  const loadComprehensiveSafetyData = async () => {
    setIsLoadingData(true);
    try {
      console.log('Loading comprehensive safety data for:', medication.name);
      
      const safetyData = await enhancedSafetyService.getComprehensiveDrugSafety(
        medication.name, 
        allMedications
      );
      
      setDrugSafetyInfo(safetyData);
      
      // Set data source indicator
      if (safetyData.fdaApproved) {
        setDataSource('FDA Database');
      } else if (safetyData.sideEffects.source === 'pattern') {
        setDataSource('Medical Knowledge Base');
      } else {
        setDataSource('Limited Data Available');
      }
      
      console.log('Safety data loaded:', safetyData);
      
    } catch (error) {
      console.error('Error loading safety data:', error);
      Alert.alert(
        'Data Loading Error',
        'Unable to fetch complete medication safety information. Some features may be limited.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleFlip = () => {
    if (isLoadingData) return;
    
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

  // Animation interpolations
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

  const showSideEffects = () => {
    if (!drugSafetyInfo?.sideEffects) {
      Alert.alert(
        'Information Unavailable',
        'Side effects data could not be loaded. Please consult your healthcare provider or medication leaflet for complete information.',
        [{ text: 'OK' }]
      );
      return;
    }

    const { common, serious, rare, source } = drugSafetyInfo.sideEffects;
    
    let alertMessage = '';
    let sourceText = '';
    
    // Add source information
    switch (source) {
      case 'fda':
        sourceText = '📋 Source: FDA Official Database\n\n';
        break;
      case 'pattern':
        sourceText = '📚 Source: Medical Knowledge Base\n\n';
        break;
      default:
        sourceText = '⚠️ Limited data available\n\n';
    }
    
    alertMessage += sourceText;
    
    if (common.length > 0) {
      alertMessage += `COMMON SIDE EFFECTS:\n• ${common.join('\n• ')}\n\n`;
    }
    
    if (serious.length > 0) {
      alertMessage += `SERIOUS SIDE EFFECTS:\n• ${serious.join('\n• ')}\n\n`;
    }
    
    if (rare.length > 0) {
      alertMessage += `RARE SIDE EFFECTS:\n• ${rare.join('\n• ')}\n\n`;
    }
    
    if (common.length === 0 && serious.length === 0 && rare.length === 0) {
      alertMessage += 'No specific side effects data available.\n\n';
    }
    
    alertMessage += '⚠️ Contact your healthcare provider if you experience any concerning symptoms.';
    
    Alert.alert(
      `Side Effects - ${medication.name}`,
      alertMessage,
      [{ text: 'OK' }]
    );
  };

  const showInteractions = () => {
    if (!drugSafetyInfo?.interactions || drugSafetyInfo.interactions.length === 0) {
      Alert.alert(
        'Drug Interactions',
        `No known interactions found for ${medication.name} with your current medications.\n\n💊 Always inform your healthcare provider about all medications, supplements, and herbal products you are taking.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const interactions = drugSafetyInfo.interactions;
    
    let alertMessage = '🔗 DETECTED INTERACTIONS:\n\n';
    
    interactions.forEach((interaction, index) => {
      const severityIcon = interaction.severity === 'serious' ? '🚨' : 
                          interaction.severity === 'warning' ? '⚠️' : '⚡';
      
      alertMessage += `${severityIcon} ${interaction.warning.toUpperCase()}\n`;
      alertMessage += `Medications: ${interaction.medications.join(' + ')}\n`;
      
      if (interaction.description) {
        alertMessage += `Details: ${interaction.description}\n`;
      }
      
      if (index < interactions.length - 1) {
        alertMessage += '\n';
      }
    });
    
    alertMessage += '\n\n💊 Always consult your healthcare provider before making any changes to your medications.';
    
    Alert.alert(
      `Drug Interactions - ${medication.name}`,
      alertMessage,
      [{ text: 'OK' }]
    );
  };

  const showRecallInfo = () => {
    if (!drugSafetyInfo?.recalls || drugSafetyInfo.recalls.length === 0) {
      Alert.alert(
        'Safety Status',
        `✅ No recent recalls found for ${medication.name}.\n\nThis medication appears to be safe based on current FDA safety data.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const recalls = drugSafetyInfo.recalls;
    
    let alertMessage = '⚠️ RECALL INFORMATION:\n\n';
    
    recalls.forEach((recall, index) => {
      const severityIcon = recall.severity === 'high' ? '🚨' : 
                          recall.severity === 'medium' ? '⚠️' : '⚡';
      
      alertMessage += `${severityIcon} ${recall.severity.toUpperCase()} RISK\n`;
      alertMessage += `Date: ${recall.date}\n`;
      alertMessage += `Reason: ${recall.reason}\n`;
      alertMessage += `Company: ${recall.company}\n`;
      
      if (index < recalls.length - 1) {
        alertMessage += '\n';
      }
    });
    
    alertMessage += '\n\n🏥 Contact your healthcare provider immediately if you have concerns about recalled medications.';
    
    Alert.alert(
      `Recall Information - ${medication.name}`,
      alertMessage,
      [{ text: 'OK' }]
    );
  };

  // Helper function to get safety colors
  const getSafetyColor = (score: string) => {
    switch (score) {
      case 'safe': return '#4CAF50';
      case 'caution': return '#FF9800';
      case 'warning': return '#FF5722';
      case 'critical': return '#F44336';
      default: return '#666';
    }
  };

  const getSafetyBackgroundColor = (score: string) => {
    switch (score) {
      case 'safe': return 'rgba(76, 175, 80, 0.2)';
      case 'caution': return 'rgba(255, 152, 0, 0.2)';
      case 'warning': return 'rgba(255, 87, 34, 0.2)';
      case 'critical': return 'rgba(244, 67, 54, 0.2)';
      default: return 'rgba(158, 158, 158, 0.2)';
    }
  };

  // Front side rendering
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
      <ScrollView showsVerticalScrollIndicator={false}>
        <DetailRow label="Medicine Name:" value={medication.name} />
        <DetailRow label="Form:" value={medication.form} />
        <DetailRow label="Dosage:" value={medication.dosage} />
        <DetailRow label="Frequency:" value={medication.frequency} />
        <DetailRow label="Time:" value={medication.time} />
        <DetailRow label="Duration:" value={medication.duration} />
        
        <View style={styles.statusRow}>
          <Text style={styles.label}>Today's Status:</Text>
          <View style={[styles.statusBadge, { 
            backgroundColor: medication.status === 'taken' ? '#4CAF50' : '#666' 
          }]}>
            <Text style={styles.statusText}>{medication.status}</Text>
          </View>
        </View>
        
        <DetailRow label="Last Taken:" value={medication.lastTaken} />
        <DetailRow label="Notes:" value={medication.notes} />

        {/* Quick Safety Preview */}
        {drugSafetyInfo && (
          <View style={styles.safetyPreview}>
            <Text style={styles.safetyPreviewTitle}>Safety Status:</Text>
            <View style={[styles.safetyBadge, { 
              backgroundColor: getSafetyColor(drugSafetyInfo.safetyScore.score)
            }]}>
              <Text style={styles.safetyBadgeText}>
                {drugSafetyInfo.safetyScore.score.toUpperCase()}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
      
      <View style={styles.flipHint}>
        <Ionicons name="information-circle" size={16} color="#4CAF50" />
        <Text style={styles.flipHintText}>
          Tap anywhere to see safety information
        </Text>
      </View>
    </Animated.View>
  );

  // Back side rendering with real data
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
      <ScrollView showsVerticalScrollIndicator={false}>
        {isLoadingData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading safety data...</Text>
          </View>
        ) : drugSafetyInfo ? (
          <>
            {/* Overall Safety Score */}
            <View style={styles.safetyScoreSection}>
              <Text style={styles.sectionTitle}>Overall Safety Assessment</Text>
              <View style={[styles.safetyScoreCard, { 
                backgroundColor: getSafetyBackgroundColor(drugSafetyInfo.safetyScore.score),
                borderColor: getSafetyColor(drugSafetyInfo.safetyScore.score)
              }]}>
                <Text style={[styles.safetyScoreText, {
                  color: getSafetyColor(drugSafetyInfo.safetyScore.score)
                }]}>
                  {drugSafetyInfo.safetyScore.score.toUpperCase()}
                </Text>
                <Text style={styles.safetyMessage}>
                  {drugSafetyInfo.safetyScore.message}
                </Text>
                {drugSafetyInfo.safetyScore.details.map((detail, index) => (
                  <Text key={index} style={styles.safetyDetail}>• {detail}</Text>
                ))}
              </View>
            </View>

            {/* FDA Status */}
            <View style={styles.fdaSection}>
              <View style={styles.sectionHeader}>
                <Ionicons 
                  name={drugSafetyInfo.fdaApproved ? "shield-checkmark" : "shield-outline"} 
                  size={20} 
                  color={drugSafetyInfo.fdaApproved ? "#4CAF50" : "#FF9800"} 
                />
                <Text style={styles.sectionTitle}>FDA Status</Text>
              </View>
              
              <View style={styles.fdaCard}>
                <Text style={[styles.fdaStatus, {
                  color: drugSafetyInfo.fdaApproved ? "#4CAF50" : "#FF9800"
                }]}>
                  {drugSafetyInfo.fdaApproved ? "✓ FDA Approved" : "⚠ Limited FDA Data"}
                </Text>
                <Text style={styles.dataSource}>Data Source: {dataSource}</Text>
                <Text style={styles.lastUpdated}>
                  Updated: {new Date(drugSafetyInfo.lastUpdated).toLocaleDateString()}
                </Text>
              </View>
            </View>

            {/* Safety Alerts & Recalls */}
            <View style={styles.recallSection}>
              <View style={styles.sectionHeader}>
                <Ionicons 
                  name={drugSafetyInfo.recalls.length > 0 ? "warning" : "shield-checkmark"} 
                  size={20} 
                  color={drugSafetyInfo.recalls.length > 0 ? "#FF9800" : "#4CAF50"} 
                />
                <Text style={styles.sectionTitle}>Safety Alerts</Text>
              </View>
              
              <TouchableOpacity style={styles.recallCard} onPress={showRecallInfo}>
                {drugSafetyInfo.recalls.length > 0 ? (
                  <>
                    <Text style={styles.warningText}>
                      ⚠️ {drugSafetyInfo.recalls.length} recall(s) found
                    </Text>
                    <Text style={styles.recallSummary}>
                      Most recent: {drugSafetyInfo.recalls[0]?.date}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.safeText}>✅ No safety alerts</Text>
                )}
                <Text style={styles.tapToView}>Tap for details</Text>
              </TouchableOpacity>
            </View>

            {/* Side Effects */}
            <View style={styles.sideEffectsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medical" size={20} color="#FF9800" />
                <Text style={styles.sectionTitle}>Side Effects</Text>
              </View>
              
              <TouchableOpacity style={styles.sideEffectsCard} onPress={showSideEffects}>
                {drugSafetyInfo.sideEffects.source !== 'unavailable' ? (
                  <>
                    {drugSafetyInfo.sideEffects.common.length > 0 && (
                      <Text style={styles.commonEffects}>
                        Common: {drugSafetyInfo.sideEffects.common.slice(0, 3).join(', ')}
                        {drugSafetyInfo.sideEffects.common.length > 3 && '...'}
                      </Text>
                    )}
                    {drugSafetyInfo.sideEffects.serious.length > 0 && (
                      <Text style={styles.seriousEffects}>
                        Serious: {drugSafetyInfo.sideEffects.serious.slice(0, 2).join(', ')}
                        {drugSafetyInfo.sideEffects.serious.length > 2 && '...'}
                      </Text>
                    )}
                    <Text style={styles.dataSourceBadge}>
                      {drugSafetyInfo.sideEffects.source === 'fda' ? '📋 FDA Data' : '📚 Medical DB'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.noDataText}>Side effects data not available</Text>
                    <Text style={styles.consultText}>Consult healthcare provider</Text>
                  </>
                )}
                <Text style={styles.tapToView}>Tap for complete list</Text>
              </TouchableOpacity>
            </View>

            {/* Drug Interactions */}
            <View style={styles.interactionsSection}>
              <View style={styles.sectionHeader}>
                <Ionicons 
                  name="link" 
                  size={20} 
                  color={drugSafetyInfo.interactions.length > 0 ? "#FF9800" : "#4CAF50"} 
                />
                <Text style={styles.sectionTitle}>Drug Interactions</Text>
              </View>
              
              <TouchableOpacity style={styles.interactionsCard} onPress={showInteractions}>
                {drugSafetyInfo.interactions.length > 0 ? (
                  <>
                    <Text style={styles.interactionCount}>
                      {drugSafetyInfo.interactions.length} interaction(s) detected
                    </Text>
                    {drugSafetyInfo.interactions.some(i => i.severity === 'serious') && (
                      <Text style={styles.seriousInteraction}>
                        🚨 Serious interaction detected
                      </Text>
                    )}
                    <Text style={styles.interactionSummary}>
                      With: {drugSafetyInfo.interactions[0]?.medications.join(', ')}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.noInteractionText}>
                    ✅ No interactions with current medications
                  </Text>
                )}
                <Text style={styles.tapToView}>Tap for details</Text>
              </TouchableOpacity>
            </View>

            {/* Medical Disclaimer */}
            <View style={styles.disclaimerSection}>
              <Text style={styles.disclaimerText}>
                ⚕️ This information is for educational purposes only. Always consult your healthcare provider for medical advice and before making any changes to your medications.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="warning-outline" size={48} color="#FF9800" />
            <Text style={styles.errorText}>Unable to load safety data</Text>
            <Text style={styles.errorSubtext}>
              Please check your internet connection and try again
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.flipHint}>
        <Ionicons name="arrow-back" size={16} color="#2196F3" />
        <Text style={styles.flipHintText}>Tap anywhere to go back</Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.modalContainer}>
      <TouchableOpacity
        activeOpacity={0.94}
        style={styles.cardTouchable}
        onPress={handleFlip}
      >
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnimation }] }]}> 
          {isFlipped ? renderBackSide() : renderFrontSide()}
        </Animated.View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  cardTouchable: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
  },
  card: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
  },
  cardSide: {
    ...StyleSheet.absoluteFillObject,
    backfaceVisibility: 'hidden',
  },
  frontSide: {
    // Front side specific styles
  },
  backSide: {
    backgroundColor: '#1e2a1e',
  },
  detailRow: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
    color: '#ccc',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  safetyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  safetyPreviewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  safetyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 10,
  },
  safetyBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  flipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  flipHintText: {
    color: '#4CAF50',
    fontSize: 12,
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    color: '#4CAF50',
    fontSize: 14,
    marginTop: 10,
  },
  safetyScoreSection: {
    marginBottom: 20,
  },
  safetyScoreCard: {
    borderRadius: 8,
    padding: 15,
    borderWidth: 2,
  },
  safetyScoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  safetyMessage: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  safetyDetail: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 2,
  },
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
    padding: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  fdaStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dataSource: {
    color: '#a5d6a7',
    fontSize: 12,
    marginBottom: 2,
  },
  lastUpdated: {
    color: '#81c784',
    fontSize: 10,
  },
  recallSection: {
    marginBottom: 20,
  },
  recallCard: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  warningText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recallSummary: {
    color: '#ffcc02',
    fontSize: 12,
    marginBottom: 4,
  },
  safeText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sideEffectsSection: {
    marginBottom: 20,
  },
  sideEffectsCard: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  commonEffects: {
    color: '#ffcc02',
    fontSize: 12,
    marginBottom: 4,
  },
  seriousEffects: {
    color: '#ff6f00',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dataSourceBadge: {
    color: '#2196F3',
    fontSize: 10,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  noDataText: {
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  consultText: {
    color: '#ffcc02',
    fontSize: 11,
    marginBottom: 4,
  },
  interactionsSection: {
    marginBottom: 20,
  },
  interactionsCard: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  interactionCount: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  seriousInteraction: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  interactionSummary: {
    color: '#ffcc02',
    fontSize: 12,
    marginBottom: 4,
  },
  noInteractionText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tapToView: {
    color: '#2196F3',
    fontSize: 10,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  disclaimerSection: {
    marginTop: 20,
    padding: 12,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  disclaimerText: {
    color: '#90caf9',
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorText: {
    color: '#FF9800',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
  },
});

export default FlipCardMedicationDetails;