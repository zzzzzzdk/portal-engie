var express = require("express");
var router = express.Router();

/**
 * @api {get} /v1/micro_apps/list 获取微应用列表
 * @apiName getMicroAppList
 * @apiGroup MicroApp
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 微应用配置数据
 */
router.get('/v1/micro_apps/list', async (req, res) => {
  await req.sleep(0.3);

  req.json.code = 20000;
  req.json.message = '获取成功';
  req.json.data = {
    version: '1.0.0',
    apps: [
      {
        id: 'db_001',
        systemId: 'system-fusion',
        name: '表单组件',
        description: '提交融合数据到其他系统',
        icon: 'UserOutlined',
        category: '融合',
        modules: [
          {
            id: 'db_mod_001',
            moduleId: 'input-only',
            name: '表单',
            description: '输入框',
            url: 'http://localhost:8083/#/input-only',
            entry: 'http://localhost:8083/#/input-only',
            icon: 'http://192.168.13.31:8083/static/images/gongan.png',
            defaultSize: { w: 6, h: 4 },
            emittableEvents: [
              {
                id: 'db_evt_001',
                type: 'data:submit:input-only',
                name: '数据提交',
                description: '提交融合数据到其他系统'
              }
            ]
          }
        ]
      },
      {
        id: 'db_002',
        systemId: 'system-finance',
        name: '接收方',
        description: '接受数据进行操作',
        icon: 'AccountBookOutlined',
        category: '结果',
        modules: [
          {
            id: 'db_mod_002',
            moduleId: 'table-only',
            name: '结果页',
            description: '结果页',
            url: 'http://192.168.13.31:8083/#/table-only',
            entry: 'http://192.168.13.31:8083/',
            icon: 'https://via.placeholder.com/300x200/FF9800/FFFFFF?text=财务报表',
            defaultSize: { w: 6, h: 6 },
            listenableEvents: [
              {
                id: 'db_evt_002',
                type: 'data:submit:table-only',
                name: '数据提交',
                description: '接收数据提交事件'
              }
            ]
          }
        ]
      }
    ]
  };

  res.json(req.json);
});

/**
 * @api {post} /v1/micro_apps/app-save 保存/编辑应用
 * @apiName saveApp
 * @apiGroup MicroApp
 *
 * @apiParam {String} [id] 数据库ID（编辑时必填）
 * @apiParam {String} systemId 系统标识符（用户输入）
 * @apiParam {String} name 应用名称
 * @apiParam {String} [description] 应用描述
 * @apiParam {String} [icon] 应用图标
 * @apiParam {String} category 应用分类
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 保存结果
 */
router.post('/v1/micro_apps/app-save', async (req, res) => {
  await req.sleep(0.3);

  const { id, systemId, name, description, icon, category } = req.body;

  if (!systemId) {
    req.json.code = 1;
    req.json.message = '系统ID不能为空';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  if (!name) {
    req.json.code = 1;
    req.json.message = '应用名称不能为空';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  if (!category) {
    req.json.code = 1;
    req.json.message = '应用分类不能为空';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  const newId = id || `app_${Date.now()}`;
  console.log('[Mock] App saved:', { id: newId, systemId, name, category });

  req.json.code = 20000;
  req.json.message = id ? '编辑成功' : '新增成功';
  req.json.data = {
    success: true,
    id: newId,
    systemId: systemId
  };

  res.json(req.json);
});

/**
 * @api {post} /v1/micro_apps/module-save 保存/编辑模块
 * @apiName saveModule
 * @apiGroup MicroApp
 *
 * @apiParam {String} [id] 数据库ID（编辑时必填）
 * @apiParam {String} moduleId 模块标识符（用户输入）
 * @apiParam {String} systemId 所属系统ID
 * @apiParam {String} name 模块名称
 * @apiParam {String} [description] 模块描述
 * @apiParam {String} url 模块URL
 * @apiParam {String} entry 模块入口
 * @apiParam {String} [icon] 模块图标
 * @apiParam {Object} [defaultSize] 默认尺寸
 * @apiParam {Boolean} [forceIconOnly] 是否强制图标模式
 * @apiParam {String} [iconSvg] SVG图标
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 保存结果
 */
router.post('/v1/micro_apps/module-save', async (req, res) => {
  await req.sleep(0.3);

  const { id, moduleId, systemId, name, url, entry } = req.body;

  if (!moduleId) {
    req.json.code = 1;
    req.json.message = '模块ID不能为空';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  if (!systemId) {
    req.json.code = 1;
    req.json.message = '所属系统不能为空';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  if (!name) {
    req.json.code = 1;
    req.json.message = '模块名称不能为空';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  if (!url || !entry) {
    req.json.code = 1;
    req.json.message = 'URL和入口地址不能为空';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  const newId = id || `module_${Date.now()}`;
  console.log('[Mock] Module saved:', { id: newId, moduleId, systemId, name });

  req.json.code = 20000;
  req.json.message = id ? '编辑成功' : '新增成功';
  req.json.data = {
    success: true,
    id: newId,
    moduleId: moduleId
  };

  res.json(req.json);
});

/**
 * @api {post} /v1/micro_apps/event-save 保存/编辑事件
 * @apiName saveEvent
 * @apiGroup MicroApp
 *
 * @apiParam {String} [id] 数据库ID（编辑时必填）
 * @apiParam {String} moduleId 所属模块ID
 * @apiParam {String} event_type 事件类型（emittableEvents/listenableEvents）
 * @apiParam {String} type 事件标识
 * @apiParam {String} name 事件名称
 * @apiParam {String} [description] 事件描述
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 保存结果
 */
router.post('/v1/micro_apps/event-save', async (req, res) => {
  await req.sleep(0.3);

  const { id, moduleId, event_type, type, name } = req.body;

  if (!moduleId) {
    req.json.code = 1;
    req.json.message = '所属模块不能为空';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  if (!event_type || !['emittableEvents', 'listenableEvents'].includes(event_type)) {
    req.json.code = 1;
    req.json.message = '事件类型不正确';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  if (!type || !name) {
    req.json.code = 1;
    req.json.message = '事件标识和名称不能为空';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  const newId = id || `event_${Date.now()}`;
  console.log('[Mock] Event saved:', { id: newId, moduleId, event_type, type, name });

  req.json.code = 20000;
  req.json.message = id ? '编辑成功' : '新增成功';
  req.json.data = {
    success: true,
    id: newId
  };

  res.json(req.json);
});

/**
 * @api {post} /v1/micro_apps/delete 删除应用/模块/事件
 * @apiName deleteMicroAppItem
 * @apiGroup MicroApp
 *
 * @apiParam {String} id 要删除的ID
 * @apiParam {String} type 类型（app/module/event）
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {Object} data 删除结果
 */
router.post('/v1/micro_apps/delete', async (req, res) => {
  await req.sleep(0.3);

  const { id, type } = req.body;

  if (!id) {
    req.json.code = 1;
    req.json.message = '删除ID不能为空';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  if (!type || !['app', 'module', 'event'].includes(type)) {
    req.json.code = 1;
    req.json.message = '删除类型不正确，必须是 app/module/event';
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  const typeNames = {
    app: '应用',
    module: '模块',
    event: '事件'
  };

  console.log(`[Mock] ${typeNames[type]} deleted:`, id);

  req.json.code = 20000;
  req.json.message = `${typeNames[type]}删除成功`;
  req.json.data = { success: true };

  res.json(req.json);
});

module.exports = router;
