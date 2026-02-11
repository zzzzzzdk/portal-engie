const express = require('express');
const router = express.Router();

const mockDashboards = {};
let seedsInitialized = false;

const ensureSeededDashboards = () => {
  if (seedsInitialized) {
    return;
  }
  const seededDashboards = {
    canglan: {
      id: 'f15a8606-3b1d-4a54-bc5b-4e60076338fe',
      title: '苍澜测试',
      widgets: [
        {
          id: '95fd71a9-9dfd-423e-a938-1bd3fffdee4a',
          type: 'headerBar',
          title: '顶部栏',
          layout: {
            h: 2,
            i: '95fd71a9-9dfd-423e-a938-1bd3fffdee4a',
            w: 36,
            x: 0,
            y: 0,
            minH: 1,
            minW: 1,
          },
          config: {
            title: '顶部栏',
            showTitle: false,
            textColor: '#022eff',
            fontFamily: 'YouSheBiaoTiHei',
            headerTitle: '“沧澜”垂域新质生产力引擎',
            backdropBlur: 20,
            backgroundType: 'color',
            backgroundColor: 'rgba(255,255,255,0.2)',
            headerAlignment: 'left',
            showUserProfile: true,
            showThemeSwitcher: true,
          },
          groupId: null,
        },
        {
          id: 'ec0c8b62-c8a8-4abe-aece-447a7136137c',
          type: 'typography',
          title: '文本组件',
          layout: {
            h: 4,
            i: 'ec0c8b62-c8a8-4abe-aece-447a7136137c',
            w: 12,
            x: 11,
            y: 2,
            minH: 1,
            minW: 2,
          },
          config: {
            title: '文本组件',
            content: '沧澜，你的超级工作助手',
            fontSize: 44,
            showTitle: false,
            textAlign: 'center',
            fontWeight: 'bold',
            backdropBlur: 0,
            backgroundType: 'color',
            backgroundColor: 'rgba(0,0,0,0)',
          },
          groupId: null,
        },
        {
          id: 'bb91e865-b799-4034-b60b-83d5a415e921',
          type: 'microApp',
          title: '门户对话框',
          layout: {
            h: 5,
            i: 'bb91e865-b799-4034-b60b-83d5a415e921',
            w: 17,
            x: 9,
            y: 7,
            minH: 1,
            minW: 1,
          },
          config: {
            icon: 'AppstoreOutlined',
            sync: true,
            alive: true,
            title: '门户对话框',
            moduleId: '7670dd74-b3a1-42a8-aaa0-7facaf8e46ff',
            systemId: 'c666d5f4-1b82-448c-9b81-0529a6da6cb7',
            showTitle: false,
            eventRoutes: [],
            microAppUrl: 'http://192.168.5.57:9998/ChatInput',
            forceIconOnly: false,
            microAppEntry: 'http://192.168.5.57:9998/ChatInput',
            backgroundType: 'color',
            backgroundColor: '#ff000000',
            refreshInterval: 60,
          },
          groupId: null,
        },
        {
          id: 'b1dbac8f-bdb0-4a26-82d7-d63533b38c3d',
          type: 'topList',
          title: '融合布控任务管理',
          layout: {
            h: 8,
            i: 'b1dbac8f-bdb0-4a26-82d7-d63533b38c3d',
            w: 5,
            x: 4,
            y: 14,
            minH: 4,
            minW: 3,
          },
          config: {
            title: 'TopList',
            showTitle: true,
            backdropBlur: 10,
            backgroundType: 'color',
            backgroundColor: 'rgba(255,255,255,0.2)',
            refreshInterval: 60,
          },
          groupId: 'group-1768812407721',
        },
        {
          id: 'ae25a0e0-cdf8-4a19-8ccf-5b42b0e67bb1',
          type: 'news',
          title: '今日重点人员预警',
          layout: {
            h: 8,
            i: 'ae25a0e0-cdf8-4a19-8ccf-5b42b0e67bb1',
            w: 6,
            x: 10,
            y: 14,
            minH: 4,
            minW: 4,
          },
          config: {
            title: 'News',
            showTitle: true,
            backdropBlur: 10,
            backgroundType: 'color',
            backgroundColor: 'rgba(255,255,255,0.2)',
            refreshInterval: 60,
          },
          groupId: 'group-1768812407721',
        },
        {
          id: '7bc9f880-ad4f-40d9-9829-8a03bf2dbca4',
          type: 'navGroup',
          title: '政务专题应用',
          layout: {
            h: 9,
            i: '7bc9f880-ad4f-40d9-9829-8a03bf2dbca4',
            w: 7,
            x: 24,
            y: 14,
            minH: 4,
            minW: 4,
          },
          config: {
            title: '导航组',
            layout: 'grid',
            columns: 4,
            itemGap: 12,
            iconSize: 32,
            showLabel: true,
            showTitle: true,
            backdropBlur: 10,
            itemIconColor: '#ffffff',
            backgroundType: 'color',
            backgroundColor: 'rgba(255,255,255,0.2)',
          },
          groupId: 'group-1768812407721',
        },
        {
          id: 'eae789ff-2f2b-46a8-9b43-2e5e3f8d4dde',
          type: 'search',
          title: '车辆档案查询',
          layout: {
            h: 4,
            i: 'eae789ff-2f2b-46a8-9b43-2e5e3f8d4dde',
            w: 6,
            x: 17,
            y: 14,
            minH: 2,
            minW: 4,
          },
          config: {
            title: 'Search',
            showTitle: true,
            backdropBlur: 10,
            backgroundType: 'color',
            backgroundColor: 'rgba(255,255,255,0.2)',
          },
          groupId: 'group-1768812407721',
        },
        {
          id: '9cc4fe6a-a534-4eb7-b672-46f3ecab99cc',
          type: 'search',
          title: '车辆轨迹查询',
          layout: {
            h: 4,
            i: '9cc4fe6a-a534-4eb7-b672-46f3ecab99cc',
            w: 6,
            x: 17,
            y: 18,
            minH: 2,
            minW: 4,
          },
          config: {
            title: 'Search',
            showTitle: true,
            backdropBlur: 10,
            backgroundType: 'color',
            backgroundColor: 'rgba(255,255,255,0.2)',
          },
          groupId: 'group-1768812407721',
        },
      ],
      groups: [
        {
          id: 'group-1768812407721',
          title: '收藏',
          widgetIds: [
            'b1dbac8f-bdb0-4a26-82d7-d63533b38c3d',
            'ae25a0e0-cdf8-4a19-8ccf-5b42b0e67bb1',
            'eae789ff-2f2b-46a8-9b43-2e5e3f8d4dde',
            '7bc9f880-ad4f-40d9-9829-8a03bf2dbca4',
            '9cc4fe6a-a534-4eb7-b672-46f3ecab99cc',
          ],
          layout: {
            h: 19,
            i: 'group-1768812407721',
            w: 27,
            x: 4,
            y: 12,
            minH: 2,
            minW: 2,
          },
          config: {
            showTitle: true,
            titleFontSize: 16,
            titleFontWeight: 600,
            backgroundType: 'color',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderStyle: 'none',
            borderRadius: 8,
          },
        },
      ],
      floatingModules: [],
      dashboardConfig: {
        backgroundType: 'image',
        backgroundColor: '#f5f5f5',
        backgroundImage: 'http://192.168.5.60:29081/canglan-trial/static/uploads/2026_01_19/164434_515002.png',
      },
      publishedAt: '2026-01-19 16:58:02',
    },
    pub_1: {
      id: 'bab6f5a9-cdf8-4bc0-bdf6-4c8fef36ef69',
      title: '沧澜门户（极简）',
      widgets: [
        {
          id: 'aec0f5e8-6837-4bfa-b797-870712be15db',
          type: 'headerBar',
          title: '“沧澜”垂域新质生产力引擎',
          layout: {
            h: 2,
            i: 'aec0f5e8-6837-4bfa-b797-870712be15db',
            w: 36,
            x: 0,
            y: 0,
            minH: 1,
            minW: 1,
          },
          config: {
            title: '顶部栏',
            showTitle: false,
            textColor: '#ffffff',
            fontFamily: 'YouSheBiaoTiHei',
            titleColor: 'rgb(34,34,34)',
            headerTitle: '“沧澜”垂域新质生产力引擎',
            backdropBlur: 20,
            backgroundType: 'color',
            headerFontSize: 32,
            backgroundColor: 'rgba(255,255,255,0.2)',
            backgroundImage: '',
            headerAlignment: 'left',
            showUserProfile: true,
            backgroundRepeat: 'no-repeat',
            showThemeSwitcher: false,
          },
          groupId: null,
        },
        {
          id: '6cfa3270-3f0a-49b6-b26d-6c42a64bde2b',
          type: 'microApp',
          title: '门户对话框',
          layout: {
            h: 2,
            i: '6cfa3270-3f0a-49b6-b26d-6c42a64bde2b',
            w: 16,
            x: 10,
            y: 6,
            minH: 1,
            minW: 1,
          },
          config: {
            icon: 'AppstoreOutlined',
            sync: true,
            alive: true,
            title: '门户对话框',
            moduleId: '7670dd74-b3a1-42a8-aaa0-7facaf8e46ff',
            systemId: 'c666d5f4-1b82-448c-9b81-0529a6da6cb7',
            showTitle: false,
            eventRoutes: [],
            microAppUrl: 'http://192.168.5.57:9998/ChatInput',
            forceIconOnly: false,
            microAppEntry: 'http://192.168.5.57:9998/ChatInput',
            backgroundType: 'color',
            backgroundColor: '#00000000',
            backgroundImage: '',
            refreshInterval: 60,
          },
          groupId: null,
        },
        {
          id: 'ecf35776-fd20-4f2c-9345-62e31d13d6bf',
          type: 'typography',
          title: '文本组件',
          layout: {
            h: 2,
            i: 'ecf35776-fd20-4f2c-9345-62e31d13d6bf',
            w: 16,
            x: 10,
            y: 4,
            minH: 1,
            minW: 1,
          },
          config: {
            color: '#ffffff',
            level: 1,
            title: '文本组件',
            content: '沧澜，你的超级工作助手',
            fontSize: 32,
            showTitle: false,
            textAlign: 'center',
            fontWeight: 'bold',
            titleColor: '#222222',
            backdropBlur: 1,
            backgroundType: 'color',
            backgroundColor: 'rgba(255,255,255,0)',
            backgroundImage: '',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          },
          groupId: null,
        },
        {
          id: 'c8ec74c4-196d-4432-b2e6-765c88df6f85',
          type: 'typography',
          title: 'Typography',
          layout: {
            h: 2,
            i: 'c8ec74c4-196d-4432-b2e6-765c88df6f85',
            w: 3,
            x: 8,
            y: 14,
            minH: 1,
            minW: 2,
          },
          config: {
            color: '#ffffff',
            level: 2,
            title: '文本组件',
            content: '推荐',
            fontSize: 22,
            showTitle: false,
            textAlign: 'left',
            fontWeight: 'bold',
            titleColor: '#222222',
            backdropBlur: 1,
            backgroundType: 'color',
            backgroundColor: 'rgba(255,255,255,0)',
          },
          groupId: null,
        },
        {
          id: 'a3748fa7-4e03-402f-bdb9-c87fef4a74c7',
          type: 'navGroup',
          title: 'NavGroup',
          layout: {
            h: 5,
            i: 'a3748fa7-4e03-402f-bdb9-c87fef4a74c7',
            w: 21,
            x: 8,
            y: 15,
            minH: 4,
            minW: 4,
          },
          config: {
            title: '导航组',
            layout: 'tag',
            columns: 4,
            itemGap: 12,
            tagBlur: 16,
            iconSize: 32,
            tagColor: 'rgba(255,255,255,0.2)',
            showLabel: true,
            showTitle: false,
            titleColor: '#222222',
            apiEndpoint: 'http://192.168.5.60:29081/Seaie-api/canglan/recommend',
            backdropBlur: 1,
            tagTextColor: 'rgb(255,255,255)',
            itemIconColor: '#ffffff',
            backgroundType: 'color',
            backgroundColor: 'rgba(0,0,0,0)',
            tagBorderRadius: 14,
          },
          groupId: null,
        },
      ],
      groups: [],
      floatingModules: [
        {
          id: 'floating-module-1767761084553',
          type: 'floatingModule',
          title: 'chat对话',
          layout: {
            h: 0,
            i: 'floating-module-1767761084553',
            w: 0,
            x: 0,
            y: 0,
          },
          config: {
            icon: 'MessageOutlined',
            theme: 'auto',
            zIndex: 9999,
            closable: true,
            maxWidth: 800,
            microApp: {
              url: 'http://192.168.5.57:9998/chat',
              entry: 'http://192.168.5.57:9998/chat',
              moduleId: 'caf58685-6480-4b2c-95f2-efaa924359ad',
              systemId: 'c666d5f4-1b82-448c-9b81-0529a6da6cb7',
            },
            minWidth: 300,
            position: {
              x: 1809,
              y: 824,
            },
            draggable: true,
            maxHeight: 900,
            minHeight: 400,
            resizable: true,
            showTitle: true,
            isExpanded: false,
            showHeader: true,
            titleColor: '#222222',
            collapsible: true,
            contentType: 'microApp',
            borderRadius: 12,
            collapsedIcon: 'http://192.168.5.60:29081/canglan-trial/static/uploads/2026_01_27/181935_852535.gif',
            backgroundType: 'image',
            collapsedWidth: 64,
            collapsedHeight: 64,
            defaultPosition: 'bottom-right',
            backgroundRepeat: 'no-repeat',
            collapsedBgColor: 'rgba(22,119,255,0)',
            collapsedIconSize: 64,
          },
        },
      ],
      dashboardConfig: {
        title: '沧澜门户（极简）',
        backgroundType: 'image',
        backgroundColor: '#f5f5f5',
        backgroundImage: 'http://192.168.5.60:29081/canglan-trial/static/uploads/2026_01_26/113041_636364.png',
      },
      publishedAt: '2026-01-26 14:53:23',
    },
    pub_2: {
      id: '',
      title: '22',
      widgets: [
        {
          id: '86eac051-5285-48b5-8746-151616f31c1a',
          type: 'microApp',
          title: '表单',
          layout: {
            i: '86eac051-5285-48b5-8746-151616f31c1a',
            x: 12,
            y: 1,
            w: 8,
            h: 6,
            minW: 1,
            minH: 1,
          },
          config: {
            title: '表单',
            showTitle: true,
            refreshInterval: 60,
            systemId: 'db_001',
            moduleId: 'db_mod_001',
            microAppUrl: 'http://localhost:8083/#/input-only',
            microAppEntry: 'http://localhost:8083/#/input-only',
            sync: true,
            alive: true,
            icon: 'http://192.168.13.31:8083/static/images/gongan.png',
            forceIconOnly: false,
            eventRoutes: [],
            backgroundType: 'color',
            backgroundColor: 'rgba(255,255,255,0.20)',
            contentPadding: 44,
          },
        },
      ],
      groups: [],
      floatingModules: [],
      dashboardConfig: {
        backgroundType: 'image',
        backgroundColor: 'rgba(255,255,255,0.20)',
        backgroundImage: 'http://localhost:4001/uploads/1769589303012_x1rhzhyss.png',
        themeMode: 'light',
        styleMode: 'minimal',
        styleTokens: {
          widget: {
            background: 'rgba(255,255,255,0.20)',
            backdropFilter: 'blur(10px)',
            borderRadius: 12,
            borderColor: 'rgba(65,123,214,0.28)',
            borderWidth: 1,
            boxShadow: '0px 6px 12px 0px rgba(42,44,46,0.09)',
            titleColor: '#222',
            textColor: '#222',
          },
          card: {
            background: 'rgba(255,255,255,0.20)',
            backdropFilter: 'blur(10px)',
            borderRadius: 10,
            borderColor: 'rgba(255,255,255,0.20)',
            boxShadow: '0px 6px 12px 0px rgba(42,44,46,0.09)',
          },
        },
      },
    },
    pub_3: { id: '33',   publishedAt: '2026-01-01 16:58:02',},
    pub_4: {  id: '44',  publishedAt: '2026-01-01 16:58:02',},
    pub_5: {  id: '55',  publishedAt: '2026-01-01 16:58:02',},
    pub_6: {  id: '66',  publishedAt: '2026-01-01 16:58:02',},
    pub_7: {  id: '77',  publishedAt: '2026-01-01 16:58:02',},
    pub_8: {  id: '88',  publishedAt: '2026-01-01 16:58:02',},
    pub_9: {  id: '99',  publishedAt: '2026-01-01 16:58:02',},
    pub_10: {  id: '10',  publishedAt: '2026-01-01 16:58:02',},
    pub_11: {  id: '11',  publishedAt: '2026-01-01 16:58:02',},
  };

  Object.entries(seededDashboards).forEach(([key, value]) => {
    if (mockDashboards[key]) {
      return;
    }
    const now = new Date().toISOString();
    mockDashboards[key] = {
      ...value,
      status: value.status ?? 1,
      createdAt: value.createdAt || value.publishedAt || now,
      updatedAt: value.updatedAt || value.publishedAt || now,
      publishedAt: value.publishedAt || null,
      coverUrl: value.coverUrl || '',
    };
  });
  seedsInitialized = true;
};

const formatDashboardRecord = (dashboard, fallbackId) => {
  if (!dashboard) {
    return null;
  }
  const snapshot = {
    widgets: dashboard.widgets || [],
    groups: dashboard.groups || [],
    floatingModules: dashboard.floatingModules || [],
    dashboardConfig: dashboard.dashboardConfig || {},
  };
  return {
    id: dashboard.id || fallbackId,
    title: dashboard.title || '未命名工作台',
    publishTime: dashboard.publishedAt || '',
    status: dashboard.status ?? 1,
    dashboardConfig: JSON.stringify(snapshot),
    coverUrl: dashboard.coverUrl || '',
  };
};

/**
 * @api {post} /v1/dashboard/publish 发布工作台
 * @apiName publishDashboard
 * @apiGroup Dashboard
 *
 * @apiParam {Object} dashboard 工作台配置
 * @apiParam {Array} dashboard.widgets 组件列表
 * @apiParam {Array} dashboard.groups 分组列表
 * @apiParam {Object} dashboard.config 工作台配置(背景等)
 * @apiParam {String} dashboard.gridDensity 网格密度
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} message 消息
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} data.id 发布ID
 * @apiSuccess {String} data.publishTime 发布时间
 */
router.post('/v1/dashboard/publish', async (req, res) => {
  await req.sleep(0.5);

  try {
    const { id: bodyId, title, dashboardConfig, status, cover_url } = req.body || {};
    if (!dashboardConfig || typeof dashboardConfig !== 'string') {
      throw new Error('缺少 dashboardConfig 字符串');
    }
    let parsedSnapshot;
    try {
      parsedSnapshot = JSON.parse(dashboardConfig);
    } catch (err) {
      throw new Error('dashboardConfig 格式错误');
    }

    const normalizedStatus = Number(status) === 0 ? 0 : 1;
    const trimmedId = typeof bodyId === 'string' && bodyId.trim() ? bodyId.trim() : '';
    const existingRecord = trimmedId ? mockDashboards[trimmedId] : null;
    const id = trimmedId || `pub_${Date.now()}`;
    const now = new Date().toISOString();
    const createdAt = existingRecord?.createdAt || now;
    const publishedAt = normalizedStatus === 1 ? now : existingRecord?.publishedAt || null;

    // 保存到内存，便于 mock 接口读取
    mockDashboards[id] = {
      ...existingRecord,
      id,
      title: title || parsedSnapshot?.dashboardConfig?.title || '未命名工作台',
      widgets: parsedSnapshot?.widgets || [],
      groups: parsedSnapshot?.groups || [],
      floatingModules: parsedSnapshot?.floatingModules || [],
      dashboardConfig: parsedSnapshot?.dashboardConfig || {},
      status: normalizedStatus,
      coverUrl: cover_url || existingRecord?.coverUrl || '',
      createdAt,
      updatedAt: now,
      publishedAt,
    };

    console.log('[Mock] Dashboard published:', {
      id,
      title,
      widgetCount: parsedSnapshot?.widgets?.length || 0,
      groupCount: parsedSnapshot?.groups?.length || 0,
      status: normalizedStatus,
    });

    req.json.code = 20000;
    req.json.message = '发布成功';
    req.json.data = {
      id,
      publishTime: publishedAt,
      status: normalizedStatus,
      success: true,
      cover_url: cover_url || existingRecord?.coverUrl || '',
    };
  } catch (error) {
    req.json.code = 1;
    req.json.message = '发布失败: ' + error.message;
    req.json.data = { success: false };
  }

  res.json(req.json);
});

/**
 * @api {get} /v1/dashboard/publish/list 获取发布列表
 * @apiName getPublishList
 * @apiGroup Dashboard
 *
 * @apiParam {Number} page 当前页码
 * @apiParam {Number} pageSize 每页条数
 * @apiParam {String} [keyword] 搜索关键词
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 分页数据
 * @apiSuccess {Array} data.list 发布列表
 * @apiSuccess {Number} data.total 总条数
 * @apiSuccess {Number} data.page 当前页
 * @apiSuccess {Number} data.pageSize 每页条数
 */
router.get('/v1/dashboard/publish/list', async (req, res) => {
  await req.sleep(0.3);

  const { page = 1, page_size = 10, keyword = '' } = req.query;
  const currentPage = parseInt(page, 10);
  const currentPageSize = parseInt(page_size, 10);

  ensureSeededDashboards();

  const allRecords = Object.values(mockDashboards).map((record) => {
    const publishTime = record.status === 1 ? record.publishedAt || '' : '';
    const updatedAt = record.updatedAt || record.createdAt || record.publishedAt || '';
    return {
      id: record.id,
      title: record.title,
      publishTime,
      status: record.status ?? 0,
      componentCount: Array.isArray(record.widgets) ? record.widgets.length : 0,
      coverUrl: record.coverUrl || '',
      updatedAt,
    };
  });

  const keywordString = String(keyword || '').toLowerCase();
  const filteredData = keywordString
    ? allRecords.filter(
        (item) =>
          item.title.toLowerCase().includes(keywordString) ||
          item.id.toLowerCase().includes(keywordString)
      )
    : allRecords;

  const sortedData = filteredData.sort((a, b) => {
    const timeA = new Date(a.updatedAt || '').getTime();
    const timeB = new Date(b.updatedAt || '').getTime();
    return timeB - timeA;
  });

  const total = sortedData.length;
  const startIndex = (currentPage - 1) * currentPageSize;
  const endIndex = startIndex + currentPageSize;
  const list = sortedData.slice(startIndex, endIndex).map((item) => ({
    id: item.id,
    title: item.title,
    publishTime: item.publishTime,
    status: item.status,
    componentCount: item.componentCount,
    coverUrl: item.coverUrl,
  }));

  req.json.code = 20000;
  req.json.message = '获取成功';
  req.json.data = {
    list,
    total:  100,
    page: currentPage,
    page_size: currentPageSize,
  };

  res.json(req.json);
});

/**
 * @api {get} /v1/dashboard/publish/:id 获取发布的工作台详情
 * @apiName getPublishedDashboard
 * @apiGroup Dashboard
 *
 * @apiParam {String} id 发布ID
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 工作台数据
 * @apiSuccess {Array} data.widgets 组件列表
 * @apiSuccess {Array} data.groups 分组列表
 * @apiSuccess {Array} data.floatingModules 悬浮模块列表
 * @apiSuccess {Object} data.dashboardConfig 工作台配置
 */
router.get('/v1/dashboard/publish', async (req, res) => {
  await req.sleep(0.3);

  const { id } = req.query;

  ensureSeededDashboards();

  if (!id) {
    req.json.code = 1;
    req.json.message = '????: id';
    req.json.data = null;
    res.json(req.json);
    return;
  }

  const dashboard = mockDashboards[id];

  if (dashboard) {
    const record = formatDashboardRecord(dashboard, id);
    req.json.code = 20000;
    req.json.message = '????';
    req.json.data = record;
  } else {
    req.json.code = 404;
    req.json.message = '??????';
    req.json.data = null;
  }

  res.json(req.json);
});

router.post('/v1/dashboard/publish/delete', async (req, res) => {
  await req.sleep(0.3);

  const { id } = req.body;

  if (!id) {
    req.json.code = 1;
    req.json.message = '缺少参数: id';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  console.log('[Mock] Dashboard deleted:', id);

  req.json.code = 20000;
  req.json.message = '删除成功';
  req.json.data = { success: true };

  res.json(req.json);
});

// 暂存数据存储（按 user_id 存储，模拟每个用户一份暂存数据）
const configurationJsonStorage = {};

/**
 * @api {post} /v1/dashboard/home/configuration-json 暂存工作台配置
 * @apiName saveConfigurationJson
 * @apiGroup Dashboard
 *
 * @apiParam {String} json_str JSON字符串格式的配置数据
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} data.id 暂存记录ID
 */
router.post('/v1/dashboard/home/configuration-json', async (req, res) => {
  await req.sleep(0.3);

  try {
    const { json_str } = req.body || {};

    if (!json_str) {
      throw new Error('缺少参数: json_str');
    }

    // 保持原始字符串形态，便于与后端对齐
    const jsonString = typeof json_str === 'string' ? json_str : JSON.stringify(json_str);

    // 解析 json_str 验证格式
    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonString);
    } catch (err) {
      throw new Error('json_str 格式错误，无法解析为 JSON');
    }

    // 模拟获取当前用户ID（实际应从 token 中获取）
    const userId = 'user_001';
    const now = new Date().toISOString();

    // 检查是否已存在暂存数据
    const existingData = configurationJsonStorage[userId];
    const id = existingData?.id || 'config_' + Date.now();

    // 保存或更新暂存数据
    configurationJsonStorage[userId] = {
      id,
      user_id: userId,
      json_str: jsonString,
      created_time: existingData?.created_time || now,
      update_time: now,
    };

    console.log('[Mock] Configuration JSON saved:', {
      id,
      userId,
      dataKeys: Object.keys(parsedJson),
    });

    req.json.code = 20000;
    req.json.message = '暂存成功';
    req.json.data = { id };
  } catch (error) {
    req.json.code = 1;
    req.json.message = '暂存失败: ' + error.message;
    req.json.data = null;
  }

  res.json(req.json);
});

/**
 * @api {get} /v1/dashboard/home/configuration-json 获取暂存的工作台配置
 * @apiName getConfigurationJson
 * @apiGroup Dashboard
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 暂存数据
 * @apiSuccess {String} data.id 暂存记录ID
 * @apiSuccess {String} data.user_id 用户ID
 * @apiSuccess {Object} data.json_str 配置数据对象
 * @apiSuccess {String} data.created_time 创建时间
 * @apiSuccess {String} data.update_time 更新时间
 */
router.get('/v1/dashboard/home/configuration-json', async (req, res) => {
  await req.sleep(0.3);

  // 模拟获取当前用户ID（实际应从 token 中获取）
  const userId = 'user_001';

  const data = configurationJsonStorage[userId];

  if (data) {
    req.json.code = 20000;
    req.json.message = '获取成功';
    req.json.data = data;
  } else {
    req.json.code = 20000;
    req.json.message = '暂无暂存数据';
    req.json.data = null;
  }

  res.json(req.json);
});

module.exports = router;
