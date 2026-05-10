import { defineConfig } from ‘vite’
import react from ‘@vitejs/plugin-react’
import { VitePWA } from ‘vite-plugin-pwa’

export default defineConfig({
plugins: [
react(),
VitePWA({
registerType: ‘autoUpdate’,
manifest: {
name: ‘FRC 4550 Member Hub’,
short_name: ‘Member Hub’,
start_url: ‘/member-hub’,
scope: ‘/member-hub’,
display: ‘standalone’,
background_color: ‘#0a0f1e’,
theme_color: ‘#60a5fa’,
icons: [
{ src: ‘/icon-192.png’, sizes: ‘192x192’, type: ‘image/png’ },
{ src: ‘/icon-512.png’, sizes: ‘512x512’, type: ‘image/png’ }
]
}
})
]
})
