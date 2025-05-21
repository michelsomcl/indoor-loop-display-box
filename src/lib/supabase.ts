
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

    // Look for active playlists in device_playlists table
    const { data: devicePlaylist, error: devicePlaylistError } = await supabase
      .from('device_playlists')
      .select('playlist_id')
      .eq('device_id', device.id)
      .eq('is_active', true)
      .single();

    console.log("Device playlist query result:", devicePlaylist, devicePlaylistError);

    // If no active playlist or is_active column doesn't exist, try without the is_active filter
    let playlistId: string | null = null;
    
    if (devicePlaylistError && devicePlaylistError.message.includes("is_active")) {
      console.log("is_active column may not exist, trying query without it");
      const { data: fallbackDevicePlaylist, error: fallbackError } = await supabase
        .from('device_playlists')
        .select('playlist_id')
        .eq('device_id', device.id)
        .single();
        
      if (!fallbackError && fallbackDevicePlaylist) {
        playlistId = fallbackDevicePlaylist.playlist_id;
      }
    } else if (!devicePlaylistError && devicePlaylist) {
      playlistId = devicePlaylist.playlist_id;
    }

    // If we still don't have a playlist_id, try a different field name (ativo instead of is_active)
    if (!playlistId) {
      console.log("Trying with 'ativo' field instead of 'is_active'");
      const { data: activoDevicePlaylist, error: activoError } = await supabase
        .from('device_playlists')
        .select('playlist_id')
        .eq('device_id', device.id)
        .eq('ativo', true)
        .single();
        
      if (!activoError && activoDevicePlaylist) {
        playlistId = activoDevicePlaylist.playlist_id;
      }
    }

    if (!playlistId) {
      console.log("No playlist found for device");
      toast({
        title: "Sem playlist",
        description: "Este dispositivo não tem uma playlist atribuída",
        variant: "destructive"
      });
      throw new Error('No playlist assigned to this device');
    }

    console.log("Using playlist ID:", playlistId);

    // Get the playlist details
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id, name')
      .eq('id', playlistId)
      .single();

    if (playlistError) {
      console.error("Playlist error:", playlistError);
      toast({
        title: "Erro",
        description: "Não foi possível encontrar a playlist",
        variant: "destructive"
      });
      throw new Error('Playlist not found');
    }

    console.log("Found playlist:", playlist);

    // Finally, get the playlist items
    const { data: playlistItems, error: itemsError } = await supabase
      .from('playlist_items')
      .select(`
        id,
        ordem,
        tipo,
        tempo,
        media_files (url),
        external_links (url)
      `)
      .eq('playlist_id', playlistId)
      .order('ordem', { ascending: true });

    if (itemsError) {
      console.error("Items error:", itemsError);
      toast({
        title: "Erro",
        description: "Falha ao carregar itens da playlist",
        variant: "destructive"
      });
      throw new Error('Failed to load playlist items');
    }

    console.log("Found playlist items:", playlistItems);

    // Map the items to our PlaylistItem interface
    const items = playlistItems.map(item => {
      let content = '';
      
      if (item.tipo === 'imagem' || item.tipo === 'video') {
        // Check if media_files exists and has elements
        content = item.media_files && item.media_files.length > 0 ? item.media_files[0].url : '';
      } else if (item.tipo === 'link') {
        // Check if external_links exists and has elements
        content = item.external_links && item.external_links.length > 0 ? item.external_links[0].url : '';
      }
      
      return {
        id: item.id,
        order: item.ordem,
        type: mapTipoToMediaType(item.tipo),
        content,
        duration: item.tempo || 10
      };
    });

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
