const SUPABASE_URL = 'https://heefdxcsucayilaxshxg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlZWZkeGNzdWNheWlsYXhzaHhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMjU5NzQsImV4cCI6MjA2MjkwMTk3NH0.285en917Bf8CIR3s3vf-Z-AahwQS2PS813mtEQk71oE';

const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const container = document.getElementById('player-content');
let playlist = [];
let index = 0;

async function carregarPlaylist() {
  const device_code = localStorage.getItem('device_code');
  const { data, error } = await supabase
    .from('playlist')
    .select('*')
    .eq('device_code', device_code)
    .order('ordem', { ascending: true });

  if (error) {
    console.error('Erro ao carregar playlist:', error);
    return;
  }

  playlist = data;
  index = 0;
  exibirProximo();
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
    video.onended = proximoItem;
    container.appendChild(video);
  } else if (item.tipo === 'link') {
    const iframe = document.createElement('iframe');
    iframe.src = item.url;
    iframe.style = 'width:100vw;height:100vh;border:none;';
    container.appendChild(iframe);
    setTimeout(proximoItem, item.duracao * 1000);
  }
}

function proximoItem() {
  index = (index + 1) % playlist.length;
  exibirProximo();
}

window.addEventListener('load', carregarPlaylist);
