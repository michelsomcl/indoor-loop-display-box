
// Import Supabase from the CDN
const { createClient } = supabase;

const SUPABASE_URL = 'https://heefdxcsucayilaxshxg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZWZkeGNzdWNheWlsYXhzaHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMjU5NzQsImV4cCI6MjA2MjkwMTk3NH0.285en917Bf8CIR3s3vf-Z-AahwQS2PS813mtEQk71oE';

// Create the Supabase client
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

let deviceCode = localStorage.getItem('deviceCode');
let currentIndex = 0;
let items = [];

async function loadPlaylist() {
  if (!deviceCode) {
    console.error("Código do dispositivo não definido.");
    return;
  }

  console.log("Carregando playlist para o dispositivo:", deviceCode);

  try {
    // First, get the device information
    const { data: deviceData, error: deviceError } = await supabaseClient
      .from('devices')
      .select('id')
      .eq('codigo', deviceCode)
      .single();

    if (deviceError) {
      console.error("Erro ao buscar dispositivo:", deviceError);
      return;
    }

    if (!deviceData) {
      console.error("Dispositivo não encontrado com código:", deviceCode);
      return;
    }

    console.log("Dispositivo encontrado:", deviceData);
    const deviceId = deviceData.id;

    // Then get the active playlist for this device
    const { data: playlistData, error: playlistError } = await supabaseClient
      .from('device_playlists')
      .select('playlist_id')
      .eq('device_id', deviceId)
      .eq('ativo', true)
      .single();

    if (playlistError) {
      console.error("Erro ao buscar playlist ativa:", playlistError);
      return;
    }

    if (!playlistData) {
      console.error("Nenhuma playlist ativa para este dispositivo.");
      return;
    }

    console.log("Playlist ativa encontrada:", playlistData);
    const playlistId = playlistData.playlist_id;

    // Finally, get the playlist items
    const { data: playlistItems, error: itemsError } = await supabaseClient
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
      console.error("Erro ao buscar itens da playlist:", itemsError);
      return;
    }

    console.log("Itens da playlist:", playlistItems);

    if (playlistItems && playlistItems.length > 0) {
      items = playlistItems;
      if (items.length > 0 && currentIndex >= items.length) {
        currentIndex = 0;
      }
      startLoop();
    } else {
      console.warn("Playlist vazia, nenhum item para exibir.");
    }
  } catch (error) {
    console.error("Erro ao carregar playlist:", error);
  }
}

function startLoop() {
  if (items.length === 0) return;

  const item = items[currentIndex];
  const container = document.getElementById('player-content');
  container.innerHTML = '';

  console.log("Exibindo item:", item);

  let displayTime = item.tempo || 10;

  if (item.tipo === 'imagem') {
    const img = document.createElement('img');
    img.src = item.media_files?.url;
    img.style.width = '100vw';
    img.style.height = '100vh';
    img.style.objectFit = 'contain';
    container.appendChild(img);
    
    // Add fade-in effect
    img.style.opacity = 0;
    img.style.transition = 'opacity 0.5s ease-in';
    
    // Delay the fade-in slightly to ensure the element is rendered
    setTimeout(() => {
      img.style.opacity = 1;
    }, 50);
    
    setTimeout(() => {
      nextItem();
    }, displayTime * 1000);
  } else if (item.tipo === 'video') {
    const video = document.createElement('video');
    video.src = item.media_files?.url;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.controls = false;
    video.style.width = '100vw';
    video.style.height = '100vh';
    video.style.objectFit = 'contain';
    container.appendChild(video);

    // Add fade-in effect
    video.style.opacity = 0;
    video.style.transition = 'opacity 0.5s ease-in';
    
    // Delay the fade-in slightly 
    setTimeout(() => {
      video.style.opacity = 1;
    }, 50);

    video.onended = () => nextItem();
    video.onerror = () => {
      console.error("Erro ao carregar vídeo:", item.media_files?.url);
      nextItem();
    };
    
    // Fallback if video doesn't play or end in reasonable time
    const maxVideoDuration = 300; // 5 minutes max
    setTimeout(() => {
      if (!video.ended && !video.paused) {
        console.warn("Video playback timeout - moving to next item");
        nextItem();
      }
    }, maxVideoDuration * 1000);
    
    return;
  } else if (item.tipo === 'link') {
    const iframe = document.createElement('iframe');
    iframe.src = item.external_links?.url;
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.border = 'none';
    container.appendChild(iframe);
    
    // Add fade-in effect
    iframe.style.opacity = 0;
    iframe.style.transition = 'opacity 0.5s ease-in';
    
    // Delay the fade-in slightly
    setTimeout(() => {
      iframe.style.opacity = 1;
    }, 50);

    setTimeout(() => {
      nextItem();
    }, displayTime * 1000);
  }
}

function nextItem() {
  if (items.length === 0) return;
  
  // Add fade-out effect
  const container = document.getElementById('player-content');
  const currentElement = container.firstChild;
  
  if (currentElement) {
    currentElement.style.transition = 'opacity 0.5s ease-out';
    currentElement.style.opacity = 0;
  }
  
  // Wait for fade-out before changing content
  setTimeout(() => {
    currentIndex = (currentIndex + 1) % items.length;
    startLoop();
  }, 500);
}

function preloadNextItems() {
  if (items.length <= 1) return;
  
  // Preload the next 2 items
  const preloadCount = Math.min(2, items.length - 1);
  
  for (let i = 1; i <= preloadCount; i++) {
    const nextIndex = (currentIndex + i) % items.length;
    const item = items[nextIndex];
    
    if (item.tipo === 'imagem') {
      const preloadImg = new Image();
      preloadImg.src = item.media_files?.url;
    } else if (item.tipo === 'video') {
      const preloadVideo = document.createElement('video');
      preloadVideo.src = item.media_files?.url;
      preloadVideo.preload = 'auto';
      preloadVideo.style.display = 'none';
      document.body.appendChild(preloadVideo);
      
      // Remove the preload element after a short time
      setTimeout(() => {
        if (document.body.contains(preloadVideo)) {
          document.body.removeChild(preloadVideo);
        }
      }, 5000);
    }
    // No preload for iframe/links as they're loaded when displayed
  }
}

// Initial load
window.onload = () => {
  if (!deviceCode) {
    window.location.href = '/';
  } else {
    loadPlaylist();
  }
};

// Set up reload interval
setInterval(() => {
  console.log("Recarregando playlist...");
  loadPlaylist();
}, 60000); // 60 seconds

// Force fullscreen when possible
function requestFullscreen() {
  const elem = document.documentElement;
  
  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch(err => {
      console.warn("Erro ao entrar em tela cheia:", err);
    });
  }
}

// Try to enter fullscreen on load and user interaction
document.addEventListener('click', () => {
  requestFullscreen();
});

document.addEventListener('touchstart', () => {
  requestFullscreen();
});

// Initial fullscreen attempt
setTimeout(requestFullscreen, 1000);
