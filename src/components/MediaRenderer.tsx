
import React, { useState, useEffect, useRef } from 'react';
import { PlaylistItem } from '@/lib/supabase';

interface MediaRendererProps {
  item: PlaylistItem;
  onComplete: () => void;
}

const MediaRenderer: React.FC<MediaRendererProps> = ({ item, onComplete }) => {
  const [loaded, setLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setLoaded(false);
    
    // Reset video state if the item changes
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [item]);

  useEffect(() => {
    if (item.type === 'video' && videoRef.current) {
      // Set up video event listeners
      const video = videoRef.current;
      
      const handleVideoEnd = () => {
        onComplete();
      };
      
      const handleVideoError = (e: Event) => {
        console.error('Video error:', e);
        // If video fails, move to next item after a short delay
        setTimeout(onComplete, 2000);
      };
      
      // Add event listeners
      video.addEventListener('ended', handleVideoEnd);
      video.addEventListener('error', handleVideoError);
      
      // Cleanup
      return () => {
        video.removeEventListener('ended', handleVideoEnd);
        video.removeEventListener('error', handleVideoError);
      };
    }
  }, [item, onComplete]);

  // Handle different media types
  switch (item.type) {
    case 'image':
      return (
        <img 
          src={item.content} 
          alt="Media content" 
          className="fullscreen object-contain"
          onLoad={() => setLoaded(true)}
        />
      );
      
    case 'video':
      return (
        <video 
          ref={videoRef}
          src={item.content}
          className="fullscreen object-contain"
          autoPlay 
          muted
          playsInline
          onCanPlay={() => setLoaded(true)}
        />
      );
      
    case 'url':
      // For URLs, we'll use an iframe
      return (
        <div className="iframe-container">
          <iframe 
            ref={iframeRef}
            src={item.content} 
            title="URL Content"
            onLoad={() => setLoaded(true)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
          />
        </div>
      );
      
    default:
      return (
        <div className="fullscreen flex items-center justify-center">
          <p>Formato não suportado</p>
        </div>
      );
  }
};

export default MediaRenderer;
