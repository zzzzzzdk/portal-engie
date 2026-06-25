import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

type E2EPage = Parameters<Parameters<typeof test>[1]>[0]['page']

const searchCard = (page: E2EPage) => page.getByTestId('search-card')
const replaceSearchCard = (page: E2EPage) => page.getByTestId('replace-search-card')
const queryFilterCard = (page: E2EPage) => page.getByTestId('query-filter-card')
const userCaseSearchCard = (page: E2EPage) => page.getByTestId('user-case-search-card')
const userCaseQueryCard = (page: E2EPage) => page.getByTestId('user-case-query-card')
const customFormCard = (page: E2EPage) => page.getByTestId('custom-form-card')
const nativeFieldCard = (page: E2EPage) => page.getByTestId('native-field-card')
const nativeFormSubmitNoneCard = (page: E2EPage) => page.getByTestId('native-form-submit-none-card')
const nativeFormSubmitTargetCard = (page: E2EPage) => page.getByTestId('native-form-submit-target-card')

const mockTableApi = async (page: E2EPage, requests: URL[]) => {
  await page.route('**/api/e2e/table**', async (route) => {
    requests.push(new URL(route.request().url()))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        list: [
          { id: '1', name: 'mock row', keyword: route.request().url() },
        ],
      }),
    })
  })
}

const mockSearchDrivenTableApi = async (page: E2EPage, requests: URL[]) => {
  await page.route('**/api/e2e/search-table**', async (route) => {
    requests.push(new URL(route.request().url()))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        list: [
          { id: '1', name: 'search row', keyword: route.request().url() },
        ],
      }),
    })
  })
}

const mockChartApi = async (page: E2EPage, requests: URL[]) => {
  await page.route('**/api/e2e/chart**', async (route) => {
    requests.push(new URL(route.request().url()))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [
          { name: 'A', value: 1 },
          { name: 'B', value: 2 },
        ],
      }),
    })
  })
}

interface CapturedPostRequest {
  url: URL
  body: Record<string, any>
}

interface CapturedHeaderRequest {
  url: URL
  headers: Record<string, string>
}

const mockPostTableApi = async (page: E2EPage, requests: CapturedPostRequest[]) => {
  await page.route('**/api/e2e/post-table**', async (route) => {
    const body = route.request().postDataJSON() as Record<string, any>
    requests.push({ url: new URL(route.request().url()), body })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        list: [
          { id: '1', name: 'post row', keyword: body?.keyword || '' },
        ],
      }),
    })
  })
}

const mockHeaderTableApi = async (page: E2EPage, requests: CapturedHeaderRequest[]) => {
  await page.route('**/api/e2e/header-table**', async (route) => {
    requests.push({ url: new URL(route.request().url()), headers: route.request().headers() })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        list: [
          { id: '1', name: 'header row' },
        ],
      }),
    })
  })
}

const mockIndicatorCardApi = async (page: E2EPage, requests: URL[]) => {
  await page.route('**/api/e2e/indicator-card**', async (route) => {
    requests.push(new URL(route.request().url()))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          value: route.request().url().includes('selectedId') ? 'selected' : 'initial',
          description: 'indicator-card',
        },
      }),
    })
  })
}

const mockAllApis = async (page: E2EPage, requests?: { table?: URL[]; searchTable?: URL[]; chart?: URL[]; indicator?: URL[]; postTable?: CapturedPostRequest[]; headerTable?: CapturedHeaderRequest[] }) => {
  await mockTableApi(page, requests?.table || [])
  await mockSearchDrivenTableApi(page, requests?.searchTable || [])
  await mockChartApi(page, requests?.chart || [])
  await mockIndicatorCardApi(page, requests?.indicator || [])
  await mockPostTableApi(page, requests?.postTable || [])
  await mockHeaderTableApi(page, requests?.headerTable || [])
}

test('query filter submit syncs values to search widget', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByLabel('关键词').first().fill('1111')
  await page.getByLabel('姓名').first().fill('112')
  await queryFilterCard(page).getByRole('button', { name: /查\s*询/ }).click()

  await expect(searchCard(page).getByPlaceholder('请输入关键词')).toHaveValue('1111')
  await expect(searchCard(page).getByPlaceholder('请输入姓名')).toHaveValue('112')

  await page.getByTestId('event-log-count').click()
  await expect(page.getByTestId('event-log-count')).toHaveText(/[1-9]\d*/)
})

test('search submit syncs mapped value to query filter widget', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await userCaseSearchCard(page).getByPlaceholder('请输入搜索内容...').fill('search-to-query')
  await userCaseSearchCard(page).getByRole('button', { name: /搜\s*索/ }).click()

  await expect(userCaseQueryCard(page).getByPlaceholder('请输入名称')).toHaveValue('search-to-query')
  await expect(page.getByText('搜索参数已提交（未配置事件路由）')).toHaveCount(0)
})

test('query filter reset clears linked search widget values', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByLabel('关键词').first().fill('first')
  await page.getByLabel('姓名').first().fill('second')
  await queryFilterCard(page).getByRole('button', { name: /查\s*询/ }).click()

  await expect(searchCard(page).getByPlaceholder('请输入关键词')).toHaveValue('first')
  await expect(searchCard(page).getByPlaceholder('请输入姓名')).toHaveValue('second')

  await queryFilterCard(page).getByRole('button', { name: /重\s*置/ }).click()

  await expect(searchCard(page).getByPlaceholder('请输入关键词')).toHaveValue('')
  await expect(searchCard(page).getByPlaceholder('请输入姓名')).toHaveValue('')
})

test('input mapping updates only mapped target fields', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await expect(replaceSearchCard(page).getByPlaceholder('请输入关键词')).toHaveValue('keep-me')
  await expect(replaceSearchCard(page).getByPlaceholder('请输入姓名')).toHaveValue('remove-me')

  await page.getByLabel('关键词').first().fill('merge-keyword')
  await queryFilterCard(page).getByRole('button', { name: /查\s*询/ }).click()

  await expect(searchCard(page).getByPlaceholder('请输入关键词')).toHaveValue('merge-keyword')
  await expect(searchCard(page).getByPlaceholder('请输入姓名')).toHaveValue('')
  await expect(replaceSearchCard(page).getByPlaceholder('请输入关键词')).toHaveValue('merge-keyword')
  await expect(replaceSearchCard(page).getByPlaceholder('请输入姓名')).toHaveValue('remove-me')
})

test('query filter submit reloads table with mapped runtime params', async ({ page }) => {
  const requests: URL[] = []
  await mockAllApis(page, { table: requests })
  await page.goto('/?e2e=widget-events')

  await expect.poll(() => requests.length).toBeGreaterThanOrEqual(1)

  await page.getByLabel('关键词').first().fill('table-keyword')
  await page.getByLabel('姓名').first().fill('table-name')
  await queryFilterCard(page).getByRole('button', { name: /查\s*询/ }).click()

  await expect.poll(() => requests.length).toBeGreaterThanOrEqual(2)

  const lastRequest = requests[requests.length - 1]
  expect(lastRequest.searchParams.get('keyword')).toBe('table-keyword')
  expect(lastRequest.searchParams.get('userName')).toBe('table-name')
  expect(lastRequest.searchParams.get('page')).toBe('1')
  expect(lastRequest.searchParams.get('staticParam')).toBe('static-value')
})

test('query filter reset clears table runtime params before reload', async ({ page }) => {
  const requests: URL[] = []
  await mockAllApis(page, { table: requests })
  await page.goto('/?e2e=widget-events')

  await expect.poll(() => requests.length).toBeGreaterThanOrEqual(1)

  await page.getByLabel('关键词').first().fill('clear-keyword')
  await page.getByLabel('姓名').first().fill('clear-name')
  await queryFilterCard(page).getByRole('button', { name: /查\s*询/ }).click()

  await expect.poll(() => requests.length).toBeGreaterThanOrEqual(2)
  expect(requests[requests.length - 1].searchParams.get('keyword')).toBe('clear-keyword')
  expect(requests[requests.length - 1].searchParams.get('userName')).toBe('clear-name')

  await queryFilterCard(page).getByRole('button', { name: /重\s*置/ }).click()

  await expect.poll(() => requests.length).toBeGreaterThanOrEqual(3)
  const resetRequest = requests[requests.length - 1]
  expect(resetRequest.searchParams.get('keyword')).toBeNull()
  expect(resetRequest.searchParams.get('userName')).toBeNull()
  expect(resetRequest.searchParams.get('staticParam')).toBe('static-value')
})

test('search submit reloads table and chart with mapped runtime params', async ({ page }) => {
  const searchTableRequests: URL[] = []
  const chartRequests: URL[] = []
  await mockAllApis(page, { searchTable: searchTableRequests, chart: chartRequests })
  await page.goto('/?e2e=widget-events')

  await expect.poll(() => searchTableRequests.length).toBeGreaterThanOrEqual(1)

  await searchCard(page).getByPlaceholder('请输入关键词').fill('search-keyword')
  await searchCard(page).getByRole('button', { name: /搜索/ }).click()

  await expect.poll(() => searchTableRequests.length).toBeGreaterThanOrEqual(2)
  await expect.poll(() => chartRequests.length).toBeGreaterThanOrEqual(1)

  const tableRequest = searchTableRequests[searchTableRequests.length - 1]
  expect(tableRequest.searchParams.get('keyword')).toBe('search-keyword')
  expect(tableRequest.searchParams.get('source')).toBe('search-submit')

  const chartRequest = chartRequests[chartRequests.length - 1]
  expect(chartRequest.searchParams.get('keyword')).toBe('search-keyword')
  expect(chartRequest.searchParams.get('chartStatic')).toBe('yes')
})

test('search submit injects runtime params into post table body', async ({ page }) => {
  const postTableRequests: CapturedPostRequest[] = []
  await mockAllApis(page, { postTable: postTableRequests })
  await page.goto('/?e2e=widget-events')

  await expect.poll(() => postTableRequests.length).toBeGreaterThanOrEqual(1)

  await searchCard(page).getByPlaceholder('请输入关键词').fill('post-keyword')
  await searchCard(page).getByRole('button', { name: /搜索/ }).click()

  await expect.poll(() => postTableRequests.length).toBeGreaterThanOrEqual(2)

  const body = postTableRequests[postTableRequests.length - 1].body
  expect(body.staticBody).toBe('body-value')
  expect(body.templatedKeyword).toBe('post-keyword')
  expect(body.keyword).toBe('post-keyword')
  expect(body.source).toBe('search-post')
})

test('search submit injects runtime params into request headers', async ({ page }) => {
  const headerRequests: CapturedHeaderRequest[] = []
  await mockAllApis(page, { headerTable: headerRequests })
  await page.goto('/?e2e=widget-events')

  await expect.poll(() => headerRequests.length).toBeGreaterThanOrEqual(1)

  await searchCard(page).getByPlaceholder('请输入关键词').fill('header-keyword')
  await searchCard(page).getByRole('button', { name: /搜索/ }).click()

  await expect.poll(() => headerRequests.length).toBeGreaterThanOrEqual(2)

  const headers = headerRequests[headerRequests.length - 1].headers
  expect(headers['x-keyword']).toBe('header-keyword')
  expect(headers['x-trace']).toBe('trace-header-keyword')
})

test('table row click updates search widget and reloads indicator card', async ({ page }) => {
  const tableRequests: URL[] = []
  const indicatorRequests: URL[] = []
  await mockAllApis(page, { table: tableRequests, indicator: indicatorRequests })
  await page.goto('/?e2e=widget-events')

  await expect.poll(() => tableRequests.length).toBeGreaterThanOrEqual(1)
  await expect.poll(() => indicatorRequests.length).toBeGreaterThanOrEqual(1)

  await page.getByLabel('关键词').first().fill('row-keyword')
  await page.getByLabel('姓名').first().fill('row-name')
  await queryFilterCard(page).getByRole('button', { name: /查\s*询/ }).click()

  await expect.poll(() => tableRequests.length).toBeGreaterThanOrEqual(2)
  await page.getByTestId('table-card').getByText('mock row').click()

  await expect(searchCard(page).getByPlaceholder('请输入关键词')).toHaveValue(/\/api\/e2e\/table/)
  await expect(searchCard(page).getByPlaceholder('请输入姓名')).toHaveValue('mock row')
  await expect.poll(() => indicatorRequests.length).toBeGreaterThanOrEqual(2)

  const indicatorRequest = indicatorRequests[indicatorRequests.length - 1]
  expect(indicatorRequest.searchParams.get('selectedId')).toBe('1')
  expect(indicatorRequest.searchParams.get('selectedName')).toBe('mock row')
})

test('custom form submit updates search widget and reloads table', async ({ page }) => {
  const searchTableRequests: URL[] = []
  await mockAllApis(page, { searchTable: searchTableRequests })
  await page.goto('/?e2e=widget-events')

  await expect.poll(() => searchTableRequests.length).toBeGreaterThanOrEqual(1)

  await customFormCard(page).getByPlaceholder('请输入表单关键词').fill('form-keyword')
  await customFormCard(page).getByPlaceholder('请输入表单姓名').fill('form-name')
  await customFormCard(page).getByRole('button', { name: /提交表单/ }).click()

  await expect(searchCard(page).getByPlaceholder('请输入关键词')).toHaveValue('form-keyword')
  await expect(searchCard(page).getByPlaceholder('请输入姓名')).toHaveValue('form-name')
  await expect.poll(() => searchTableRequests.length).toBeGreaterThanOrEqual(2)

  const tableRequest = searchTableRequests[searchTableRequests.length - 1]
  expect(tableRequest.searchParams.get('formKeyword')).toBe('form-keyword')
  expect(tableRequest.searchParams.get('formName')).toBe('form-name')
})

test('native form field change updates search widget', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await nativeFieldCard(page).getByPlaceholder('请输入原生关键词').fill('native-keyword')

  await expect(searchCard(page).getByPlaceholder('请输入关键词')).toHaveValue('native-keyword')
})

test('native form submit mode none still emits internal submit linkage', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await nativeFormSubmitNoneCard(page).getByPlaceholder('请输入原生表单关键词').fill('native-form-submit-keyword')
  await nativeFormSubmitNoneCard(page).getByRole('button', { name: /提\s*交/ }).click()

  await expect(nativeFormSubmitTargetCard(page).getByPlaceholder('请输入搜索内容...')).toHaveValue('native-form-submit-keyword')
})

test('looping events are blocked by depth guard', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByTestId('clear-event-logs').click()
  await page.getByTestId('start-loop').click()
  await page.getByTestId('blocked-log-count').click()

  await expect(page.getByTestId('blocked-log-count')).toHaveText(/[1-9]\d*/)
})

test('debounced output emits only the last event burst', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByTestId('fire-debounce').click()

  await expect(page.getByTestId('debounce-count')).toHaveText('1')
})

test('debounced input handler runs only once per event burst', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByTestId('fire-input-debounce').click()

  await expect(page.getByTestId('input-debounce-count')).toHaveText('1')
})

test('missing mapping path is handled without crashing', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByTestId('fire-missing-path').click()

  await expect(page.getByTestId('missing-path-value')).toHaveText('undefined')
})

test('disabled output and input configs do not run', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByTestId('fire-disabled-output').click()
  await page.getByTestId('fire-disabled-input').click()

  await expect(page.getByTestId('disabled-count')).toHaveText('0')
})

test('multiple inputs with same source event apply their own mappings', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByTestId('fire-multi-input').click()

  await expect(page.getByTestId('multi-input-value')).toHaveText('{"keep":"keep","first":"one","second":"two"}')
})

test('mapped output keeps original payload paths readable by input mapping', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByTestId('fire-mapped-payload').click()

  await expect(page.getByTestId('mapped-payload-value')).toHaveText('mapped-keyword')
})

test('config dialog linkage mapping save transform preserves mappings and debounce', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByTestId('run-config-transform').click()

  await expect(page.getByTestId('config-transform-result')).toHaveText('pass')
})

test('field suggestion builder exposes configured source paths', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByTestId('run-field-suggestions').click()

  await expect(page.getByTestId('field-suggestion-result')).toHaveText('pass')
})

test('capability declarations only expose implemented input actions', async ({ page }) => {
  await mockAllApis(page)
  await page.goto('/?e2e=widget-events')

  await page.getByTestId('run-capability-check').click()

  await expect(page.getByTestId('capability-check-result')).toHaveText('pass')
})
