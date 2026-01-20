const express = require('express');
const router = express.Router();

/**
 * @api {post} /v1/dashboard/publish 发布仪表盘
 * @apiName publishDashboard
 * @apiGroup Dashboard
 *
 * @apiParam {Object} dashboard 仪表盘配置
 * @apiParam {Array} dashboard.widgets 组件列表
 * @apiParam {Array} dashboard.groups 分组列表
 * @apiParam {Object} dashboard.config 仪表盘配置(背景等)
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
    const dashboardData = req.body;

    // 模拟保存发布数据
    const id = 'pub_' + Date.now();
    const publishTime = new Date().toISOString();

    // 这里可以将数据保存到文件或数据库
    console.log('[Mock] Dashboard published:', {
      id,
      widgetCount: dashboardData.widgets?.length || 0,
      groupCount: dashboardData.groups?.length || 0,
    });

    req.json.code = 0;
    req.json.message = '发布成功';
    req.json.data = {
      id,
      publishTime,
      success: true,
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

  // 模拟数据
  const allData = [
    { id: 'pub_1', title: '默认仪表盘', publishTime: '2025-12-01T10:00:00.000Z' },
    { id: 'pub_2', title: '数据监控面板', publishTime: '2025-12-05T14:30:00.000Z' },
    { id: 'pub_3', title: '运维监控大屏', publishTime: '2025-12-08T09:15:00.000Z' },
    { id: 'pub_4', title: '销售数据看板', publishTime: '2025-12-09T11:20:00.000Z' },
    { id: 'pub_5', title: '用户行为分析', publishTime: '2025-12-10T08:45:00.000Z' },
    { id: 'pub_6', title: '系统性能监控', publishTime: '2025-12-10T14:00:00.000Z' },
    { id: 'pub_7', title: '财务报表大屏', publishTime: '2025-12-10T16:30:00.000Z' },
    { id: 'pub_8', title: '库存管理看板', publishTime: '2025-12-11T09:00:00.000Z' },
  ];

  // 关键词过滤
  let filteredData = allData;
  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    filteredData = allData.filter(item =>
      item.title.toLowerCase().includes(lowerKeyword) ||
      item.id.toLowerCase().includes(lowerKeyword)
    );
  }

  // 分页
  const total = filteredData.length;
  const startIndex = (currentPage - 1) * currentPageSize;
  const endIndex = startIndex + currentPageSize;
  const list = filteredData.slice(startIndex, endIndex);

  req.json.code = 20000;
  req.json.message = '获取成功';
  req.json.data = {
    list,
    total,
    page: currentPage,
    page_size: currentPageSize,
  };

  res.json(req.json);
});

/**
 * @api {get} /v1/dashboard/publish/:id 获取发布的仪表盘详情
 * @apiName getPublishedDashboard
 * @apiGroup Dashboard
 *
 * @apiParam {String} id 发布ID
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 仪表盘数据
 * @apiSuccess {Array} data.widgets 组件列表
 * @apiSuccess {Array} data.groups 分组列表
 * @apiSuccess {Array} data.floatingModules 悬浮模块列表
 * @apiSuccess {Object} data.dashboardConfig 仪表盘配置
 */
router.get('/v1/dashboard/publish', async (req, res) => {
  await req.sleep(0.3);

  const { id } = req.query;

  // 模拟数据 - 实际应从数据库获取
  const mockDashboards = {
    canglan: {
      "id": "f15a8606-3b1d-4a54-bc5b-4e60076338fe",
      "title": "苍蓝测试",
      "widgets": [
        {
          "id": "95fd71a9-9dfd-423e-a938-1bd3fffdee4a",
          "type": "headerBar",
          "title": "头部栏",
          "layout": {
            "h": 2,
            "i": "95fd71a9-9dfd-423e-a938-1bd3fffdee4a",
            "w": 36,
            "x": 0,
            "y": 0,
            "minH": 1,
            "minW": 1
          },
          "config": {
            "title": "头部栏",
            "showTitle": false,
            "textColor": "#022eff",
            "fontFamily": "YouSheBiaoTiHei",
            "headerTitle": "“沧澜”垂域新质生产力引擎",
            "backdropBlur": 20,
            "backgroundType": "color",
            "backgroundColor": "rgba(255,255,255,0.2)",
            "headerAlignment": "left",
            "showUserProfile": true,
            "showThemeSwitcher": true
          },
          "groupId": null
        },
        {
          "id": "ec0c8b62-c8a8-4abe-aece-447a7136137c",
          "type": "typography",
          "title": "文本组件",
          "layout": {
            "h": 4,
            "i": "ec0c8b62-c8a8-4abe-aece-447a7136137c",
            "w": 12,
            "x": 11,
            "y": 2,
            "minH": 1,
            "minW": 2
          },
          "config": {
            "title": "文本组件",
            "content": "沧澜，你的超级工作助手",
            "fontSize": 44,
            "showTitle": false,
            "textAlign": "center",
            "fontWeight": "bold",
            "backdropBlur": 0,
            "backgroundType": "color",
            "backgroundColor": "rgba(0,0,0,0)"
          },
          "groupId": null
        },
        {
          "id": "bb91e865-b799-4034-b60b-83d5a415e921",
          "type": "microApp",
          "title": "门户对话框",
          "layout": {
            "h": 5,
            "i": "bb91e865-b799-4034-b60b-83d5a415e921",
            "w": 17,
            "x": 9,
            "y": 7,
            "minH": 1,
            "minW": 1
          },
          "config": {
            "icon": "AppstoreOutlined",
            "sync": true,
            "alive": true,
            "title": "门户对话框",
            "moduleId": "7670dd74-b3a1-42a8-aaa0-7facaf8e46ff",
            "systemId": "c666d5f4-1b82-448c-9b81-0529a6da6cb7",
            "showTitle": false,
            "eventRoutes": [],
            "microAppUrl": "http://192.168.5.57:9998/ChatInput",
            "forceIconOnly": false,
            "microAppEntry": "http://192.168.5.57:9998/ChatInput",
            "backgroundType": "color",
            "backgroundColor": "#ff000000",
            "refreshInterval": 60
          },
          "groupId": null
        },
        {
          "id": "b1dbac8f-bdb0-4a26-82d7-d63533b38c3d",
          "type": "topList",
          "title": "融合布控任务管理",
          "layout": {
            "h": 8,
            "i": "b1dbac8f-bdb0-4a26-82d7-d63533b38c3d",
            "w": 5,
            "x": 4,
            "y": 14,
            "minH": 4,
            "minW": 3
          },
          "config": {
            "title": "TopList",
            "showTitle": true,
            "backdropBlur": 10,
            "backgroundType": "color",
            "backgroundColor": "rgba(255,255,255,0.2)",
            "refreshInterval": 60
          },
          "groupId": "group-1768812407721"
        },
        {
          "id": "ae25a0e0-cdf8-4a19-8ccf-5b42b0e67bb1",
          "type": "news",
          "title": "今日重点人员预警",
          "layout": {
            "h": 8,
            "i": "ae25a0e0-cdf8-4a19-8ccf-5b42b0e67bb1",
            "w": 6,
            "x": 10,
            "y": 14,
            "minH": 4,
            "minW": 4
          },
          "config": {
            "title": "News",
            "showTitle": true,
            "backdropBlur": 10,
            "backgroundType": "color",
            "backgroundColor": "rgba(255,255,255,0.2)",
            "refreshInterval": 60
          },
          "groupId": "group-1768812407721"
        },
        {
          "id": "7bc9f880-ad4f-40d9-9829-8a03bf2dbca4",
          "type": "navGroup",
          "title": "政务专题应用",
          "layout": {
            "h": 9,
            "i": "7bc9f880-ad4f-40d9-9829-8a03bf2dbca4",
            "w": 7,
            "x": 24,
            "y": 14,
            "minH": 4,
            "minW": 4
          },
          "config": {
            "title": "导航组",
            "layout": "grid",
            "columns": 4,
            "itemGap": 12,
            "iconSize": 32,
            "showLabel": true,
            "showTitle": true,
            "backdropBlur": 10,
            "itemIconColor": "#ffffff",
            "backgroundType": "color",
            "backgroundColor": "rgba(255,255,255,0.2)"
          },
          "groupId": "group-1768812407721"
        },
        {
          "id": "eae789ff-2f2b-46a8-9b43-2e5e3f8d4dde",
          "type": "search",
          "title": "车辆档案查询",
          "layout": {
            "h": 4,
            "i": "eae789ff-2f2b-46a8-9b43-2e5e3f8d4dde",
            "w": 6,
            "x": 17,
            "y": 14,
            "minH": 2,
            "minW": 4
          },
          "config": {
            "title": "Search",
            "showTitle": true,
            "backdropBlur": 10,
            "backgroundType": "color",
            "backgroundColor": "rgba(255,255,255,0.2)"
          },
          "groupId": "group-1768812407721"
        },
        {
          "id": "9cc4fe6a-a534-4eb7-b672-46f3ecab99cc",
          "type": "search",
          "title": "车辆轨迹查询",
          "layout": {
            "h": 4,
            "i": "9cc4fe6a-a534-4eb7-b672-46f3ecab99cc",
            "w": 6,
            "x": 17,
            "y": 18,
            "minH": 2,
            "minW": 4
          },
          "config": {
            "title": "Search",
            "showTitle": true,
            "backdropBlur": 10,
            "backgroundType": "color",
            "backgroundColor": "rgba(255,255,255,0.2)"
          },
          "groupId": "group-1768812407721"
        }
      ],
      "groups": [
        {
          "id": "group-1768812407721",
          "title": "收藏",
          "widgetIds": [
            "b1dbac8f-bdb0-4a26-82d7-d63533b38c3d",
            "ae25a0e0-cdf8-4a19-8ccf-5b42b0e67bb1",
            "eae789ff-2f2b-46a8-9b43-2e5e3f8d4dde",
            "7bc9f880-ad4f-40d9-9829-8a03bf2dbca4",
            "9cc4fe6a-a534-4eb7-b672-46f3ecab99cc"
          ],
          "layout": {
            "h": 19,
            "i": "group-1768812407721",
            "w": 27,
            "x": 4,
            "y": 12,
            "minH": 2,
            "minW": 2
          },
          "config": {
            "showTitle": true,
            "titleFontSize": 16,
            "titleFontWeight": 600,
            "backgroundType": "color",
            "backgroundColor": "rgba(255,255,255,0.2)",
            "borderStyle": "none",
            "borderRadius": 8
          }
        }
      ],
      "floatingModules": [],
      "dashboardConfig": {
        "backgroundType": "image",
        "backgroundColor": "#f5f5f5",
        "backgroundImage": "http://192.168.5.60:29081/canglan-trial/static/uploads/2026_01_19/164434_515002.png"
      },
      "publishedAt": "2026-01-19 16:58:02"
    },
    pub_1: {
      id: 'pub_1',
      title: '默认仪表盘',
      publishTime: '2025-12-01T10:00:00.000Z',
      widgets: [
        {
          id: 'widget-1',
          type: 'clock',
          layout: { x: 0, y: 0, w: 3, h: 2 },
          config: { title: '时钟', showTitle: true },
        },
        {
          id: 'widget-2',
          type: 'stats',
          layout: { x: 3, y: 0, w: 3, h: 2 },
          config: { title: '统计', showTitle: true },
        },
      ],
      groups: [],
      floatingModules: [],
      dashboardConfig: {
        backgroundType: 'color',
        backgroundColor: '#f0f2f5',
      },
    },
    pub_2: {
      id: 'pub_2',
      title: '数据监控面板',
      publishTime: '2025-12-05T14:30:00.000Z',
      widgets: [
        {
          id: 'widget-1',
          type: 'chart',
          layout: { x: 0, y: 0, w: 6, h: 3 },
          config: { title: '数据图表', showTitle: true },
        },
      ],
      groups: [],
      floatingModules: [],
      dashboardConfig: {
        backgroundType: 'gradient',
        backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
    },
  };

  const dashboard = mockDashboards[id];

  if (dashboard) {
    req.json.code = 0;
    req.json.message = '获取成功';
    req.json.data = dashboard;
  } else {
    req.json.code = 404;
    req.json.message = '仪表盘不存在';
    req.json.data = null;
  }

  res.json(req.json);
});

/**
 * @api {post} /v1/dashboard/publish/delete 删除已发布的仪表盘
 * @apiName deletePublishedDashboard
 * @apiGroup Dashboard
 *
 * @apiParam {String} id 发布ID
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 删除结果
 */
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

module.exports = router;
