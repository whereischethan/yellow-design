// Run: node scripts/process-vehicle-images.js
// Requires: npm install --save-dev sharp (already done if you're seeing this)

const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const SRC_DIR = '/Users/whereischethan/Downloads'
const OUT_DIR = path.join(__dirname, '../assets/vehicles')

// Best 4 photos chosen for the vehicle screen
const PHOTOS = [
  { src: 'image.png', out: 'clavis-exterior.jpg' },      // exterior front — Bangalore Palace
  { src: 'clavis-2.jpg', out: 'clavis-sunroof.jpg' },    // panoramic sunroof from rear seats
  { src: 'clavis-1.jpg', out: 'clavis-cabin.jpg' },      // boot/cargo with seats down
  { src: 'clavis-3.jpg', out: 'clavis-purifier.jpg' },   // smart air purifier headrest
]

async function process() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  for (const { src, out } of PHOTOS) {
    const srcPath = path.join(SRC_DIR, src)
    const outPath = path.join(OUT_DIR, out)

    if (!fs.existsSync(srcPath)) {
      console.warn(`  SKIP  ${src} — not found in ${SRC_DIR}`)
      continue
    }

    const meta = await sharp(srcPath).metadata()
    const targetW = Math.min(meta.width * 2, 3200)
    const targetH = Math.min(meta.height * 2, 2200)

    await sharp(srcPath)
      .resize(targetW, targetH, { kernel: sharp.kernel.lanczos3 })
      .sharpen({ sigma: 1.2, m1: 0.5, m2: 0.5 })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(outPath)

    const { size } = fs.statSync(outPath)
    console.log(`  OK    ${out}  (${(size / 1024).toFixed(0)} KB)`)
  }

  console.log('\nDone — images in assets/vehicles/')
}

process().catch(err => { console.error(err); process.exit(1) })
