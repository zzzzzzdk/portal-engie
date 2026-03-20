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


    "water_mark": true,
    "login_url": "./login.html?",
    "logout_url": "./login.html?",
    "sys_text": "沧澜门户-微前端",
    "api_host": "http://192.168.5.60:29081",
    "iamUrl": "http://192.168.11.12:80/main.html",
    system_list: ['das','coe'],



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

const createDemoBannerImage = (title, colorStart, colorEnd) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="1200" height="480" viewBox="0 0 1200 480" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colorStart}" />
          <stop offset="100%" stop-color="${colorEnd}" />
        </linearGradient>
      </defs>
      <rect width="1200" height="480" rx="36" fill="url(#bg)" />
      <circle cx="1040" cy="90" r="120" fill="rgba(255,255,255,0.12)" />
      <circle cx="1080" cy="400" r="160" fill="rgba(255,255,255,0.08)" />
      <text x="72" y="170" fill="#ffffff" font-size="54" font-family="Microsoft YaHei, PingFang SC, sans-serif" font-weight="700">${title}</text>
      <text x="72" y="230" fill="rgba(255,255,255,0.85)" font-size="24" font-family="Microsoft YaHei, PingFang SC, sans-serif">Portal Engine Mock Demo</text>
      <text x="72" y="290" fill="rgba(255,255,255,0.72)" font-size="18" font-family="Microsoft YaHei, PingFang SC, sans-serif">支持 query、body、分页与嵌套字段路径演示</text>
    </svg>
  `)}`;

const DEMO_TABLE_SOURCE = [
  { id: 'table-01', name: '海域综合态势', owner: '指挥中心', category: '监测', status: '运行中', score: 98, updateTime: '2026-03-18 09:12:00' },
  { id: 'table-02', name: '岸线风险巡检', owner: '海防一组', category: '巡检', status: '待处理', score: 86, updateTime: '2026-03-18 09:30:00' },
  { id: 'table-03', name: '港区通行统计', owner: '港航部门', category: '统计', status: '运行中', score: 92, updateTime: '2026-03-18 10:05:00' },
  { id: 'table-04', name: '渔船定位追踪', owner: '海事分局', category: '监测', status: '已完成', score: 89, updateTime: '2026-03-18 10:26:00' },
  { id: 'table-05', name: '重点目标告警', owner: '指挥中心', category: '告警', status: '运行中', score: 97, updateTime: '2026-03-18 11:08:00' },
  { id: 'table-06', name: '视频链路巡检', owner: '运维中心', category: '巡检', status: '离线', score: 63, updateTime: '2026-03-18 11:20:00' },
  { id: 'table-07', name: 'AIS 数据同步', owner: '数据中台', category: '同步', status: '运行中', score: 94, updateTime: '2026-03-18 11:38:00' },
  { id: 'table-08', name: '船舶画像分析', owner: '研判中心', category: '分析', status: '待处理', score: 81, updateTime: '2026-03-18 12:15:00' },
  { id: 'table-09', name: '雷达融合校验', owner: '海防二组', category: '校验', status: '运行中', score: 90, updateTime: '2026-03-18 12:42:00' },
  { id: 'table-10', name: '应急预案推送', owner: '值班室', category: '告警', status: '已完成', score: 95, updateTime: '2026-03-18 13:10:00' },
  { id: 'table-11', name: '航标设施巡检', owner: '港航部门', category: '巡检', status: '运行中', score: 88, updateTime: '2026-03-18 13:46:00' },
  { id: 'table-12', name: '北斗定位核验', owner: '海事分局', category: '校验', status: '待处理', score: 84, updateTime: '2026-03-18 14:06:00' },
  { id: 'table-13', name: '无人机巡航回传', owner: '运维中心', category: '监测', status: '运行中', score: 96, updateTime: '2026-03-18 14:32:00' },
  { id: 'table-14', name: '事件处置闭环', owner: '指挥中心', category: '处置', status: '已完成', score: 93, updateTime: '2026-03-18 15:02:00' },
  { id: 'table-15', name: '海气象同步', owner: '数据中台', category: '同步', status: '运行中', score: 91, updateTime: '2026-03-18 15:40:00' },
  { id: 'table-16', name: '设备在线率分析', owner: '研判中心', category: '分析', status: '离线', score: 72, updateTime: '2026-03-18 16:10:00' },
];

const DEMO_NEWS_SOURCE = [
  { id: 'news-01', title: '港区北侧新增巡检航线正式启用', description: '新增巡检航线已同步至值班系统，支持按航段快速切换。', source: '港航播报', category: '运营', publishTime: '2026-03-18 08:10', url: 'https://example.com/news/port-route-01' },
  { id: 'news-02', title: '近岸雷达融合算法完成版本升级', description: '升级后目标识别稳定性提升，可直接用于演示图表与统计组件联调。', source: '算法中心', category: '技术', publishTime: '2026-03-18 08:45', url: 'https://example.com/news/radar-02' },
  { id: 'news-03', title: '渔船异常停留告警规则完成优化', description: '规则新增时间窗与区域白名单控制，降低误报率。', source: '研判中心', category: '告警', publishTime: '2026-03-18 09:20', url: 'https://example.com/news/alarm-03' },
  { id: 'news-04', title: '视频中台接入第 12 路码流', description: '新码流可用于轮播图与排行榜组件演示封面数据。', source: '运维中心', category: '技术', publishTime: '2026-03-18 09:58', url: 'https://example.com/news/video-04' },
  { id: 'news-05', title: '本周海域态势研判报告已生成', description: '系统已输出周报摘要，可通过新闻动态组件展示。', source: '指挥中心', category: '研判', publishTime: '2026-03-18 10:36', url: 'https://example.com/news/report-05' },
  { id: 'news-06', title: '岸线巡检任务进入高频执行时段', description: '支持通过 query 或 body 传递关键字与分类进行筛选。', source: '巡检中心', category: '运营', publishTime: '2026-03-18 11:00', url: 'https://example.com/news/patrol-06' },
  { id: 'news-07', title: '多源数据接入质量评分更新完成', description: '评分结果已回写数据中台，可用于表格组件排序展示。', source: '数据中台', category: '数据', publishTime: '2026-03-18 11:22', url: 'https://example.com/news/data-07' },
  { id: 'news-08', title: '重点海区告警处置效率提升 14%', description: '处置闭环时长持续收敛，适合作为统计卡片演示指标。', source: '指挥中心', category: '告警', publishTime: '2026-03-18 12:08', url: 'https://example.com/news/efficiency-08' },
  { id: 'news-09', title: '设备在线率日看板已开放预览', description: '支持结合分页模式进行接口调试与验证。', source: '运维中心', category: '运维', publishTime: '2026-03-18 13:14', url: 'https://example.com/news/device-09' },
  { id: 'news-10', title: '图表中心新增月度趋势演示数据', description: '用于折线图、柱状图和面积图三种模式的快速展示。', source: '可视化组', category: '技术', publishTime: '2026-03-18 14:02', url: 'https://example.com/news/chart-10' },
  { id: 'news-11', title: '联动处置服务支持按区域过滤', description: '可在 POST body 中传递 region 参数完成不同区域演示。', source: '联动中心', category: '服务', publishTime: '2026-03-18 15:18', url: 'https://example.com/news/region-11' },
  { id: 'news-12', title: '导航分组示例新增多种布局素材', description: '包括 flex、grid、text、tag 等布局样式演示。', source: '前端组', category: '体验', publishTime: '2026-03-18 16:05', url: 'https://example.com/news/nav-12' },
];

const DEMO_TOP_LIST_SOURCE = [
  { id: 'top-01', name: '一号海域', value: 1286, change: '+12.8%', unit: '次', category: '告警' },
  { id: 'top-02', name: '二号航道', value: 1198, change: '+9.6%', unit: '次', category: '告警' },
  { id: 'top-03', name: '东侧泊位', value: 1080, change: '+6.4%', unit: '次', category: '告警' },
  { id: 'top-04', name: '北部港池', value: 986, change: '+5.2%', unit: '次', category: '告警' },
  { id: 'top-05', name: '西侧岸线', value: 860, change: '+4.1%', unit: '次', category: '告警' },
  { id: 'top-06', name: '巡检一组', value: 362, change: '+18.2%', unit: '次', category: '处置' },
  { id: 'top-07', name: '巡检二组', value: 338, change: '+12.4%', unit: '次', category: '处置' },
  { id: 'top-08', name: '指挥中心', value: 315, change: '+8.1%', unit: '次', category: '处置' },
  { id: 'top-09', name: '值班室', value: 286, change: '-2.4%', unit: '次', category: '处置' },
  { id: 'top-10', name: '海防一组', value: 258, change: '+3.6%', unit: '次', category: '处置' },
  { id: 'top-11', name: '雷达站 A', value: 99.2, change: '+0.8%', unit: '%', category: '在线率' },
  { id: 'top-12', name: '视频站 B', value: 98.4, change: '+1.1%', unit: '%', category: '在线率' },
  { id: 'top-13', name: 'AIS 节点 C', value: 97.8, change: '-0.4%', unit: '%', category: '在线率' },
  { id: 'top-14', name: '链路节点 D', value: 96.9, change: '+0.3%', unit: '%', category: '在线率' },
  { id: 'top-15', name: '边缘设备 E', value: 95.6, change: '-1.2%', unit: '%', category: '在线率' },
];

const DEMO_CAROUSEL_SOURCE = [
  {
    id: 'carousel-01',
    scene: 'portal',
    title: '海域综合态势总览',
    subtitle: '门户首页推荐',
    description: '展示多源感知、统计看板与应急联动入口。',
    imageUrl: createDemoBannerImage('海域综合态势总览', '#0f6bff', '#19c2ff'),
    link: '/dashboard-gridstack',
    buttonText: '进入工作台',
    badge: '推荐',
  },
  {
    id: 'carousel-02',
    scene: 'portal',
    title: '重点告警联动处置',
    subtitle: '告警演示场景',
    description: '联动排行榜、新闻与表格组件，适合演示分页接口。',
    imageUrl: createDemoBannerImage('重点告警联动处置', '#ff7a18', '#ffb347'),
    link: '/dashboard-gridstack',
    buttonText: '查看详情',
    badge: '告警',
  },
  {
    id: 'carousel-03',
    scene: 'ops',
    title: '设备在线率巡检看板',
    subtitle: '运维场景',
    description: '适合配合统计卡片与折线图组件一起演示。',
    imageUrl: createDemoBannerImage('设备在线率巡检看板', '#22c55e', '#14b8a6'),
    link: '/dashboard-gridstack',
    buttonText: '打开运维看板',
    badge: '运维',
  },
  {
    id: 'carousel-04',
    scene: 'ops',
    title: '视频链路健康监测',
    subtitle: '运维场景',
    description: '用于验证嵌套列表字段路径与 body 参数筛选。',
    imageUrl: createDemoBannerImage('视频链路健康监测', '#7c3aed', '#ec4899'),
    link: '/dashboard-gridstack',
    buttonText: '查看链路',
    badge: '链路',
  },
];

const DEMO_NAV_GROUP_SOURCE = [
  { id: 'nav-01', groupType: 'portal', url: '/dashboard-gridstack', icon: 'DashboardOutlined', name: '综合看板', description: '进入综合态势看板', openInNew: false },
  { id: 'nav-02', groupType: 'portal', url: '/micro-app-config', icon: 'AppstoreOutlined', name: '应用配置', description: '微应用配置与发布入口', openInNew: false },
  { id: 'nav-03', groupType: 'portal', url: '/home', icon: 'HomeOutlined', name: '首页门户', description: '回到门户首页', openInNew: false },
  { id: 'nav-04', groupType: 'portal', url: '/dashboard', icon: 'LineChartOutlined', name: '统计分析', description: '查看图表与统计分析', openInNew: false },
  { id: 'nav-05', groupType: 'service', url: '/monitor-tasks', icon: 'AlertOutlined', name: '监测任务', description: '监测任务与告警联动', openInNew: false },
  { id: 'nav-06', groupType: 'service', url: '/event-alert', icon: 'BellOutlined', name: '事件告警', description: '查看最新事件告警', openInNew: false },
  { id: 'nav-07', groupType: 'service', url: '/video-resources', icon: 'VideoCameraOutlined', name: '视频资源', description: '视频资源接入与播放', openInNew: false },
  { id: 'nav-08', groupType: 'service', url: '/online-source', icon: 'CloudOutlined', name: '在线资源', description: '在线资源统一接入', openInNew: false },
  { id: 'nav-09', groupType: 'admin', url: '/users', icon: 'UserOutlined', name: '用户管理', description: '用户账号与权限管理', openInNew: false },
  { id: 'nav-10', groupType: 'admin', url: '/settings', icon: 'SettingOutlined', name: '系统设置', description: '门户系统配置中心', openInNew: false },
  { id: 'nav-11', groupType: 'admin', url: '/files', icon: 'FolderOutlined', name: '文件管理', description: '文件与素材统一管理', openInNew: false },
  { id: 'nav-12', groupType: 'admin', url: '/help', icon: 'QuestionCircleOutlined', name: '帮助中心', description: '配置说明与帮助文档', openInNew: false },
];

const DEMO_STATS_MAP = {
  today: {
    activeUsers: 18642,
    idleRate: 7.8,
    alertCount: 138,
    successRate: 98.6,
  },
  week: {
    activeUsers: 93426,
    idleRate: 6.3,
    alertCount: 892,
    successRate: 97.9,
  },
  month: {
    activeUsers: 382614,
    idleRate: 5.7,
    alertCount: 3654,
    successRate: 98.2,
  },
};

const DEMO_CHART_MAP = {
  week: {
    xAxis: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    series: [132, 148, 165, 158, 176, 188, 205],
  },
  month: {
    xAxis: ['第1周', '第2周', '第3周', '第4周'],
    series: [968, 1026, 1108, 1186],
  },
  quarter: {
    xAxis: ['1月', '2月', '3月'],
    series: [3180, 3460, 3725],
  },
};

const normalizePositiveNumber = (value, fallbackValue) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return Math.floor(parsed);
};

const getNormalizedKeyword = (value) => String(value || '').trim().toLowerCase();

const containsKeyword = (values, keyword) => {
  if (!keyword) {
    return true;
  }
  return values.some(value => String(value || '').toLowerCase().includes(keyword));
};

const paginateDemoList = (list, params = {}) => {
  const page = normalizePositiveNumber(params.page || params.current, 1);
  const pageSize = normalizePositiveNumber(
    params.page_size || params.pageSize || params.size,
    10,
  );
  const start = (page - 1) * pageSize;

  return {
    list: list.slice(start, start + pageSize),
    total: list.length,
    page,
    page_size: pageSize,
    current: page,
    pageSize,
  };
};

const buildTableList = (params = {}) => {
  const keyword = getNormalizedKeyword(params.keyword);
  const status = String(params.status || '').trim();
  const category = String(params.category || '').trim();

  return DEMO_TABLE_SOURCE.filter(item => {
    if (status && item.status !== status) {
      return false;
    }
    if (category && item.category !== category) {
      return false;
    }
    return containsKeyword(
      [item.name, item.owner, item.category, item.status],
      keyword,
    );
  });
};

const buildNewsList = (params = {}) => {
  const keyword = getNormalizedKeyword(params.keyword);
  const category = String(params.category || '').trim();

  return DEMO_NEWS_SOURCE.filter(item => {
    if (category && item.category !== category) {
      return false;
    }
    return containsKeyword(
      [item.title, item.description, item.source, item.category],
      keyword,
    );
  });
};

const buildTopList = (params = {}) => {
  const keyword = getNormalizedKeyword(params.keyword);
  const category = String(params.category || '').trim();

  return DEMO_TOP_LIST_SOURCE.filter(item => {
    if (category && item.category !== category) {
      return false;
    }
    return containsKeyword([item.name, item.category], keyword);
  }).sort((prev, next) => Number(next.value) - Number(prev.value));
};

const buildCarouselList = (params = {}) => {
  const scene = String(params.scene || 'portal').trim();
  const keyword = getNormalizedKeyword(params.keyword);

  return DEMO_CAROUSEL_SOURCE.filter(item => {
    if (scene && item.scene !== scene) {
      return false;
    }
    return containsKeyword([item.title, item.subtitle, item.description, item.badge], keyword);
  });
};

const buildNavGroupList = (params = {}) => {
  const groupType = String(params.groupType || 'portal').trim();
  const keyword = getNormalizedKeyword(params.keyword);

  return DEMO_NAV_GROUP_SOURCE.filter(item => {
    if (groupType && item.groupType !== groupType) {
      return false;
    }
    return containsKeyword([item.name, item.description], keyword);
  });
};

router.get("/api/demo/table", async (req, res) => {
  await req.sleep(0.2);
  const params = req.query || {};
  const filteredList = buildTableList(params);
  const pagination = paginateDemoList(filteredList, params);

  req.json.data = {
    list: pagination.list,
    total: pagination.total,
    page: pagination.page,
    page_size: pagination.page_size,
    filters: {
      keyword: params.keyword || '',
      status: params.status || '',
      category: params.category || '',
    },
  };

  res.json(req.json);
});

router.post("/api/demo/table", async (req, res) => {
  await req.sleep(0.2);
  const params = req.body || {};
  const filteredList = buildTableList(params);
  const pagination = paginateDemoList(filteredList, params);

  req.json.data = {
    list: pagination.list,
    total: pagination.total,
    page: pagination.page,
    page_size: pagination.page_size,
    filters: {
      keyword: params.keyword || '',
      status: params.status || '',
      category: params.category || '',
    },
  };

  res.json(req.json);
});

router.get("/api/demo/news", async (req, res) => {
  await req.sleep(0.2);
  const params = req.query || {};
  const filteredList = buildNewsList(params);
  const pagination = paginateDemoList(filteredList, params);

  req.json.data = {
    records: pagination.list,
    total: pagination.total,
    page: pagination.page,
    page_size: pagination.page_size,
    query: {
      keyword: params.keyword || '',
      category: params.category || '',
    },
  };

  res.json(req.json);
});

router.post("/api/demo/news", async (req, res) => {
  await req.sleep(0.2);
  const params = req.body || {};
  const filteredList = buildNewsList(params);
  const pagination = paginateDemoList(filteredList, params);

  req.json.data = {
    records: pagination.list,
    total: pagination.total,
    page: pagination.page,
    page_size: pagination.page_size,
    query: {
      keyword: params.keyword || '',
      category: params.category || '',
    },
  };

  res.json(req.json);
});

router.get("/api/demo/top-list", async (req, res) => {
  await req.sleep(0.2);
  const params = req.query || {};
  const filteredList = buildTopList(params);
  const pagination = paginateDemoList(filteredList, params);

  req.json.data = {
    rows: pagination.list,
    total: pagination.total,
    current: pagination.current,
    pageSize: pagination.pageSize,
    query: {
      keyword: params.keyword || '',
      category: params.category || '',
    },
  };

  res.json(req.json);
});

router.post("/api/demo/top-list", async (req, res) => {
  await req.sleep(0.2);
  const params = req.body || {};
  const filteredList = buildTopList(params);
  const pagination = paginateDemoList(filteredList, params);

  req.json.data = {
    rows: pagination.list,
    total: pagination.total,
    current: pagination.current,
    pageSize: pagination.pageSize,
    query: {
      keyword: params.keyword || '',
      category: params.category || '',
    },
  };

  res.json(req.json);
});

router.get("/api/demo/carousel", async (req, res) => {
  await req.sleep(0.2);
  const params = req.query || {};

  req.json.data = {
    carousel: {
      scene: params.scene || 'portal',
      items: buildCarouselList(params),
    },
  };

  res.json(req.json);
});

router.post("/api/demo/carousel", async (req, res) => {
  await req.sleep(0.2);
  const params = req.body || {};

  req.json.data = {
    carousel: {
      scene: params.scene || 'portal',
      items: buildCarouselList(params),
    },
  };

  res.json(req.json);
});

router.get("/api/demo/nav-group", async (req, res) => {
  await req.sleep(0.2);
  const params = req.query || {};

  req.json.payload = {
    groups: {
      groupType: params.groupType || 'portal',
      list: buildNavGroupList(params),
    },
  };

  res.json(req.json);
});

router.post("/api/demo/nav-group", async (req, res) => {
  await req.sleep(0.2);
  const params = req.body || {};

  req.json.payload = {
    groups: {
      groupType: params.groupType || 'portal',
      list: buildNavGroupList(params),
    },
  };

  res.json(req.json);
});

router.get("/api/demo/stats", async (req, res) => {
  await req.sleep(0.15);
  const scope = String(req.query.scope || 'today').trim();

  req.json.payload = {
    metrics: {
      scope,
      ...(
        DEMO_STATS_MAP[scope] ||
        DEMO_STATS_MAP.today
      ),
    },
  };

  res.json(req.json);
});

router.post("/api/demo/stats", async (req, res) => {
  await req.sleep(0.15);
  const params = req.body || {};
  const scope = String(params.scope || 'today').trim();

  req.json.payload = {
    metrics: {
      scope,
      ...(
        DEMO_STATS_MAP[scope] ||
        DEMO_STATS_MAP.today
      ),
    },
  };

  res.json(req.json);
});

router.get("/api/demo/chart", async (req, res) => {
  await req.sleep(0.15);
  const period = String(req.query.period || 'week').trim();

  req.json.result = {
    chart: {
      period,
      ...(
        DEMO_CHART_MAP[period] ||
        DEMO_CHART_MAP.week
      ),
    },
  };

  res.json(req.json);
});

router.post("/api/demo/chart", async (req, res) => {
  await req.sleep(0.15);
  const params = req.body || {};
  const period = String(params.period || 'week').trim();

  req.json.result = {
    chart: {
      period,
      ...(
        DEMO_CHART_MAP[period] ||
        DEMO_CHART_MAP.week
      ),
    },
  };

  res.json(req.json);
});

module.exports = {
  router,
};
