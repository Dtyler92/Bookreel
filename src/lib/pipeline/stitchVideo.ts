import { execSync } from 'child_process'
import { writeFileSync, existsSync, mkdirSync, createWriteStream } from 'fs'
import { join } from 'path'
import https from 'https'
import http from 'http'

async function downloadFile(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath)
    const protocol = url.startsWith('https') ? https : http
    protocol.get(url, (response) => {
      response.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', reject)
  })
}

export async function stitchVideoClips(
  clipUrls: string[],
  bookId: string
): Promise<string> {
  const tmpDir = `/tmp/bookreel-${bookId}`
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

  // Download all clips
  const clipPaths: string[] = []
  for (let i = 0; i < clipUrls.length; i++) {
    const clipPath = join(tmpDir, `clip-${i}.mp4`)
    await downloadFile(clipUrls[i], clipPath)
    clipPaths.push(clipPath)
  }

  // Create concat file
  const concatFile = join(tmpDir, 'concat.txt')
  const concatContent = clipPaths.map(p => `file '${p}'`).join('\n')
  writeFileSync(concatFile, concatContent)

  // Stitch with FFmpeg
  const outputPath = join(tmpDir, 'trailer.mp4')
  execSync(`ffmpeg -f concat -safe 0 -i ${concatFile} -c copy ${outputPath} -y`)

  return outputPath
}
