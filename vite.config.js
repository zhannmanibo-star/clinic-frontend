import {defineConfig, loadEnv} from 'vite';
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {server: {host:'localhost', port:5173, strictPort:true, allowedHosts:['terminal.local'], proxy: {
    '/api': {target:env.BACKEND_URL || 'http://127.0.0.1:3000', changeOrigin:true}
  }}};
});
