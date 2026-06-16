import sharp from 'sharp'
import { mkdirSync } from 'fs'

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
mkdirSync('./public/icons', { recursive: true })

for (const size of sizes) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 200, g: 64, b: 47, alpha: 1 }
    }
  })
  .png()
  .toFile(`./public/icons/icon-${size}x${size}.png`)
  console.log(`✅ Generated ${size}x${size} icon`)
}
