export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  MainApp: undefined;
  Home: undefined;
  Profile: undefined;
  AddMedication: { onAddMedication?: (medication: Medication) => void };
  MedicationList: undefined;
  MedicationDetails: { medicationId: string };
  Schedule: undefined;
  History: undefined;
  PersonalInformation: undefined;
  EmergencyContacts: undefined;
  Notifications: undefined;
  PrivacySecurity: undefined;
  HelpSupport: undefined;
  EditMedication: { medicationId: string };
};

export type Medication = {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  time: string; // Added time field for scheduling notifications
};