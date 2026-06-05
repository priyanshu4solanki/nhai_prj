import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import './src/localization/i18n';
import {LanguageProvider} from './src/contexts/LanguageContext';

import {RootNavigator} from './src/navigation/RootNavigator';

function App(): JSX.Element {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <RootNavigator />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

export default App;
