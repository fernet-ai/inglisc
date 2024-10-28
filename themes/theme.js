import { DefaultTheme, configureFonts } from 'react-native-paper';

const fontConfig = {
  fontFamily: 'monospace'
};


const ThEInGliscTheme = {
  ...DefaultTheme,
  fonts: configureFonts({config: fontConfig}),
  colors: {
    ...DefaultTheme.colors,
    primary: '#0D92F4',  
    secondary: '#C8102E', 
    accent: '#F95454',   
    background: '#F4F6FF', 
    surface: '#ffffff',   
    text: '#0000ff', 
  },
};

export default ThEInGliscTheme;
