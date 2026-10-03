import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorNote, Field } from '@/components/ui';
import { APP_NAME } from '@/lib/config';
import { useSession } from '@/lib/session';
import { authStyles as styles } from '@/components/auth-styles';
import { space, type } from '@/theme';

export default function SignIn() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in.');
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
            <Text style={type.display}>Welcome back.</Text>
            <Text style={type.secondary}>Your reputation is always changing. Stay informed.</Text>
          </View>

          <View style={{ gap: space.lg }}>
            <ErrorNote message={error} />
            <Field label="Work email" value={email} onChangeText={setEmail} placeholder="you@company.com"
              autoCapitalize="none" autoCorrect={false} keyboardType="email-address" textContentType="emailAddress" autoComplete="email" returnKeyType="next" />
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="Enter your password"
              secureTextEntry textContentType="password" autoComplete="current-password" returnKeyType="go" onSubmitEditing={submit} />
            <Button label="Sign in" onPress={submit} loading={busy} />
          </View>

          <View style={styles.alt}>
            <Text style={type.secondary}>Don&apos;t have an account? </Text>
            <Link href="/sign-up" style={styles.link}>Create one</Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
