import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { SplashScreen } from './src/screens/auth/SplashScreen';
import { useQuickAddStore } from './src/store/useQuickAddStore';
import { useThemeStore } from './src/store/useThemeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
});

function AppContent() {
  const themeVersion = useThemeStore((s) => s.themeVersion);
  // Defer evaluation of all screens until the theme is fully hydrated from AsyncStorage
  const { RootNavigator } = require('./src/navigation/RootNavigator');

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <RootNavigator key={`root-nav-${themeVersion}`} />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  const [themeLoaded, setThemeLoaded] = React.useState(false);

  React.useEffect(() => {
    useQuickAddStore.getState().init();
    useThemeStore.getState().initThemePreferences().then(() => {
      setThemeLoaded(true);
    });
  }, []);

  if (!fontsLoaded || !themeLoaded) {
    return <SplashScreen />;
  }

  return <AppContent />;
}
