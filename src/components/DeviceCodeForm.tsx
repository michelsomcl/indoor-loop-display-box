
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { saveDeviceCode } from '@/lib/supabase';
import { toast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase';

const DeviceCodeForm: React.FC = () => {
  const [deviceCode, setDeviceCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deviceCode.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira um código de dispositivo",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("Verificando dispositivo:", deviceCode);
      
      // First check if the device exists
      const { data: device, error: deviceError } = await supabase
        .from('devices')
        .select('id')
        .eq('code', deviceCode)
        .single();
        
      if (deviceError) {
        console.error("Erro ao buscar dispositivo:", deviceError);
        
        if (deviceError.code === 'PGRST116') {
          toast({
            title: "Dispositivo não encontrado",
            description: `Não foi encontrado dispositivo com código: ${deviceCode}`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro",
            description: `Erro ao verificar dispositivo: ${deviceError.message}`,
            variant: "destructive"
          });
        }
        
        setLoading(false);
        return;
      }
      
      if (!device) {
        toast({
          title: "Dispositivo não encontrado",
          description: "O código informado não corresponde a um dispositivo registrado",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      console.log("Dispositivo encontrado:", device);
      
      // Check for device_playlists entries using different approaches
      const { data: devicePlaylists, error: dpError } = await supabase
        .from('device_playlists')
        .select('playlist_id')
        .eq('device_id', device.id);
      
      console.log("Playlists associadas ao dispositivo:", devicePlaylists);
      
      if (dpError) {
        console.error("Erro ao verificar playlists do dispositivo:", dpError);
        toast({
          title: "Erro",
          description: `Erro ao verificar playlists do dispositivo: ${dpError.message}`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      if (!devicePlaylists || devicePlaylists.length === 0) {
        toast({
          title: "Sem playlist",
          description: "Este dispositivo não tem nenhuma playlist associada",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Get the playlist ID
      const playlistId = devicePlaylists[0].playlist_id;
      console.log("ID da playlist encontrado:", playlistId);
      
      // Check if the playlist exists
      const { data: playlist, error: playlistError } = await supabase
        .from('playlists')
        .select('id, name')
        .eq('id', playlistId)
        .single();
        
      if (playlistError || !playlist) {
        console.error("Erro ao buscar playlist:", playlistError);
        toast({
          title: "Playlist não encontrada",
          description: "A playlist associada ao dispositivo não foi encontrada",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      console.log("Playlist encontrada:", playlist);
      
      // Check if playlist has items, but query each table separately
      const { data: playlistItems, error: itemsError } = await supabase
        .from('playlist_items')
        .select('id, ordem, tipo, tempo, playlist_id')
        .eq('playlist_id', playlistId);
        
      if (itemsError) {
        console.error("Erro ao buscar itens da playlist:", itemsError);
        toast({
          title: "Erro",
          description: `Erro ao buscar itens da playlist: ${itemsError.message}`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      console.log("Itens da playlist encontrados:", playlistItems);
      
      if (!playlistItems || playlistItems.length === 0) {
        toast({
          title: "Playlist vazia",
          description: "A playlist associada ao dispositivo não possui nenhum item",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Save the device code and navigate to player
      console.log("Salvando código do dispositivo e redirecionando para player");
      saveDeviceCode(deviceCode);
      navigate('/player');
      
    } catch (error) {
      console.error("Erro completo:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível verificar o código do dispositivo",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">Mídia Indoor Player</CardTitle>
          <CardDescription>Digite o código do dispositivo para começar</CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Código do dispositivo"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                className="text-center text-lg py-6"
                disabled={loading}
                autoFocus
              />
            </div>
          </CardContent>
          
          <CardFooter>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default DeviceCodeForm;
