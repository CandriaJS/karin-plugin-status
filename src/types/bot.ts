export interface BotInfo {
  /* bot昵称 */
  name: string
  /* 头像 */
  avatarUrl: string
  /* 适配器名称 */
  adapter: AdapterInfo,
  /* 运行时间 */
  runTime: string,
  /* 好友数 */
  friendCount: number,
  /* 群数 */
  groupCount: number,
  /** 群成员数 */
  groupMemberCount: number

}

export interface AdapterInfo {
  /* 适配器名称 */
  name: string
  /* 适配器版本 */
  version: string
}
