import { h, Session } from "koishi"

// 从会话及引用消息中提取图片 URL
export function extractImagesFromSession(session: Session): string[] {
  const images = extractImagesFromMessage(session.stripped.content)
  if (session.quote) {
    images.push(...extractImagesFromMessage(session.quote.content))
  }
  return images
}

// 从消息内容中提取 img / mface 图片地址
export function extractImagesFromMessage(content: string): string[] {
  const images: string[] = []

  for (const img of h.select(content, "img")) {
    if (img.attrs.src) images.push(img.attrs.src)
  }

  for (const mface of h.select(content, "mface")) {
    if (mface.attrs.url) images.push(mface.attrs.url)
  }

  return images
}
