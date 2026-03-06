import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Surface, useTheme, Avatar } from 'react-native-paper';
import { signUp, confirmSignUp, signIn, resetPassword, confirmResetPassword, signOut } from 'aws-amplify/auth';

// --- 10 REALISTIC DEMO PATIENTS ---
const DEMO_USERS = [
  { id: '1000000001', name: 'Shreshth M.', condition: 'Hypertension', bg: '#E8F8F5', color: '#1ABC9C', blood: 'O+', allergies: 'None', history: 'Diagnosed with mild hypertension. On Losartan 50mg.', reports: 'BP: 125/80 (Normal)' },
  { id: '1000000002', name: 'Priya K.', condition: 'Type 2 Diabetes', bg: '#FDEDEC', color: '#E74C3C', blood: 'A+', allergies: 'Penicillin', history: 'Type 2 Diabetes diagnosed 2021. Managed via diet.', reports: 'HbA1c: 6.4% (Improved)' },
  { id: '1000000003', name: 'Rahul S.', condition: 'Asthma', bg: '#EBF5FB', color: '#3498DB', blood: 'B-', allergies: 'Dust, Pollen', history: 'Lifelong asthma. Uses Albuterol inhaler as needed.', reports: 'Spirometry: Normal lung capacity.' },
  { id: '1000000004', name: 'Anita V.', condition: 'Prenatal Care', bg: '#F5EEF8', color: '#9B59B6', blood: 'AB+', allergies: 'Latex', history: '24 weeks pregnant. Routine checkups normal.', reports: 'Ultrasound: Fetal heart rate 140bpm.' },
  { id: '1000000005', name: 'Vikram D.', condition: 'Post-Op Knee', bg: '#FEF9E7', color: '#F1C40F', blood: 'O-', allergies: 'Ibuprofen', history: 'ACL reconstruction surgery 2 months ago.', reports: 'MRI: Healing progressing well.' },
  { id: '1000000006', name: 'Sneha R.', condition: 'Hypothyroidism', bg: '#EAEDED', color: '#95A5A6', blood: 'A-', allergies: 'None', history: 'Thyroid levels monitored every 6 months.', reports: 'TSH: 2.1 mIU/L (Optimal)' },
  { id: '1000000007', name: 'Rohan P.', condition: 'Pediatric', bg: '#E8F6F3', color: '#2ECC71', blood: 'O+', allergies: 'Peanuts', history: '8-year-old routine checkup and vaccinations.', reports: 'All milestones met. Flu shot given.' },
  { id: '1000000008', name: 'Kavita L.', condition: 'Migraines', bg: '#F4ECF7', color: '#8E44AD', blood: 'B+', allergies: 'Sulfa Drugs', history: 'Chronic migraines. Prescribed Sumatriptan.', reports: 'Neurological exam: Normal.' },
  { id: '1000000009', name: 'Amit T.', condition: 'Cardiac Arrhythmia', bg: '#FDEBD0', color: '#E67E22', blood: 'AB-', allergies: 'None', history: 'Occasional palpitations. Wears holter monitor.', reports: 'ECG: Minor PVCs, no acute distress.' },
  { id: '1000000010', name: 'Pooja N.', condition: 'Anemia', bg: '#F9E79F', color: '#D4AC0D', blood: 'A+', allergies: 'None', history: 'Iron deficiency anemia. Taking supplements.', reports: 'Hemoglobin: 10.5 g/dL (Slightly low)' },
];

export default function LoginScreen({ navigation }: any) {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP' | 'SUCCESS' | 'FORGOT_PWD' | 'FORGOT_ID' | 'DEMO_SELECT'>('LOGIN');
  const [step, setStep] = useState(1); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [patientIdInput, setPatientIdInput] = useState(''); 
  const [generatedPatientId, setGeneratedPatientId] = useState(''); 
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const theme = useTheme();

  // --- SIGN UP FLOW (WITH COLLISION CATCHER) ---
  const handleSignUp = async () => {
    if (!email.includes('@')) {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
        return;
    }
    if (password.length < 8) {
        Alert.alert("Weak Password", "Password must be at least 8 characters long and contain uppercase, numbers, and special characters.");
        return;
    }

    setLoading(true);
    let isUnique = false;
    let newPatientId = '';

    while (!isUnique) {
        newPatientId = Math.floor(1000000000 + Math.random() * 9000000000).toString();
        try {
            await signUp({ 
                username: newPatientId, 
                password: password,
                options: { userAttributes: { email: email } } 
            });
            isUnique = true; 
            setGeneratedPatientId(newPatientId);
            setStep(2); 
        } catch (error: any) {
            if (error.name === 'UsernameExistsException') {
                console.log("Collision detected! Regenerating ID...");
                continue; 
            } else {
                Alert.alert('Sign Up Error', error.message);
                setLoading(false);
                return; 
            }
        }
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
      setLoading(true);
      try {
          await confirmSignUp({ username: generatedPatientId, confirmationCode: otpCode });
          setAuthMode('SUCCESS'); 
      } catch (error: any) {
          Alert.alert('Verification Failed', 'Incorrect OTP.');
      } finally {
          setLoading(false);
      }
  };

  // --- LOGIN FLOW ---
  const handleLogin = async () => {
      const cleanPatientId = patientIdInput.trim();
      
      if (cleanPatientId.length !== 10 || password.length < 8) {
          Alert.alert("Invalid Input", "Enter your 10-digit Patient ID and valid Password.");
          return;
      }
      
      setLoading(true);
      try {
          console.log("Sending to AWS Cognito...");
          await signIn({ username: cleanPatientId, password: password });
          console.log("AWS Login Success! Navigating to Dashboard...");
          navigation.replace('Dashboard', { demoMode: false });
      } catch (error: any) {
          console.log("AWS Login Error:", error);
          if (error.name === 'UserAlreadyAuthenticatedException') {
              try {
                  console.log("Clearing stuck session...");
                  await signOut(); 
                  console.log("Retrying login with new Patient ID...");
                  await signIn({ username: cleanPatientId, password: password });
                  navigation.replace('Dashboard', { demoMode: false });
              } catch (retryError: any) {
                  Alert.alert('Login Failed', retryError.message);
              }
          } else {
              Alert.alert('Login Failed', error.message || 'Incorrect Patient ID or Password.');
          }
      } finally {
          setLoading(false);
      }
  };

  // --- FORGOT PASSWORD FLOW ---
  const handleForgotPassword = async () => {
      if (patientIdInput.length !== 10) {
          Alert.alert("Required", "Please enter your 10-digit Patient ID first.");
          return;
      }
      setLoading(true);
      try {
          await resetPassword({ username: patientIdInput });
          setStep(2); 
      } catch (error: any) {
          Alert.alert("Error", error.message);
      } finally {
          setLoading(false);
      }
  };

  const handleConfirmNewPassword = async () => {
      if (password.length < 8 || otpCode.length < 3) {
          Alert.alert("Invalid", "Enter the OTP and a new 8+ character password.");
          return;
      }
      setLoading(true);
      try {
          await confirmResetPassword({ username: patientIdInput, confirmationCode: otpCode, newPassword: password });
          Alert.alert("Success", "Password reset successfully! You can now log in.");
          setAuthMode('LOGIN');
          setStep(1);
          setPassword('');
          setOtpCode('');
      } catch (error: any) {
          Alert.alert("Error", error.message);
      } finally {
          setLoading(false);
      }
  };

  const handleForgotPatientId = () => {
      if (!email.includes('@')) {
          Alert.alert("Invalid Email", "Please enter a valid email address.");
          return;
      }
      setLoading(true);
      setTimeout(() => {
          setLoading(false);
          Alert.alert("Check Your Inbox", "If this email is registered, your Patient ID(s) have been securely emailed to you.");
          setAuthMode('LOGIN');
          setEmail('');
      }, 1500);
  };

  // --- DEMO SELECTOR FLOW ---
  const handleDemoSelect = (user: any) => {
      // Passes the specific user data instantly to the dashboard
      navigation.replace('Dashboard', { demoMode: true, demoUserData: user });
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.inner}>
          
          <View style={styles.headerContainer}>
            <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              Kushal Mangal
            </Text>
            <Text variant="titleMedium" style={{ color: '#7F8C8D', marginTop: 8 }}>
              Hospital Portal EMR Login
            </Text>
          </View>

          <Surface style={styles.card} elevation={3}>
            
            {/* --- UI: DEMO SELECTOR --- */}
            {authMode === 'DEMO_SELECT' ? (
                <View style={{ flex: 1, maxHeight: 450 }}>
                    <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 10, color: '#2C3E50' }}>Select Demo Patient</Text>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {DEMO_USERS.map((user) => (
                            <TouchableOpacity key={user.id} onPress={() => handleDemoSelect(user)} style={{ marginBottom: 10 }}>
                                <Surface style={[styles.demoUserCard, { borderLeftColor: user.color }]} elevation={1}>
                                    <Avatar.Text size={40} label={user.name.charAt(0)} style={{ backgroundColor: user.bg }} color={user.color} />
                                    <View style={{ marginLeft: 15, flex: 1 }}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{user.name}</Text>
                                        <Text style={{ color: '#7F8C8D', fontSize: 12 }}>ID: {user.id}</Text>
                                        <Text style={{ color: user.color, fontSize: 13, marginTop: 2, fontWeight: '600' }}>{user.condition}</Text>
                                    </View>
                                </Surface>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <Button mode="text" onPress={() => setAuthMode('LOGIN')} style={{ marginTop: 10 }}>Cancel</Button>
                </View>
            ) : (
                <View>
                    {/* --- UI: TOGGLE TABS --- */}
                    {(authMode === 'LOGIN' || authMode === 'SIGNUP') && step === 1 && (
                        <View style={styles.toggleContainer}>
                            <Button mode={authMode === 'LOGIN' ? 'contained' : 'outlined'} onPress={() => { setAuthMode('LOGIN'); setPassword(''); }} style={styles.toggleBtn}>Log In</Button>
                            <Button mode={authMode === 'SIGNUP' ? 'contained' : 'outlined'} onPress={() => { setAuthMode('SIGNUP'); setPassword(''); }} style={styles.toggleBtn}>New Patient</Button>
                        </View>
                    )}

                    {/* --- UI: LOGIN --- */}
                    {authMode === 'LOGIN' && step === 1 && (
                      <View>
                        <TextInput label="10-Digit Patient ID" value={patientIdInput} onChangeText={setPatientIdInput} mode="outlined" keyboardType="number-pad" maxLength={10} style={styles.input} left={<TextInput.Icon icon="account" />} />
                        <TextInput 
                          label="Password" 
                          value={password} 
                          onChangeText={setPassword} 
                          mode="outlined" 
                          secureTextEntry={!showPassword} 
                          style={styles.input} 
                          left={<TextInput.Icon icon="lock" />} 
                          right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
                        />
                        <Button mode="contained" onPress={handleLogin} loading={loading} style={styles.button}>Access Records</Button>
                        <View style={styles.forgotLinks}>
                            <Button mode="text" onPress={() => { setAuthMode('FORGOT_PWD'); setStep(1); setPassword(''); }}>Forgot Password?</Button>
                            <Button mode="text" onPress={() => { setAuthMode('FORGOT_ID'); setEmail(''); }} textColor="#95A5A6">Forgot Patient ID?</Button>
                        </View>
                      </View>
                    )}

                    {/* --- UI: SIGN UP STEP 1 --- */}
                    {authMode === 'SIGNUP' && step === 1 && (
                      <View>
                        <Text variant="bodySmall" style={styles.instruction}>Register to receive your unique 10-digit Patient ID.</Text>
                        <TextInput label="Email Address" value={email} onChangeText={(text) => setEmail(text.trim().toLowerCase())} mode="outlined" keyboardType="email-address" autoCapitalize="none" style={styles.input} left={<TextInput.Icon icon="email" />} />
                        <TextInput 
                          label="Create a Password" 
                          value={password} 
                          onChangeText={setPassword} 
                          mode="outlined" 
                          secureTextEntry={!showPassword} 
                          style={styles.input} 
                          left={<TextInput.Icon icon="lock" />} 
                          right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />}
                        />
                        <Button mode="contained" onPress={handleSignUp} loading={loading} style={styles.button}>Get Patient ID</Button>
                      </View>
                    )}

                    {/* --- UI: SIGN UP STEP 2 --- */}
                    {authMode === 'SIGNUP' && step === 2 && (
                      <View>
                        <Text variant="bodyMedium" style={styles.instruction}>Check your inbox! We sent a 6-digit code to {email}.</Text>
                        <TextInput label="OTP Code" value={otpCode} onChangeText={setOtpCode} mode="outlined" keyboardType="number-pad" style={styles.input} />
                        <Button mode="contained" onPress={handleVerifyOTP} loading={loading} style={styles.button}>Verify</Button>
                        <Button mode="text" onPress={() => setStep(1)} disabled={loading} style={{ marginTop: 8 }}>Cancel</Button>
                      </View>
                    )}

                    {/* --- UI: SUCCESS --- */}
                    {authMode === 'SUCCESS' && (
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                            <Text variant="headlineSmall" style={{ color: '#27AE60', fontWeight: 'bold', marginBottom: 10 }}>Registration Complete!</Text>
                            <Text variant="bodyMedium" style={{ textAlign: 'center', color: '#34495E', marginBottom: 20 }}>
                                Please screenshot or save your Patient ID. You will need it to log in.
                            </Text>
                            <Surface style={styles.idDisplayBox} elevation={2}>
                                <Text variant="displaySmall" style={{ color: theme.colors.primary, fontWeight: 'bold', letterSpacing: 2 }}>{generatedPatientId}</Text>
                            </Surface>
                            <Button mode="contained" style={[styles.button, { width: '100%' }]} onPress={() => { setAuthMode('LOGIN'); setPatientIdInput(generatedPatientId); setPassword(''); setStep(1); }}>Go to Login</Button>
                        </View>
                    )}

                    {/* --- UI: FORGOT PASSWORD --- */}
                    {authMode === 'FORGOT_PWD' && (
                        <View>
                            {step === 1 ? (
                                <>
                                    <Text variant="titleMedium" style={{marginBottom: 15, textAlign: 'center'}}>Reset Password</Text>
                                    <TextInput label="Enter your 10-Digit Patient ID" value={patientIdInput} onChangeText={setPatientIdInput} mode="outlined" keyboardType="number-pad" maxLength={10} style={styles.input} />
                                    <Button mode="contained" onPress={handleForgotPassword} loading={loading} style={styles.button}>Send Reset OTP</Button>
                                    <Button mode="text" onPress={() => setAuthMode('LOGIN')} style={{ marginTop: 8 }}>Back to Login</Button>
                                </>
                            ) : (
                                <>
                                    <Text variant="bodyMedium" style={styles.instruction}>Enter the OTP sent to your registered email and your new password.</Text>
                                    <TextInput label="6-Digit OTP" value={otpCode} onChangeText={setOtpCode} mode="outlined" keyboardType="number-pad" style={styles.input} />
                                    <TextInput label="New Password" value={password} onChangeText={setPassword} mode="outlined" secureTextEntry={!showPassword} style={styles.input} right={<TextInput.Icon icon={showPassword ? "eye-off" : "eye"} onPress={() => setShowPassword(!showPassword)} />} />
                                    <Button mode="contained" onPress={handleConfirmNewPassword} loading={loading} style={styles.button}>Confirm New Password</Button>
                                    <Button mode="text" onPress={() => setStep(1)} style={{ marginTop: 8 }}>Cancel</Button>
                                </>
                            )}
                        </View>
                    )}

                    {/* --- UI: FORGOT ID --- */}
                    {authMode === 'FORGOT_ID' && (
                        <View>
                            <Text variant="titleMedium" style={{marginBottom: 15, textAlign: 'center'}}>Retrieve Patient ID</Text>
                            <Text variant="bodySmall" style={styles.instruction}>Enter your registered email address. For your security, we will email your Patient ID(s) directly to your inbox.</Text>
                            <TextInput label="Email Address" value={email} onChangeText={(text) => setEmail(text.trim().toLowerCase())} mode="outlined" keyboardType="email-address" autoCapitalize="none" style={styles.input} left={<TextInput.Icon icon="email" />} />
                            <Button mode="contained" onPress={handleForgotPatientId} loading={loading} style={styles.button}>Email My Patient ID</Button>
                            <Button mode="text" onPress={() => setAuthMode('LOGIN')} style={{ marginTop: 8 }}>Back to Login</Button>
                        </View>
                    )}
                </View>
            )}

          </Surface>

          {/* THE DEMO TRIGGER BUTTON */}
          {authMode !== 'DEMO_SELECT' && (
              <View style={styles.demoContainer}>
                  <Button mode="elevated" buttonColor="#27AE60" textColor="white" icon="rocket-launch" onPress={() => setAuthMode('DEMO_SELECT')}>Enter Prototype Demo Mode</Button>
              </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  inner: { flex: 1, justifyContent: 'center', padding: 24, maxWidth: 450, width: '100%', alignSelf: 'center' },
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  card: { padding: 24, borderRadius: 16, backgroundColor: '#ffffff', marginBottom: 20 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  toggleBtn: { flex: 0.48 },
  instruction: { textAlign: 'center', marginBottom: 20, color: '#34495E' },
  input: { marginBottom: 20, backgroundColor: '#ffffff' },
  button: { borderRadius: 8, paddingVertical: 6 },
  forgotLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  idDisplayBox: { backgroundColor: '#E8F6F3', padding: 20, borderRadius: 12, marginBottom: 25, alignItems: 'center', width: '100%' },
  demoContainer: { alignItems: 'center', marginTop: 20, padding: 16, borderTopWidth: 1, borderColor: '#E0E0E0' },
  demoUserCard: { flexDirection: 'row', padding: 15, borderRadius: 12, backgroundColor: 'white', alignItems: 'center', borderLeftWidth: 5 }
});