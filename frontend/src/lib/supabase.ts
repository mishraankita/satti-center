import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

// Create a supabase client (uses placeholders if env vars not set - for development/preview)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return supabaseUrl !== 'https://placeholder.supabase.co' && supabaseKey !== 'placeholder-key';
};

// Realtime subscription helper for game rooms
export const subscribeToRoom = (
  roomCode: string,
  onUpdate: (payload: any) => void
): RealtimeChannel => {
  const channel = supabase.channel(`room:${roomCode}`);
  
  channel
    .on('broadcast', { event: 'game_update' }, (payload) => {
      onUpdate(payload.payload);
    })
    .subscribe();
  
  return channel;
};

export const broadcastGameUpdate = async (
  roomCode: string,
  gameState: any
) => {
  const channel = supabase.channel(`room:${roomCode}`);
  
  await channel.send({
    type: 'broadcast',
    event: 'game_update',
    payload: gameState,
  });
};

export const unsubscribeFromRoom = (channel: RealtimeChannel) => {
  supabase.removeChannel(channel);
};

export default supabase;
