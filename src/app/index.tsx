import { Redirect } from 'expo-router';

export default function Index() {
  // Onboarding always opens first; its buttons decide map vs login.
  return <Redirect href="/onboarding" />;
}
