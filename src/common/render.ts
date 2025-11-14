import { Version } from '@/root'
import { BotInfo } from '@/types'
import { createCanvas, Image, SKRSContext2D } from 'cavas'
import { isEmpty } from 'es-toolkit/compat'
import { ImageElement, segment } from 'node-karin'
import axios from 'node-karin/axios'
import fs from 'node:fs'
import {
  getCpuInfo,
  getGpuInfo,
  getMemoryInfo,
  getDiskInfo,
  DiskDetail,
  DiskInfo,
} from 'system-info'

export const Render = {
  async status(bot: BotInfo | Array<BotInfo>): Promise<ImageElement> {
    const background = new Image()
    background.src = await fs.promises.readFile(
      `${Version.Plugin_Path}/resources/default_background.webp`,
    )
    await new Promise((resolve) => (background.onload = () => resolve(null)))

    const columnWidth = 800
    const columnHeight = 1800
    const cardHeight = 220
    const cardSpacing = 20
    const startY = 40

    const cardsPerColumn = Math.floor(
      (columnHeight - startY - cardSpacing) / (cardHeight + cardSpacing),
    )

    const systemCardHeight = 450
    const botArray = Array.isArray(bot) ? bot : [bot]
    const lastBotIndex = Math.max(0, botArray.length - 1)
    const lastColumn = Math.floor(lastBotIndex / cardsPerColumn)
    const lastRow = lastBotIndex % cardsPerColumn
    const nextY =
      botArray.length === 0
        ? startY
        : startY + (lastRow + 1) * (cardHeight + cardSpacing) + cardSpacing

    const systemFitsInColumn = nextY + systemCardHeight + 60 <= columnHeight
    const systemColumn = systemFitsInColumn ? lastColumn : lastColumn + 1
    const systemY = systemFitsInColumn ? nextY : startY

    const diskInfo = getDiskInfo()
    const diskHeight =
      diskInfo && diskInfo.disks.length > 0
        ? 90 + diskInfo.disks.length * (80 + 15) - 15 + 40
        : 0

    const totalColumns = systemColumn + 1
    const requiredHeight = Math.max(
      columnHeight,
      systemY + systemCardHeight + diskHeight + cardSpacing + 60,
    )
    const canvas = createCanvas(columnWidth * totalColumns, requiredHeight)
    const ctx = canvas.getContext('2d')

    // 绘制背景
    for (let col = 0; col < totalColumns; col++) {
      ctx.drawImage(
        background,
        col * columnWidth,
        0,
        columnWidth,
        requiredHeight,
      )
    }

    // 绘制bot卡片
    await Promise.all(
      botArray.map(async (bot, i) => {
        const column = Math.floor(i / cardsPerColumn)
        const row = i % cardsPerColumn
        const avatarData = isEmpty(bot.avatarUrl)
          ? await fs.promises.readFile(
              `${Version.Plugin_Path}/resources/default_avatar.webp`,
            )
          : (await axios.get(bot.avatarUrl, { responseType: 'arraybuffer' }))
              .data
        return drawBotCard(
          ctx,
          columnWidth,
          bot,
          column * columnWidth,
          startY + row * (cardHeight + cardSpacing),
          cardHeight,
          avatarData,
        )
      }),
    )

    await drawSystemInfo(
      ctx,
      columnWidth,
      systemColumn,
      systemY,
      systemCardHeight,
      40,
    )

    // 绘制磁盘信息
    const diskY = systemY + systemCardHeight + cardSpacing
    drawDiskInfo(ctx, diskInfo, columnWidth, systemColumn, diskY, 40)

    const base64 = (await canvas.encode('png')).toString('base64')
    return segment.image(`base64://${base64}`)
  },
}

function drawRoundedRect(
  ctx: SKRSContext2D,
  w: number,
  h: number,
  y: number,
  padding: number,
  xOffset: number = 0,
) {
  const cardWidth = w - padding * 2

  const cardRadius = 20
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(xOffset + padding + cardRadius, y)
  ctx.lineTo(xOffset + padding + cardWidth - cardRadius, y)
  ctx.quadraticCurveTo(
    xOffset + padding + cardWidth,
    y,
    xOffset + padding + cardWidth,
    y + cardRadius,
  )
  ctx.lineTo(xOffset + padding + cardWidth, y + h - cardRadius)
  ctx.quadraticCurveTo(
    xOffset + padding + cardWidth,
    y + h,
    xOffset + padding + cardWidth - cardRadius,
    y + h,
  )
  ctx.lineTo(xOffset + padding + cardRadius, y + h)
  ctx.quadraticCurveTo(
    xOffset + padding,
    y + h,
    xOffset + padding,
    y + h - cardRadius,
  )
  ctx.lineTo(xOffset + padding, y + cardRadius)
  ctx.quadraticCurveTo(xOffset + padding, y, xOffset + padding + cardRadius, y)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fill()
  ctx.restore()
  return { width: cardWidth, height: h }
}

async function drawBotCard(
  ctx: SKRSContext2D,
  w: number,
  bot: BotInfo,
  xOffset: number,
  cardY: number,
  cardHeight: number,
  avatar: Buffer,
) {
  const cardPadding = 40
  drawRoundedRect(ctx, w, cardHeight, cardY, cardPadding, xOffset)

  const avatarPadding = 20
  const avatarSize = cardHeight - avatarPadding * 2
  const drawAvatar = async (avatarData: Buffer) => {
    const avatarX = xOffset + cardPadding + avatarPadding
    const avatarY = cardY + avatarPadding
    const avatar = new Image()
    avatar.src = avatarData
    await new Promise((resolve) => (avatar.onload = () => resolve(null)))
    ctx.save()
    ctx.beginPath()
    ctx.arc(
      avatarX + avatarSize / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2,
    )
    ctx.clip()
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize)
    ctx.restore()
  }
  await drawAvatar(avatar)

  const avatarRightX = xOffset + cardPadding + avatarPadding + avatarSize
  const botNameX = avatarRightX + 40
  const botNameY = cardY + 20 + 30 / 2
  ctx.font = '30px Douyin Sans'
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(bot.name, botNameX, botNameY)

  const lineY = botNameY + 30 / 2 + 10
  const lineStartX = xOffset + cardPadding + avatarPadding + avatarSize + 20
  const lineEndX = xOffset + w - cardPadding - 20
  ctx.beginPath()
  ctx.moveTo(lineStartX, lineY)
  ctx.lineTo(lineEndX, lineY)
  ctx.strokeStyle = '#CCCCCC'
  ctx.lineWidth = 1
  ctx.stroke()

  const badgeY = lineY + 10
  const badgeX = xOffset + cardPadding + avatarPadding + avatarSize + 20

  const drawBadge = (
    ctx: SKRSContext2D,
    x: number,
    y: number,
    text: string,
    backgroundColor: string = '#E6E6FA',
  ) => {
    const borderRadius = 10
    const padding = 10

    ctx.font = '20px Douyin Sans'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const textMetrics = ctx.measureText(text)
    const badgeWidth = textMetrics.width + padding * 2
    const badgeHeight = 20 + padding * 2

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x + borderRadius, y)
    ctx.lineTo(x + badgeWidth - borderRadius, y)
    ctx.quadraticCurveTo(x + badgeWidth, y, x + badgeWidth, y + borderRadius)
    ctx.lineTo(x + badgeWidth, y + badgeHeight - borderRadius)
    ctx.quadraticCurveTo(
      x + badgeWidth,
      y + badgeHeight,
      x + badgeWidth - borderRadius,
      y + badgeHeight,
    )
    ctx.lineTo(x + borderRadius, y + badgeHeight)
    ctx.quadraticCurveTo(x, y + badgeHeight, x, y + badgeHeight - borderRadius)
    ctx.lineTo(x, y + borderRadius)
    ctx.quadraticCurveTo(x, y, x + borderRadius, y)
    ctx.closePath()

    ctx.fillStyle = backgroundColor
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = '#000000'
    ctx.fillText(text, x + padding, y + padding)
    return { width: badgeWidth, height: badgeHeight }
  }
  const adapterBadge = drawBadge(
    ctx,
    badgeX,
    badgeY,
    `${bot.adapter.name} v${bot.adapter.version}`,
  )
  drawBadge(
    ctx,
    badgeX + adapterBadge.width + 10,
    badgeY,
    `Bot已运行: ${bot.runTime}`,
    '#e1a75bff',
  )
  const groupCountBadge = drawBadge(
    ctx,
    badgeX,
    badgeY + adapterBadge.height + 10,
    `群组: ${bot.groupCount}`,
    '#e1a75bff',
  )
  const groupMemberCountBadge = drawBadge(
    ctx,
    badgeX + groupCountBadge.width + 10,
    badgeY + adapterBadge.height + 10,
    `群成员: ${bot.groupMemberCount}`,
  )
  drawBadge(
    ctx,
    badgeX + groupCountBadge.width + groupMemberCountBadge.width + 20,
    badgeY + adapterBadge.height + 10,
    `好友: ${bot.friendCount}`,
    '#ADD8E6',
  )
}

async function drawSystemInfo(
  ctx: SKRSContext2D,
  w: number,
  column: number,
  h: number,
  cardHeight: number,
  cardPadding: number,
) {
  const xOffset = column * w
  drawRoundedRect(ctx, w, cardHeight, h, cardPadding, xOffset)

  const radius = 60
  const itemsPerRow = 3
  const rowHeight = 150
  const labelHeight = 30

  const drawCircularProgress = (
    ctx: SKRSContext2D,
    x: number,
    y: number,
    percent: number,
    label: string,
    description?: string,
  ) => {
    const lineWidth = 15
    const startAngle = -Math.PI / 2
    const outerRadius = radius
    const innerRadius = radius - lineWidth
    const progressEndAngle = startAngle + (percent / 100) * Math.PI * 2
    ctx.save()
    ctx.beginPath()
    ctx.arc(x, y, outerRadius, startAngle, progressEndAngle)
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = '#FFB6C1'
    ctx.lineCap = 'round'
    ctx.stroke()

    ctx.beginPath()
    ctx.arc(x, y, innerRadius, 0, Math.PI * 2)
    ctx.fillStyle = '#ADD8E6'
    ctx.fill()

    ctx.font = 'bold 24px Douyin Sans'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#000000'
    ctx.fillText(`${Math.round(percent)}%`, x, y)
    ctx.restore()

    ctx.font = '20px Douyin Sans'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = '#000000'
    ctx.fillText(label, x, y + radius + 20)

    if (description) {
      ctx.font = '16px Douyin Sans'
      ctx.fillStyle = '#666666'
      ctx.fillText(description, x, y + radius + 45)
    }

    return { x: x, y: y }
  }

  const systemData = []

  const cpuInfo = getCpuInfo()
  systemData.push({
    name: 'CPU',
    value: cpuInfo.usage ?? 0,
    description: `${cpuInfo.physicalCores}核 ${cpuInfo.logicalCores}线程`,
  })

  const memoryInfo = getMemoryInfo()
  systemData.push({
    name: '内存',
    value: memoryInfo.usage ?? 0,
    description: `${(memoryInfo.used / 1024).toFixed(1)}GB / ${(memoryInfo.total / 1024).toFixed(1)}GB`,
  })

  systemData.push({
    name: 'SWAP',
    value: memoryInfo.swapUsage ?? 0,
    description: `${((memoryInfo.swapUsed ?? 0) / 1024).toFixed(1)}GB / ${((memoryInfo.swapTotal ?? 0) / 1024).toFixed(1)}GB`,
  })

  const nodeMemory = process.memoryUsage()
  const nodeUsage = Math.round(
    (nodeMemory.rss / (memoryInfo.total * 1024 * 1024)) * 100,
  )
  systemData.push({
    name: 'Node',
    value: nodeUsage,
    description: `总 ${(nodeMemory.rss / 1024 / 1024).toFixed(1)}MB | 堆 ${(nodeMemory.heapTotal / 1024 / 1024).toFixed(1)}MB | 栈 ${(nodeMemory.heapUsed / 1024 / 1024).toFixed(1)}MB`,
  })
  const gpuinfo = getGpuInfo()
  if (gpuinfo) {
    systemData.push({
      name: 'GPU',
      value: gpuinfo.usage ?? 0,
      description: `${(gpuinfo.memoryUsed / 1024).toFixed(1)}GB / ${(gpuinfo.memoryTotal / 1024).toFixed(1)}GB`,
    })
  }

  const systemXOffset = column * w
  const baseY = h + 80 + 20
  const sectionWidth = w / itemsPerRow
  const rowSpacing = rowHeight + labelHeight + 20

  systemData.forEach((item, i) => {
    const rowIdx = Math.floor(i / itemsPerRow)
    const colIdx = i % itemsPerRow
    const itemsInRow = Math.min(
      itemsPerRow,
      systemData.length - rowIdx * itemsPerRow,
    )

    const totalRowWidth = itemsInRow * sectionWidth
    const centerX =
      systemXOffset +
      (w - totalRowWidth) / 2 +
      sectionWidth / 2 +
      colIdx * sectionWidth
    const centerY = baseY + rowIdx * rowSpacing

    drawCircularProgress(
      ctx,
      centerX,
      centerY,
      item.value,
      item.name,
      item.description,
    )
  })
}

function drawDiskInfo(
  ctx: SKRSContext2D,
  diskInfo: DiskInfo,
  w: number,
  column: number,
  y: number,
  cardPadding: number,
) {
  if (!diskInfo || diskInfo.disks.length === 0) return { height: 0 }
  
  const xOffset = column * w
  const itemHeight = 80
  const itemSpacing = 15
  const headerHeight = 90
  const totalHeight =
    headerHeight +
    diskInfo.disks.length * (itemHeight + itemSpacing) -
    itemSpacing +
    40

  drawRoundedRect(ctx, w, totalHeight, y, cardPadding, xOffset)

  ctx.font = 'bold 28px Douyin Sans'
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('硬盘信息', xOffset + cardPadding + 20, y + 40)

  ctx.font = '20px Douyin Sans'
  ctx.fillStyle = '#666666'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(
    `读取: ${diskInfo.readSpeed.toFixed(1)}MB/s | 写入: ${diskInfo.writeSpeed.toFixed(1)}MB/s`,
    xOffset + cardPadding + 20,
    y + 65
  )

  const drawDiskProgressBar = (
    ctx: SKRSContext2D,
    disk: DiskDetail,
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    const progressBarHeight = 20
    const progressBarY = y + height - progressBarHeight - 10
    const progressBarRadius = 10

    ctx.font = '22px Douyin Sans'
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(disk.mount, x, y + 5)

    ctx.font = '18px Douyin Sans'
    ctx.fillStyle = '#666666'
    ctx.fillText(
      `${disk.usedSpace}GB / ${disk.totalSpace}GB (${disk.usage}%)`,
      x,
      y + 30,
    )

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x + progressBarRadius, progressBarY)
    ctx.lineTo(x + width - progressBarRadius, progressBarY)
    ctx.quadraticCurveTo(
      x + width,
      progressBarY,
      x + width,
      progressBarY + progressBarRadius,
    )
    ctx.lineTo(x + width, progressBarY + progressBarHeight - progressBarRadius)
    ctx.quadraticCurveTo(
      x + width,
      progressBarY + progressBarHeight,
      x + width - progressBarRadius,
      progressBarY + progressBarHeight,
    )
    ctx.lineTo(x + progressBarRadius, progressBarY + progressBarHeight)
    ctx.quadraticCurveTo(
      x,
      progressBarY + progressBarHeight,
      x,
      progressBarY + progressBarHeight - progressBarRadius,
    )
    ctx.lineTo(x, progressBarY + progressBarRadius)
    ctx.quadraticCurveTo(x, progressBarY, x + progressBarRadius, progressBarY)
    ctx.closePath()
    ctx.fillStyle = '#E0E0E0'
    ctx.fill()
    ctx.restore()

    const progressWidth = (width * disk.usage) / 100
    if (progressWidth > 0) {
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(x + progressBarRadius, progressBarY)

      if (progressWidth <= progressBarRadius) {
        ctx.lineTo(x + progressWidth, progressBarY)
        ctx.lineTo(x + progressWidth, progressBarY + progressBarHeight)
        ctx.lineTo(x + progressBarRadius, progressBarY + progressBarHeight)
        ctx.quadraticCurveTo(
          x,
          progressBarY + progressBarHeight,
          x,
          progressBarY + progressBarHeight - progressBarRadius,
        )
        ctx.lineTo(x, progressBarY + progressBarRadius)
        ctx.quadraticCurveTo(
          x,
          progressBarY,
          x + progressBarRadius,
          progressBarY,
        )
      } else if (progressWidth >= width - progressBarRadius) {
        ctx.lineTo(x + width - progressBarRadius, progressBarY)
        ctx.quadraticCurveTo(
          x + width,
          progressBarY,
          x + width,
          progressBarY + progressBarRadius,
        )
        ctx.lineTo(
          x + width,
          progressBarY + progressBarHeight - progressBarRadius,
        )
        ctx.quadraticCurveTo(
          x + width,
          progressBarY + progressBarHeight,
          x + width - progressBarRadius,
          progressBarY + progressBarHeight,
        )
        ctx.lineTo(x + progressBarRadius, progressBarY + progressBarHeight)
        ctx.quadraticCurveTo(
          x,
          progressBarY + progressBarHeight,
          x,
          progressBarY + progressBarHeight - progressBarRadius,
        )
        ctx.lineTo(x, progressBarY + progressBarRadius)
        ctx.quadraticCurveTo(
          x,
          progressBarY,
          x + progressBarRadius,
          progressBarY,
        )
      } else {
        ctx.lineTo(x + progressWidth, progressBarY)
        ctx.lineTo(x + progressWidth, progressBarY + progressBarHeight)
        ctx.lineTo(x + progressBarRadius, progressBarY + progressBarHeight)
        ctx.quadraticCurveTo(
          x,
          progressBarY + progressBarHeight,
          x,
          progressBarY + progressBarHeight - progressBarRadius,
        )
        ctx.lineTo(x, progressBarY + progressBarRadius)
        ctx.quadraticCurveTo(
          x,
          progressBarY,
          x + progressBarRadius,
          progressBarY,
        )
      }

      ctx.closePath()

      if (disk.usage >= 90) {
        ctx.fillStyle = '#FF6B6B'
      } else if (disk.usage >= 75) {
        ctx.fillStyle = '#FFB347'
      } else {
        ctx.fillStyle = '#4ECDC4'
      }

      ctx.fill()
      ctx.restore()
    }
  }
  diskInfo.disks.forEach((disk, index) => {
    const itemY = y + headerHeight + index * (itemHeight + itemSpacing) + 10
    drawDiskProgressBar(
      ctx,
      disk,
      xOffset + cardPadding + 20,
      itemY,
      w - (cardPadding + 20) * 2,
      itemHeight,
    )
  })

  return { height: totalHeight }
}
