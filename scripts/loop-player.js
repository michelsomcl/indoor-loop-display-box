
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
    const device_code = localStorage.getItem('deviceCode');
    console.log('Código do dispositivo:', device_code);
    
    if (!device_code) {
      console.error('Nenhum código de dispositivo encontrado');
      return;
    }

    try {
      // First, get the device information
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id')
        .eq('code', device_code)
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

      // Query device_playlists table directly
      const { data: devicePlaylists, error: dpError } = await supabase
        .from('device_playlists')
        .select('playlist_id')
        .eq('device_id', device.id);
        
      if (dpError) {
        console.error('Erro ao buscar playlists do dispositivo:', dpError);
        return;
      }
      
      if (!devicePlaylists || devicePlaylists.length === 0) {
        console.error('Nenhuma playlist encontrada para este dispositivo');
        return;
      }
      
      console.log('Playlists encontradas:', devicePlaylists);
      
      // Use the first playlist found
      const playlistId = devicePlaylists[0].playlist_id;
      console.log('ID da playlist:', playlistId);

      // Get playlist items - simple query without joins
      const { data: playlistItems, error: itemsError } = await supabase
        .from('playlist_items')
        .select('id, order_num, tipo, tempo, playlist_id')  // Changed "ordem" to "order_num"
        .eq('playlist_id', playlistId)
        .order('order_num', { ascending: true });  // Changed "ordem" to "order_num" here too

      if (itemsError) {
        console.error('Erro ao buscar itens da playlist:', itemsError);
        return;
      }

      if (!playlistItems || playlistItems.length === 0) {
        console.error('Nenhum item encontrado na playlist');
        return;
      }

      console.log('Itens da playlist:', playlistItems);

      // Process playlist items one by one to get content URLs
      playlist = [];
      
      for (const item of playlistItems) {
        let url = '';
        
        if (item.tipo === 'imagem' || item.tipo === 'video') {
          // Get URL from media_files table
          const { data: media, error: mediaError } = await supabase
            .from('media_files')
            .select('url')
            .eq('playlist_item_id', item.id)
            .single();
            
          if (!mediaError && media) {
            url = media.url;
          }
        } else if (item.tipo === 'link') {
          // Get URL from external_links table
          const { data: link, error: linkError } = await supabase
            .from('external_links')
            .select('url')
            .eq('playlist_item_id', item.id)
            .single();
            
          if (!linkError && link) {
            url = link.url;
          }
        }
        
        playlist.push({
          id: item.id,
          tipo: item.tipo,
          url: url,
          duracao: item.tempo || 10
        });
      }

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
      img.onerror = () => {
        console.error('Erro ao carregar imagem:', item.url);
        setTimeout(proximoItem, 2000); // Move to next if image fails
      };
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
      iframe.onerror = () => {
        console.error('Erro ao carregar link:', item.url);
        setTimeout(proximoItem, 2000); // Move to next if iframe fails
      };
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
