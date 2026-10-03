import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authStyles as styles } from '@/components/auth-styles';
import { Button, ErrorNote, Field } from '@/components/ui';
import { APP_NAME } from '@/lib/config';
import { useSession } from '@/lib/session';
import { space, type } from '@/theme';


export default function SignUp() {
  const { signUp } = useSession();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) return setError('Enter your name.');
    if (!email.trim()) return setError('Enter your work email.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    setBusy(true);
    setError(null);
    try {
      await signUp({ name, email, password });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create your account.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.mark}><Text style={styles.markText}>{APP_NAME[0]}</Text></View>
            <Text style={styles.brandName}>{APP_NAME}</Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={type.display}>Create your account.</Text>
            <Text style={type.secondary}>14-day free trial with everything in Growth. No credit card required.</Text>
          </View>

          <View style={{ gap: space.lg }}>
            <ErrorNote message={error} />
            <Field label="Full name" value={name} onChangeText={setName} placeholder="Jane Doe" textContentType="name" autoComplete="name" returnKeyType="next" />
            <Field label="Work email" value={email} onChangeText={setEmail} placeholder="you@company.com"
              autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" returnKeyType="next" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters"
              secureTextEntry textContentType="newPassword" autoComplete="new-password" returnKeyType="go" onSubmitEditing={submit} />
            <Button label="Start free trial" onPress={submit} loading={busy} />
            <Text style={[type.small, { textAlign: 'center' }]}>Add your first keyword in the Sources tab after signing up.</Text>
          </View>

          <View style={styles.alt}>
            <Text style={type.secondary}>Already have an account? </Text>
            <Link href="/sign-in" style={styles.link}>Sign in</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
