var express = require('express')

var router = express.Router()

const DEFAULT_PAGINATION = {
  mode: 'none',
  page: 1,
  pageSize: 10,
  pageParam: 'page',
  pageSizeParam: 'page_size',
  totalField: 'data.total',
  currentField: 'data.page',
  pageSizeField: 'data.page_size',
  showTotal: true,
}

const HEADER_OPTIONS = [
  'Accept',
  'Authorization',
  'Content-Type',
  'User-Agent',
  'X-Requested-With',
  'Cache-Control',
]

const nowText = () => new Date().toISOString().slice(0, 19).replace('T', ' ')

const clone = value => JSON.parse(JSON.stringify(value))

const normalizeText = value => String(value || '').trim()

const normalizePositiveInteger = (value, fallbackValue) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallbackValue
  }
  return parsed
}

const sanitizeKeyValueList = (list, allowKeyMap) => {
  if (!Array.isArray(list)) {
    return []
  }

  return list
    .map(item => ({
      key: normalizeText(item?.key),
      value: normalizeText(item?.value),
    }))
    .filter(item => {
      if (!item.key) {
        return false
      }
      if (allowKeyMap && !allowKeyMap.has(item.key)) {
        return false
      }
      return true
    })
}

const sanitizePagination = pagination => {
  const normalized = {
    ...DEFAULT_PAGINATION,
    ...(pagination || {}),
  }

  return {
    mode: normalized.mode === 'pagination' ? 'pagination' : 'none',
    page: normalizePositiveInteger(normalized.page, 1),
    pageSize: normalizePositiveInteger(normalized.pageSize, 10),
    pageParam: normalizeText(normalized.pageParam) || 'page',
    pageSizeParam: normalizeText(normalized.pageSizeParam) || 'page_size',
    totalField: normalizeText(normalized.totalField) || 'data.total',
    currentField: normalizeText(normalized.currentField) || 'data.page',
    pageSizeField: normalizeText(normalized.pageSizeField) || 'data.page_size',
    showTotal: normalized.showTotal !== false,
  }
}

const sanitizeDataSource = (payload, previousRecord) => {
  const headerKeyMap = new Set(HEADER_OPTIONS)
  const name = normalizeText(payload?.name)
  const method = normalizeText(payload?.method).toUpperCase() === 'POST' ? 'POST' : 'GET'
  const url = normalizeText(payload?.url)
  const description = normalizeText(payload?.description)
  const listField = normalizeText(payload?.listField) || 'data.list'
  const timeout = normalizePositiveInteger(payload?.timeout, 10)
  const headersList = sanitizeKeyValueList(payload?.requestConfig?.headersList, headerKeyMap)
  const queryList = sanitizeKeyValueList(payload?.requestConfig?.queryList)
  const bodyList = method === 'POST'
    ? sanitizeKeyValueList(payload?.requestConfig?.bodyList)
    : []
  const pagination = sanitizePagination(payload?.requestConfig?.pagination)
  const timestamp = nowText()

  return {
    id: previousRecord?.id || `ds_${Date.now()}`,
    name,
    method,
    url,
    description,
    listField,
    timeout,
    requestConfig: {
      headersList,
      queryList,
      bodyList,
      pagination,
    },
    createdAt: previousRecord?.createdAt || timestamp,
    updatedAt: timestamp,
  }
}

let dataSources = [
  {
    id: 'ds_001',
    name: '任务列表演示',
    method: 'GET',
    url: '/api/demo/table',
    description: '表格组件示例',
    listField: 'data.list',
    timeout: 10,
    requestConfig: {
      headersList: [
        { key: 'Accept', value: 'application/json' },
      ],
      queryList: [
        { key: 'keyword', value: '巡检' },
        { key: 'status', value: '运行中' },
        { key: 'category', value: '巡检' },
      ],
      bodyList: [],
      pagination: {
        mode: 'pagination',
        page: 1,
        pageSize: 5,
        pageParam: 'page',
        pageSizeParam: 'page_size',
        totalField: 'data.total',
        currentField: 'data.page',
        pageSizeField: 'data.page_size',
        showTotal: true,
      },
    },
    createdAt: '2026-04-10 09:20:00',
    updatedAt: '2026-04-12 15:18:00',
  },
  {
    id: 'ds_002',
    name: '新闻动态演示',
    method: 'POST',
    url: '/api/demo/news',
    description: '新闻组件示例',
    listField: 'data.records',
    timeout: 8,
    requestConfig: {
      headersList: [
        { key: 'Accept', value: 'application/json' },
        { key: 'Content-Type', value: 'application/json' },
      ],
      queryList: [],
      bodyList: [
        { key: 'keyword', value: '演示' },
        { key: 'category', value: '技术' },
      ],
      pagination: {
        mode: 'pagination',
        page: 1,
        pageSize: 4,
        pageParam: 'page',
        pageSizeParam: 'page_size',
        totalField: 'data.total',
        currentField: 'data.page',
        pageSizeField: 'data.page_size',
        showTotal: true,
      },
    },
    createdAt: '2026-04-09 14:00:00',
    updatedAt: '2026-04-11 11:06:00',
  },
  {
    id: 'ds_003',
    name: '告警排行演示ceshijiekou告警排行演示ceshijiekou',
    method: 'GET',
    url: '/api/demo/top-list',
    description: '排行组件示例',
    listField: 'data.rows',
    timeout: 10,
    requestConfig: {
      headersList: [
        { key: 'Accept', value: 'application/json' },
      ],
      queryList: [
        { key: 'category', value: '告警' },
      ],
      bodyList: [],
      pagination: {
        mode: 'pagination',
        page: 1,
        pageSize: 5,
        pageParam: 'page',
        pageSizeParam: 'page_size',
        totalField: 'data.total',
        currentField: 'data.current',
        pageSizeField: 'data.pageSize',
        showTotal: true,
      },
    },
    createdAt: '2026-04-08 16:35:00',
    updatedAt: '2026-04-12 09:42:00',
  },
  {
    id: 'ds_004',
    name: '轮播图演示',
    method: 'POST',
    url: '/api/demo/carousel',
    description: '轮播图组件示例',
    listField: 'data.carousel.items',
    timeout: 10,
    requestConfig: {
      headersList: [
        { key: 'Accept', value: 'application/json' },
        { key: 'Content-Type', value: 'application/json' },
      ],
      queryList: [],
      bodyList: [
        { key: 'scene', value: 'portal' },
      ],
      pagination: {
        ...DEFAULT_PAGINATION,
        mode: 'none',
      },
    },
    createdAt: '2026-04-08 10:18:00',
    updatedAt: '2026-04-12 08:50:00',
  },
  {
    id: 'ds_005',
    name: '导航分组演示',
    method: 'GET',
    url: '/api/demo/nav-group',
    description: '导航分组组件示例',
    listField: 'payload.groups.list',
    timeout: 12,
    requestConfig: {
      headersList: [
        { key: 'Accept', value: 'application/json' },
      ],
      queryList: [
        { key: 'groupType', value: 'portal' },
      ],
      bodyList: [],
      pagination: {
        ...DEFAULT_PAGINATION,
        mode: 'none',
      },
    },
    createdAt: '2026-04-08 09:30:00',
    updatedAt: '2026-04-12 09:15:00',
  },
  {
    id: 'ds_006',
    name: '级联字段演示',
    method: 'GET',
    url: '/api/demo/cascader',
    description: '级联字段示例',
    listField: 'data.cascader.list',
    timeout: 10,
    requestConfig: {
      headersList: [
        { key: 'Accept', value: 'application/json' },
      ],
      queryList: [
        { key: 'scene', value: 'port' },
      ],
      bodyList: [],
      pagination: {
        ...DEFAULT_PAGINATION,
        mode: 'none',
      },
    },
    createdAt: '2026-04-07 17:08:00',
    updatedAt: '2026-04-11 18:20:00',
  },
  {
    id: 'ds_007',
    name: '统计卡片演示',
    method: 'GET',
    url: '/api/demo/stats',
    description: '统计卡片示例',
    listField: 'payload.metrics',
    timeout: 6,
    requestConfig: {
      headersList: [
        { key: 'Accept', value: 'application/json' },
      ],
      queryList: [
        { key: 'scope', value: 'today' },
      ],
      bodyList: [],
      pagination: {
        ...DEFAULT_PAGINATION,
        mode: 'none',
      },
    },
    createdAt: '2026-04-07 11:20:00',
    updatedAt: '2026-04-11 16:40:00',
  },
  {
    id: 'ds_008',
    name: '图表演示',
    method: 'POST',
    url: '/api/demo/chart',
    description: '图表组件示例',
    listField: 'result.chart',
    timeout: 6,
    requestConfig: {
      headersList: [
        { key: 'Accept', value: 'application/json' },
        { key: 'Content-Type', value: 'application/json' },
      ],
      queryList: [],
      bodyList: [
        { key: 'period', value: 'week' },
      ],
      pagination: {
        ...DEFAULT_PAGINATION,
        mode: 'none',
      },
    },
    createdAt: '2026-04-07 10:00:00',
    updatedAt: '2026-04-11 15:10:00',
  },
]

router.get('/v1/data-sources/list', async (req, res) => {
  await req.sleep(0.2)

  const keyword = normalizeText(req.query?.keyword).toLowerCase()
  const page = normalizePositiveInteger(req.query?.page, 1)
  const pageSize = normalizePositiveInteger(req.query?.page_size, 10)

  const filteredList = dataSources.filter(item => {
    if (!keyword) {
      return true
    }

    return [item.name, item.url, item.description]
      .some(field => String(field || '').toLowerCase().includes(keyword))
  })

  const orderedList = filteredList
    .slice()
    .sort((prev, next) => String(next.updatedAt || '').localeCompare(String(prev.updatedAt || '')))
  const start = (page - 1) * pageSize

  req.json.data = {
    list: clone(orderedList.slice(start, start + pageSize)),
    total: orderedList.length,
    page,
    page_size: pageSize,
  }

  res.json(req.json)
})

router.get('/v1/data-sources/detail', async (req, res) => {
  await req.sleep(0.15)

  const id = normalizeText(req.query?.id)
  const record = dataSources.find(item => item.id === id)

  if (!record) {
    req.json.code = 40004
    req.json.message = '数据源不存在'
    req.json.data = null
    return res.json(req.json)
  }

  req.json.data = clone(record)
  res.json(req.json)
})

router.post('/v1/data-sources/create', async (req, res) => {
  await req.sleep(0.2)

  const normalized = sanitizeDataSource(req.body)

  if (!normalized.name) {
    req.json.code = 40000
    req.json.message = '数据源名称不能为空'
    req.json.data = null
    return res.json(req.json)
  }

  if (Array.from(normalized.name).length > 20) {
    req.json.code = 40000
    req.json.message = '数据源名称不能超过 20 个字'
    req.json.data = null
    return res.json(req.json)
  }

  if (!normalized.url) {
    req.json.code = 40000
    req.json.message = '接口地址不能为空'
    req.json.data = null
    return res.json(req.json)
  }

  if (normalized.description && Array.from(normalized.description).length > 30) {
    req.json.code = 40000
    req.json.message = '描述不能超过 30 个字'
    req.json.data = null
    return res.json(req.json)
  }

  if (!Number.isInteger(normalized.timeout) || normalized.timeout <= 1) {
    req.json.code = 40000
    req.json.message = '查询超时必须大于 1 秒'
    req.json.data = null
    return res.json(req.json)
  }

  if (dataSources.some(item => item.name === normalized.name)) {
    req.json.code = 40000
    req.json.message = '数据源名称已存在'
    req.json.data = null
    return res.json(req.json)
  }

  dataSources.unshift(normalized)
  req.json.data = { id: normalized.id }
  res.json(req.json)
})

router.post('/v1/data-sources/update', async (req, res) => {
  await req.sleep(0.2)

  const id = normalizeText(req.body?.id)
  const currentRecord = dataSources.find(item => item.id === id)

  if (!currentRecord) {
    req.json.code = 40004
    req.json.message = '数据源不存在'
    req.json.data = null
    return res.json(req.json)
  }

  const normalized = sanitizeDataSource(req.body, currentRecord)

  if (!normalized.name) {
    req.json.code = 40000
    req.json.message = '数据源名称不能为空'
    req.json.data = null
    return res.json(req.json)
  }

  if (Array.from(normalized.name).length > 20) {
    req.json.code = 40000
    req.json.message = '数据源名称不能超过 20 个字'
    req.json.data = null
    return res.json(req.json)
  }

  if (!normalized.url) {
    req.json.code = 40000
    req.json.message = '接口地址不能为空'
    req.json.data = null
    return res.json(req.json)
  }

  if (normalized.description && Array.from(normalized.description).length > 30) {
    req.json.code = 40000
    req.json.message = '描述不能超过 30 个字'
    req.json.data = null
    return res.json(req.json)
  }

  if (!Number.isInteger(normalized.timeout) || normalized.timeout <= 1) {
    req.json.code = 40000
    req.json.message = '查询超时必须大于 1 秒'
    req.json.data = null
    return res.json(req.json)
  }

  if (dataSources.some(item => item.name === normalized.name && item.id !== normalized.id)) {
    req.json.code = 40000
    req.json.message = '数据源名称已存在'
    req.json.data = null
    return res.json(req.json)
  }

  dataSources = dataSources.map(item => (item.id === normalized.id ? normalized : item))
  req.json.data = { id: normalized.id }
  res.json(req.json)
})

router.post('/v1/data-sources/delete', async (req, res) => {
  await req.sleep(0.15)

  const id = normalizeText(req.body?.id)
  const exists = dataSources.some(item => item.id === id)

  if (!exists) {
    req.json.code = 40004
    req.json.message = '数据源不存在'
    req.json.data = null
    return res.json(req.json)
  }

  dataSources = dataSources.filter(item => item.id !== id)
  req.json.data = { success: true }
  res.json(req.json)
})

module.exports = router
