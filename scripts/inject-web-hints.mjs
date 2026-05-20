import { readFileSync, writeFileSync } from 'fs'

const path = 'dist/index.html'
const html = readFileSync(path, 'utf8')

if (html.includes('clarity.ms/tag')) {
  console.log('Analytics already present, skipping.')
  process.exit(0)
}

const CLARITY_SCRIPT = `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","wofj0t94ji");</script>`

const HINTS = `
  <link rel="preconnect" href="https://yellow-design-backend-dmevc5oa4q-el.a.run.app" />
  <link rel="preconnect" href="https://www.clarity.ms" />
  <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
  <link rel="preload" href="/assets/node_modules/@expo-google-fonts/bricolage-grotesque/400Regular/BricolageGrotesque_400Regular.6586800789b30b19bbaeb349ca5d240a.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
  <link rel="preload" href="/assets/node_modules/@expo-google-fonts/bricolage-grotesque/600SemiBold/BricolageGrotesque_600SemiBold.e5b5fc505484ff3ca24da73cba67c660.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
  <link rel="preload" href="/assets/node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.a0147b5ab9e4946e81879aef45313def.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
  ${CLARITY_SCRIPT}`

// Inject before </head> if no <link rel="icon">, otherwise before the icon link
let injected
if (html.includes('<link rel="icon"')) {
  injected = html.replace('<link rel="icon"', HINTS + '\n  <link rel="icon"')
} else {
  injected = html.replace('</head>', HINTS + '\n</head>')
}

writeFileSync(path, injected)
console.log('Performance hints + Clarity injected into dist/index.html')
