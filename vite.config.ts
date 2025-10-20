import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(({ command, mode }) => {
  const includeEditor = command === 'serve' || mode === 'editor' || process.env.VITE_INCLUDE_EDITOR === 'true';

  const input: Record<string, string> = {
    main: path.resolve(__dirname, 'index.html'),
  };

  if (includeEditor) {
    input.editor = path.resolve(__dirname, 'editor.html');
  }

  return {
    build: {
      rollupOptions: {
        input,
        output: {
          manualChunks: {
            phaser: ['phaser'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
    },
  };
});
