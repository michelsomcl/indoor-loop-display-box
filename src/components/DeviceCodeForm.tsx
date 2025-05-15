
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { saveDeviceCode, getPlaylistByDeviceCode } from '@/lib/supabase';
import { toast } from "@/components/ui/use-toast";

const DeviceCodeForm: React.FC = () => {
  const [deviceCode, setDeviceCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deviceCode.trim()) {
      toast({
        title: "Error",
        description: "Por favor, insira um código de dispositivo",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const playlist = await getPlaylistByDeviceCode(deviceCode);
      
      if (playlist) {
        // Save the device code
        saveDeviceCode(deviceCode);
        
        // Navigate to player
        navigate('/player');
      } else {
        toast({
          title: "Dispositivo não encontrado",
          description: "O código informado não corresponde a um dispositivo registrado",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível verificar o código do dispositivo",
        variant: "destructive"
      });
    } finally {
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
