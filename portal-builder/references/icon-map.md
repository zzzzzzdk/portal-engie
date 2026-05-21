# Icon 映射参考

本文件用于 Portal Builder 在生成 `navGroup` 和 `iconNav` 时稳定输出当前项目真实可用的 icon 名。

来源基线：

- [`src/components/IconPicker/iconData.ts`](e:/demo/portalengie_frontend/src/components/IconPicker/iconData.ts)
- [`src/components/IconRenderer/index.tsx`](e:/demo/portalengie_frontend/src/components/IconRenderer/index.tsx)

## 先判定组件，再选图标

### `navGroup`

用于多图标入口。

输出规则：

- `staticItems[].icon` 只用 iconfont 名
- 必须带 `icon-` 前缀
- 只从本文件白名单中选
- 不要输出未加前缀的 `line_xxx` / `fill_xxx`
- 不要输出自造名字，如 `icon-home`、`icon-setting`
- 拿不准时使用 `icon-line_duixiang`

### `iconNav`

用于单图标入口。

输出规则：

- `config.icon` 优先使用 Ant Design Outlined 图标名
- 只从本文件白名单中选
- 不要给 `iconNav` 写 iconfont 名
- 拿不准时使用 `AppstoreOutlined`

## 常用语义映射

| 语义 | `navGroup` 用 | `iconNav` 用 | 备注 |
|---|---|---|---|
| 首页 / 主页 / 官网 | `icon-fill_shouye` | `HomeOutlined` | 门户首页入口 |
| 工作台 / 看板 / 驾驶舱 | `icon-fill_gongzuotai` | `DashboardOutlined` | 工作台类入口 |
| 应用 / 模块 / 门户 / 服务 | `icon-fill_yingyongguanli` | `AppstoreOutlined` | 最常见默认入口 |
| 部署 / 运维 / 工业运营 | `icon-fill_bushuguanli` | `DeploymentUnitOutlined` | 偏平台能力 |
| 模型 / 方案 / 决策 | `icon-fill_moxingguanli` | `ClusterOutlined` | 模型与方案聚合 |
| 样本 / 文档 / 资料 | `icon-fill_yangbenguanli` | `FileOutlined` | 文档资料类 |
| 能源 / 环境 / 碳 | `icon-line_huanjing` | `GlobalOutlined` | 能源环境场景 |
| 用户 / 客户 / 团队 | `icon-line_yonghu` | `UserOutlined` | 人员入口 |
| 搜索 / 查询 / 检索 | `icon-line_jiansuo` | `SearchOutlined` | 检索入口 |
| 设置 / 配置 | `icon-line_shezhi` | `SettingOutlined` | 配置类入口 |
| 编辑 / 修改 | `icon-line_bianji` | `EditOutlined` | 编辑动作 |
| 上传 / 导入 | `icon-line_shangchuan` | `UploadOutlined` | 上传导入动作 |
| 风险 / 告警 / 安全 | `icon-fill_jinggao` | `SafetyCertificateOutlined` | 风险安全类 |
| 数据 / 对象 / 资产 | `icon-line_duixiang` | `DatabaseOutlined` | 无更精确语义时的通用兜底 |
| 退出 / 登出 | `icon-line_tuichu` | `CloseOutlined` | 出口动作 |

## `navGroup` 白名单

以下名字可直接写入 `staticItems[].icon`：

```text
icon-line_xia
icon-line_huanjing
icon-line_bianji
icon-line_shuaxin
icon-line_daoru
icon-line_shuangxia
icon-line_shanchu
icon-line_duixiang
icon-line_yonghu
icon-line_tuichu
icon-line_jiansuo
icon-line_shezhi
icon-line_shang
icon-line_you
icon-line_zuo
icon-line_shangchuan
icon-fill_xiaoyan
icon-fill_guanbi
icon-fill_shaixuan
icon-fill_paixu
icon-fill_jinggao
icon-fill_yuandian
icon-fill_gongzuotai
icon-fill_shouye
icon-fill_bushuguanli
icon-fill_moxingguanli
icon-fill_yangbenguanli
icon-fill_yingyongguanli
icon-buheguitousuhuifuzhushou
icon-a-110
icon-AIPPT
icon-anquanjianchazhushou
icon-bianminzixunzhushou
icon-gongjijinxiaoguanjia
icon-fatiaozhisou
icon-dianweixunlian
icon-gonganxiaobangshou
icon-shipintiaoyuezhushou
icon-tufaanshijianyuanzhiyin
icon-morenyingyong
icon-zhongfujingqingshuli
icon-wenshu
icon-xinwenhuoquzhushou
icon-tuandui
icon-maoduntiaojiezhushou
icon-jingqingdingxingfenxi
icon-qingbaoxiansuotongjifenxi
icon-jingdanzhiliangtisheng
icon-jijiananlifenxi
icon-huiyizhiji
icon-gongwenxiezuozhushou
icon-chujingjianyizhushou
```

## `iconNav` 常用白名单

以下名字优先用于 `iconNav.config.icon`：

```text
HomeOutlined
AppstoreOutlined
DashboardOutlined
DeploymentUnitOutlined
ClusterOutlined
FileOutlined
GlobalOutlined
UserOutlined
SearchOutlined
SettingOutlined
EditOutlined
UploadOutlined
DatabaseOutlined
ApiOutlined
LineChartOutlined
BarChartOutlined
PieChartOutlined
CloudOutlined
TeamOutlined
ToolOutlined
SafetyCertificateOutlined
CloseOutlined
```

## 生成示例

### `navGroup`

```json
{
  "type": "navGroup",
  "config": {
    "staticItems": [
      { "name": "首页", "icon": "icon-fill_shouye" },
      { "name": "应用中心", "icon": "icon-fill_yingyongguanli" },
      { "name": "用户管理", "icon": "icon-line_yonghu" },
      { "name": "系统设置", "icon": "icon-line_shezhi" }
    ]
  }
}
```

### `iconNav`

```json
{
  "type": "iconNav",
  "config": {
    "icon": "AppstoreOutlined"
  }
}
```

## 强规则

- 先判断是 `navGroup` 还是 `iconNav`，再决定 icon 名格式
- 不要混用 `iconfont` 和 Ant Design 名称
- 不要输出项目里不存在的图标名
- 不要省略 `navGroup` 的 `icon-` 前缀
- 语义不确定时用稳定兜底，不要自由发挥
