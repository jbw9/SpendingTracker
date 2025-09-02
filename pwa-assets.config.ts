import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023'
  },
  preset: {
    ...minimal2023Preset,
    maskable: {
      sizes: [512],
      padding: 0.05
    },
    apple: {
      sizes: [180],
      padding: 0.05
    }
  },
  images: ['public/icon.svg']
})