
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeviceCodeForm from '@/components/DeviceCodeForm';
import { getDeviceCode } from '@/lib/supabase';

const Index = () => {
  const navigate = useNavigate();

  // Check if device code is already stored, and redirect to player if it exists
  useEffect(() => {
    const storedDeviceCode = getDeviceCode();
    if (storedDeviceCode) {
      navigate('/player');
    }
  }, [navigate]);

  return <DeviceCodeForm />;
};

export default Index;
