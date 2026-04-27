import { resolve } from 'path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const BAKED_CHANNEL = process.env.ADC_CHANNEL ?? '';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __ADC_CHANNEL__: JSON.stringify(BAKED_CHANNEL),
    },
    build: {
      lib: {
        entry: resolve(__dirname, 'src/main/index.ts'),
        formats: ['cjs'],
        fileName: () => 'index.cjs',
      },
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
          'agent-host/index': resolve(__dirname, 'src/main/agent-host/index.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'agent-host/index') return 'agent-host/index.cjs';
            return '[name].cjs';
          },
        },
      },
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@main': resolve(__dirname, 'src/main'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __ADC_CHANNEL__: JSON.stringify(BAKED_CHANNEL),
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          'test-suite-recorder': resolve(__dirname, 'src/preload/test-suite-recorder.ts'),
        },
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
      },
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
  },
  renderer: {
    plugins: [react()],
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
      },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@features': resolve(__dirname, 'src/renderer/features'),
        '@ui': resolve(__dirname, 'src/renderer/shared/components/ui'),
      },
    },
  },
});
