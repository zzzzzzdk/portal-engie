var express = require("express");
var router = express.Router();
const { Random, mock } = require("mockjs");

/* GET home page. */
router.get("/", function (req, res, next) {
  res.render("index", {
    title: "pc_demo mock 数据",
  });
});

/**
 * @api {get} ---- 系统公共事项
 * @apiName common1
 * @apiGroup common
 *
 * @apiDescription
 * 1、iam中的配置target_url如下：http://192.168.5.37/#/，具体跳转到那个页面，前端会根据用户菜单权限中的第一个来控制跳转。
 * 2、部署页面时需要修改 index.html和front.html中的 baseApi、baseApi2。
 *
 * @apiHeader {String} Authorization  登陆认证token
 *
 * @apiError  {String} message  错误信息
 * @apiError  {Number} status  状态码 <code>401未登录、5xx服务器错误、4xx客户端错误</code>
 *
 */

/**
 * @api {get} /sys_config 获取系统配置信息-白名单
 * @apiName common2
 * @apiUse APICommon
 * @apiGroup common
 *
 * @apiSuccess {Object} data  返回信息
 * @apiSuccess {String} data.title  系统title
 * @apiSuccess {String} data.login_url iam登录地址
 * @apiSuccess {String} data.logout_url iam退出地址
 * @apiSuccess {String} data.d_color 系统默认主题 <code>light 白色主题 、 dark 黑色主题</code>
 * @apiSuccess {String} data.d_layout 系统默认布局方式 <code>vertical 纵向布局 、 horizontal 横向布局</code>
 * @apiSuccess {String} data.help_url 帮助文档地址
 * @apiSuccess {String} data.manage_url iam后台地址
 * @apiSuccess {String} data.chrome_url=/uploads/chrome.zip 谷歌浏览器下载地址
 * @apiSuccess {String} data.post_error=/post_error 系统错误上传接口
 * @apiSuccess {String} data.water_mark  是否显示水印
 * @apiSuccess {String} data.province  省份
 */
router.get("/v1/common/get-sysconfig", function (req, res, next) {
  // req.json.data = '1651c1y+LEUOHurir0zxsERiUMvT9m07aHhZtxyRDhMk' +
  // 'G6FQdX6Kyda7NQr/vkHuowPGe1QDLMYK+32Be/TUpyM/WUNYwwvUwow' +
  // 'C6kLioMDZGFwaCkXam7JoftOkDK1UqzzvkFzdwvE1JH/EvmC6vNIK0hzo' +
  // 'uDiCebSRUtRgt160D67yi0S3aRLJB+a5/8NJwGiO8ss5G/w1ywVNZOWdXd+' +
  // 'LiZYQIV/IZ0ILnXAN84hsppW8NCmnwXsPJyR1pOjk8rbBxCLwRB0VTWRmxyAX' +
  // 'tR10cV5xl/lz8G8/L1iReitusJIRh5G5fAngE3u0DSo7Kx4gi9z/8/1OY+SUb' +
  // 'cCPrl6h8NOtE4gtUPnkyHb6kt7Fz8SgzLoC3t2qCeTY7zVSHtZO11l9A3dG8mC' +
  // 'emg15hUUFYl1CS8FLlYA+pDMTdIPyE1oYeV4M+E7z0WQ5v0+6fSTkJjaOkaVYPH' +
  // 'DaX1bBq7rJonyqU909d98t11FTjz7GSVkBoEnoDGG85UIPy7uE2BIUr6JXe/LmSviafO8agg=='

  req.json.data = {


    water_mark: true,
    login_url: "./login.html?",
    logout_url: "./login.html?",
    "sys_text": "沧澜门户-微前端",
    "api_host": "http://192.168.5.60:29081",
    "iamUrl": "http://192.168.11.12:80/main.html",
    // "login_url": "http://192.168.11.12:80/#/login?apply=50a79e81-2b86-159c-2757-fd5b138bf333",
    // "logout_url": "http://192.168.11.12:80/#/logout?apply=50a79e81-2b86-159c-2757-fd5b138bf333",
    "editPasswordUrl": "http://192.168.11.12:80/#/personalcenter?type=1&model=1",
    "waterMark": false,
    "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApuRHyeBATfR3urZrGDpA\naeozcnQaXmDbQKJhj4tWEvXT6IzdrFd5ZOR2vplKIfKMpDDtBn+/sR6FtGiEsFvM\ncS7gVfaPa6dI466WkCuVtaTeUkg+4u3jF8dhRDvKfXgo67auLAvhO/jy4jfBwBHd\nDdjezNmMwQRrBGNOaK3JwlXQeB9QKagSDdyZzMu7523uviTs2CNjUZ7aMavomEkU\n2vIIPXprcaEcPwb9Btmu6cuAIvRVDPPPJj32kfoSXX773Lxx7HazKWVD/lL/5nq9\n/zAGJL+uk9lP2z6BYr25xdC64vfK04oTdWpMqIiC5HCHRfRAL5c0pY0YJ7V8xhFO\nawIDAQAB\n-----END PUBLIC KEY-----",
    map: {
      map_crs: 3857,
      center: [120.205252, 35.965781],
      zoom: 11,
      tile_templates: {
        default: "http://192.168.7.206:25003/v3/tile?z={z}&x={x}&y={y}",
        default_text: "",
        image: "http://192.168.7.203:25003/v3/tile?z={z}&x={x}&y={y}",
        image_text: "",
        sea: "http://192.168.7.203:25001/v3/tile?z={z}&x={y}&y={x}",
        sea_text: "",
      },
      tile_options: {
        default: {
          minZoom: 6,
          maxZoom: 18,
        },
        image: {
          minZoom: 6,
          maxZoom: 18,
        },
        sea: {
          minZoom: 6,
          maxZoom: 18,
        },
      },
    },
  };

  res.json(req.json);
});

/**
 * @api {post} /get_user_info 获取用户信息
 * @apiName common3
 * @apiUse APICommon
 * @apiGroup common
 *
 * @apiSuccess {Object} data  返回信息
 * @apiSuccess {String} data.color 系统主题  <code>light 白色主题 、 dark 黑色主题</code>
 * @apiSuccess {String} data.layout  系统布局方式  <code>vertical 纵向布局 、 horizontal 横向布局</code>
 * @apiSuccess {Object} data.user_info 用户信息
 * @apiSuccess {String} data.user_info.user_uuid 用户id
 * @apiSuccess {String} data.user_info.user_name 用户名称
 * @apiSuccess {String} data.user_info.account   用户账号
 * @apiSuccess {String[]} data.user_info.role    用户角色
 * @apiSuccess {String[]} data.user_info.phone_number  用户手机号
 * @apiSuccess {Object[]} data.menus 菜单
 * @apiSuccess {String} data.menus.title 菜单名称
 * @apiSuccess {String} data.menus.icon 字体图标
 * @apiSuccess {String} data.menus.path 菜单路径
 * @apiSuccess {Object[]} data.menus.children 子菜单
 * @apiSuccess {String[]} data.route 页面权限
 */
router.all("/v1/user/info", async function (req, res, next) {
  await req.sleep(0);

  req.json.data = {
    color: "light", // light    dark
    layout: "horizontal", // vertical     horizontal
    user_info: {
      user_uuid: 1234,
      user_name: "张三",
      account: "admin",
      phone_number: "12345678901",
      organization_uuid: "1",
      role: ["管理员"],
    },
    menus: [
      {
        title: "首页",
        icon: "fill_shouye",
        path: "/home",
      },
      {
        title: "工作台",
        icon: "fill_shouye",
        path: "/data-board",
      },
      {
        title: "样本管理",
        icon: "fill_yangbenguanli",
        children: [
          {
            title: "素材库",
            path: "/material-library",
          },
        ],
      },

      {
        title: "工作台",
        icon: "fill_gongzuotai",
        children: [
          {
            title: "算法市场",
            path: "/algorithm-list",
          },
          {
            title: "我的算法",
            path: "/my-algorithm",
          },
          {
            title: "申请列表",
            path: "/apply-list",
          },
          {
            title: "审批列表",
            path: "/approval-list",
          },
          {
            title: "算法组合",
            path: "/algorithm-composition",
          },
        ],
      },
      {
        title: "模型管理",
        icon: "fill_moxingguanli",
        children: [
          { title: "视频资源", path: "/video-resources" },
          { title: "在线资源", path: "/online-source" },
          { title: "离线数据", path: "/offline-source" },
          { title: "算力资源", path: "/power-source" },
        ],
      },
      {
        title: "部署管理",
        icon: "fill_bushuguanli",
        id: 3,
        children: [
          {
            title: "监测任务",
            // icon: "jiance",
            path: "/monitor-tasks",
          },
          {
            title: "任务结果",
            path: "/event-alert",
          },
        ],
      },
      {
        title: "应用管理",
        icon: "fill_yingyongguanli",
        path: "/model-train",
      },
    ],
    route: [
      "/",
      "/dashboard",
      '/micro-app-config',
      '/dashboard-gridstack'
    ],
  };

  res.json(req.json);
});

/**
 * @api {post} /common/logout 退出登录
 * @apiName common6
 * @apiUse APICommon
 * @apiGroup common
 *
 */
router.post("/common/logout", function (req, res, next) {
  res.json(req.json);
});



/**
 * @api {post} /common/upload 上传文件
 * @apiName uploadFile
 * @apiGroup Common
 *
 * @apiQuery {File} file    file文件
 *
 * @apiSuccess {Object} data 合并成功后的文件信息
 * @apiSuccess {String} data.file_name  文件名
 * @apiSuccess {String} data.file_url   文件URL
 * @apiSuccess {String} data.file_path  文件路径
 * @apiSuccess {String} data.file_ext   文件后缀
 * @apiSuccess {Number} data.file_size  文件大小
 * @apiSuccess {String} data.content_type  文件类型
 */
router.post("/common/upload", async (req, res) => {
  req.sleep(1);
  req.json.data = {
    file_name: "1.png",
    file_url: "http://192.168.5.47:3003/10001.jpg",
    file_path: "http://192.168.5.47:3003/10001.jpg",
    file_ext: ".png",
    file_size: 100,
    content_type: "image/png",
  };
  res.json(req.json);
});

/**
 * @api {post} /login 登录接口
 * @apiName login
 * @apiGroup Common
 *
 * @apiParam {String} username 用户名
 * @apiParam {String} password 密码
 *
 * @apiSuccess {Object} data ��回信息
 * @apiSuccess {String} data.token token
 * @apiSuccess {Object} data.user_info 用户信息
 */
router.post("/login", async (req, res) => {
  await req.sleep(1);
  const { username, password } = req.body;

  if (username === 'admin' && password === '123456') {
    const token = 'mock-token-' + new Date().getTime();

    // 模拟后端写入 Cookie
    res.cookie('JWT-TOKEN', token, {
      httpOnly: false,  // 允许前端读取
      maxAge: 24 * 60 * 60 * 1000,  // 24小时过期
      path: '/'
    });

    req.json.data = {
      token: token,
      user_info: {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        avatar: ''
      }
    };
    req.json.code = 0;
    req.json.message = '登录成功';
  } else {
    req.json.code = 1;
    req.json.message = '用户名或密码错误 (admin/123456)';
  }

  res.json(req.json);
});

/**
 * @api {post} /api/micro-app/save-config 保存微应用配置
 * @apiName saveMicroAppConfig
 * @apiGroup MicroApp
 *
 * @apiParam {Object} config 配置对象
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} message 消息
 */
router.post("/micro-app/save-config", async (req, res) => {
  await req.sleep(0.5);
  const fs = require('fs');
  const path = require('path');

  try {
    const configData = req.body;

    // 配置文件路径
    const configPath = path.join(__dirname, '../../public/config/micro-apps.json');

    // 确保目录存在
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // 写入文件
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');

    req.json.code = 0;
    req.json.message = '配置保存成功';
    req.json.data = { success: true };
  } catch (error) {
    req.json.code = 1;
    req.json.message = '配置保存失败: ' + error.message;
    req.json.data = { success: false };
  }

  res.json(req.json);
});


/**
 * @api {get} /api/nav-group 获取导航组数据
 * @apiName getNavGroup
 * @apiGroup NavGroup
 *
 * @apiSuccess {Array} data 导航项数组
 */
router.get("/api/nav-group", async (req, res) => {
  await req.sleep(0.3);
  req.json.data = [
    { id: '1', url: '/dashboard', icon: 'DashboardOutlined', name: '工作台', description: '数据可视化面板' },
    { id: '2', url: '/settings', icon: 'SettingOutlined', name: '系统设置', description: '系统配置管理' },
    { id: '3', url: '/users', icon: 'UserOutlined', name: '用户管理', description: '用户账号管理' },
    { id: '4', url: '/files', icon: 'FolderOutlined', name: '文件管理', description: '文件存储管理' },
    { id: '5', url: '/messages', icon: 'MessageOutlined', name: '消息中心', description: '系统消息通知' },
    { id: '6', url: '/analytics', icon: 'LineChartOutlined', name: '数据分析', description: '业务数据分析' },
    { id: '7', url: '/calendar', icon: 'CalendarOutlined', name: '日程安排', description: '个人日程管理' },
    { id: '8', url: '/help', icon: 'QuestionCircleOutlined', name: '帮助中心', description: '使用帮助文档' },
  ];
  res.json(req.json);
});

/**
 * @api {get} /api/nav-group/:id 获取指定导航组数据
 * @apiName getNavGroupById
 * @apiGroup NavGroup
 *
 * @apiParam {String} id 导航组ID
 *
 * @apiSuccess {Array} data 导航项数组
 */
router.get("/api/nav-group/:id", async (req, res) => {
  await req.sleep(0.2);
  const { id } = req.params;

  // 根据不同ID返回不同的导航数据
  const navGroups = {
    'main': [
      { id: '1', url: '/home', icon: 'HomeOutlined', name: '首页' },
      { id: '2', url: '/dashboard', icon: 'DashboardOutlined', name: '工作台' },
      { id: '3', url: '/apps', icon: 'AppstoreOutlined', name: '应用中心' },
    ],
    'tools': [
      { id: '1', url: '/calculator', icon: 'CalculatorOutlined', name: '计算器' },
      { id: '2', url: '/translate', icon: 'TranslationOutlined', name: '翻译' },
      { id: '3', url: '/converter', icon: 'SwapOutlined', name: '转换器' },
    ],
    'admin': [
      { id: '1', url: '/users', icon: 'TeamOutlined', name: '用户管理' },
      { id: '2', url: '/roles', icon: 'SafetyOutlined', name: '角色管理' },
      { id: '3', url: '/permissions', icon: 'KeyOutlined', name: '权限管理' },
      { id: '4', url: '/logs', icon: 'FileSearchOutlined', name: '操作日志' },
    ],
  };

  req.json.data = navGroups[id] || navGroups['main'];
  res.json(req.json);
});

module.exports = {
  router,
};
