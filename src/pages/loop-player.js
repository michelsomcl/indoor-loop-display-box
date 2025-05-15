const SUPABASE_URL = 'https://heefdxcsucayilaxshxg.supabase.co'; // coloque aqui a URL do seu projeto
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZWZkeGNzdWNheWlsYXhzaHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMjU5NzQsImV4cCI6MjA2MjkwMTk3NH0.285en917Bf8CIR3s3vf-Z-AahwQS2PS813mtEQk71oE'; // sua anon key

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let deviceCode = localStorage.getItem('device_code');
let currentIndex = 0;
let items = [];

async function loadPlaylist() {
  if (!deviceCode) {
    alert("Código do dispositivo não definido.");
    return;
  }

  const { data: deviceData, error: deviceError } = await supabase
    .from('devices')
    .select('id')
    .eq('codigo', deviceCode)
    .single();

  if (deviceError || !deviceData) {
    alert("Dispositivo não encontrado.");
    return;
  }

  const deviceId = deviceData.id;

  const { data: playlistData, error: playlistError } = await supabase
    .from('device_playlists')
    .select('playlist_id')
    .eq('device_id', deviceId)
    .eq('ativo', true)
    .single();

  if (playlistError || !playlistData) {
    alert("Playlist não encontrada.");
    return;
  }

  const playlistId = playlistData.playlist_id;

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
    alert("Erro ao carregar playlist.");
    return;
  }

  items = playlistItems;
  currentIndex = 0;
  startLoop();
}

function startLoop() {
  if (items.length === 0) return;

  const item = items[currentIndex];
  const container = document.getElementById('player-content');
  container.innerHTML = '';

  let displayTime = item.tempo || 10;

  if (item.tipo === 'imagem') {
    const img = document.createElement('img');
    img.src = item.media_files?.url;
    img.style.width = '100vw';
    img.style.height = '100vh';
    img.style.objectFit = 'contain';
    container.appendChild(img);
  } else if (item.tipo === 'video') {
    const video = document.createElement('video');
    video.src = item.media_files?.url;
    video.autoplay = true;
    video.controls = false;
    video.style.width = '100vw';
    video.style.height = '100vh';
    video.style.objectFit = 'contain';
    container.appendChild(video);

    video.onended = () => nextItem();
    return;
  } else if (item.tipo === 'link') {
    const iframe = document.createElement('iframe');
    iframe.src = item.external_links?.url;
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
    iframe.style.border = 'none';
    container.appendChild(iframe);
  }

  setTimeout(() => {
    nextItem();
  }, displayTime * 1000);
}

function nextItem() {
  currentIndex = (currentIndex + 1) % items.length;
  startLoop();
}

setInterval(() => {
  loadPlaylist();
}, 60000);

window.onload = () => {
  if (!deviceCode) {
    window.location.href = '/inicio';
  } else {
    loadPlaylist();
  }
};
