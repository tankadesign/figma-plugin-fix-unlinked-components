import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],

  root: './src/ui',

  build: {
    target: 'esnext',
    outDir: '../../dist',
    emptyOutDir: false,

    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'ui.js',
        assetFileNames: 'ui.[ext]',
      },
    },

    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
  },
})
