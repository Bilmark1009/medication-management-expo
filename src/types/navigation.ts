export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Landing: undefined;
  Login: undefined;
  Register: undefined;
  TermsAndConditions: undefined;
  ForgotPassword: undefined;
  VerifyHash: { 
    email: string; 
    password: string;
    fromRegistration?: boolean;
  };
  MainApp: undefined;
  Home: undefined;
  Profile: undefined;
  AddMedication: { onAddMedication?: (medication: Medication) => void };
  MedicationList: undefined;
  MedicationDetails: { medicationId: string };
  Medication: undefined;
  History: undefined;
  PersonalInformation: undefined;
  EmergencyContacts: undefined;
  PrivacySecurity: undefined;
  HelpSupport: undefined;
  EditMedication: { medicationId: string };
};

export type Medication = {
  id: string;
  name: string;
  form?: string;
  dosage: string;
  frequency: string;
  instructions?: string;
  time: string;
};