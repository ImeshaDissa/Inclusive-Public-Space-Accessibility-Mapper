import { Redirect } from 'expo-router';
import { useApp } from '@/context/AppContext';

export default function Index() {
  return <Redirect href="/onboarding" />;
}
