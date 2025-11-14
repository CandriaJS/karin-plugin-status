export interface DiskDetail {
  /** 磁盘名称 */
  name: string
  /** 磁盘挂载点 */
  mount: string
  /** 总磁盘空间(单位: GB) */
  totalSpace: number
  /** 已用磁盘空间(单位: GB) */
  usedSpace: number
  /** 可用磁盘空间(单位: GB) */
  freeSpace: number
  /** 磁盘使用率 */
  usage: number
}

export interface DiskInfo {
  /** 总磁盘空间(单位: GB) */
  totalSpace: number
  /** 总已用磁盘空间(单位: GB) */
  totalUsedSpace: number
  /** 总可用磁盘空间(单位: GB) */
  totalFreeSpace: number
  /** 总体磁盘使用率 */
  totalUsage: number
  /** 磁盘读速度(单位: MB/S) */
  readSpeed: number
  /** 磁盘写入速度(单位: MB/S) */
  writeSpeed: number
  /** 各个磁盘详细信息 */
  disks: Array<DiskDetail>
}
