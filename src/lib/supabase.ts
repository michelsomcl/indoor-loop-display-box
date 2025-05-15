
import { createClient } from '@supabase/supabase-js';
import { toast } from "@/components/ui/use-toast";

// Public Supabase URL and anon key - these are safe to expose
// You'll need to replace these with your actual Supabase URL and anon key
const supabaseUrl = 'https://your-supabase-url.supabase.co';
const supabaseAnonKey = 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MediaType = 'image' | 'video' | 'url';

export interface PlaylistItem {
  id: string;
  order: number;
  type: MediaType;
  content: string; // URL to the content or actual URL for iframe/websites
  duration?: number; // Duration in seconds (for images and URLs)
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
}

export const getPlaylistByDeviceCode = async (deviceCode: string): Promise<Playlist | null> => {
  try {
    // First, get the device information
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('playlist_id')
      .eq('code', deviceCode)
      .single();

    if (deviceError || !device) {
      throw new Error('Device not found');
    }

    // Then get the playlist
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, name')
      .eq('id', device.playlist_id)
      .single();

    if (playlistError || !playlist) {
      throw new Error('Playlist not found');
    }

    // Finally, get the playlist items
    const { data: items, error: itemsError } = await supabase
      .from('playlist_items')
      .select('*')
      .eq('playlist_id', playlist.id)
      .order('order', { ascending: true });

    if (itemsError) {
      throw new Error('Failed to load playlist items');
    }

    return {
      id: playlist.id,
      name: playlist.name,
      items: items || []
    };
  } catch (error) {
    console.error('Error fetching playlist:', error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to fetch playlist",
      variant: "destructive"
    });
    return null;
  }
};

// Function to save device code to localStorage
export const saveDeviceCode = (code: string): void => {
  localStorage.setItem('deviceCode', code);
};

// Function to get device code from localStorage
export const getDeviceCode = (): string | null => {
  return localStorage.getItem('deviceCode');
};
