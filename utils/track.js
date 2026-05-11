import { reportClick } from '@/request/user'

const CLICK_REPORT_BATCH_SIZE = 20
const CLICK_REPORT_INTERVAL = 5 * 60 * 1000
const CLICK_REPORT_MAX_QUEUE_SIZE = 100

const CLICK_REPORT_QUEUE_KEY = 'CLICK_REPORT_QUEUE_V1'
const CLICK_REPORT_LOCK_KEY = 'CLICK_REPORT_LOCK_V1'
const CLICK_REPORT_LOCK_TTL = 30 * 1000

let clickReportTimer = null
let clickReportFlushing = false

const normalizeCreationId = (creationId) => {
  if (creationId === undefined || creationId === null || creationId === '') {
    return ''
  }

  // 不转 Number，避免 Long / 雪花 ID 超过 JS 安全整数范围后丢精度
  return String(creationId)
}

const readQueue = () => {
  try {
    const raw = uni.getStorageSync(CLICK_REPORT_QUEUE_KEY)

    if (!raw) return []

    const list = Array.isArray(raw)
      ? raw
      : typeof raw === 'string'
        ? JSON.parse(raw)
        : []

    if (!Array.isArray(list)) return []

    const ids = []
    const seen = new Set()

    list.forEach(item => {
      const id = normalizeCreationId(item)
      if (!id || seen.has(id)) return

      seen.add(id)
      ids.push(id)
    })

    return ids.slice(-CLICK_REPORT_MAX_QUEUE_SIZE)
  } catch (err) {
    console.error('[click-track] readQueue failed', err)
    return []
  }
}

const writeQueue = (ids = []) => {
  try {
    const list = []
    const seen = new Set()

    ids.forEach(item => {
      const id = normalizeCreationId(item)
      if (!id || seen.has(id)) return

      seen.add(id)
      list.push(id)
    })

    const finalList = list.slice(-CLICK_REPORT_MAX_QUEUE_SIZE)
    uni.setStorageSync(CLICK_REPORT_QUEUE_KEY, finalList)

    return finalList
  } catch (err) {
    console.error('[click-track] writeQueue failed', err)
    return []
  }
}

const clearClickReportTimer = () => {
  if (clickReportTimer) {
    clearTimeout(clickReportTimer)
    clickReportTimer = null
  }
}

const scheduleClickReportTimer = () => {
  if (clickReportTimer) return

  const queue = readQueue()
  if (!queue.length) return

  clickReportTimer = setTimeout(() => {
    clickReportTimer = null
    flushClickReportQueue('timer')
  }, CLICK_REPORT_INTERVAL)
}

const acquireFlushLock = (reason = 'manual') => {
  const now = Date.now()
  const token = `${now}_${Math.random().toString(36).slice(2)}`

  try {
    const currentLock = uni.getStorageSync(CLICK_REPORT_LOCK_KEY)

    if (
      currentLock &&
      currentLock.token &&
      currentLock.ts &&
      now - Number(currentLock.ts) < CLICK_REPORT_LOCK_TTL
    ) {
      return ''
    }

    const nextLock = {
      token,
      ts: now,
      reason
    }

    uni.setStorageSync(CLICK_REPORT_LOCK_KEY, nextLock)

    const checkLock = uni.getStorageSync(CLICK_REPORT_LOCK_KEY)
    if (checkLock && checkLock.token === token) {
      return token
    }

    return ''
  } catch (err) {
    console.error('[click-track] acquireFlushLock failed', err)

    // storage lock 异常时，不阻断主流程；返回 token 允许继续尝试
    return token
  }
}

const releaseFlushLock = (token) => {
  if (!token) return

  try {
    const currentLock = uni.getStorageSync(CLICK_REPORT_LOCK_KEY)

    if (!currentLock || currentLock.token === token) {
      uni.removeStorageSync(CLICK_REPORT_LOCK_KEY)
    }
  } catch (err) {
    console.error('[click-track] releaseFlushLock failed', err)
  }
}

export const enqueueClickReport = (creationId) => {
  const id = normalizeCreationId(creationId)
  if (!id) return

  const queue = readQueue()

  if (!queue.includes(id)) {
    queue.push(id)
  }

  const nextQueue = writeQueue(queue)

  // 满 20 条：立即批量上报
  if (nextQueue.length >= CLICK_REPORT_BATCH_SIZE) {
    flushClickReportQueue('batch-full')
    return
  }

  // 不满 20 条：启动 5 分钟定时器
  scheduleClickReportTimer()
}

export const flushClickReportQueue = async (reason = 'manual') => {
  const beforeQueue = readQueue()

  if (clickReportFlushing) return false
  if (!beforeQueue.length) return true

  const lockToken = acquireFlushLock(reason)
  if (!lockToken) return false

  clickReportFlushing = true
  clearClickReportTimer()

  let ids = []

  try {
    const queue = readQueue()

    if (!queue.length) return true

    ids = queue.slice(0, CLICK_REPORT_BATCH_SIZE)
    const remainIds = queue.slice(CLICK_REPORT_BATCH_SIZE)

    // 先从 storage 移除本次要上报的 ids，避免重复 flush
    writeQueue(remainIds)

    const ok = await reportClick({
      creationIds: ids
    })

    if (!ok) {
      const currentQueue = readQueue()
      writeQueue(ids.concat(currentQueue))
    }

    return !!ok
  } catch (err) {
    console.error('[click-track] flushClickReportQueue failed', err)

    if (ids.length) {
      const currentQueue = readQueue()
      writeQueue(ids.concat(currentQueue))
    }

    return false
  } finally {
    clickReportFlushing = false
    releaseFlushLock(lockToken)

    const afterQueue = readQueue()

    if (afterQueue.length >= CLICK_REPORT_BATCH_SIZE) {
      flushClickReportQueue('batch-remain')
    } else if (afterQueue.length > 0) {
      scheduleClickReportTimer()
    }
  }
}

export const getClickReportQueueSnapshot = () => {
  return readQueue()
}

export const clearClickReportQueue = () => {
  clearClickReportTimer()
  writeQueue([])

  try {
    uni.removeStorageSync(CLICK_REPORT_LOCK_KEY)
  } catch (err) {
    console.error('[click-track] clearClickReportQueue remove lock failed', err)
  }
}