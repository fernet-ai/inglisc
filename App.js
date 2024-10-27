import React from 'react';
import { Provider as PaperProvider } from 'react-native-paper';
import MainNavigator from './navigation/MainNavigator';
import ThEInGliscTheme from './themes/theme';

export default function App() {
  return (
    <PaperProvider theme={ThEInGliscTheme} >
      <MainNavigator /> 
    </PaperProvider> 
    );
}
