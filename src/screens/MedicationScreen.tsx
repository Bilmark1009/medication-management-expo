import * as Notifications from 'expo-notifications';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  SafeAreaView,
  Modal,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { executeQuery } from '../utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medication as BaseMedication } from '../types/navigation';
import { 
  configureNotifications, 
  requestNotificationPermission,
  scheduleMedicationNotification,
  cancelAllNotifications,
  debugNotificationService,
  cancelScheduledNotification,
  type MedicationNotification
} from '../services/notificationService';
// **NEW: Add background task imports**
import { 
  checkMissedDosesToday,
  calculateSimpleAdherence 
} from '../services/backgroundTasks';
import ReactNativeModal from 'react-native-modal';
import FlipCardMedicationDetails from '../components/FlipCardMedicationDetails';
import DateTimePicker from '@react-native-community/datetimepicker';
import { simpleFDAService, SimpleDrugInfo } from '../services/FDAserviceapi';
// **UPDATED: Extended Medication type with background task fields**
type Medication = BaseMedication & {
  time: string;
  timeObj: Date;
  notification_id?: string;
  duration?: string;
  times?: Date[];
  // **NEW: Background task fields**
  daily_status?: string;
  last_reset_date?: string;
  last_taken_date?: string;
  daily_notes?: string;
};

const MEDICATION_FORMS = [
  { key: 'Tablet', icon: 'tablet-portrait-outline' },
  { key: 'Capsule', icon: 'medkit-outline' },
  { key: 'Liquid', icon: 'water-outline' },
  { key: 'Lotion', icon: 'color-fill-outline' },
  { key: 'Spray', icon: 'cloud-outline' },
  { key: 'Ointment', icon: 'flask-outline' },
  { key: 'Drops', icon: 'rainy-outline' },
  { key: 'Gel', icon: 'beaker-outline' },
  { key: 'Patch', icon: 'albums-outline' },
  { key: 'Injection', icon: 'fitness-outline' },
  { key: 'Inhaler', icon: 'cloudy-outline' },
  { key: 'Suppository', icon: 'cube-outline' },
  { key: 'Powder', icon: 'snow-outline' },
  { key: 'Chewable', icon: 'cafe-outline' },
  { key: 'Granules', icon: 'grid-outline' }
];

const FREQUENCIES = [
  { key: 'Once daily', times: 1 },
  { key: 'Twice daily', times: 2 },
  { key: 'Three times daily', times: 3 },
  { key: 'Four times daily', times: 4 },
  { key: 'Every 6 hours', times: 4 },
  { key: 'Every 8 hours', times: 3 },
];

// AddMedicationModal Component with DateTimePicker (keeping your existing implementation)
const AddMedicationModal = ({ visible, onClose, onDone }: any) => {
  const [step, setStep] = useState(1);
  const [medName, setMedName] = useState('');
  const [medForm, setMedForm] = useState<string | null>(null);
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<any>(null);
  const [times, setTimes] = useState<Date[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [duration, setDuration] = useState<string>('');
  const [fdaResults, setFdaResults] = useState<SimpleDrugInfo[]>([]);
const [showFdaResults, setShowFdaResults] = useState(false);
const [isSearching, setIsSearching] = useState(false);


  // **FIXED** Time generation with proper local time handling
  useEffect(() => {
    if (frequency && times.length !== frequency.times) {
      const count = frequency.times;
      const now = new Date();
      
      if (count > 1) {
        // Create evenly spaced times starting from 8 AM today
        const startTime = new Date();
        startTime.setHours(8, 0, 0, 0); // 8:00 AM today
        
        const interval = 24 / count; // hours between doses
        const generated: Date[] = [];
        
        for (let i = 0; i < count; i++) {
          const newTime = new Date(startTime);
          newTime.setHours(startTime.getHours() + Math.round(i * interval), 0, 0, 0);
          
          // If this time has passed today, move to tomorrow
          if (newTime <= now) {
            newTime.setDate(newTime.getDate() + 1);
          }
          
          generated.push(newTime);
        }
        
        setTimes(generated);
        console.log('🕐 Generated times for multiple doses:', generated.map(t => 
          `${t.toLocaleDateString()} ${t.toLocaleTimeString()}`
        ));
      } else {
        // Single dose - default to 1 hour from now
        const singleTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
        singleTime.setSeconds(0, 0); // Clear seconds and milliseconds
        
        setTimes([singleTime]);
        console.log('🕐 Generated single dose time:', singleTime.toLocaleString());
      }
    }
  }, [frequency]);

  // **FIXED** DateTimePicker change handler
  const onDateTimeChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    
    if (event.type === 'set' && selectedDate) {
      const now = new Date();
      let finalTime = new Date(selectedDate);
      
      // Ensure we're setting time for today
      finalTime.setFullYear(now.getFullYear(), now.getMonth(), now.getDate());
      
      // If the selected time has passed today, schedule for tomorrow
      if (finalTime <= now) {
        finalTime.setDate(finalTime.getDate() + 1);
        console.log(`⏭️ Selected time has passed, moved to tomorrow: ${finalTime.toLocaleString()}`);
      }
      
      console.log(`🕐 Time selected: ${finalTime.toLocaleString()}`);
      
      // Update the specific time in the array
      const newTimes = [...times];
      newTimes[currentTimeIndex] = finalTime;
      setTimes(newTimes);
      
      // For multiple doses, update subsequent times based on the first one
      if (currentTimeIndex === 0 && frequency && frequency.times > 1) {
        const count = frequency.times;
        const interval = 24 / count; // hours between doses
        const updatedTimes = [];
        
        for (let i = 0; i < count; i++) {
          const newTime = new Date(finalTime);
          newTime.setHours(finalTime.getHours() + Math.round(i * interval), finalTime.getMinutes(), 0, 0);
          
          // If any subsequent time passes midnight, adjust to next day
          if (i > 0 && newTime.getHours() < finalTime.getHours()) {
            newTime.setDate(newTime.getDate() + 1);
          }
          
          updatedTimes.push(newTime);
        }
        
        setTimes(updatedTimes);
        console.log('🕐 Updated all times based on first selection:', updatedTimes.map(t => 
          t.toLocaleTimeString()
        ));
      }
    }
  };

  const reset = () => {
    setStep(1);
    setMedName('');
    setMedForm(null);
    setDosage('');
    setFrequency(null);
    setTimes([]);
    setDuration('');
    setShowDatePicker(false);
    setCurrentTimeIndex(0);
  };

  const handleDone = () => {
    console.log('📋 Submitting medication with times:', times.map(t => ({
      local: t.toLocaleString(),
      iso: t.toISOString(),
      timestamp: t.getTime()
    })));
    
    onDone({ 
      name: medName, 
      form: medForm, 
      dosage, 
      frequency: frequency.key, 
      times, 
      duration 
    });
    reset();
    onClose();
  };

  return (
    <ReactNativeModal isVisible={visible} style={{margin:0}}>
      <View style={{flex:1, backgroundColor:'#181818'}}>
        {/* Header with Back/Close buttons */}
        <View style={{position:'absolute',top:40,left:0,right:0,zIndex:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center',width:'100%',paddingHorizontal:16}}>
          <TouchableOpacity
            onPress={() => {
              if (step > 1) {
                setStep(step - 1);
              } else {
                reset();
                onClose();
              }
            }}
            style={{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(44,44,44,0.9)',borderRadius:8,paddingVertical:8,paddingHorizontal:14,elevation:5}}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
            <Text style={{color:'#fff',fontSize:16,marginLeft:6,fontWeight:'600'}}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>{reset();onClose();}} style={{backgroundColor:'rgba(44,44,44,0.9)',borderRadius:8,padding:8}}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{flex:1, justifyContent:'center', alignItems:'center', padding:24}}>
          {/* Step 1: Medication Name */}
{step === 1 && (
  <View style={{width:'100%'}}>
    <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>
      Step 1: Medication Name
    </Text>
    
    <View style={{backgroundColor:'#232323',borderRadius:8,padding:16,marginBottom:16}}>
      <Text style={{color:'#aaa',fontSize:16,marginBottom:8}}>Enter medication name</Text>
      <View style={{backgroundColor:'#333',borderRadius:6,position:'relative'}}>
        <TextInput
          style={{color:'#fff',fontSize:18,padding:12,paddingRight:40}}
          placeholder="Start typing medication name..."
          placeholderTextColor="#888"
          value={medName}
          onChangeText={async (text) => {
            setMedName(text);
            
            if (text.length > 2) {
              setIsSearching(true);
              try {
                const results = await simpleFDAService.searchMedications(text);
                setFdaResults(results);
                setShowFdaResults(results.length > 0);
              } catch (error) {
                console.error('Search error:', error);
                setShowFdaResults(false);
              } finally {
                setIsSearching(false);
              }
            } else {
              setShowFdaResults(false);
              setIsSearching(false);
            }
          }}
        />
        
        {/* Loading indicator */}
        {isSearching && (
          <View style={{
            position:'absolute',
            right:12,
            top:12,
            width:20,
            height:20,
          }}>
            <ActivityIndicator size="small" color="#4CAF50" />
          </View>
        )}
        
        {/* FDA badge when not searching */}
        {!isSearching && medName.length > 2 && (
          <View style={{
            position:'absolute',
            right:8,
            top:8,
            backgroundColor:'#4CAF50',
            borderRadius:4,
            paddingHorizontal:6,
            paddingVertical:2,
          }}>
            <Text style={{color:'#fff',fontSize:10,fontWeight:'bold'}}>FDA</Text>
          </View>
        )}
      </View>
      
      {/* Improved FDA Results Dropdown */}
      {showFdaResults && (
        <View style={{
          backgroundColor:'#1a1a1a',
          borderRadius:6,
          marginTop:8,
          maxHeight:250,
          borderWidth:1,
          borderColor:'#4CAF50',
          shadowColor:'#4CAF50',
          shadowOffset:{width:0,height:2},
          shadowOpacity:0.3,
          shadowRadius:4,
          elevation:5,
        }}>
          {/* Header */}
          <View style={{
            backgroundColor:'#4CAF50',
            paddingVertical:8,
            paddingHorizontal:12,
            flexDirection:'row',
            alignItems:'center',
          }}>
            <Ionicons name="shield-checkmark" size={16} color="#fff" />
            <Text style={{color:'#fff',fontSize:12,fontWeight:'bold',marginLeft:6}}>
              FDA Verified Medications
            </Text>
            <Text style={{color:'#fff',fontSize:10,marginLeft:'auto'}}>
              {fdaResults.length} found
            </Text>
          </View>
          
          <ScrollView style={{maxHeight:200}} showsVerticalScrollIndicator={false}>
            {fdaResults.map((drug, index) => (
              <TouchableOpacity
                key={index}
                style={{
                  padding:12,
                  borderBottomWidth: index < fdaResults.length - 1 ? 1 : 0,
                  borderBottomColor:'#333',
                  backgroundColor: index % 2 === 0 ? '#1a1a1a' : '#1e1e1e',
                }}
                onPress={() => {
                  // Auto-fill from FDA data
                  setMedName(drug.brandName);
                  if (drug.dosageForm !== 'Unknown') setMedForm(drug.dosageForm);
                  if (drug.strength !== 'Unknown') setDosage(drug.strength);
                  setShowFdaResults(false);
                }}
                activeOpacity={0.7}
              >
                <View style={{flexDirection:'row',alignItems:'center',marginBottom:4}}>
                  <Text style={{
                    color:'#fff',
                    fontSize:16,
                    fontWeight:'600',
                    flex:1,
                  }}>
                    {drug.brandName}
                  </Text>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                </View>
                
                {drug.genericName !== 'Unknown' && drug.genericName !== drug.brandName && (
                  <Text style={{color:'#aaa',fontSize:13,marginBottom:2}}>
                    Generic: {drug.genericName}
                  </Text>
                )}
                
                <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
                  {drug.strength !== 'Unknown' && (
                    <Text style={{color:'#4CAF50',fontSize:11,backgroundColor:'rgba(76,175,80,0.2)',paddingHorizontal:6,paddingVertical:2,borderRadius:4}}>
                      {drug.strength}
                    </Text>
                  )}
                  {drug.dosageForm !== 'Unknown' && (
                    <Text style={{color:'#2196F3',fontSize:11,backgroundColor:'rgba(33,150,243,0.2)',paddingHorizontal:6,paddingVertical:2,borderRadius:4}}>
                      {drug.dosageForm}
                    </Text>
                  )}
                </View>
                
                {drug.manufacturer !== 'Unknown' && (
                  <Text style={{color:'#666',fontSize:10,marginTop:4}}>
                    {drug.manufacturer}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Footer */}
          <View style={{
            backgroundColor:'#2a2a2a',
            paddingVertical:6,
            paddingHorizontal:12,
            alignItems:'center',
          }}>
            <Text style={{color:'#666',fontSize:10}}>
              Tap any medication to auto-fill details
            </Text>
          </View>
        </View>
      )}
      
      {/* No results message */}
      {!isSearching && medName.length > 2 && !showFdaResults && (
        <View style={{
          backgroundColor:'#333',
          borderRadius:6,
          marginTop:8,
          padding:12,
          alignItems:'center',
        }}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <Text style={{color:'#666',fontSize:12,marginTop:4}}>
            No FDA matches found. You can still continue manually.
          </Text>
        </View>
      )}
    </View>
    
    <TouchableOpacity 
      style={{backgroundColor: medName.trim() ? '#F44336' : '#666',padding:14,borderRadius:8,alignItems:'center'}} 
      disabled={!medName.trim()} 
      onPress={()=>setStep(2)}
    >
      <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
    </TouchableOpacity>
  </View>
)}


          {/* Step 2: Medication Form */}
          {step === 2 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 2: Select Medication Form</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16,justifyContent:'center'}}>
                {MEDICATION_FORMS.map(f => (
                  <TouchableOpacity 
                    key={f.key} 
                    onPress={()=>setMedForm(f.key)} 
                    style={{backgroundColor:medForm===f.key?'#F44336':'#232323',borderRadius:8,padding:12,margin:4,alignItems:'center',width:90}}
                  >
                    <Ionicons name={f.icon as any} size={28} color={medForm===f.key?'#fff':'#aaa'} />
                    <Text style={{color:medForm===f.key?'#fff':'#aaa',marginTop:4,fontSize:13}}>{f.key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity 
                style={{backgroundColor: medForm ? '#F44336' : '#666',padding:14,borderRadius:8,alignItems:'center'}} 
                disabled={!medForm} 
                onPress={()=>setStep(3)}
              >
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Dosage */}
          {step === 3 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 3: Dosage</Text>
              <View style={{backgroundColor:'#232323',borderRadius:8,padding:16,marginBottom:16}}>
                <Text style={{color:'#aaa',fontSize:16,marginBottom:8}}>Enter dosage (e.g., 500mg, 1 tablet)</Text>
                <View style={{backgroundColor:'#333',borderRadius:6}}>
                  <TextInput
                    style={{color:'#fff',fontSize:18,padding:12}}
                    placeholder="Dosage"
                    placeholderTextColor="#888"
                    value={dosage}
                    onChangeText={setDosage}
                  />
                </View>
              </View>
              <TouchableOpacity 
                style={{backgroundColor: dosage.trim() ? '#F44336' : '#666',padding:14,borderRadius:8,alignItems:'center'}} 
                disabled={!dosage.trim()} 
                onPress={()=>setStep(4)}
              >
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 4: Frequency */}
          {step === 4 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 4: Choose Frequency</Text>
              <View style={{marginBottom:16}}>
                {FREQUENCIES.map(f => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={()=>setFrequency(f)}
                    style={{backgroundColor:frequency?.key===f.key?'#F44336':'#232323',borderRadius:8,padding:14,marginVertical:4}}
                  >
                    <Text style={{color:frequency?.key===f.key?'#fff':'#aaa',fontSize:16}}>{f.key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity 
                style={{backgroundColor: frequency ? '#F44336' : '#666',padding:14,borderRadius:8,alignItems:'center'}} 
                disabled={!frequency} 
                onPress={()=>setStep(5)}
              >
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 5: Set Schedule with DateTimePicker */}
          {step === 5 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 5: Set Schedule</Text>
              <Text style={{color:'#aaa',marginBottom:12}}>Set intake times</Text>
              
              {times.map((time, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  onPress={() => {
                    setCurrentTimeIndex(idx);
                    setShowDatePicker(true);
                  }} 
                  style={{backgroundColor:'#232323',borderRadius:8,padding:14,marginBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}
                >
                  <Text style={{color:'#fff',fontSize:18}}>Intake {idx+1}</Text>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{color:'#F44336',fontSize:16}}>
                      {time.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}
                    </Text>
                    <Ionicons name="time-outline" size={20} color="#F44336" style={{marginLeft:8}} />
                  </View>
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity 
                style={{backgroundColor:'#F44336',padding:14,borderRadius:8,alignItems:'center',marginTop:12}} 
                onPress={()=>setStep(6)}
              >
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>

              {/* DateTimePicker */}
              {showDatePicker && (
                <DateTimePicker
                  value={times[currentTimeIndex] || new Date()}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateTimeChange}
                />
              )}
            </View>
          )}

          {/* Step 6: Duration */}
          {step === 6 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 6: Set Duration</Text>
              <Text style={{color:'#aaa',marginBottom:12}}>How long will you take this medication?</Text>
              <View style={{marginBottom:16}}>
                {['Everyday (no end date)','1 week','2 weeks','1 month','3 months','Custom'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={()=>setDuration(d)}
                    style={{backgroundColor:duration===d?'#F44336':'#232323',borderRadius:8,padding:14,marginVertical:4}}
                  >
                    <Text style={{color:duration===d?'#fff':'#aaa',fontSize:16}}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity 
                style={{backgroundColor: duration ? '#F44336' : '#666',padding:14,borderRadius:8,alignItems:'center',marginTop:8}} 
                disabled={!duration} 
                onPress={()=>setStep(7)}
              >
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 7: Confirmation */}
          {step === 7 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 7: Confirm Details</Text>
              <Text style={{color:'#aaa',marginBottom:12}}>Review your medication details before saving.</Text>
              <View style={{backgroundColor:'#232323',borderRadius:8,padding:16,marginBottom:16}}>
                <Text style={{color:'#fff',fontSize:18,marginBottom:8}}>Name: {medName}</Text>
                <Text style={{color:'#fff',fontSize:18,marginBottom:8}}>Form: {medForm}</Text>
                <Text style={{color:'#fff',fontSize:18,marginBottom:8}}>Dosage: {dosage}</Text>
                <Text style={{color:'#fff',fontSize:18,marginBottom:8}}>Frequency: {frequency?.key}</Text>
                <Text style={{color:'#fff',fontSize:18,marginBottom:8}}>Duration: {duration}</Text>
                <Text style={{color:'#fff',fontSize:18,marginBottom:8}}>
                  Times: {times.map(t => t.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})).join(', ')}
                </Text>
              </View>
              <TouchableOpacity 
                style={{backgroundColor:'#F44336',padding:14,borderRadius:8,alignItems:'center',marginBottom:8}} 
                onPress={handleDone}
              >
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Add Medication</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={{backgroundColor:'#aaa',padding:10,borderRadius:8,alignItems:'center'}} 
                onPress={()=>setStep(1)}
              >
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:16}}>Start Over</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </ReactNativeModal>
  );
};

// Main MedicationScreen Component
const MedicationScreen: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isDebugMenuOpen, setIsDebugMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailModal, setDetailModal] = useState<{visible: boolean, medication: Medication | null}>({visible: false, medication: null});
  
  // **NEW: Background task integration states**
  const [missedDoses, setMissedDoses] = useState<Medication[]>([]);
  const [adherenceData, setAdherenceData] = useState({ adherence: 0, total: 0, taken: 0, missed: 0 });
  
  const navigation = useNavigation<any>();

  useEffect(() => {
    const initNotifications = async () => {
      await configureNotifications();
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications to receive medication reminders.',
          [{ text: 'OK' }]
        );
      }
      loadMedications();
    };
    
    initNotifications();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMedications();
      loadBackgroundTaskData(); // **NEW: Load background task data**
    });
    return unsubscribe;
  }, [navigation]);

  // **NEW: Load background task data**
  const loadBackgroundTaskData = async () => {
    try {
      const missed = await checkMissedDosesToday();
      setMissedDoses(missed);
      
      const adherence = await calculateSimpleAdherence(7);
      setAdherenceData(adherence);
      
      console.log(`📊 Medication screen - Missed: ${missed.length}, Adherence: ${adherence.adherence}%`);
    } catch (error) {
      console.error('❌ Error loading background task data:', error);
    }
  };

  const loadMedications = async () => {
    try {
      const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
      if (!currentUser?.id) throw new Error('User not logged in');
      
      // **UPDATED: Load medications with background task fields**
      const result = await executeQuery(
        'SELECT * FROM medications WHERE user_id = ? ORDER BY time ASC;',
        [currentUser.id]
      ) as Array<BaseMedication & { 
        time: string; 
        daily_status?: string; 
        last_reset_date?: string;
        last_taken_date?: string;
        daily_notes?: string;
      }>;
      
      const meds: Medication[] = (result || []).map(med => ({
        ...med,
        time: med.time,
        timeObj: new Date(med.time)
      }));
      
      setMedications(meds);
    } catch (error) {
      console.error('Error loading medications:', error);
      Alert.alert('Error', 'Failed to load medications');
    } finally {
      setIsLoading(false);
    }
  };

  // **UPDATED: handleAddMedication with background task support**
  const handleAddMedication = async (med: { 
    name: string; 
    form?: string; 
    dosage: string; 
    frequency: string; 
    times: Date[]; 
    duration?: string 
  }) => {
    try {
      console.log('🚀 Starting medication addition process...');
      
      const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
      if (!currentUser?.id) {
        throw new Error('User not logged in');
      }
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      console.log('🕐 Current time:', now.toLocaleString());
      
      // **KEY FIX: Process times and store as LOCAL time strings**
      const processedTimes = med.times.map((time, index) => {
        console.log(`📅 Processing time ${index + 1}:`);
        console.log(`   Original: ${time.toLocaleString()}`);
        console.log(`   ISO: ${time.toISOString()}`);
        
        // Create a proper local time
        const localTime = new Date(time);
        
        // If the time has passed today, move to tomorrow
        if (localTime <= now) {
          localTime.setDate(localTime.getDate() + 1);
          console.log(`⏭️ Moved to tomorrow: ${localTime.toLocaleString()}`);
        }
        
        // **CRITICAL: Create a local time string without timezone info**
        const localTimeString = `${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, '0')}-${String(localTime.getDate()).padStart(2, '0')} ${String(localTime.getHours()).padStart(2, '0')}:${String(localTime.getMinutes()).padStart(2, '0')}:${String(localTime.getSeconds()).padStart(2, '0')}`;
        
        console.log(`💾 Will store as: ${localTimeString}`);
        
        return {
          dateObject: localTime,
          localString: localTimeString
        };
      });
      
      // **UPDATED: Store medications with background task columns**
      for (let i = 0; i < processedTimes.length; i++) {
        const { localString } = processedTimes[i];
        
        try {
          // **Store with background task support**
          await executeQuery(
            `INSERT INTO medications (
              user_id, name, form, dosage, 
              frequency, time, duration,
              daily_status, last_reset_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
              currentUser.id, 
              med.name, 
              med.form || null, 
              med.dosage, 
              med.frequency, 
              localString, // Store as local time string
              med.duration || null,
              'pending', // Initialize daily_status
              today // Set last_reset_date to today
            ]
          );
          
          console.log(`✅ Saved medication: ${med.name} for ${localString}`);
        } catch (error) {
          console.error('Error saving medication to database:', error);
          throw new Error('Failed to save medication to database');
        }
      }
      
      // Schedule notifications
      try {
        const insertedMeds = await executeQuery(
          'SELECT id, name, dosage, time FROM medications WHERE user_id = ? AND name = ? ORDER BY id DESC LIMIT ?',
          [currentUser.id, med.name, processedTimes.length]
        ) as Array<MedicationNotification>;

        console.log(`📋 Retrieved ${insertedMeds.length} medications for notification scheduling`);

        for (let i = 0; i < insertedMeds.length; i++) {
          const medication = insertedMeds[i];
          
          if (medication) {
            try {
              console.log(`🔔 Scheduling notification for: ${medication.name} at ${medication.time}`);
              
              await scheduleMedicationNotification({
                ...medication,
                user_id: currentUser.id
              });
              
              console.log(`✅ Notification scheduled for ${medication.name}`);
            } catch (error) {
              console.error('Failed to schedule notification:', {
                medicationId: medication.id,
                medicationName: medication.name,
                error
              });
            }
          }
        }
      } catch (error) {
        console.error('Error scheduling notifications:', error);
      }
      
      console.log('🎉 Medication addition process completed!');
      await loadMedications();
      await loadBackgroundTaskData(); // **NEW: Refresh background task data**
      
    } catch (error) {
      console.error('❌ Error in handleAddMedication:', error);
      Alert.alert('Error', 'Failed to add medication. Please try again.');
    }
  };

  const handleDeleteMedication = async (medication: Medication) => {
    try {
      const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
      
      if (!medication.time) {
        Alert.alert('Error', 'Medication time not found. Cannot delete this medication.');
        return;
      }
      
      if (medication.notification_id) {
        await cancelScheduledNotification(medication.notification_id);
      }
      
      await executeQuery(
        'DELETE FROM medications WHERE user_id = ? AND name = ? AND time = ?;',
        [currentUser.id, medication.name, medication.time]
      );
      
      loadMedications();
      loadBackgroundTaskData(); // **NEW: Refresh background task data**
    } catch (error) {
      console.error('Error deleting medication:', error);
      Alert.alert('Error', 'Failed to delete medication');
    }
  };

  // Debug functions (keeping your existing implementation)
  const handleTestNotification = async () => {
    try {
      const notificationId = await debugNotificationService.sendTest(5);
      Alert.alert(
        'Test Notification', 
        `Test notification scheduled! ID: ${notificationId}`
      );
      console.log('Test notification ID:', notificationId);
    } catch (error) {
      console.error('Test notification failed:', error);
      Alert.alert('Error', 'Failed to schedule test notification');
    }
  };

  const handleListNotifications = async () => {
    try {
      const scheduled = await debugNotificationService.listScheduled();
      Alert.alert(
        'Scheduled Notifications', 
        `Found ${scheduled.length} scheduled notifications. Check console for details.`
      );
    } catch (error) {
      console.error('Failed to list notifications:', error);
      Alert.alert('Error', 'Failed to list scheduled notifications');
    }
  };

  // Debug function for notification scheduling
  const debugActualScheduling = async () => {
    try {
      console.log('=== 🔍 DEBUG NOTIFICATION SCHEDULING ===');
      
      // Get all scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const now = new Date();
      
      console.log(`🕐 Current time: ${now.toLocaleString()}`);
      console.log(`📋 Total scheduled notifications: ${scheduled.length}`);
      
      if (scheduled.length === 0) {
        console.log('❌ No notifications are scheduled!');
        return;
      }
      
      scheduled.forEach((notification, index) => {
        console.log(`\n--- Notification ${index + 1} ---`);
        console.log(`ID: ${notification.identifier}`);
        console.log(`Title: ${notification.content.title}`);
        console.log(`Body: ${notification.content.body}`);
        console.log(`Data:`, notification.content.data);
        
        // Check the trigger
        if (notification.trigger) {
          console.log(`Trigger type:`, typeof notification.trigger);
          console.log(`Trigger object:`, notification.trigger);
          
          if ('date' in notification.trigger && notification.trigger.date) {
            const triggerDate = new Date(notification.trigger.date as number);
            const timeUntil = triggerDate.getTime() - now.getTime();
            const minutesUntil = Math.round(timeUntil / (1000 * 60));
            const secondsUntil = Math.round(timeUntil / 1000);
            
            console.log(`📅 Scheduled for: ${triggerDate.toLocaleString()}`);
            console.log(`⏱️  Time until fire: ${minutesUntil} minutes (${secondsUntil} seconds)`);
            
            if (timeUntil <= 0) {
              console.log(`🚨 WARNING: This notification should have fired already!`);
            } else if (timeUntil < 60000) {
              console.log(`⚠️  WARNING: This notification will fire very soon!`);
            }
          } else if ('seconds' in notification.trigger) {
            console.log(`🔢 Seconds-based trigger: ${notification.trigger.seconds} seconds`);
          } else {
            console.log(`❓ Unknown trigger format`);
          }
        } else {
          console.log(`❌ No trigger found!`);
        }
      });
      
      console.log('\n=== END DEBUG ===');
      
      // Also check permissions
      const permissions = await Notifications.getPermissionsAsync();
      console.log('📱 Notification permissions:', permissions);
      
    } catch (error) {
      console.error('❌ Error debugging notifications:', error);
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
      });
    } catch (e) {
      return timeString;
    }
  };

  // **UPDATED: renderMedicationItem with background task status**
  const renderMedicationItem = ({ item }: { item: Medication }) => {
    const getStatusColor = (status?: string) => {
      switch (status) {
        case 'taken': return '#4CAF50';
        case 'skipped': return '#FF9800';
        case 'pending': return '#4CAF50';
        default: return '#4CAF50';
      }
    };

    const getStatusText = (status?: string) => {
      switch (status) {
        case 'taken': return 'Taken';
        case 'skipped': return 'Skipped';
        case 'pending': return 'Pending';
        default: return 'Scheduled';
      }
    };

    return (
      <TouchableOpacity
        style={styles.medicationCard}
        activeOpacity={0.85}
        onPress={() => setDetailModal({visible: true, medication: item})}
      >
        <View style={styles.medicationInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.medicationName}>{item.name}</Text>
            {/* **NEW: Status badge** */}
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.daily_status) }]} />
              <Text style={[styles.statusText, { color: getStatusColor(item.daily_status) }]}>
                {getStatusText(item.daily_status)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={[styles.medicationDetails, { color: '#4CAF50' }]}>
              {formatTime(item.time)}
            </Text>
            {/* **NEW: Show reset date if available** */}
            {item.last_reset_date && (
              <Text style={[styles.medicationDetails, { color: '#888', fontSize: 12 }]}>
                Reset: {item.last_reset_date}
              </Text>
            )}
          </View>
          {item.form && (
            <Text style={styles.medicationDetails}>
              {item.form} • {item.dosage}
            </Text>
          )}
          <Text style={styles.medicationDetails}>{item.frequency}</Text>
          {/* **NEW: Show daily notes if available** */}
          {item.daily_notes && (
            <Text style={[styles.medicationDetails, { color: '#FFC107', fontSize: 12, fontStyle: 'italic' }]}>
              Note: {item.daily_notes}
            </Text>
          )}
        </View>
        <View style={styles.medicationActions}>
          <TouchableOpacity
            onPress={() => handleDeleteMedication(item)}
            style={styles.actionButton}
          >
            <Ionicons name="trash" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // **NEW: Render adherence summary**
  const renderAdherenceCard = () => {
    if (adherenceData.total === 0) return null;

    const adherenceColor = adherenceData.adherence >= 80 ? '#4CAF50' : 
                          adherenceData.adherence >= 50 ? '#FF9800' : '#F44336';

    return (
      <View style={styles.adherenceCard}>
        <View style={styles.adherenceHeader}>
          <Ionicons name="analytics" size={24} color={adherenceColor} />
          <Text style={styles.adherenceTitle}>7-Day Adherence</Text>
        </View>
        <View style={styles.adherenceStats}>
          <View style={styles.adherenceStat}>
            <Text style={[styles.adherenceValue, { color: adherenceColor }]}>{adherenceData.adherence}%</Text>
            <Text style={styles.adherenceLabel}>Overall</Text>
          </View>
          <View style={styles.adherenceStat}>
            <Text style={[styles.adherenceValue, { color: '#4CAF50' }]}>{adherenceData.taken}</Text>
            <Text style={styles.adherenceLabel}>Taken</Text>
          </View>
          <View style={styles.adherenceStat}>
            <Text style={[styles.adherenceValue, { color: '#F44336' }]}>{adherenceData.missed}</Text>
            <Text style={styles.adherenceLabel}>Missed</Text>
          </View>
          <View style={styles.adherenceStat}>
            <Text style={[styles.adherenceValue, { color: '#888' }]}>{adherenceData.total}</Text>
            <Text style={styles.adherenceLabel}>Total</Text>
          </View>
        </View>
      </View>
    );
  };


  const renderMedicationDetailModal = () => {
    const med = detailModal.medication;
    return (
      <Modal
        visible={detailModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModal({visible: false, medication: null})}
      >
        {med && (
          <FlipCardMedicationDetails
            medication={{
              name: med.name,
              form: med.form,
              dosage: med.dosage,
              frequency: med.frequency,
              time: med.time,
              duration: med.duration,
              status: med.daily_status || '',
              lastTaken: med.last_taken_date || '',
              notes: med.daily_notes || '',
            }}
            onClose={() => setDetailModal({visible: false, medication: null})}
          />
        )}
      </Modal>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <>
      {renderMedicationDetailModal()}
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.gradient}
      >
        <SafeAreaView style={{flex: 1}}>
          <View style={[styles.container, {paddingTop: 24}]}>
            <View style={styles.header}>
              <Text style={styles.title}>My Medications</Text>
              <View style={{flexDirection: 'row'}}>
                <TouchableOpacity 
                  onPress={() => setIsDebugMenuOpen(!isDebugMenuOpen)}
                  style={styles.debugButton}
                >
                  <Ionicons name="bug" size={20} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {isDebugMenuOpen && (
              <View style={styles.debugMenu}>
                <Text style={styles.debugTitle}>Debug Menu</Text>
                
                <TouchableOpacity 
                  style={styles.debugButton}
                  onPress={handleTestNotification}
                >
                  <Text style={styles.debugButtonText}>Test Notification (5s)</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.debugButton}
                  onPress={handleListNotifications}
                >
                  <Text style={styles.debugButtonText}>List Notifications</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.debugButton}
                  onPress={debugActualScheduling}
                >
                  <Text style={styles.debugButtonText}>Debug Actual Scheduling</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.debugButton, {backgroundColor: '#dc2626'}]}
                  onPress={async () => {
                    await Notifications.cancelAllScheduledNotificationsAsync();
                    Alert.alert('Debug', 'All notifications cleared');
                  }}
                >
                  <Text style={styles.debugButtonText}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}

            {medications.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="medical-outline" size={64} color="#F44336" />
                <Text style={styles.emptyText}>No medications added yet</Text>
                <TouchableOpacity
                  style={styles.addFirstButton}
                  onPress={() => setShowAddModal(true)}
                >
                  <Text style={styles.addFirstButtonText}>Add Your First Medication</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flex: 1, width: '100%' }}>
                {/* **NEW: Show adherence card if data available** */}
                {renderAdherenceCard()}
                
                {/* **NEW: Show missed doses summary if any** */}
                {missedDoses.length > 0 && (
                  <View style={styles.missedDosesAlert}>
                    <Ionicons name="warning" size={20} color="#FF9800" />
                    <Text style={styles.missedDosesText}>
                      {missedDoses.length} missed dose{missedDoses.length > 1 ? 's' : ''} today
                    </Text>
                  </View>
                )}
                
                <FlatList
                  data={medications}
                  renderItem={renderMedicationItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContainer}
                  style={styles.listContent}
                  showsVerticalScrollIndicator={true}
                  scrollEnabled={true}
                  bounces={true}
                  nestedScrollEnabled={true}
                />
              </View>
            )}
            
            {/* Floating Plus Button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                bottom: 90,
                right: 24,
                backgroundColor: '#F44336',
                width: 60,
                height: 60,
                borderRadius: 30,
                justifyContent: 'center',
                alignItems: 'center',
                elevation: 5,
                shadowColor: '#000',
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: {width: 2, height: 2},
                zIndex: 100
              }}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add" size={36} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Add Medication Modal */}
          <AddMedicationModal
            visible={showAddModal}
            onClose={() => setShowAddModal(false)}
            onDone={handleAddMedication}
          />
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

// **UPDATED: Styles with new background task elements**
const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#FF6B6B',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    marginLeft: 10,
  },
  debugButton: {
    backgroundColor: '#6B7280',
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
    alignItems: 'center',
  },
  debugButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  debugMenu: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    margin: 10,
    elevation: 5,
    position: 'absolute',
    top: 70,
    right: 10,
    zIndex: 1000,
    width: 200,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#374151',
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#888888',
    fontSize: 16,
    marginVertical: 16,
  },
  addFirstButton: {
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  addFirstButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 100,
    paddingTop: 8,
  },
  listContent: {
    flexGrow: 1,
  },
  medicationCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  medicationDetails: {
    color: '#888888',
    fontSize: 14,
  },
  medicationActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  
  // **NEW: Background task related styles**
  adherenceCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  adherenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adherenceTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  adherenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  adherenceStat: {
    alignItems: 'center',
  },
  adherenceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  adherenceLabel: {
    color: '#888888',
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  missedDosesAlert: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  missedDosesText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default MedicationScreen;