/**
 * Web-Variante: lädt zuerst CanvasKit (Skia als WebAssembly, liegt in
 * public/canvaskit.wasm) und erst danach den Editor.
 */
import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { ActivityIndicator, View } from 'react-native';

export default function EditorHost() {
  return (
    <WithSkiaWeb
      opts={{ locateFile: (file: string) => `/${file}` }}
      getComponent={() => import('./EditorScreen')}
      fallback={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      }
    />
  );
}
