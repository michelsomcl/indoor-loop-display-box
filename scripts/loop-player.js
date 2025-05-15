
const SUPABASE_URL = 'https://heefdxcsucayilaxshxg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZWZkeGNzdWNheWlsYXhzaHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMjU5NzQsImV4cCI6MjA2MjkwMTk3NH0.285en917Bf8CIR3s3vf-Z-AahwQS2PS813mtEQk71oE';

document.addEventListener('DOMContentLoaded', function() {
  // Initialize supabase
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const container = document.getElementById('player-content');
  let playlist = [];
  let index = 0;

  async function carregarPlaylist() {
    console.log('Carregando playlist...');
    const device_code = localStorage.getItem('deviceCode'); // Changed from device_code to deviceCode to match React app
    console.log('Código do dispositivo:', device_code);
    
    if (!device_code) {
      console.error('Nenhum código de dispositivo encontrado');
      return;
    }

    try {
      // First, get the device information
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id, playlist_id')
        .eq('codigo', device_code)
        .single();

      if (deviceError) {
        console.error('Erro ao buscar dispositivo:', deviceError);
        return;
      }

      if (!device) {
        console.error('Dispositivo não encontrado:', device_code);
        return;
      }

      console.log('Dispositivo encontrado:', device);

      // Get playlist items
      let playlistId = device.playlist_id;
      
      if (!playlistId) {
        const { data: devicePlaylist, error: devicePlaylistError } = await supabase
          .from('device_playlists')
          .select('playlist_id')
          .eq('device_id', device.id)
          .eq('ativo', true)
          .single();

        if (devicePlaylistError) {
          console.error('Erro ao buscar playlist do dispositivo:', devicePlaylistError);
          return;
        }

        if (!devicePlaylist) {
          console.error('Nenhuma playlist ativa para este dispositivo');
          return;
        }

        playlistId = devicePlaylist.playlist_id;
      }

      console.log('ID da playlist:', playlistId);

      // Get playlist items
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
        console.error('Erro ao buscar itens da playlist:', itemsError);
        return;
      }

      if (!playlistItems || playlistItems.length === 0) {
        console.error('Nenhum item encontrado na playlist');
        return;
      }

      console.log('Itens da playlist:', playlistItems);

      // Map the items to our playlist format
      playlist = playlistItems.map(item => {
        let url = '';
        
        if (item.tipo === 'imagem' || item.tipo === 'video') {
          // Access the first item of the media_files array if available
          url = item.media_files && item.media_files.length > 0 ? item.media_files[0].url : '';
        } else if (item.tipo === 'link') {
          // Access the first item of the external_links array if available
          url = item.external_links && item.external_links.length > 0 ? item.external_links[0].url : '';
        }
        
        return {
          id: item.id,
          tipo: item.tipo,
          url: url,
          duracao: item.tempo || 10  // Default to 10 seconds if not specified
        };
      });

      console.log('Playlist processada:', playlist);
      index = 0;
      exibirProximo();
    } catch (error) {
      console.error('Erro ao carregar playlist:', error);
    }
  }

  function exibirProximo() {
    if (playlist.length === 0) return;

    const item = playlist[index];
    container.innerHTML = '';

    if (item.tipo === 'imagem') {
      const img = document.createElement('img');
      img.src = item.url;
      img.style = 'width:100vw;height:100vh;object-fit:cover;';
      container.appendChild(img);
      setTimeout(proximoItem, item.duracao * 1000);
    } else if (item.tipo === 'video') {
      const video = document.createElement('video');
      video.src = item.url;
      video.style = 'width:100vw;height:100vh;object-fit:cover;';
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.onended = proximoItem;
      video.onerror = () => {
        console.error('Erro ao carregar vídeo:', item.url);
        setTimeout(proximoItem, 2000); // Move to next item if video fails
      };
      container.appendChild(video);
    } else if (item.tipo === 'link') {
      const iframe = document.createElement('iframe');
      iframe.src = item.url;
      iframe.style = 'width:100vw;height:100vh;border:none;';
      iframe.onload = () => console.log('Link carregado:', item.url);
      iframe.onerror = () => console.error('Erro ao carregar link:', item.url);
      container.appendChild(iframe);
      setTimeout(proximoItem, item.duracao * 1000);
    }
  }

  function proximoItem() {
    index = (index + 1) % playlist.length;
    exibirProximo();
  }

  // Load playlist initially
  carregarPlaylist();
  
  // Refresh playlist every 60 seconds
  setInterval(carregarPlaylist, 60000);
});
