import { readFileSync, writeFileSync } from 'fs'

const path = 'web-build/index.html'
const html = readFileSync(path, 'utf8')

if (html.includes('rel="preload"')) {
  console.log('Hints already present, skipping.')
  process.exit(0)
}

const HINTS = `
  <link rel="preconnect" href="https://yellow-design-backend-dmevc5oa4q-el.a.run.app" />
  <link rel="preconnect" href="https://www.clarity.ms" />
  <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
  <link rel="preload" href="/assets/node_modules/@expo-google-fonts/bricolage-grotesque/400Regular/BricolageGrotesque_400Regular.6586800789b30b19bbaeb349ca5d240a.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
  <link rel="preload" href="/assets/node_modules/@expo-google-fonts/bricolage-grotesque/600SemiBold/BricolageGrotesque_600SemiBold.e5b5fc505484ff3ca24da73cba67c660.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
  <link rel="preload" href="/assets/node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.a0147b5ab9e4946e81879aef45313def.ttf" as="font" type="font/ttf" crossorigin="anonymous" />`

const injected = html.replace('<link rel="icon"', HINTS + '\n  <link rel="icon"')
writeFileSync(path, injected)
console.log('Performance hints injected into web-build/index.html')
