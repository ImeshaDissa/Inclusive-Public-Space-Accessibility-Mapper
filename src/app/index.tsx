import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';

export default function Index() {
  const { authReady } = useApp();
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboardingSeen')
      .then((value) => setSeen(value === '1'))
      .catch(() => setSeen(false));
  }, []);

  if (!authReady || seen === null) return null;
  if (!seen) return <Redirect href="/onboarding" />;
  return <Redirect href="/map" />;
}
