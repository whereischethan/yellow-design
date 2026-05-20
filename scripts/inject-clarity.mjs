import { readFileSync, writeFileSync } from 'fs'

const CLARITY_ID = 'wofj0t94ji'
const SNIPPET = `  <script type="text/javascript">
    (function(c,l,a,r,i,t,y){
      c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
      t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
      y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window,document,"clarity","script","${CLARITY_ID}");
  </script>`

const path = 'dist/index.html'
const html = readFileSync(path, 'utf8')

if (html.includes('clarity.ms')) {
  console.log('Clarity already present in dist/index.html, skipping.')
  process.exit(0)
}

const injected = html.replace('</head>', `${SNIPPET}\n  </head>`)
writeFileSync(path, injected)
console.log('Clarity snippet injected into dist/index.html')
