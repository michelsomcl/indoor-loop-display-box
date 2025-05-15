
import React, { useState, useEffect, useCallback } from 'react';
import { getDeviceCode, getPlaylistByDeviceCode, PlaylistItem, Playlist } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import MediaRenderer from './MediaRenderer';
import { toast } from "@/components/ui/use-toast";

const MediaPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  // Function to fetch playlist data
  const fetchPlaylistData = useCallback(async () => {
    const deviceCode = getDeviceCode();
    
    if (!deviceCode) {
      navigate('/');
      return;
    }

    try {
      const playlistData = await getPlaylistByDeviceCode(deviceCode);
      
      if (playlistData && playlistData.items.length > 0) {
        setPlaylist(playlistData);
      } else {
        toast({
          title: "Playlist vazia",
          description: "Não há itens para exibir na playlist",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error fetching playlist:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a playlist",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Load playlist on component mount
  useEffect(() => {
    fetchPlaylistData();
    
    // Set up interval to refresh playlist data every 60 seconds
    const refreshInterval = setInterval(() => {
      fetchPlaylistData();
    }, 60000); // 60 seconds
    
    return () => clearInterval(refreshInterval);
  }, [fetchPlaylistData]);

  // Function to advance to the next item in playlist
  const advanceToNextItem = useCallback(() => {
    if (!playlist || playlist.items.length === 0) return;
    
    setIsTransitioning(true);
    
    setTimeout(() => {
      setCurrentItemIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % playlist.items.length;
        return nextIndex;
      });
      setIsTransitioning(false);
    }, 800); // Fade transition duration
  }, [playlist]);

  // Get the current item from the playlist
  const currentItem = playlist?.items[currentItemIndex];

  // Effect to handle timing for advancing to the next item
  useEffect(() => {
    if (!currentItem || loading) return;

    let timer: number;

    if (currentItem.type === 'video') {
      // Videos will trigger the next item when they end
      // This is handled in the MediaRenderer component
    } else {
      // For images and URLs, use the specified duration or default to 10 seconds
      const duration = currentItem.duration || 10;
      timer = window.setTimeout(advanceToNextItem, duration * 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentItem, currentItemIndex, loading, advanceToNextItem]);

  // Preload next items (up to 2 items ahead)
  const preloadItems = useCallback(() => {
    if (!playlist || playlist.items.length <= 1) return null;
    
    const preloadElements = [];
    const itemsToPreload = 2; // Number of items to preload
    
    for (let i = 1; i <= itemsToPreload; i++) {
      const nextIndex = (currentItemIndex + i) % playlist.items.length;
      const item = playlist.items[nextIndex];
      
      if (item.type === 'image') {
        preloadElements.push(
          <link 
            key={`preload-${item.id}`} 
            rel="preload" 
            href={item.content} 
            as="image" 
          />
        );
      } else if (item.type === 'video') {
        preloadElements.push(
          <link 
            key={`preload-${item.id}`} 
            rel="preload" 
            href={item.content} 
            as="video" 
          />
        );
      }
    }
    
    return preloadElements;
  }, [playlist, currentItemIndex]);

  if (loading) {
    return (
      <div className="fullscreen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Carregando...</h2>
          <p className="text-muted-foreground">Preparando sua mídia</p>
        </div>
      </div>
    );
  }

  if (!playlist || playlist.items.length === 0) {
    return (
      <div className="fullscreen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Nenhum conteúdo disponível</h2>
          <p className="text-muted-foreground">
            Não há itens na playlist para este dispositivo
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {preloadItems()}
      
      <div className={`fullscreen ${isTransitioning ? 'animate-fade-out' : 'animate-fade-in'}`}>
        {currentItem && (
          <MediaRenderer 
            item={currentItem} 
            onComplete={advanceToNextItem} 
          />
        )}
      </div>
    </>
  );
};

export default MediaPlayer;
