import { ScrollViewStyleReset } from 'expo-router/html'
import type { PropsWithChildren } from 'react'

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        <ScrollViewStyleReset />

        {/* DNS preconnect for backend and analytics */}
        <link rel="preconnect" href="https://yellow-design-backend-dmevc5oa4q-el.a.run.app" />
        <link rel="preconnect" href="https://www.clarity.ms" />
        <link rel="dns-prefetch" href="https://checkout.razorpay.com" />

        {/* Preload the two most-used font weights so they arrive before JS executes */}
        <link rel="preload" href="/assets/node_modules/@expo-google-fonts/bricolage-grotesque/400Regular/BricolageGrotesque_400Regular.6586800789b30b19bbaeb349ca5d240a.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/node_modules/@expo-google-fonts/bricolage-grotesque/600SemiBold/BricolageGrotesque_600SemiBold.e5b5fc505484ff3ca24da73cba67c660.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/assets/node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.a0147b5ab9e4946e81879aef45313def.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />

        {/* Microsoft Clarity — session recording + heatmaps (async, non-blocking) */}
        <script dangerouslySetInnerHTML={{ __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","wofj0t94ji");` }} />

        {/* Google Ads conversion tracking — TODO: replace AW-XXXXXXXXX with the real conversion ID once created (must match lib/gtag.ts) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-XXXXXXXXX" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config','AW-XXXXXXXXX');` }} />

        <style dangerouslySetInnerHTML={{ __html: `
          * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
          html, body, #root { height: 100%; touch-action: pan-x pan-y; }
          input, textarea, select { outline: none !important; -webkit-appearance: none; }
          input[type="datetime-local"]::-webkit-calendar-picker-indicator {
            opacity: 0.5; cursor: pointer;
          }
          input[type="datetime-local"] { min-width: 0; width: 100%; }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  )
}
