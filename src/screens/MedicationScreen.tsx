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
  TextInput, // <-- add TextInput import
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { executeQuery } from '../utils/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Medication as BaseMedication } from '../types/navigation';

// Extend the base Medication type with our additional fields
type Medication = BaseMedication & {
  time: string;
  timeObj: Date;
  notification_id?: string;
  duration?: string;
  times?: Date[]; // Add times property for the medication form
};
import { schedulePushNotification, cancelScheduledNotification } from '../services/notifications';

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
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#F44336',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingBottom: 100, // Extra padding to account for the floating button
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
  medicationNotes: {
    color: '#BBBBBB',
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
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
});

// --- AddMedicationModal Component ---
import ReactNativeModal from 'react-native-modal';

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

// --- Use react-native-modal-datetime-picker for time selection ---
import { Modal } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const AddMedicationModal = ({ visible, onClose, onDone }: any) => {
  const [step, setStep] = useState(1);
  const [medName, setMedName] = useState('');
  const [medForm, setMedForm] = useState<string | null>(null);
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<any>(null);
  const [times, setTimes] = useState<Date[]>([]);
  const [showTimePicker, setShowTimePicker] = useState<{show: boolean, idx: number}>({show: false, idx: 0});
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    if (frequency && times.length !== frequency.times) {
      // For multi-intake frequencies, auto-generate times spaced evenly from 08:00
      const count = frequency.times;
      if (count > 1) {
        const base = new Date();
        base.setHours(8, 0, 0, 0); // Start at 08:00
        const interval = 24 / count; // hours between doses
        const generated: Date[] = [];
        for (let i = 0; i < count; i++) {
          const t = new Date(base.getTime());
          t.setHours(base.getHours() + Math.round(i * interval));
          generated.push(new Date(t));
        }
        setTimes(generated);
      } else {
        setTimes([new Date()]);
      }
    }
  }, [frequency]);

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      let newTimes = [...times];
      if (showTimePicker.idx === 0 && frequency && frequency.times > 1) {
        // User is updating the first intake, update all subsequent times based on interval
        const count = frequency.times;
        const interval = 24 / count;
        const base = new Date(selectedDate);
        newTimes = [];
        for (let i = 0; i < count; i++) {
          const t = new Date(base.getTime() + i * interval * 60 * 60 * 1000);
          newTimes.push(t);
        }
      } else {
        newTimes[showTimePicker.idx] = selectedDate;
      }
      setTimes(newTimes);
    }
    setShowTimePicker({show: false, idx: 0});
  };

  const reset = () => {
    setStep(1); setMedName(''); setMedForm(null); setDosage(''); setFrequency(null); setTimes([]); setDuration('');
  };

  // Ensure steps go up to 6; update navigation logic if needed

  // Initialize times when entering step 5 or 6
  useEffect(() => {
    if ((step === 5 || step === 6) && times.length === 0) {
      setTimes([new Date()]);
    }
  }, [step]);

  const handleDone = () => {
    onDone({ name: medName, form: medForm, dosage, frequency: frequency.key, times, duration });
    reset();
    onClose();
  };


  return (
    <ReactNativeModal isVisible={visible} style={{margin:0}}>
      <View style={{flex:1, backgroundColor:'#181818'}}>
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
            style={{flexDirection:'row',alignItems:'center',backgroundColor:'rgba(44,44,44,0.9)',borderRadius:8,paddingVertical:8,paddingHorizontal:14,elevation:5,shadowColor:'#000',shadowOpacity:0.2,shadowRadius:4,shadowOffset:{width:1,height:1}}}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
            <Text style={{color:'#fff',fontSize:16,marginLeft:6,fontWeight:'600'}}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>{reset();onClose();}} style={{backgroundColor:'rgba(44,44,44,0.9)',borderRadius:8,padding:8}}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={{flex:1, justifyContent:'center', alignItems:'center', padding:24}}>
          {step === 1 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 1: Medication Name</Text>
              <View style={{backgroundColor:'#232323',borderRadius:8,padding:16,marginBottom:16}}>
                <Text style={{color:'#aaa',fontSize:16,marginBottom:8}}>Enter medication name</Text>
                <View style={{backgroundColor:'#333',borderRadius:6}}>
                  <TextInput
                    style={{color:'#fff',fontSize:18,padding:12}}
                    placeholder="Medication Name"
                    placeholderTextColor="#888"
                    value={medName}
                    onChangeText={setMedName}
                  />
                </View>
              </View>
              <TouchableOpacity style={{backgroundColor:'#F44336',padding:14,borderRadius:8,alignItems:'center'}} disabled={!medName.trim()} onPress={()=>setStep(2)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
          {step === 2 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 2: Select Medication Form</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16,justifyContent:'center'}}>
                {MEDICATION_FORMS.map(f => (
                  <TouchableOpacity key={f.key} onPress={()=>setMedForm(f.key)} style={{backgroundColor:medForm===f.key?'#F44336':'#232323',borderRadius:8,padding:12,margin:4,alignItems:'center',width:90}}>
                    <Ionicons name={f.icon as any} size={28} color={medForm===f.key?'#fff':'#aaa'} />
                    <Text style={{color:medForm===f.key?'#fff':'#aaa',marginTop:4,fontSize:13}}>{f.key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={{backgroundColor:'#F44336',padding:14,borderRadius:8,alignItems:'center'}} disabled={!medForm} onPress={()=>setStep(3)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
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
              <TouchableOpacity style={{backgroundColor:'#F44336',padding:14,borderRadius:8,alignItems:'center'}} disabled={!dosage.trim()} onPress={()=>setStep(4)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
          {step === 4 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 4: Choose Frequency</Text>
              <View style={{marginBottom:16}}>
                {FREQUENCIES.map(f => (
                  <TouchableOpacity key={f.key} onPress={()=>setFrequency(f)} style={{backgroundColor:frequency?.key===f.key?'#F44336':'#232323',borderRadius:8,padding:14,marginVertical:4}}>
                    <Text style={{color:frequency?.key===f.key?'#fff':'#aaa',fontSize:16}}>{f.key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={{backgroundColor:'#F44336',padding:14,borderRadius:8,alignItems:'center'}} disabled={!frequency} onPress={()=>setStep(5)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
          {step === 5 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 5: Set Schedule</Text>
              <Text style={{color:'#aaa',marginBottom:12}}>Set intake times</Text>
              {/* Ensure times is initialized with correct number of Date objects for the frequency */}
              {(() => {
                if (times.length !== (frequency?.times || 1)) {
                  setTimes(Array.from({length: frequency?.times || 1}, (_,i) => times[i] || new Date()));
                  return null;
                }
                return null;
              })()}
              {times.map((t, idx) => (
                <TouchableOpacity key={idx} onPress={() => {
                  // Defensive: ensure times[idx] is a Date
                  if (!times[idx]) {
                    const newTimes = [...times];
                    newTimes[idx] = new Date();
                    setTimes(newTimes);
                  }
                  setShowTimePicker({show:true,idx});
                }} style={{backgroundColor:'#232323',borderRadius:8,padding:14,marginBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                  <Text style={{color:'#fff',fontSize:18}}>Intake {idx+1}</Text>
                  <Text style={{color:'#F44336',fontSize:16}}>{t?.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}</Text>
                  <Ionicons name="time-outline" size={20} color="#F44336" style={{marginLeft:8}} />
                </TouchableOpacity>
              ))}
              {/* Add navigation to step 6 */}
              <TouchableOpacity style={{backgroundColor:'#F44336',padding:14,borderRadius:8,alignItems:'center',marginTop:12}} onPress={()=>setStep(6)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
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
              <TouchableOpacity style={{backgroundColor:'#F44336',padding:14,borderRadius:8,alignItems:'center',marginTop:8}} disabled={!duration} onPress={()=>setStep(7)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
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
                <Text style={{color:'#fff',fontSize:18,marginBottom:8}}>Times: {times.map(t => t?.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})).join(', ')}</Text>
              </View>
              <TouchableOpacity style={{backgroundColor:'#F44336',padding:14,borderRadius:8,alignItems:'center',marginBottom:8}} onPress={handleDone}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Add Medication</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{backgroundColor:'#aaa',padding:10,borderRadius:8,alignItems:'center'}} onPress={()=>setStep(1)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:16}}>Start Over</Text>
              </TouchableOpacity>
            </View>
          )}
          <Modal
            visible={showTimePicker.show}
            transparent
            animationType="slide"
            onRequestClose={() => setShowTimePicker({show:false,idx:0})}
          >
            <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center'}}>
              <View style={{backgroundColor:'#222',borderRadius:12,padding:20,width:280,alignItems:'center'}}>
                <Text style={{color:'#fff',fontSize:18,marginBottom:16}}>Select Time</Text>
                <View style={{flexDirection:'row',justifyContent:'center',alignItems:'flex-end'}}>
                    <View style={{alignItems:'center'}}>
                      <Text style={{color:'#fff',fontSize:14,marginBottom:4}}>Hour</Text>
                      <Picker
                    selectedValue={times[showTimePicker.idx] ? times[showTimePicker.idx].getHours() : 8}
                    style={{width:100,color:'#fff'}} itemStyle={{color:'#fff'}} dropdownIconColor="#fff"
                    onValueChange={(hour: number) => {
                      if (!times[showTimePicker.idx]) return;
                      const t = new Date(times[showTimePicker.idx]);
                      t.setHours(hour);
                      const newTimes = [...times];
                      newTimes[showTimePicker.idx] = t;
                      setTimes(newTimes);
                    }}
                  >
                    {[...Array(24).keys()].map(h => (
                      <Picker.Item key={h} label={h.toString().padStart(2,'0')} value={h} color="#000" />
                    ))}
                  </Picker>
                    </View>
                    <Text style={{color:'#fff',fontSize:18,marginHorizontal:8,alignSelf:'flex-end'}}>:</Text>
                    <View style={{alignItems:'center'}}>
                      <Text style={{color:'#fff',fontSize:14,marginBottom:4}}>Minute</Text>
                      <Picker
                    selectedValue={times[showTimePicker.idx] ? times[showTimePicker.idx].getMinutes() : 0}
                    style={{width:100,color:'#fff'}} itemStyle={{color:'#fff'}} dropdownIconColor="#fff"
                    onValueChange={(minute: number) => {
                      if (!times[showTimePicker.idx]) return;
                      const t = new Date(times[showTimePicker.idx]);
                      t.setMinutes(minute);
                      const newTimes = [...times];
                      newTimes[showTimePicker.idx] = t;
                      setTimes(newTimes);
                    }}
                  >
                    {[...Array(60).keys()].map(m => (
                      <Picker.Item key={m} label={m.toString().padStart(2,'0')} value={m} color="#000" />
                    ))}
                  </Picker>
                    </View>
                </View>
                <TouchableOpacity style={{marginTop:20,backgroundColor:'#4CAF50',padding:12,borderRadius:8,width:120,alignItems:'center'}} onPress={()=>setShowTimePicker({show:false,idx:0})}>
                  <Text style={{color:'#fff',fontWeight:'bold',fontSize:16}}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </View>
      </View>
    </ReactNativeModal>
  );
};

// --- MedicationScreen with FAB and Modal ---
const MedicationScreen: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMedications();
    });
    return unsubscribe;
  }, [navigation]);

  const loadMedications = async () => {
    try {
      const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
      if (!currentUser?.id) throw new Error('User not logged in');
      
      const result = await executeQuery(
        'SELECT * FROM medications WHERE user_id = ? ORDER BY time ASC;',
        [currentUser.id]
      ) as Array<BaseMedication & { time: string }>;
      
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

  const [detailModal, setDetailModal] = useState<{visible: boolean, medication: Medication | null}>({visible: false, medication: null});

  const handleDeleteMedication = async (med: Medication) => {
    try {
      const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
      // Use time as unique identifier for deletion
      if (!med.time) {
        Alert.alert('Error', 'Medication time not found. Cannot delete this medication.');
        return;
      }
      
      // Cancel the notification if it exists
      if (med.notification_id) {
        await cancelScheduledNotification(med.notification_id);
      }
      
      await executeQuery(
        'DELETE FROM medications WHERE user_id = ? AND name = ? AND time = ?;',
        [currentUser.id, med.name, med.time]
      );
      loadMedications();
    } catch (error) {
      console.error('Error deleting medication:', error);
      Alert.alert('Error', 'Failed to delete medication');
    }
  };

  const handleAddMedication = async (med: { 
    name: string; 
    form?: string; 
    dosage: string; 
    frequency: string; 
    times: Date[]; 
    instructions?: string; 
    duration?: string 
  }) => {
    try {
      const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
      if (!currentUser?.id) throw new Error('User not logged in');
      
      // Insert each time as a separate medication entry
      for (const time of med.times) {
        const result = await executeQuery(
          'INSERT INTO medications (user_id, name, form, dosage, frequency, time, instructions, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
          [currentUser.id, med.name, med.form, med.dosage, med.frequency, time.toISOString(), med.instructions || '', med.duration || '']
        );
        
        // Schedule notification for the new medication
        if (result && result.insertId) {
          const newMed = {
            id: result.insertId.toString(),
            ...med,
            time: time.toISOString()
          };
          await schedulePushNotification(newMed);
        }
      }
      
      // Reload medications to show the new entries
      await loadMedications();
    } catch (error) {
      console.error('Error adding medication:', error);
      Alert.alert('Error', 'Failed to add medication');
    }
  };

  // Medication Detail Modal
  const MedicationDetailModal = () => {
    const med = detailModal.medication;
    return (
      <Modal
        visible={detailModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModal({visible: false, medication: null})}
      >
        <View style={{flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'center', alignItems:'center'}}>
          <View style={{backgroundColor:'#232323', borderRadius:16, padding:28, width:'85%', maxWidth:400, alignItems:'center'}}>
            <Text style={{color:'#fff', fontSize:20, fontWeight:'bold', marginBottom:16}}>Medication Details</Text>
            
            {med ? (
              <>
                <Text style={{color:'#fff', fontWeight:'bold', alignSelf:'flex-start'}}>Medicine Name:</Text>
                <Text style={{color:'#ccc', marginBottom:10, alignSelf:'flex-start'}}>{med.name}</Text>
                <Text style={{color:'#fff', fontWeight:'bold', alignSelf:'flex-start'}}>Form:</Text>
                <Text style={{color:'#ccc', marginBottom:10, alignSelf:'flex-start'}}>{med.form || 'Not specified'}</Text>
                <Text style={{color:'#fff', fontWeight:'bold', alignSelf:'flex-start'}}>Dosage:</Text>
                <Text style={{color:'#ccc', marginBottom:10, alignSelf:'flex-start'}}>{med.dosage || 'Not specified'}</Text>
                <Text style={{color:'#fff', fontWeight:'bold', alignSelf:'flex-start'}}>Frequency:</Text>
                <Text style={{color:'#ccc', marginBottom:10, alignSelf:'flex-start'}}>{med.frequency || 'Not specified'}</Text>
                <Text style={{color:'#fff', fontWeight:'bold', alignSelf:'flex-start'}}>Time:</Text>
                <Text style={{color:'#ccc', marginBottom:10, alignSelf:'flex-start'}}>{med.time ? formatTime(med.time) : 'Not specified'}</Text>
                <Text style={{color:'#fff', fontWeight:'bold', alignSelf:'flex-start'}}>Duration:</Text>
                <Text style={{color:'#ccc', marginBottom:8, alignSelf:'flex-start'}}>{med.duration || 'Not specified'}</Text>
              </>
            ) : null}
            
            <TouchableOpacity
              style={{marginTop:18, backgroundColor:'#4CAF50', borderRadius:8, paddingVertical:10, paddingHorizontal:36}}
              onPress={() => setDetailModal({visible: false, medication: null})}
            >
              <Text style={{color:'#fff', fontWeight:'bold', fontSize:16}}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
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
      return timeString; // Return as is if parsing fails
    }
  };

  const renderMedicationItem = ({ item }: { item: Medication }) => {
    return (
      <TouchableOpacity
        style={styles.medicationCard}
        activeOpacity={0.85}
        onPress={() => setDetailModal({visible: true, medication: item})}
      >
        <View style={styles.medicationInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.medicationName}>{item.name}</Text>
            <Text style={[styles.medicationDetails, { color: '#4CAF50' }]}>
              {formatTime(item.time)}
            </Text>
          </View>
          {item.form && (
            <Text style={styles.medicationDetails}>
              {item.form} • {item.dosage}
            </Text>
          )}
          <Text style={styles.medicationDetails}>{item.frequency}</Text>
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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <>
      <MedicationDetailModal />
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.gradient}
      >
        <SafeAreaView style={{flex: 1}}>
          <View style={[styles.container, {paddingTop: 24}]}>
            <View style={styles.header}>
              <Text style={styles.title}>My Medications</Text>
            </View>

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
            coverScreen={true}
            propagateSwipe={true}
          />
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

export default MedicationScreen;