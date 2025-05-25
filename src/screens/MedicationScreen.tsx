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
import { Medication } from '../types/navigation';

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
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#4CAF50',
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
    paddingBottom: 24,
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
  const [frequency, setFrequency] = useState<any>(null);
  const [times, setTimes] = useState<Date[]>([]);
  const [showTimePicker, setShowTimePicker] = useState<{show: boolean, idx: number}>({show: false, idx: 0});
  const [duration, setDuration] = useState<string>('');

  useEffect(() => {
    if (frequency && times.length !== frequency.times) {
      setTimes(Array(frequency.times).fill(new Date()));
    }
  }, [frequency]);

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'set' && selectedDate) {
      const newTimes = [...times];
      newTimes[showTimePicker.idx] = selectedDate;
      setTimes(newTimes);
    }
    setShowTimePicker({show: false, idx: 0});
  };

  const reset = () => {
    setStep(1); setMedName(''); setMedForm(null); setFrequency(null); setTimes([]);
  };

  const handleDone = () => {
    onDone({ name: medName, form: medForm, frequency: frequency.key, times, duration });
    reset();
    onClose();
  };


  return (
    <ReactNativeModal isVisible={visible} style={{margin:0}}>
      <View style={{flex:1, backgroundColor:'#181818'}}>
        <TouchableOpacity style={{position:'absolute',top:40,right:20,zIndex:1}} onPress={()=>{reset();onClose();}}>
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
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
              <TouchableOpacity style={{backgroundColor:'#4CAF50',padding:14,borderRadius:8,alignItems:'center'}} disabled={!medName.trim()} onPress={()=>setStep(2)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
          {step === 2 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 2: Select Medication Form</Text>
              <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16,justifyContent:'center'}}>
                {MEDICATION_FORMS.map(f => (
                  <TouchableOpacity key={f.key} onPress={()=>setMedForm(f.key)} style={{backgroundColor:medForm===f.key?'#4CAF50':'#232323',borderRadius:8,padding:12,margin:4,alignItems:'center',width:90}}>
                    <Ionicons name={f.icon as any} size={28} color={medForm===f.key?'#fff':'#aaa'} />
                    <Text style={{color:medForm===f.key?'#fff':'#aaa',marginTop:4,fontSize:13}}>{f.key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={{backgroundColor:'#4CAF50',padding:14,borderRadius:8,alignItems:'center'}} disabled={!medForm} onPress={()=>setStep(3)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
          {step === 3 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 3: Choose Frequency</Text>
              <View style={{marginBottom:16}}>
                {FREQUENCIES.map(f => (
                  <TouchableOpacity key={f.key} onPress={()=>setFrequency(f)} style={{backgroundColor:frequency?.key===f.key?'#4CAF50':'#232323',borderRadius:8,padding:14,marginVertical:4}}>
                    <Text style={{color:frequency?.key===f.key?'#fff':'#aaa',fontSize:16}}>{f.key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={{backgroundColor:'#4CAF50',padding:14,borderRadius:8,alignItems:'center'}} disabled={!frequency} onPress={()=>setStep(4)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
          {step === 4 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 4: Set Schedule</Text>
              <Text style={{color:'#aaa',marginBottom:12}}>Set intake times</Text>
              {times.map((t, idx) => (
                <TouchableOpacity key={idx} onPress={()=>setShowTimePicker({show:true,idx})} style={{backgroundColor:'#232323',borderRadius:8,padding:14,marginBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
                  <Text style={{color:'#fff',fontSize:18}}>Intake {idx+1}</Text>
                  <Text style={{color:'#4CAF50',fontSize:16}}>{t.toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true})}</Text>
                  <Ionicons name="time-outline" size={20} color="#4CAF50" style={{marginLeft:8}} />
                </TouchableOpacity>
              ))}
              <Modal
                visible={showTimePicker.show}
                transparent
                animationType="slide"
                onRequestClose={() => setShowTimePicker({show:false,idx:0})}
              >
                <View style={{flex:1,backgroundColor:'rgba(0,0,0,0.6)',justifyContent:'center',alignItems:'center'}}>
                  <View style={{backgroundColor:'#222',borderRadius:12,padding:20,width:280,alignItems:'center'}}>
                    <Text style={{color:'#fff',fontSize:18,marginBottom:16}}>Select Time</Text>
                    <View style={{flexDirection:'row',justifyContent:'center',alignItems:'center'}}>
                      <Picker
                        selectedValue={times[showTimePicker.idx].getHours()}
                        style={{width:100,color:'#fff'}} itemStyle={{color:'#fff'}} dropdownIconColor="#fff"
                        onValueChange={hour => {
                          const t = new Date(times[showTimePicker.idx]);
                          t.setHours(hour);
                          const newTimes = [...times];
                          newTimes[showTimePicker.idx] = t;
                          setTimes(newTimes);
                        }}
                      >
                        {[...Array(24).keys()].map(h => (
                          <Picker.Item key={h} label={h.toString().padStart(2,'0')} value={h} />
                        ))}
                      </Picker>
                      <Text style={{color:'#fff',fontSize:18,marginHorizontal:8}}>:</Text>
                      <Picker
                        selectedValue={times[showTimePicker.idx].getMinutes()}
                        style={{width:100,color:'#fff'}} itemStyle={{color:'#fff'}} dropdownIconColor="#fff"
                        onValueChange={minute => {
                          const t = new Date(times[showTimePicker.idx]);
                          t.setMinutes(minute);
                          const newTimes = [...times];
                          newTimes[showTimePicker.idx] = t;
                          setTimes(newTimes);
                        }}
                      >
                        {[...Array(60).keys()].map(m => (
                          <Picker.Item key={m} label={m.toString().padStart(2,'0')} value={m} />
                        ))}
                      </Picker>
                    </View>
                    <TouchableOpacity
                      style={{marginTop:24,backgroundColor:'#4CAF50',borderRadius:8,paddingVertical:10,paddingHorizontal:32}}
                      onPress={() => setShowTimePicker({show:false,idx:0})}
                    >
                      <Text style={{color:'#fff',fontWeight:'bold',fontSize:16}}>Set</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{marginTop:12,backgroundColor:'#888',borderRadius:8,paddingVertical:8,paddingHorizontal:24}}
                      onPress={() => setShowTimePicker({show:false,idx:0})}
                    >
                      <Text style={{color:'#fff',fontWeight:'bold',fontSize:14}}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
              <TouchableOpacity style={{backgroundColor:'#4CAF50',padding:14,borderRadius:8,alignItems:'center',marginTop:8}} onPress={()=>setStep(5)}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
          {step === 5 && (
            <View style={{width:'100%'}}>
              <Text style={{color:'#fff',fontSize:24,fontWeight:'bold',marginBottom:16}}>Step 5: Set Duration</Text>
              <Text style={{color:'#aaa',marginBottom:12}}>How long will you take this medication?</Text>
              <View style={{marginBottom:16}}>
                {['Everyday (no end date)','1 week','2 weeks','1 month','3 months','Custom'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={()=>setDuration(d)}
                    style={{backgroundColor:duration===d?'#4CAF50':'#232323',borderRadius:8,padding:14,marginVertical:4}}
                  >
                    <Text style={{color:duration===d?'#fff':'#aaa',fontSize:16}}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={{backgroundColor:'#4CAF50',padding:14,borderRadius:8,alignItems:'center',marginTop:8}} disabled={!duration} onPress={handleDone}>
                <Text style={{color:'#fff',fontWeight:'bold',fontSize:18}}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
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
      // Fetch all columns, including duration if it exists
      const result = await executeQuery(
        'SELECT * FROM medications WHERE user_id = ? ORDER BY time ASC;',
        [currentUser.id]
      );
      // If duration is not in DB, fallback to undefined
      const meds = (result || []).map((m: any) => ({
        ...m,
        duration: m.duration || undefined
      }));
      setMedications(meds);
    } catch (error) {
      console.error('Error loading medications:', error);
      Alert.alert('Error', 'Failed to load medications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    try {
      await executeQuery('DELETE FROM medications WHERE id = ?;', [id]);
      loadMedications();
    } catch (error) {
      console.error('Error deleting medication:', error);
      Alert.alert('Error', 'Failed to delete medication');
    }
  };

  const handleAddMedication = async (med: any) => {
    try {
      const currentUser = JSON.parse(await AsyncStorage.getItem('currentUser') || '{}');
      if (!currentUser?.id) throw new Error('User not logged in');
      for (let t of med.times) {
        await executeQuery(
          'INSERT INTO medications (user_id, name, dosage, frequency, time, instructions) VALUES (?, ?, ?, ?, ?, ?);',
          [currentUser.id, med.name, med.form, med.frequency, t.toISOString(), med.instructions || '']
        );
      }
      loadMedications();
    } catch (error) {
      Alert.alert('Error', 'Failed to add medication');
    }
  };

  const [detailModal, setDetailModal] = useState<{visible: boolean, medication: (Medication & { duration?: string }) | null}>({visible: false, medication: null});

  const renderMedicationItem = ({ item }: { item: Medication & { duration?: string } }) => {
    return (
      <TouchableOpacity
        style={styles.medicationCard}
        activeOpacity={0.85}
        onPress={() => setDetailModal({visible: true, medication: item})}
      >
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>{item.name}</Text>
          <Text style={styles.medicationDetails}>
            {item.dosage} • {item.frequency} • {formatTime(item.time)}
          </Text>
        </View>
        <View style={styles.medicationActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditMedication', { medicationId: item.id })}
            style={styles.actionButton}
          >
            <Ionicons name="pencil" size={20} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteMedication(item.id)}
            style={styles.actionButton}
          >
            <Ionicons name="trash" size={20} color="#F44336" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
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
            <Text style={{color:'#4CAF50', fontSize:22, fontWeight:'bold', marginBottom:18}}>Medication Details</Text>
            {med && (
              <>
                <Text style={{color:'#fff', fontWeight:'bold', alignSelf:'flex-start'}}>Medicine Name:</Text>
                <Text style={{color:'#ccc', marginBottom:10, alignSelf:'flex-start'}}>{med.name}</Text>
                <Text style={{color:'#fff', fontWeight:'bold', alignSelf:'flex-start'}}>Frequency:</Text>
                <Text style={{color:'#ccc', marginBottom:10, alignSelf:'flex-start'}}>{med.frequency}</Text>
                <Text style={{color:'#fff', fontWeight:'bold', alignSelf:'flex-start'}}>Scheduled Intake:</Text>
                <Text style={{color:'#ccc', marginBottom:10, alignSelf:'flex-start'}}>{formatTime(med.time)}</Text>
                <Text style={{color:'#fff', fontWeight:'bold', alignSelf:'flex-start'}}>Duration:</Text>
                <Text style={{color:'#ccc', marginBottom:8, alignSelf:'flex-start'}}>{med.duration || 'Not specified'}</Text>
              </>
            )}
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
      const time = new Date(timeString);
      return time.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch (error) {
      return timeString;
    }
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
          <View style={[styles.container, {paddingTop: 24}]}> {/* Add extra padding for header */}
            <View style={styles.header}>
              <Text style={styles.title}>My Medications</Text>
            </View>

          {medications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color="#4CAF50" />
              <Text style={styles.emptyText}>No medications added yet</Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.addFirstButtonText}>Add Your First Medication</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={medications}
              renderItem={renderMedicationItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
          {/* Floating Plus Button */}
          <TouchableOpacity
            style={{position:'absolute',bottom:90,right:24,backgroundColor:'#4CAF50',width:60,height:60,borderRadius:30,justifyContent:'center',alignItems:'center',elevation:5,shadowColor:'#000',shadowOpacity:0.3,shadowRadius:8,shadowOffset:{width:2,height:2}, zIndex: 100}}
            onPress={()=>setShowAddModal(true)}
          >
            <Ionicons name="add" size={36} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Render Modal as sibling to main content to overlay tab bar */}
        <AddMedicationModal
          visible={showAddModal}
          onClose={()=>setShowAddModal(false)}
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
