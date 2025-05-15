
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDeviceCode } from '@/lib/supabase';
import MediaPlayer from '@/components/MediaPlayer';

const Player = () => {
  const navigate = useNavigate();

  // Check if device code exists, redirect to index if not
  useEffect(() => {
    const storedDeviceCode = getDeviceCode();
    if (!storedDeviceCode) {
      navigate('/');
    }
    
    // Set up fullscreen
    const enterFullscreen = () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen()
          .catch(err => console.error(`Error attempting to enable fullscreen: ${err}`));
      }
    };
    
    // Try to enter fullscreen when component mounts
    enterFullscreen();
    
    // Add event listener for user interaction to trigger fullscreen
    const fullscreenHandler = () => {
      enterFullscreen();
      document.removeEventListener('click', fullscreenHandler);
    };
    
    document.addEventListener('click', fullscreenHandler);
    
    return () => {
      document.removeEventListener('click', fullscreenHandler);
    };
  }, [navigate]);

  return <MediaPlayer />;
};

export default Player;
