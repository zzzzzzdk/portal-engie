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
    "sys_info": {
      "sys_name": "极光极光训推用一体平台",
      "sys_description": "一个一站式AI模型生产与应用平台，针对各行各业定制AI需求，提供了包括数据集管理、数据标注、数据处理、模型训练、评估、部署及应用等全流程功能。",
      "logo": ""
    },
    "sys_config": {
      "login_url": "登陆url",
      "logout_url": "退出url",
      "manage_url": "iam url"
    },
    "sys_scene_info": [
      {
        "id": 1,
        "scene_name": "智慧公安"
      }
    ],
    "sys_model_info": {
      "llm": [
        {
          "id": 1,
          "model_name": "chat-gpt",
          "api_url": "http://1.1.1.1:800/chat",
          "api_key": "cr_gkjh23**************",
          "context_max_len": 4096,
          "is_default": true
        }
      ],
      "detection": [
        {
          "id": 2,
          "model_name": "yolo-v8",
          "api_url": "http://mock.url:1111/detect",
          "is_default": true
        }
      ],
      "img_text_relation": [
        {
          "id": 3,
          "model_name": "clip",
          "api_url": "http://mock.url:1111/img2vector",
          "is_default": true
        }
      ]
    },
    "sys_label_info": [
      {
        "id": 1,
        "class_name": "类别名称",
        "children": [
          {
            "id": 1,
            "label_en": "person",
            "lebel_zh": "人"
          }
        ]
      }
    ],
    province: "鲁",
    water_mark: true,
    login_url: "./login.html?",
    logout_url: "./login.html?",
    help_url: "/syshelp",
    manage_url: "http://192.168.5.57:30080/#/applypanel",
    chrome_url: "1111",
    mlflow_web_url: "http://192.168.5.57:30087",
    ws_url: "ws://192.168.5.57:86/video",
    post_error: "",
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
        title: "仪表盘",
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


module.exports = {
  router,
};
