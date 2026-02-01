import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../src/constants/theme';
import { useGameStore } from '../src/store/gameStore';
import { createRoom, joinRoom, getCardConfig, getAllCardImages } from '../src/lib/api';

export default function LobbyScreen() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'host' | 'join'>('menu');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { setPlayer, setRoom, setCardConfig, addCardImage, reset } = useGameStore();
  
  // Reset store on mount
  useEffect(() => {
    reset();
    loadCardConfig();
  }, []);
  
  const loadCardConfig = async () => {
    try {
      const config = await getCardConfig();
      setCardConfig(config);
      
      // Load cached card images
      const images = await getAllCardImages();
      images.forEach(img => addCardImage(img.rank, img.image_base64));
    } catch (e) {
      console.log('Failed to load card config:', e);
    }
  };
  
  const handleHost = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await createRoom(playerName.trim());
      setPlayer(result.player_id, playerName.trim());
      setRoom(result.room_code, result.room);
      router.push(`/waiting?code=${result.room_code}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleJoin = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter room code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await joinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      setPlayer(result.player_id, playerName.trim());
      setRoom(result.room_code, result.room);
      router.push(`/waiting?code=${result.room_code}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderMenu = () => (
    <View style={styles.menuContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>STRATA</Text>
        <Text style={styles.logoNumber}>7</Text>
      </View>
      <Text style={styles.subtitle}>Badam Satti / Sevens</Text>
      <Text style={styles.description}>A journey from Earth's core to deep space</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => setMode('host')}
        >
          <Ionicons name="add-circle-outline" size={24} color={COLORS.textPrimary} />
          <Text style={styles.buttonText}>Host Game</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => setMode('join')}
        >
          <Ionicons name="enter-outline" size={24} color={COLORS.primary} />
          <Text style={styles.secondaryButtonText}>Join Game</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderHostForm = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('menu')}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      
      <Text style={styles.formTitle}>Host a Game</Text>
      <Text style={styles.formSubtitle}>Create a room and invite your friends</Text>
      
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Your Display Name"
          placeholderTextColor={COLORS.textMuted}
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={15}
          autoCapitalize="words"
        />
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleHost}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.textPrimary} />
        ) : (
          <>
            <Ionicons name="rocket-outline" size={24} color={COLORS.textPrimary} />
            <Text style={styles.buttonText}>Create Room</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
  
  const renderJoinForm = () => (
    <View style={styles.formContainer}>
      <TouchableOpacity style={styles.backButton} onPress={() => setMode('menu')}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      
      <Text style={styles.formTitle}>Join a Game</Text>
      <Text style={styles.formSubtitle}>Enter the room code shared by host</Text>
      
      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.input}
          placeholder="Your Display Name"
          placeholderTextColor={COLORS.textMuted}
          value={playerName}
          onChangeText={setPlayerName}
          maxLength={15}
          autoCapitalize="words"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="key-outline" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder="ABCD"
          placeholderTextColor={COLORS.textMuted}
          value={roomCode}
          onChangeText={(text) => setRoomCode(text.toUpperCase())}
          maxLength={4}
          autoCapitalize="characters"
        />
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      <TouchableOpacity 
        style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
        onPress={handleJoin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={COLORS.textPrimary} />
        ) : (
          <>
            <Ionicons name="enter-outline" size={24} color={COLORS.textPrimary} />
            <Text style={styles.buttonText}>Join Room</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'menu' && renderMenu()}
          {mode === 'host' && renderHostForm()}
          {mode === 'join' && renderJoinForm()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  menuContainer: {
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 4,
  },
  logoNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: SPACING.xl * 2,
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    gap: SPACING.sm,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
    gap: SPACING.sm,
  },
  buttonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  formContainer: {
    width: '100%',
  },
  backButton: {
    marginBottom: SPACING.lg,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  input: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
});
