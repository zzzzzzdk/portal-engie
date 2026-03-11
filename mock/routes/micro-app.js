var express = require("express");
var router = express.Router();
var multer = require('multer');

// 配置 multer 使用内存存储（JSON 文件不需要持久化）
const configUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制 5MB
  },
  fileFilter: (req, file, cb) => {
    // 只允许 JSON 文件
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 JSON 文件'), false);
    }
  }
});

// 临时存储导出内容，模拟下载链接
const exportConfigDownloads = new Map();

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
                name: '数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交数据提交',
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

/**
 * @api {post} /v1/micro_apps/import_config 导入微应用配置
 * @apiName importConfig
 * @apiGroup MicroApp
 *
 * @apiParam {File} file JSON 配置文件
 */
router.post('/v1/micro_apps/import_config', configUpload.single('file'), async (req, res) => {
  try {
    await req.sleep(0.3);

    if (!req.file) {
      req.json.code = 1;
      req.json.message = '请选择要导入的配置文件';
      req.json.data = { success: false };
      return res.json(req.json);
    }

    let configData;
    try {
      const fileContent = req.file.buffer.toString('utf-8');
      configData = JSON.parse(fileContent);
    } catch (error) {
      req.json.code = 1;
      req.json.message = 'JSON 文件格式不正确';
      req.json.data = { success: false };
      return res.json(req.json);
    }

    if (!configData.apps || !Array.isArray(configData.apps)) {
      req.json.code = 1;
      req.json.message = '配置文件结构不正确，缺少 apps 数组';
      req.json.data = { success: false };
      return res.json(req.json);
    }

    const appCount = configData.apps.length;
    const moduleCount = configData.apps.reduce((sum, app) => {
      return sum + (Array.isArray(app.modules) ? app.modules.length : 0);
    }, 0);

    console.log('[Mock] Config imported:', {
      version: configData.version,
      appCount,
      moduleCount,
      filename: req.file.originalname,
    });

    req.json.code = 20000;
    req.json.message = '导入成功';
    req.json.data = {
      success: true,
      version: configData.version || '1.0.0',
      appCount,
      moduleCount,
      importedAt: new Date().toISOString(),
    };

    res.json(req.json);
  } catch (error) {
    req.json.code = 1;
    req.json.message = '导入失败: ' + error.message;
    req.json.data = { success: false };
    res.json(req.json);
  }
});

/**
 * @api {get} /v1/micro_apps/export_config 导出微应用配置
 * @apiName exportConfig
 * @apiGroup MicroApp
 *
 * @apiSuccess {Object} data 返回下载链接
 */
router.get('/v1/micro_apps/export_config', async (req, res) => {
  await req.sleep(0.3);

  const exportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
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
                description: '提交融合数据到其他系统',
              }
            ]
          }
        ]
      },
      {
        id: 'db_002',
        systemId: 'system-finance',
        name: '接收方',
        description: '接收数据进行操作',
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
                description: '接收数据提交事件',
              }
            ]
          }
        ]
      }
    ]
  };

  const content = JSON.stringify(exportData, null, 2);
  const downloadId = `export_${Math.random().toString(36).slice(2, 10)}`;
  exportConfigDownloads.set(downloadId, content);

  setTimeout(() => {
    exportConfigDownloads.delete(downloadId);
  }, 5 * 60 * 1000);

  const protocol = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host');
  const downloadUrl = `${protocol}://${host}/v1/download/${downloadId}`;

  req.json.code = 20000;
  req.json.message = '请求成功';
  req.json.data = {
    download_url: downloadUrl,
  };

  console.log('[Mock] Config export prepared:', { downloadId, appCount: exportData.apps.length, downloadUrl });

  res.json(req.json);
});

router.get('/v1/download/:downloadId', async (req, res) => {
  await req.sleep(0.1);
  const rawId = req.params.downloadId || '';
  const normalizedId = rawId.replace(/\.json$/i, '');
  const content = exportConfigDownloads.get(normalizedId);

  if (!content) {
    return res.status(404).json({
      code: 1,
      message: '下载链接已失效或不存在',
      data: null,
    });
  }

  const filename = `${normalizedId}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(content);
});

module.exports = router;
