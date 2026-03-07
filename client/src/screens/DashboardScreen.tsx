import 'react-native-url-polyfill/auto'; 
import React, { useEffect, useState ,useRef} from 'react';
import { View, ScrollView, StyleSheet, Alert, KeyboardAvoidingView, Platform, Dimensions, Linking, TouchableOpacity } from 'react-native';
import { Text, Card, ActivityIndicator, Appbar, useTheme, Button, Divider, Avatar, TextInput, Surface, IconButton } from 'react-native-paper';
import { getCurrentUser, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

// --- A REALISTIC MOCK PDF URL FOR THE PROTOTYPE ---
const MOCK_PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';


const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const CORS_PROXY = "https://corsfix.com/?"; 

const DEMO_USERS = [
  { id: '1000000001', name: 'Shreshth M.', condition: 'Hypertension', blood: 'O+', allergies: 'None', history: 'Diagnosed with mild hypertension. On Losartan 50mg.', reports: 'BP: 125/80 (Normal)', documents: [{ title: 'Cardiology_Consult_Jan.pdf', type: 'Prescription', date: '12 Jan 2024', url: MOCK_PDF_URL }, { title: 'ECG_Report_Final.pdf', type: 'Lab Report', date: '10 Jan 2024', url: MOCK_PDF_URL }] },
  { id: '1000000002', name: 'Priya K.', condition: 'Type 2 Diabetes', blood: 'A+', allergies: 'Penicillin', history: 'Type 2 Diabetes diagnosed 2021. Managed via diet.', reports: 'HbA1c: 6.4% (Improved)', documents: [{ title: 'Endocrinology_Rx.pdf', type: 'Prescription', date: '05 Feb 2024', url: MOCK_PDF_URL }, { title: 'Blood_Panel_HbA1c.pdf', type: 'Lab Report', date: '01 Feb 2024', url: MOCK_PDF_URL }] },
  { id: '1000000003', name: 'Rahul S.', condition: 'Asthma', blood: 'B-', allergies: 'Dust, Pollen', history: 'Lifelong asthma. Uses Albuterol inhaler as needed.', reports: 'Spirometry: Normal lung capacity.', documents: [{ title: 'Pulmonology_Discharge.pdf', type: 'Discharge', date: '20 Nov 2023', url: MOCK_PDF_URL }] },
  { id: '1000000004', name: 'Anita V.', condition: 'Prenatal Care', blood: 'AB+', allergies: 'Latex', history: '24 weeks pregnant. Routine checkups normal.', reports: 'Ultrasound: Fetal heart rate 140bpm.', documents: [{ title: 'Ultrasound_Scan_Wk24.pdf', type: 'Scan Result', date: '15 Feb 2024', url: MOCK_PDF_URL }, { title: 'Prenatal_Vitamins_Rx.pdf', type: 'Prescription', date: '15 Feb 2024', url: MOCK_PDF_URL }] },
  { id: '1000000005', name: 'Vikram D.', condition: 'Post-Op Knee', blood: 'O-', allergies: 'Ibuprofen', history: 'ACL reconstruction surgery 2 months ago.', reports: 'MRI: Healing progressing well.', documents: [{ title: 'Surgical_Discharge_Summary.pdf', type: 'Discharge', date: '10 Dec 2023', url: MOCK_PDF_URL }, { title: 'Post_Op_MRI.pdf', type: 'Scan Result', date: '12 Feb 2024', url: MOCK_PDF_URL }] },
  { id: '1000000006', name: 'Sneha R.', condition: 'Hypothyroidism', blood: 'A-', allergies: 'None', history: 'Thyroid levels monitored every 6 months.', reports: 'TSH: 2.1 mIU/L (Optimal)', documents: [{ title: 'Thyroid_Panel.pdf', type: 'Lab Report', date: '22 Jan 2024', url: MOCK_PDF_URL }] },
  { id: '1000000007', name: 'Rohan P.', condition: 'Pediatric', blood: 'O+', allergies: 'Peanuts', history: '8-year-old routine checkup and vaccinations.', reports: 'All milestones met. Flu shot given.', documents: [{ title: 'Vaccination_Record.pdf', type: 'Lab Report', date: '02 Mar 2024', url: MOCK_PDF_URL }] },
  { id: '1000000008', name: 'Kavita L.', condition: 'Migraines', blood: 'B+', allergies: 'Sulfa Drugs', history: 'Chronic migraines. Prescribed Sumatriptan.', reports: 'Neurological exam: Normal.', documents: [{ title: 'Neurology_Consult_Rx.pdf', type: 'Prescription', date: '18 Feb 2024', url: MOCK_PDF_URL }] },
  { id: '1000000009', name: 'Amit T.', condition: 'Cardiac Arrhythmia', blood: 'AB-', allergies: 'None', history: 'Occasional palpitations. Wears holter monitor.', reports: 'ECG: Minor PVCs, no acute distress.', documents: [{ title: 'Holter_Monitor_Analysis.pdf', type: 'Lab Report', date: '28 Jan 2024', url: MOCK_PDF_URL }] },
  { id: '1000000010', name: 'Pooja N.', condition: 'Anemia', blood: 'A+', allergies: 'None', history: 'Iron deficiency anemia. Taking supplements.', reports: 'Hemoglobin: 10.5 g/dL (Slightly low)', documents: [{ title: 'CBC_Blood_Test.pdf', type: 'Lab Report', date: '14 Feb 2024', url: MOCK_PDF_URL }, { title: 'Iron_Supplements_Rx.pdf', type: 'Prescription', date: '15 Feb 2024', url: MOCK_PDF_URL }] },
];


export default function DashboardScreen({ route, navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [patientId, setPatientId] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', bloodType: '', allergies: '', briefHistory: '' });
  
  // --- KUSHA AI CONVERSATIONAL STATE ---
  const [aiInput, setAiInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const theme = useTheme();
  const isDemoMode = route.params?.demoMode || false;
  const demoUserData = route.params?.demoUserData; 

  // --- AWS DYNAMODB SETUP ---
  const getDynamoClient = async () => {
      const session = await fetchAuthSession();
      const client = new DynamoDBClient({ 
          region: "us-east-1", 
          credentials: {
              accessKeyId: session.credentials?.accessKeyId || '',
              secretAccessKey: session.credentials?.secretAccessKey || '',
              sessionToken: session.credentials?.sessionToken || ''
          }
      });
      return DynamoDBDocumentClient.from(client);
  };

  useEffect(() => {
    fetchLivePatientData();
  }, []);

  const fetchLivePatientData = async () => {
    setLoading(true);
    try {
      if (isDemoMode) {
          setPatientId(demoUserData.id);
          const formattedDemoData = {
              patientId: demoUserData.id,
              fullName: demoUserData.name,
              bloodType: demoUserData.blood,
              allergies: demoUserData.allergies,
              briefHistory: demoUserData.history,
              recentReports: demoUserData.reports,
              documents: demoUserData.documents 
          };
          setPatientData(formattedDemoData);
          setIsNewProfile(false); 
          try {
             const docClient = await getDynamoClient();
             await docClient.send(new PutCommand({ TableName: "PatientRecords", Item: formattedDemoData }));
          } catch (silentError) { console.log("Silent upload skipped."); }
      } else {
          const currentId = (await getCurrentUser()).username;
          setPatientId(currentId);
          const docClient = await getDynamoClient();
          const response = await docClient.send(new GetCommand({ TableName: "PatientRecords", Key: { patientId: currentId } }));

          if (response.Item) {
              setPatientData(response.Item);
              setIsNewProfile(false);
          } else {
              setPatientData(null); 
              setIsNewProfile(true);
          }
      }
    } catch (error: any) {
      if (!isDemoMode) { setPatientData(null); setIsNewProfile(true); }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
      if (!formData.fullName || !formData.bloodType) { Alert.alert("Required", "Please fill in Name and Blood Type."); return; }
      setLoading(true);
      const newPatientRecord = {
          patientId: patientId,
          fullName: formData.fullName,
          bloodType: formData.bloodType,
          allergies: formData.allergies || 'None recorded',
          briefHistory: formData.briefHistory || 'New patient. No prior history.',
          recentReports: 'No lab reports available yet.',
          documents: [] 
      };

      try {
          const docClient = await getDynamoClient();
          await docClient.send(new PutCommand({ TableName: "PatientRecords", Item: newPatientRecord }));
          setPatientData(newPatientRecord);
          setIsNewProfile(false);
          Alert.alert("Success", "Profile saved securely to AWS DynamoDB!");
      } catch (error: any) {
          Alert.alert("AWS Save Error", `Reason: ${error.message}`);
      } finally { setLoading(false); }
  };

  const seedDatabase = async () => {
      setLoading(true);
      try {
          const docClient = await getDynamoClient();
          for (const user of DEMO_USERS) {
              await docClient.send(new PutCommand({ TableName: "PatientRecords", Item: user }));
          }
          Alert.alert("Success", "Uploaded Demo Users to AWS DynamoDB!");
      } catch (error: any) { Alert.alert("Upload Error", `Reason: ${error.message}`);
      } finally { setLoading(false); }
  };

  const handleUploadReport = async () => {
      try {
          const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
          if (result.canceled) return; 

          let fileUri = '';
          let fileName = '';
          if (result.assets && result.assets.length > 0) {
              fileUri = result.assets[0].uri;
              fileName = result.assets[0].name;
          } else { return; }

          setLoading(true);
          const newDoc = {
              title: fileName || `Uploaded_Report_${Math.floor(Math.random() * 1000)}.pdf`,
              type: 'Uploaded Report',
              date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
              url: fileUri 
          };

          const updatedDocs = [newDoc, ...(patientData?.documents || [])];
          const updatedPatientData = { ...patientData, documents: updatedDocs };
          setPatientData(updatedPatientData);

          try {
              const docClient = await getDynamoClient();
              await docClient.send(new PutCommand({ TableName: "PatientRecords", Item: updatedPatientData }));
              Alert.alert("Upload Successful", `"${newDoc.title}" securely saved to AWS!`);
          } catch (awsError: any) {
              Alert.alert("Local Upload Success", `"${newDoc.title}" added to screen, but AWS sync skipped.`);
          }
      } catch (error: any) {
          Alert.alert("Upload Failed", "Could not open the file explorer.");
      } finally {
          setLoading(false);
      }
  };

  const handleLogout = async () => {
    if (!isDemoMode) { await signOut(); }
    navigation.replace('Login');
  };
// --- AUDIO TOGGLE LOGIC ---
  const handleMicPress = () => {
      if (isListening) {
          stopRecordingAndTranscribe();
      } else {
          startRecording();
      }
  };

  const startRecording = async () => {
    try {
      // 
      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
        recordingRef.current = null;
      }

      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true,
        staysActiveInBackground: false, 
      });
      
      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      
      recordingRef.current = newRecording; 
      setRecording(newRecording);
      setIsListening(true);
      setAiInput('Listening... (Tap mic again to send)'); // New UI feedback
    } catch (err) {
      console.error('Failed to start recording', err);
      recordingRef.current = null;
      setRecording(null); 
      setIsListening(false);
      Alert.alert("Microphone Error", "Hardware busy. Please try again.");
    }
  };

  const stopRecordingAndTranscribe = async () => {
    const currentRecording = recordingRef.current;
    if (!currentRecording) return;
    
    setIsListening(false);
    setAiInput('Recording sent! Translating voice to text...'); // New UI feedback

    try { await currentRecording.stopAndUnloadAsync(); } catch (e) {}
    
    const uri = currentRecording.getURI();
    recordingRef.current = null;
    setRecording(null);

    if (uri) { await sendToGroqWhisper(uri); }
  };
  // --- ---
  // --- GROQ WHISPER (SPEECH TO TEXT) ---
  const sendToGroqWhisper = async (uri: string) => {
    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
          // 1. Fetch the local browser memory blob
          const audioFetch = await fetch(uri);
          const audioBlob = await audioFetch.blob();
          
          // 2. Cast it to a strict File object so Groq recognizes it
          const mimeType = audioBlob.type || 'audio/webm';
          const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
          const audioFile = new File([audioBlob], `audio.${ext}`, { type: mimeType });
          
          formData.append('file', audioFile); 
      } else {
          const fileUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
          formData.append('file', {
            uri: fileUri,
            type: 'audio/m4a', 
            name: 'audio.m4a'
          } as any);
      }
      
     formData.append('model', 'whisper-large-v3-turbo'); 
      
      
      const safeName = patientData?.fullName || 'the patient';
      const safeHistory = patientData?.briefHistory || 'general health';
      const safeAllergies = patientData?.allergies || 'none';

      // 
      const medicalSeedPrompt = `Namaste, Vanakkam, Namaskaram, Kem cho. Mera naam Kusha hai. Clinic, hospital, doctor, medicine, prescription, emergency, symptoms, dosage, pharmacy, treatment. Patient name: ${safeName}. Medical history: ${safeHistory}. Allergies: ${safeAllergies}.`;

      formData.append('prompt', medicalSeedPrompt);

      formData.append('temperature', '0.0'); // Forces strict transcription instead of guessing
      
      const groqUrl = "https://api.groq.com/openai/v1/audio/transcriptions";

      const response = await fetch(groqUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` }, 
        body: formData,
      });

      const data = await response.json();
      
     if (data.text) {
          setAiInput(data.text);
        
          setTimeout(() => handleAiAsk(data.text, true), 500); 
      } else {
          console.log("Full Groq Error:", data); 
          setAiInput('');
          Alert.alert("Transcription Failed", data.error?.message || "Check console for details.");
      }
    } catch (error) {
      console.error("Network/File Error:", error);
      setAiInput('');
      Alert.alert("Groq API Error", "Network error or invalid audio file.");
    }
  };

  const handleAiAsk = async (transcribedText?: string, isVoiceMode: boolean = false) => {
    const userQuery = transcribedText || aiInput;
    if (!userQuery.trim()) return;
    
    const shouldSpeak = isVoiceMode; 
   
    setChatHistory(prev => [...prev, { role: 'user', text: userQuery }]);
    setIsThinking(true);
    setAiInput(''); 
    setIsListening(false); 
    Speech.stop(); 

    try {
        const systemPrompt = `You are Kusha, an empathetic Medical AI Assistant. 
        Patient Info:
        - Name: ${patientData?.fullName || 'the patient'}
        - Blood Type: ${patientData?.bloodType || 'Unknown'}
        - Allergies: ${patientData?.allergies || 'None'}
        - History: ${patientData?.briefHistory || 'None'}

        RULES:
        1. Answer health queries using ONLY their medical profile context.
        2. Advise emergency help for severe symptoms.
        3. ALWAYS reply in the exact language used by the patient (e.g. Hindi, Hinglish, English).
        4. Keep your response concise, empathetic, and strictly under 4 sentences.`;

       const groqUrl = "https://api.groq.com/openai/v1/chat/completions";

        const response = await fetch(groqUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant", 
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userQuery }
                ],
                temperature: 0.5,
                max_tokens: 300
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Groq API Error');
        }

        const aiTextResponse = data.choices[0].message.content;


      setChatHistory(prev => [...prev, { role: 'ai', text: aiTextResponse }]);
        
        if (shouldSpeak) {
            // 🚨 THE PAN-INDIA LANGUAGE ROUTER 🚨
            let voiceLang = 'en-IN'; // Default to Indian English

            if (/[\u0900-\u097F]/.test(aiTextResponse)) {
                voiceLang = 'hi-IN'; // Devanagari (Hindi, Marathi)
            } else if (/[\u0980-\u09FF]/.test(aiTextResponse)) {
                voiceLang = 'bn-IN'; // Bengali
            } else if (/[\u0B80-\u0BFF]/.test(aiTextResponse)) {
                voiceLang = 'ta-IN'; // Tamil
            } else if (/[\u0C00-\u0C7F]/.test(aiTextResponse)) {
                voiceLang = 'te-IN'; // Telugu
            } else if (/[\u0A80-\u0AFF]/.test(aiTextResponse)) {
                voiceLang = 'gu-IN'; // Gujarati
            } else if (/[\u0C80-\u0CFF]/.test(aiTextResponse)) {
                voiceLang = 'kn-IN'; // Kannada
            } else if (/[\u0D00-\u0D7F]/.test(aiTextResponse)) {
                voiceLang = 'ml-IN'; // Malayalam
            }

            Speech.speak(aiTextResponse, { 
                language: voiceLang,
                pitch: 1.1, 
                rate: 0.9 
            });
        }
    } catch (error: any) {
        console.log("Groq Error: ", error);
        setChatHistory(prev => [...prev, { role: 'ai', text: "I'm sorry, my Groq neural pathways are updating. Please try again." }]);
    } finally {
        setIsThinking(false);
    }
  };

  // --- UI: NEW PATIENT ONBOARDING FORM ---
  if (isNewProfile) {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#F4F7F6' }}>
          <Appbar.Header style={{ backgroundColor: '#1ABC9C' }}>
            <Appbar.Content title="Patient Registration" color="white" />
            <Appbar.Action icon="logout" color="white" onPress={handleLogout} />
          </Appbar.Header>
          <ScrollView contentContainerStyle={styles.onboardingScroll}>
              <Surface style={styles.onboardingCard} elevation={2}>
                  <Avatar.Icon size={64} icon="shield-account" style={{ alignSelf: 'center', marginBottom: 20, backgroundColor: '#E8F8F5' }} color="#1ABC9C" />
                  <Text variant="titleLarge" style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: 10, color: '#2C3E50' }}>Welcome to Kushal Mangal</Text>
                  <Text style={{ textAlign: 'center', color: '#7F8C8D', marginBottom: 30 }}>Securely set up your profile. ID: {patientId}</Text>
                  <TextInput label="Full Legal Name" value={formData.fullName} onChangeText={(text) => setFormData({...formData, fullName: text})} mode="outlined" style={styles.input} activeOutlineColor="#1ABC9C" />
                  <TextInput label="Blood Type (e.g., O+, A-)" value={formData.bloodType} onChangeText={(text) => setFormData({...formData, bloodType: text})} mode="outlined" style={styles.input} activeOutlineColor="#1ABC9C" />
                  <TextInput label="Known Allergies" value={formData.allergies} onChangeText={(text) => setFormData({...formData, allergies: text})} mode="outlined" placeholder="e.g., Penicillin, Peanuts" style={styles.input} activeOutlineColor="#1ABC9C" />
                  <TextInput label="Brief Medical History" value={formData.briefHistory} onChangeText={(text) => setFormData({...formData, briefHistory: text})} mode="outlined" multiline numberOfLines={3} style={styles.input} activeOutlineColor="#1ABC9C" />
                  <Button mode="contained" onPress={handleSaveProfile} style={styles.saveButton} contentStyle={{ height: 50 }}>Securely Save Profile</Button>
              </Surface>
          </ScrollView>
        </KeyboardAvoidingView>
      );
  }

  // --- UI: PROFESSIONAL DASHBOARD ---
  return (
    <View style={styles.container}>
      
      <Appbar.Header style={styles.appBar}>
        <Avatar.Icon size={36} icon="hospital-box" style={{ marginLeft: 16, backgroundColor: 'rgba(255,255,255,0.2)' }} color="white" />
        <Appbar.Content title="Kushal Portal" color="white" titleStyle={{ fontWeight: '800', fontSize: 20 }} />
        {!isDemoMode && <Appbar.Action icon="database-sync" color="white" onPress={seedDatabase} />} 
        <Appbar.Action icon="logout" color="white" onPress={handleLogout} />
      </Appbar.Header>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0.1 : 0} 
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
          <View style={styles.mainLayout}>
              
              <View style={styles.leftColumn}>
                  <Surface style={styles.actionCard} elevation={1}>
                      <Text variant="titleMedium" style={styles.sectionTitle}>Portal Services</Text>
                      <Button icon="badge-account-horizontal" mode="contained-tonal" style={styles.actionBtn} textColor="#1ABC9C" buttonColor="#E8F8F5">Connect ABHA ID</Button>
                      <Button icon="hospital-marker" mode="contained-tonal" style={styles.actionBtn} textColor="#2980B9" buttonColor="#EBF5FB">Nearby Facilities</Button>
                      <Button icon="stethoscope" mode="contained-tonal" style={styles.actionBtn} textColor="#8E44AD" buttonColor="#F5EEF8">Consult Specialist</Button>
                      <Button icon="cloud-upload" mode="contained-tonal" style={styles.actionBtn} textColor="#E67E22" buttonColor="#FEF5E7" onPress={handleUploadReport}>Upload Records</Button>
                  </Surface>
              </View>

              <View style={styles.rightColumn}>
                <View style={styles.profileHeader}>
                    <View>
                        <Text variant="headlineMedium" style={styles.patientName}>{patientData?.fullName}</Text>
                        <Text variant="bodyMedium" style={styles.patientIdBadge}>ID: {patientId}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                        <Avatar.Icon size={24} icon="check-circle" color="#1ABC9C" style={{backgroundColor: 'transparent'}} />
                        <Text style={{color: '#1ABC9C', fontWeight: 'bold', fontSize: 12}}>Stable</Text>
                    </View>
                </View>

                <View style={styles.vitalsRow}>
                    <Surface style={styles.vitalMiniCard} elevation={1}>
                        <Text variant="labelSmall" style={styles.vitalLabel}>BLOOD TYPE</Text>
                        <Text variant="titleLarge" style={styles.vitalValue}>{patientData?.bloodType}</Text>
                    </Surface>
                    <Surface style={styles.vitalMiniCard} elevation={1}>
                        <Text variant="labelSmall" style={styles.vitalLabel}>ALLERGIES</Text>
                        <Text variant="titleMedium" style={[styles.vitalValue, { color: '#E74C3C' }]}>{patientData?.allergies}</Text>
                    </Surface>
                </View>

                <Card style={styles.medicalCard} elevation={1}>
                  <Card.Title title="Medical History" titleStyle={styles.cardTitle} left={(props) => <Avatar.Icon {...props} icon="clipboard-text-clock" style={styles.cardIcon} color="#34495E" />} />
                  <Divider style={{ marginHorizontal: 16 }} />
                  <Card.Content style={{ paddingTop: 16 }}>
                      <Text variant="bodyLarge" style={styles.cardText}>{patientData?.briefHistory}</Text>
                  </Card.Content>
                </Card>

                {/* --- PDF DOCUMENTS SECTION --- */}
                <Card style={styles.medicalCard} elevation={1}>
                  <Card.Title title="Clinical Reports & Prescriptions" titleStyle={styles.cardTitle} left={(props) => <Avatar.Icon {...props} icon="folder-account" style={styles.cardIcon} color="#34495E" />} />
                  <Divider style={{ marginHorizontal: 16 }} />
                  <Card.Content style={{ paddingTop: 16 }}>
                    <Text variant="bodyMedium" style={[styles.cardText, {marginBottom: 10}]}>{patientData?.recentReports}</Text>
                    
                    {patientData?.documents && patientData.documents.map((doc: any, index: number) => (
                        <Surface key={index} style={styles.documentItem} elevation={0}>
                            <Avatar.Icon size={40} icon={doc.type === 'Prescription' ? 'pill' : 'file-document-outline'} style={{backgroundColor: '#E8F8F5'}} color="#1ABC9C" />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={{ fontWeight: 'bold', color: '#2C3E50', fontSize: 15 }}>{doc.title}</Text>
                                <Text style={{ fontSize: 12, color: '#7F8C8D', marginTop: 2 }}>{doc.type} • {doc.date}</Text>
                            </View>
                            <IconButton icon="download" iconColor="#34495E" size={24} onPress={() => Linking.openURL(doc.url)} />
                        </Surface>
                    ))}
                  </Card.Content>
                </Card>
              </View>

          </View>
        </ScrollView>

      {/* --- KUSHA AI CONVERSATIONAL INTERFACE --- */}
        <View style={styles.floatingAiWrapper}>
            <Surface style={styles.chatContainer} elevation={3}>
                
                <ScrollView style={styles.chatScrollArea} contentContainerStyle={{ padding: 12 }}>
                    {chatHistory.length === 0 && (
                        <Text style={styles.welcomeText}>Tap the microphone or type below to ask Kusha a question about your health.</Text>
                    )}
                    
                    {chatHistory.map((msg, index) => (
                        <View key={index} style={[styles.chatBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                            {msg.role === 'ai' && <Avatar.Icon size={24} icon="robot-outline" style={{ backgroundColor: 'white', marginRight: 8, marginTop: 4 }} color="#1ABC9C" />}
                            <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>{msg.text}</Text>
                        </View>
                    ))}

                    {isThinking && (
                        <View style={[styles.chatBubble, styles.aiBubble, { flexDirection: 'row', alignItems: 'center' }]}>
                            <ActivityIndicator size="small" color="white" style={{marginRight: 10}} />
                            <Text style={styles.aiText}>Kusha is analyzing your EMR...</Text>
                        </View>
                    )}
                </ScrollView>

                <Divider />

                <View style={styles.inputRow}>
                    
                   {/* REAL LIVE AUDIO RECORDING BUTTON */}
                    {/* TAP-TO-TOGGLE AUDIO RECORDING BUTTON */}
                    <TouchableOpacity 
                        style={[styles.micButton, isListening && styles.micButtonActive]}
                        onPress={handleMicPress} 
                    >
                        <Avatar.Icon 
                            size={44} 
                            // Shows a stop icon when listening, mic when idle
                            icon={isListening ? "stop" : "microphone"} 
                            style={{ backgroundColor: 'transparent' }} 
                            color={isListening ? "white" : "#1ABC9C"} 
                        />
                    </TouchableOpacity>
                    {/* Text Input */}
                    <TextInput 
                        mode="flat" 
                        multiline={true} 
                        placeholder={isListening ? "Listening... Speak now." : "Ask Kusha..."} 
                        placeholderTextColor="#95A5A6"
                        value={aiInput}
                        onChangeText={setAiInput}
                        style={styles.aiChatInput} 
                        underlineColor="transparent"
                        activeUnderlineColor="transparent"
                        onKeyPress={(e: any) => {
                            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                                e.preventDefault(); 
                                handleAiAsk(undefined, false); // 🚨 Explicitly tell it NOT to speak
                            }
                        }}
                    />
                    
                   <Button 
                        mode="contained" 
                        onPress={() => handleAiAsk(undefined, false)} // 🚨 Explicitly tell it NOT to speak
                        style={styles.aiSendButton} 
                        contentStyle={{ height: 44 }}
                        disabled={isThinking}
                    >
                        Send
                    </Button>
                </View>

            </Surface>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F7F6' },
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  appBar: { backgroundColor: '#1ABC9C', elevation: 0 }, 
  
  mainLayout: { 
      flex: 1, 
      flexDirection: isMobile ? 'column' : 'row', 
      padding: 16,
      maxWidth: 1200, 
      alignSelf: 'center',
      width: '100%'
  },
  leftColumn: { 
      width: isMobile ? '100%' : 280, 
      marginRight: isMobile ? 0 : 20,
      marginBottom: isMobile ? 20 : 0
  }, 
  rightColumn: { flex: 1 }, 
  
  actionCard: { padding: 20, borderRadius: 16, backgroundColor: 'white', borderWidth: 1, borderColor: '#EAEDED' },
  sectionTitle: { fontWeight: '800', marginBottom: 16, color: '#2C3E50', letterSpacing: 0.5 },
  actionBtn: { marginBottom: 12, borderRadius: 12, justifyContent: 'flex-start' },

  profileHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 },
  patientName: { fontWeight: '900', color: '#2C3E50', letterSpacing: -0.5 },
  patientIdBadge: { color: '#7F8C8D', marginTop: 4, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F8F5', paddingRight: 12, borderRadius: 20, borderWidth: 1, borderColor: '#A3E4D7' },

  vitalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  vitalMiniCard: { flex: 0.48, padding: 16, borderRadius: 16, backgroundColor: 'white', alignItems: 'center', borderWidth: 1, borderColor: '#EAEDED' },
  vitalLabel: { color: '#95A5A6', fontWeight: '800', marginBottom: 8, letterSpacing: 1 },
  vitalValue: { color: '#2C3E50', fontWeight: '900' },

  medicalCard: { marginBottom: 16, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#EAEDED' },
  cardTitle: { color: '#2C3E50', fontWeight: '800', fontSize: 18 },
  cardIcon: { backgroundColor: '#F4F6F7' },
  cardText: { color: '#555', lineHeight: 26, fontSize: 16 },
  
  documentItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F8F9F9', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#EAEDED' },

  floatingAiWrapper: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: Platform.OS === 'ios' ? 24 : 16, 
      backgroundColor: '#F4F7F6', 
      borderTopWidth: 1,
      borderColor: '#EAEDED',
      alignItems: isMobile ? 'center' : 'center',
      width: '100%',
  },
  chatContainer: { maxWidth: 800, width: '100%', backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#EAEDED', marginLeft: isMobile ? 0 : 200 },
  chatScrollArea: { maxHeight: 250, minHeight: 100 },
  welcomeText: { textAlign: 'center', color: '#95A5A6', fontStyle: 'italic', marginTop: 20 },
  
  chatBubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginBottom: 10, flexDirection: 'row' },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#F0F3F4', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#1ABC9C', borderBottomLeftRadius: 4 },
  
  userText: { color: '#2C3E50', fontSize: 15, lineHeight: 22 },
  aiText: { color: 'white', fontSize: 15, lineHeight: 22, flex: 1, fontWeight: '500' },
  
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#F8F9F9' },
  micButton: { borderRadius: 25, backgroundColor: '#E8F8F5', marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  micButtonActive: { backgroundColor: '#E74C3C' }, 
  aiChatInput: { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: 'transparent', fontSize: 16 },
  aiSendButton: { borderRadius: 25, marginLeft: 8, backgroundColor: '#1ABC9C' },

  onboardingScroll: { padding: 16, flexGrow: 1, justifyContent: 'center' },
  onboardingCard: { padding: 30, borderRadius: 20, backgroundColor: '#ffffff', width: '100%', maxWidth: 500, alignSelf: 'center', borderWidth: 1, borderColor: '#EAEDED' },
  input: { marginBottom: 16, backgroundColor: '#ffffff' },
  saveButton: { borderRadius: 12, marginTop: 15, backgroundColor: '#1ABC9C' }
});