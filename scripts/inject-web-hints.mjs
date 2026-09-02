import { readFileSync, writeFileSync } from 'fs'

const path = 'dist/index.html'
let html = readFileSync(path, 'utf8')

// ─── Microsoft Clarity ────────────────────────────────────────────────────────
const hasClarityAlready = html.includes('clarity.ms/tag')

const CLARITY_SCRIPT = `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","wofj0t94ji");</script>`

// ─── Meta Pixel ───────────────────────────────────────────────────────────────
const hasPixelAlready = html.includes('fbevents.js')

const META_PIXEL = `<!-- Meta Pixel Code -->
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '971659905581728');
      fbq('track', 'PageView');
    </script>
    <noscript><img height="1" width="1" style="display:none"
      src="https://www.facebook.com/tr?id=971659905581728&ev=PageView&noscript=1"
    /></noscript>
    <!-- End Meta Pixel Code -->`

// ─── Google Ads conversion tracking ────────────────────────────────────────────
// TODO: replace AW-XXXXXXXXX (and the id in lib/gtag.ts) with the real conversion ID once created
const hasGtagAlready = html.includes('googletagmanager.com/gtag')

const GTAG_SCRIPT = `<script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','AW-XXXXXXXXX');</script>`

// ─── Performance hints ────────────────────────────────────────────────────────
const HINTS = `
  <link rel="preconnect" href="https://yellow-design-backend-dmevc5oa4q-el.a.run.app" />
  <link rel="preconnect" href="https://www.clarity.ms" />
  <link rel="preconnect" href="https://connect.facebook.net" />
  <link rel="dns-prefetch" href="https://checkout.razorpay.com" />
  <link rel="preload" href="/assets/node_modules/@expo-google-fonts/bricolage-grotesque/400Regular/BricolageGrotesque_400Regular.6586800789b30b19bbaeb349ca5d240a.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
  <link rel="preload" href="/assets/node_modules/@expo-google-fonts/bricolage-grotesque/600SemiBold/BricolageGrotesque_600SemiBold.e5b5fc505484ff3ca24da73cba67c660.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
  <link rel="preload" href="/assets/node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.a0147b5ab9e4946e81879aef45313def.ttf" as="font" type="font/ttf" crossorigin="anonymous" />
  ${hasClarityAlready ? '' : CLARITY_SCRIPT}
    ${hasPixelAlready ? '' : META_PIXEL}
    ${hasGtagAlready ? '' : GTAG_SCRIPT}`

// ─── Inject before the icon link (or before </head>) ─────────────────────────
if (html.includes('<link rel="icon"')) {
  html = html.replace('<link rel="icon"', HINTS + '\n  <link rel="icon"')
} else {
  html = html.replace('</head>', HINTS + '\n</head>')
}

writeFileSync(path, html)

const parts = []
if (!hasClarityAlready) parts.push('Clarity')
if (!hasPixelAlready)   parts.push('Meta Pixel')
if (!hasGtagAlready)    parts.push('Google Ads gtag')
parts.push('performance hints')
console.log(`Injected: ${parts.join(', ')} → dist/index.html`)
