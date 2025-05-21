
import { createClient } from '@supabase/supabase-js';
import { toast } from "@/components/ui/use-toast";

// Public Supabase URL and anon key - these are safe to expose
const supabaseUrl = 'https://heefdxcsucayilaxshxg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZWZkeGNzdWNheWlsYXhzaHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMjU5NzQsImV4cCI6MjA2MjkwMTk3NH0.285en917Bf8CIR3s3vf-Z-AahwQS2PS813mtEQk71oE';

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

// Function to get the playlist for a device with the given code
export const getPlaylistByDeviceCode = async (deviceCode: string): Promise<Playlist | null> => {
  try {
    console.log("Fetching device with code:", deviceCode);
    
    // First, get the device information
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id')
      .eq('code', deviceCode)
      .single();

    if (deviceError) {
      console.error("Device error:", deviceError);
      throw new Error(`Device not found: ${deviceError.message}`);
    }

    if (!device) {
      console.log("No device found with code:", deviceCode);
      toast({
        title: "Dispositivo não encontrado",
        description: `Nenhum dispositivo encontrado com código: ${deviceCode}`,
        variant: "destructive"
      });
      throw new Error('Device not found');
    }

    console.log("Found device:", device);

    // Query device_playlists table to get all playlists for this device
    const { data: devicePlaylists, error: dpError } = await supabase
      .from('device_playlists')
      .select('playlist_id')
      .eq('device_id', device.id);
      
    if (dpError) {
      console.error("Error fetching device playlists:", dpError);
      throw new Error(`Error fetching device playlists: ${dpError.message}`);
    }
    
    if (!devicePlaylists || devicePlaylists.length === 0) {
      console.error("No playlists found for device");
      throw new Error('No playlists assigned to this device');
    }
    
    console.log("Found device playlists:", devicePlaylists);
    
    // Use the first playlist found
    const playlistId = devicePlaylists[0].playlist_id;
    console.log("Using playlist ID:", playlistId);

    // Get the playlist details
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, name')
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      console.error("Playlist error:", playlistError);
      toast({
        title: "Erro",
        description: "Não foi possível encontrar a playlist",
        variant: "destructive"
      });
      throw new Error('Playlist not found');
    }

    console.log("Found playlist:", playlist);

    // Get the playlist items (simple query without joins)
    const { data: playlistItems, error: itemsError } = await supabase
      .from('playlist_items')
      .select('id, order_num, item_type, tempo, playlist_id')  // Changed "tipo" to "item_type"
      .eq('playlist_id', playlistId)
      .order('order_num', { ascending: true });

    if (itemsError) {
      console.error("Items error:", itemsError);
      throw new Error(`Failed to load playlist items: ${itemsError.message}`);
    }
    
    if (!playlistItems || playlistItems.length === 0) {
      console.log("No items found in playlist");
      throw new Error('No items found in the playlist');
    }

    console.log("Found playlist items:", playlistItems);
    
    // Now get media files separately for each item that needs them
    const items: PlaylistItem[] = [];
    
    for (const item of playlistItems) {
      let content = '';
      
      if (item.item_type === 'imagem' || item.item_type === 'video') {  // Changed "tipo" to "item_type"
        // Fetch media from media_files table
        const { data: mediaFiles, error: mediaError } = await supabase
          .from('media_files')
          .select('url')
          .eq('playlist_item_id', item.id)
          .single();
          
        if (!mediaError && mediaFiles) {
          content = mediaFiles.url;
        }
        
        console.log(`Media for item ${item.id}:`, mediaFiles, mediaError);
      } else if (item.item_type === 'link') {  // Changed "tipo" to "item_type"
        // Fetch URL from external_links table
        const { data: links, error: linkError } = await supabase
          .from('external_links')
          .select('url')
          .eq('playlist_item_id', item.id)
          .single();
          
        if (!linkError && links) {
          content = links.url;
        }
        
        console.log(`Link for item ${item.id}:`, links, linkError);
      }
      
      items.push({
        id: item.id,
        order: item.order_num,
        type: mapTipoToMediaType(item.item_type),  // Changed from item.tipo to item.item_type
        content,
        duration: item.tempo || 10
      });
    }

    console.log("Fully processed playlist items:", items);
    
    return {
      id: playlist.id,
      name: playlist.name,
      items: items
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

// Helper to map database tipo to our MediaType
function mapTipoToMediaType(tipo: string): MediaType {
  switch (tipo) {
    case 'imagem': return 'image';
    case 'video': return 'video';
    case 'link': return 'url';
    default: return 'image';
  }
}

// Function to save device code to localStorage
export const saveDeviceCode = (code: string): void => {
  localStorage.setItem('deviceCode', code);
};

// Function to get device code from localStorage
export const getDeviceCode = (): string | null => {
  return localStorage.getItem('deviceCode');
};
