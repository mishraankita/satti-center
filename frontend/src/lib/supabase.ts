import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
