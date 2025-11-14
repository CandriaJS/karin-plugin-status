import { Render } from '@/common'
import { getBotInfo } from '@/models'
import karin from 'node-karin'

export const state = karin.command(/^#?(?:状态|status)$/i, async (e) => {
  const selfId = e.selfId

  const info = await getBotInfo(selfId)

  const img = await Render.status(info!)
  return await e.reply(img)
}, {
  name: 'karin-plugin-status:state',
  rank: 500
})
