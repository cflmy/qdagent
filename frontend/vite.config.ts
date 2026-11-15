import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwindcss()], optimizeDeps:{exclude:['emf-converter']}, server: { proxy: { '/api':'http://127.0.0.1:7964','/login':'http://127.0.0.1:7964','/oidc':'http://127.0.0.1:7964' } }, build: { sourcemap: true,rollupOptions:{input:{main:'index.html',viewer:'file-viewer.html'},external:['@napi-rs/canvas'],output:{manualChunks:{'react-vendor':['react','react-dom','react-dom/client','react/jsx-runtime'],'markdown':['react-markdown','remark-gfm'],'primitives':['@radix-ui/react-dialog']}}} } });
