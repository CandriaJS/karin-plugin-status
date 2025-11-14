import { AdapterInfo, BotInfo } from '@/types'
import { isElement } from 'es-toolkit/compat'
import { getBot, formatTime, getAllBotID } from 'node-karin'

export function getBotInfo(): Promise<BotInfo[]>
export function getBotInfo(selfId: string): Promise<BotInfo | null>

export async function getBotInfo(selfId?: string) {
  const resolveBotInfo = async (id: string): Promise<BotInfo | null> => {
    const bot = getBot(id)
    if (!bot) return null

    const botName = bot.account.name ?? '未知'
    const botAvatar = bot.account.avatar ?? ''
    const adapterInfo: AdapterInfo = {
      name: bot.adapter.protocol ?? '未知',
      version: bot.adapter.version ?? '未知',
    }

    const [friendList, groupList] = await Promise.all([
      bot.getFriendList(),
      bot.getGroupList(),
    ])

    const groupMemberCount = (
      await Promise.all(
        (groupList ?? []).map((g) => bot.getGroupMemberList(g.groupId)),
      )
    )
      .filter((list) => Array.isArray(list))
      .reduce((sum, list) => sum + list.length, 0)

    const info: BotInfo = {
      name: botName,
      runTime: bot.adapter.connectTime
        ? formatTime(bot.adapter.connectTime)
        : '未知',
      avatarUrl: botAvatar,
      adapter: adapterInfo,
      friendCount: friendList.length ?? 0,
      groupCount: groupList.length ?? 0,
      groupMemberCount,
    }

    return info
  }

  if (selfId) {
    return resolveBotInfo(selfId)
  }

  const botIdList = getAllBotID()
  if (isElement(botIdList)) return []

  const results = await Promise.all(botIdList.map((id) => resolveBotInfo(id)))
  return results.filter((r): r is BotInfo => r !== null)
}
