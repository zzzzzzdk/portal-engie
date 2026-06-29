const express = require("express");
const router = express.Router();
const Mock = require("mockjs");
const Random = Mock.Random;

const mockDashboards = {};
let seedsInitialized = false;
const APP_STATUS_DRAFT = 0;
const APP_STATUS_PENDING = 1;
const APP_STATUS_PUBLISHED = 2;
const homepageStorage = {};

const chartPresetList = [
  "basic-line",
  "basic-bar",
  "stacked-bar",
  "percent-bar",
  "grouped-bar",
  "basic-horizontal-bar",
  "stacked-horizontal-bar",
  "progress-bar",
  "gauge",
  "pie",
  "donut",
  "radar",
  "area-map",
  "flow-map",
  "funnel",
  "scatter",
  "dual-axis",
  "grouped-dual-axis",
];

const chartPresetTitleMap = {
  "basic-line": "基础折线图",
  "basic-bar": "基础柱状图",
  "stacked-bar": "堆叠柱状图",
  "percent-bar": "百分比柱状图",
  "grouped-bar": "分组柱状图",
  "basic-horizontal-bar": "基础条形图",
  "stacked-horizontal-bar": "堆叠条形图",
  "progress-bar": "进度条",
  gauge: "仪表盘",
  pie: "饼图",
  donut: "环形图",
  radar: "雷达图",
  "area-map": "区域地图",
  "flow-map": "流向地图",
  funnel: "漏斗图",
  scatter: "散点图",
  "dual-axis": "柱线组合图",
  "grouped-dual-axis": "分组柱线组合图",
};

const createLayout = (id, x, y, w, h, minW = 2, minH = 2) => ({
  i: id,
  x,
  y,
  w,
  h,
  minW,
  minH,
});

const createTestWidget = (type, title, layout, config = {}, extra = {}) => {
  const id = `mobile-test-${type}-${extra.idSuffix || title}`
    .replace(/[^\w-]/g, "-")
    .toLowerCase();

  return {
    id,
    type,
    title,
    layout: createLayout(id, layout.x, layout.y, layout.w, layout.h, layout.minW, layout.minH),
    config: {
      title,
      showTitle: true,
      titleColor: "#1f2937",
      backgroundType: "color",
      backgroundColor: "#ffffff",
      contentPadding: 12,
      refreshInterval: 0,
      ...config,
    },
    ...(extra.groupId ? { groupId: extra.groupId } : {}),
  };
};

const createNativeFormField = (type, label, field, extra = {}) => ({
  id: `native-${field}`,
  type,
  label,
  field,
  required: false,
  disabled: false,
  hidden: false,
  placeholder: ["switch", "checkboxGroup", "radioGroup", "slider", "rate", "button"].includes(type)
    ? undefined
    : `请输入${label}`,
  itemProps: {
    showLabel: true,
    asterisk: true,
  },
  componentProps: {},
  styleProps: {},
  rules: [],
  eventConfig: {
    changeRoutes: [],
    clickRoutes: [],
  },
  ...extra,
});

const buildCanglanTestDashboard = () => {
  const groupBasicId = "mobile-test-group-basic";
  const groupDataId = "mobile-test-group-data";
  const commonChartData = [
    { name: "周一", value: 120, value2: 80, category: "A" },
    { name: "周二", value: 168, value2: 96, category: "B" },
    { name: "周三", value: 142, value2: 118, category: "C" },
    { name: "周四", value: 196, value2: 136, category: "D" },
    { name: "周五", value: 222, value2: 158, category: "E" },
  ];
  const navItems = [
    { id: "nav-home", name: "首页", url: "#/portal", icon: "icon-line_shouye" },
    { id: "nav-data", name: "数据", url: "#/dashboard", icon: "icon-line_yibiaopan" },
    { id: "nav-form", name: "表单", url: "#/form", icon: "icon-line_biaodan" },
    { id: "nav-doc", name: "文档", url: "#/docs", icon: "icon-line_wendang" },
  ];
  const queryOptions = [
    { label: "全部", value: "" },
    { label: "正常", value: "normal" },
    { label: "告警", value: "warning" },
  ];
  const previewImagePrimary =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='720' height='320' viewBox='0 0 720 320'%3E%3Crect width='720' height='320' fill='%23123c69'/%3E%3Ctext x='48' y='176' fill='white' font-size='44' font-family='Arial'%3EMobile Preview%3C/text%3E%3C/svg%3E";
  const previewImageSecondary =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='720' height='320' viewBox='0 0 720 320'%3E%3Crect width='720' height='320' fill='%232a9d8f'/%3E%3Ctext x='48' y='176' fill='white' font-size='44' font-family='Arial'%3EAll Widgets%3C/text%3E%3C/svg%3E";
  const recognitionImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='160' viewBox='0 0 240 160'%3E%3Crect width='240' height='160' fill='%23edf6f9'/%3E%3Ccircle cx='120' cy='64' r='32' fill='%232a9d8f'/%3E%3Crect x='64' y='112' width='112' height='18' rx='9' fill='%23123c69'/%3E%3C/svg%3E";
  const nativeFormChildren = [
    createNativeFormField("input", "联系人", "contactName", { defaultValue: "测试用户" }),
    createNativeFormField("password", "密码", "password", {
      defaultValue: "portal123",
      componentProps: { allowClear: true, visibilityToggle: true },
    }),
    createNativeFormField("textarea", "备注", "remark", {
      componentProps: { rows: 3 },
      defaultValue: "移动端表单渲染测试",
    }),
    createNativeFormField("inputNumber", "数量", "amount", {
      defaultValue: 12,
      componentProps: { min: 0, step: 1, controls: true },
    }),
    createNativeFormField("select", "状态", "status", {
      dataSourceType: "manual",
      options: queryOptions,
      placeholder: "请选择状态",
      defaultValue: "normal",
    }),
    createNativeFormField("transfer", "穿梭框", "transferItems", {
      dataSourceType: "manual",
      options: [
        { label: "待选一", value: "left-1" },
        { label: "待选二", value: "left-2" },
      ],
      defaultValue: ["left-1"],
      componentProps: {
        showSearch: true,
        titles: ["待选", "已选"],
        operations: ["添加", "移除"],
      },
    }),
    createNativeFormField("checkableTag", "可选标签", "tagItems", {
      dataSourceType: "manual",
      options: [
        { label: "重点", text: "重点", value: "important", showStyle: "colorBlock", color: "#2a9d8f", borderColor: "#2a9d8f" },
        { label: "普通", text: "普通", value: "normal", showStyle: "colorBlock", color: "#457b9d", borderColor: "#457b9d" },
      ],
      defaultValue: ["important"],
      componentProps: { allowClear: false, showAsRadio: false },
    }),
    createNativeFormField("formPlate", "车牌组件", "plate", {
      defaultValue: { plateTypeId: 1, plateNumber: "鲁A12345", noplate: "" },
    }),
    createNativeFormField("formVehicleModel", "车型组件", "vehicleModel", {
      defaultValue: { brandValue: "brand-a", modelValue: ["model-a"], yearValue: ["2026"] },
    }),
    createNativeFormField("radioGroup", "单选组", "radioStatus", {
      dataSourceType: "manual",
      options: queryOptions,
      defaultValue: "normal",
      componentProps: { direction: "horizontal" },
    }),
    createNativeFormField("checkboxGroup", "复选组", "checkboxStatus", {
      dataSourceType: "manual",
      options: [
        { label: "文本", value: "text" },
        { label: "图表", value: "chart" },
        { label: "表单", value: "form" },
      ],
      defaultValue: ["text", "chart"],
      componentProps: { direction: "horizontal" },
    }),
    createNativeFormField("datePicker", "日期", "date", {
      componentProps: { picker: "date" },
    }),
    createNativeFormField("dateRangePicker", "日期范围", "dateRange", {}),
    createNativeFormField("timePicker", "时间", "time", {}),
    createNativeFormField("timeRangePicker", "时间范围", "timeRange", {}),
    createNativeFormField("cascader", "级联选择", "region", {
      dataSourceType: "manual",
      options: [
        {
          label: "山东",
          value: "sd",
          children: [
            { label: "济南", value: "jn" },
            { label: "青岛", value: "qd" },
          ],
        },
      ],
    }),
    createNativeFormField("switch", "启用", "enabled", { defaultValue: true }),
    createNativeFormField("treeSelect", "树选择", "treeNode", {
      dataSourceType: "manual",
      options: [
        {
          label: "组件",
          value: "widget",
          children: [
            { label: "基础组件", value: "basic" },
            { label: "图表组件", value: "chart" },
          ],
        },
      ],
    }),
    createNativeFormField("colorPicker", "颜色", "themeColor", { defaultValue: "#2a9d8f" }),
    createNativeFormField("slider", "滑块", "scoreSlider", {
      defaultValue: 72,
      componentProps: { min: 0, max: 100 },
    }),
    createNativeFormField("rate", "评分", "rateScore", { defaultValue: 4 }),
    createNativeFormField("button", "按钮", "actionButton", {
      componentProps: { text: "触发动作", type: "primary" },
    }),
  ];
  const widgets = [
    createTestWidget(
      "headerBar",
      "导航栏",
      { x: 0, y: 0, w: 36, h: 2, minW: 1, minH: 1 },
      {
        showTitle: false,
        headerTitle: "苍澜测试 - 全组件移动预览",
        headerFontSize: 22,
        textColor: "#ffffff",
        backgroundType: "gradient",
        backgroundGradient: "linear-gradient(135deg, #123c69 0%, #2a9d8f 100%)",
        backgroundColor: "#123c69",
        showNavMenu: true,
        navDataSource: "static",
        navItems,
      },
      { idSuffix: "header" },
    ),
    createTestWidget(
      "typography",
      "文本",
      { x: 0, y: 2, w: 9, h: 3, minW: 2, minH: 1 },
      {
        content: "全组件移动渲染测试",
        level: 3,
        color: "#123c69",
        textAlign: "left",
        fontSize: 20,
        fontWeight: 700,
      },
      { groupId: groupBasicId, idSuffix: "typography" },
    ),
    createTestWidget(
      "richText",
      "富文本",
      { x: 9, y: 2, w: 9, h: 6, minW: 4, minH: 3 },
      {
        showTitle: false,
        html:
          '<div style="color:#1f2937;line-height:1.7"><h3 style="color:#2a9d8f;margin:0 0 8px">富文本公告</h3><p>用于验证移动预览中的 HTML、段落、强调文本和内容高度。</p><ul><li>静态内容</li><li>无外部接口依赖</li></ul></div>',
        minHeight: 160,
        allowImageUpload: false,
      },
      { groupId: groupBasicId, idSuffix: "rich-text" },
    ),
    createTestWidget(
      "clock",
      "时钟",
      { x: 18, y: 2, w: 6, h: 6, minW: 2, minH: 3 },
      {},
      { groupId: groupBasicId, idSuffix: "clock" },
    ),
    createTestWidget(
      "stats",
      "统计卡片",
      { x: 24, y: 2, w: 12, h: 6, minW: 4, minH: 3 },
      {
        dataSource: "static",
        staticData: { activeUsers: 128640, idleRate: 6.32, publishCount: 28 },
        statsItems: [
          { key: "activeUsers", label: "访问量", precision: 0, trend: "up", color: "#2a9d8f" },
          { key: "idleRate", label: "错误率", precision: 2, suffix: "%", trend: "down", color: "#e76f51" },
          { key: "publishCount", label: "发布数", precision: 0, trend: "up", color: "#457b9d" },
        ],
      },
      { groupId: groupBasicId, idSuffix: "stats" },
    ),
    createTestWidget(
      "indicatorCard",
      "指标卡片",
      { x: 0, y: 8, w: 8, h: 5, minW: 2, minH: 2 },
      {
        dataSource: "static",
        staticValue: "98.6%",
        staticDescription: "移动端通过率",
        indicatorValueColor: "#2a9d8f",
        indicatorDescriptionColor: "#4b5563",
      },
      { groupId: groupBasicId, idSuffix: "indicator-card" },
    ),
    createTestWidget(
      "indicatorCardList",
      "指标列表卡片",
      { x: 8, y: 8, w: 10, h: 6, minW: 4, minH: 3 },
      {
        dataSource: "static",
        staticItems: [
          { id: "item-1", value: 18, description: "图表预设" },
          { id: "item-2", value: 24, description: "系统组件" },
          { id: "item-3", value: 2, description: "悬浮模块" },
        ],
        columns: 3,
      },
      { groupId: groupBasicId, idSuffix: "indicator-list" },
    ),
    createTestWidget(
      "recognitionCard",
      "识别卡片",
      { x: 18, y: 8, w: 8, h: 10, minW: 4, minH: 7 },
      {
        dataSource: "static",
        staticData: {
          imageUrl: recognitionImage,
          plateNo: "鲁A12345",
          personName: "测试对象",
          similarity: 96.8,
          deviceName: "移动预览设备",
          captureTime: "2026-06-25 10:20:00",
        },
        showSimilarity: true,
        similarityField: "similarity",
        imageField: "imageUrl",
        showPlateNo: true,
        plateNoField: "plateNo",
        showPersonName: true,
        personNameField: "personName",
        infoItems: [
          { id: "device", field: "deviceName" },
          { id: "time", field: "captureTime" },
        ],
      },
      { groupId: groupBasicId, idSuffix: "recognition-card" },
    ),
    createTestWidget(
      "carousel",
      "轮播图",
      { x: 26, y: 8, w: 10, h: 10, minW: 4, minH: 3 },
      {
        showTitle: false,
        contentPadding: 0,
        dataSourceType: "static",
        autoplay: { enabled: true, delay: 4000, pauseOnMouseEnter: true, disableOnInteraction: false },
        pagination: { enabled: true, type: "bullets", clickable: true },
        navigation: { enabled: true },
        slidesPerView: 1,
        slidesPerGroup: 1,
        spaceBetween: 12,
        loop: true,
        effect: "slide",
        textAlign: "left",
        overlayStyle: "gradient",
        overlayColor: "rgba(0,0,0,0.35)",
        slides: [
          {
            id: "slide-1",
            title: "移动预览",
            description: "验证轮播组件在手机宽度下的高度和触控。",
            imageUrl: previewImagePrimary,
            buttonText: "查看",
            buttonLink: "#/mobile-preview/canglan",
          },
          {
            id: "slide-2",
            title: "全组件测试",
            description: "覆盖组件库、图表预设、分组和悬浮模块。",
            imageUrl: previewImageSecondary,
          },
        ],
      },
      { groupId: groupBasicId, idSuffix: "carousel" },
    ),
    createTestWidget(
      "link",
      "快捷链接",
      { x: 0, y: 18, w: 6, h: 5, minW: 2, minH: 2 },
      {
        layout: "button",
        links: [
          { title: "工作台", url: "#/dashboard", icon: "DashboardOutlined", description: "打开工作台" },
          { title: "发布列表", url: "#/publish-list", icon: "AppstoreOutlined", description: "打开发布列表" },
        ],
      },
      { groupId: groupDataId, idSuffix: "link" },
    ),
    createTestWidget(
      "pageNavigator",
      "页面切换器",
      { x: 6, y: 18, w: 12, h: 3, minW: 6, minH: 1 },
      {
        showTitle: false,
        displayMode: "text",
        itemColor: "#123c69",
        items: [
          { name: "总览", path: "#/mobile-preview/canglan" },
          { name: "表单", path: "#/mobile-preview/canglan?tab=form" },
          { name: "图表", path: "#/mobile-preview/canglan?tab=chart" },
        ],
      },
      { groupId: groupDataId, idSuffix: "page-navigator" },
    ),
    createTestWidget(
      "news",
      "新闻动态",
      { x: 18, y: 18, w: 8, h: 10, minW: 4, minH: 4 },
      {
        dataSource: "static",
        maxItems: 4,
        showDate: true,
        showSource: true,
        staticData: [
          { title: "手机预览支持分组渲染", date: "2026-06-25", source: "测试数据", url: "#" },
          { title: "组件库全量覆盖测试", date: "2026-06-25", source: "测试数据", url: "#" },
          { title: "微应用降级卡片验证", date: "2026-06-25", source: "测试数据", url: "#" },
          { title: "表单移动布局验证", date: "2026-06-25", source: "测试数据", url: "#" },
        ],
      },
      { groupId: groupDataId, idSuffix: "news" },
    ),
    createTestWidget(
      "topList",
      "排行榜",
      { x: 26, y: 18, w: 10, h: 10, minW: 3, minH: 4 },
      {
        dataSource: "static",
        rankingField: "rank",
        labelField: "name",
        valueField: "value",
        showRank: true,
        maxItems: 5,
        staticData: [
          { rank: 1, name: "导航栏", value: 100 },
          { rank: 2, name: "图表", value: 98 },
          { rank: 3, name: "表单", value: 96 },
          { rank: 4, name: "表格", value: 95 },
          { rank: 5, name: "微应用", value: 92 },
        ],
      },
      { groupId: groupDataId, idSuffix: "top-list" },
    ),
    createTestWidget(
      "search",
      "搜索",
      { x: 0, y: 28, w: 10, h: 4, minW: 4, minH: 2 },
      {
        placeholder: "请输入组件名称",
        buttonText: "搜索",
        showClearButton: true,
        layout: "inline",
        submitMethod: "eventRoute",
        searchFields: [
          { id: "keyword", name: "keyword", label: "关键词", type: "input", placeholder: "组件名称" },
          { id: "status", name: "status", label: "状态", type: "select", options: queryOptions, defaultValue: "" },
        ],
      },
      { groupId: groupDataId, idSuffix: "search" },
    ),
    createTestWidget(
      "queryFilter",
      "查询筛选",
      { x: 10, y: 28, w: 16, h: 6, minW: 6, minH: 3 },
      {
        formLayout: "vertical",
        layoutCols: 4,
        submitMethod: "eventRoute",
        submitButtonText: "查询",
        resetButtonText: "重置",
        showResetButton: true,
        queryFields: [
          { id: "q-keyword", type: "input", label: "关键词", field: "keyword", placeholder: "请输入关键词" },
          { id: "q-status", type: "select", label: "状态", field: "status", dataSourceType: "manual", manualOptions: queryOptions },
          { id: "q-date", type: "datePicker", label: "日期", field: "date", pickerType: "date" },
          { id: "q-score", type: "inputNumber", label: "评分", field: "score", min: 0, max: 100 },
        ],
      },
      { groupId: groupDataId, idSuffix: "query-filter" },
    ),
    createTestWidget(
      "dataTable",
      "数据表格",
      { x: 26, y: 28, w: 10, h: 8, minW: 6, minH: 4 },
      {
        dataSource: "static",
        rowKey: "key",
        columns: [
          { title: "组件", dataIndex: "name", width: 120 },
          { title: "类型", dataIndex: "type", width: 120 },
          { title: "状态", dataIndex: "status", width: 100 },
        ],
        staticData: [
          { key: "1", name: "HeaderBar", type: "导航", status: "正常" },
          { key: "2", name: "DataTable", type: "数据", status: "正常" },
          { key: "3", name: "NativeForm", type: "表单", status: "正常" },
          { key: "4", name: "MicroApp", type: "微应用", status: "降级" },
        ],
        paginationMode: "pagination",
        paginationConfig: { page: 1, pageSize: 3, showTotal: true },
      },
      { groupId: groupDataId, idSuffix: "data-table" },
    ),
    createTestWidget("cardGrid", "卡片网格", { x: 0, y: 36, w: 8, h: 6, minW: 4, minH: 3 }, {}, { idSuffix: "card-grid" }),
    createTestWidget(
      "customForm",
      "自定义表单",
      { x: 8, y: 36, w: 10, h: 11, minW: 4, minH: 4 },
      {
        submitMethod: "eventRoute",
        fields: [
          { id: "cf-name", type: "input", label: "姓名", field: "name", required: true, placeholder: "请输入姓名" },
          { id: "cf-type", type: "select", label: "类型", field: "type", dataSourceType: "manual", manualOptions: queryOptions },
          { id: "cf-date", type: "datePicker", label: "日期", field: "date", pickerType: "date" },
          { id: "cf-remark", type: "textarea", label: "备注", field: "remark", placeholder: "请输入备注" },
        ],
      },
      { idSuffix: "custom-form" },
    ),
    createTestWidget(
      "nativeForm",
      "原生表单",
      { x: 18, y: 36, w: 12, h: 12, minW: 8, minH: 8 },
      {
        contentPadding: 0,
        formSchema: {
          version: 1,
          meta: { name: "移动端原生表单", description: "用于测试 NativeFormWidget 手机预览" },
          layout: {
            mode: "vertical",
            labelWidth: 96,
            labelCol: { span: 24 },
            wrapperCol: { span: 24 },
            fieldSpacing: 16,
            labelAlign: "left",
            colon: true,
            size: "middle",
            variant: "outlined",
          },
          children: nativeFormChildren,
        },
        submitConfig: {
          mode: "eventRoute",
          eventRoutes: [],
          submitButtonText: "提交",
          successMessage: "提交成功",
          failureMessage: "提交失败",
        },
        appearance: {
          bordered: true,
          padding: "12px",
          borderRadius: "8px",
          backgroundColor: "#ffffff",
          borderColor: "#e5e7eb",
          boxShadow: "",
        },
      },
      { idSuffix: "native-form" },
    ),
    createTestWidget(
      "nativeFormField",
      "原生表单字段",
      { x: 30, y: 36, w: 6, h: 5, minW: 2, minH: 2 },
      {
        field: createNativeFormField("select", "独立字段", "standaloneStatus", {
          dataSourceType: "manual",
          options: queryOptions,
          placeholder: "请选择",
          defaultValue: "normal",
        }),
        runtime: { mode: "standalone", emitOnChange: true },
        eventConfig: { changeRoutes: [], clickRoutes: [] },
      },
      { idSuffix: "native-form-field" },
    ),
    createTestWidget(
      "iconNav",
      "图标导航",
      { x: 0, y: 48, w: 4, h: 4, minW: 1, minH: 1 },
      {
        showTitle: false,
        icon: "AppstoreOutlined",
        url: "#/publish-list",
        openInNew: false,
        iconSize: 42,
        iconColor: "#2a9d8f",
      },
      { idSuffix: "icon-nav" },
    ),
    createTestWidget(
      "navGroup",
      "导航组",
      { x: 4, y: 48, w: 12, h: 10, minW: 4, minH: 4 },
      {
        layout: "grid",
        columns: 4,
        showLabel: true,
        iconSize: 40,
        itemGap: 12,
        staticItems: navItems.map((item, index) => ({
          ...item,
          iconBgColor: ["#e0f2fe", "#dcfce7", "#fef3c7", "#fee2e2"][index],
          iconColor: ["#0284c7", "#16a34a", "#d97706", "#dc2626"][index],
          textColor: "#1f2937",
        })),
      },
      { idSuffix: "nav-group" },
    ),
    createTestWidget(
      "microApp",
      "微应用",
      { x: 16, y: 48, w: 10, h: 6, minW: 2, minH: 2 },
      {
        systemId: "mobile-test-system",
        moduleId: "mobile-test-module",
        microAppUrl: "about:blank",
        microAppEntry: "about:blank",
        sync: false,
        alive: true,
        props: { source: "mobile-preview-test" },
      },
      { idSuffix: "micro-app" },
    ),
    createTestWidget(
      "myDocuments",
      "我的文档",
      { x: 26, y: 48, w: 10, h: 5, minW: 1, minH: 1 },
      {
        showTitle: false,
        contentPadding: 0,
        btnColor: "#2a9d8f",
        btnTextColor: "#ffffff",
      },
      { idSuffix: "my-documents" },
    ),
  ];

  chartPresetList.forEach((preset, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    widgets.push(createTestWidget(
      "chart",
      chartPresetTitleMap[preset],
      { x: col * 12, y: 58 + row * 9, w: 12, h: 9, minW: 4, minH: 4 },
      {
        chartPreset: preset,
        chartType: preset,
        dataSource: "static",
        staticData: commonChartData,
        categoryField: "name",
        valueField: "value",
        seriesField: "category",
        xField: "name",
        yField: "value",
        value2Field: "value2",
        showLegend: true,
        showTooltip: true,
        colors: ["#2a9d8f", "#457b9d", "#e9c46a", "#e76f51", "#8ab17d"],
      },
      { idSuffix: `chart-${preset}` },
    ));
  });

  return {
    id: "canglan",
    title: "苍澜测试",
    status: APP_STATUS_PUBLISHED,
    publishedAt: "2026-01-19 16:58:02",
    createdAt: "2026-01-19 16:58:02",
    updatedAt: "2026-06-25 10:00:00",
    widgets,
    groups: [
      {
        id: groupBasicId,
        title: "基础组件分组",
        widgetIds: [
          "mobile-test-typography-typography",
          "mobile-test-richtext-rich-text",
          "mobile-test-clock-clock",
          "mobile-test-stats-stats",
          "mobile-test-indicatorcard-indicator-card",
          "mobile-test-indicatorcardlist-indicator-list",
          "mobile-test-recognitioncard-recognition-card",
          "mobile-test-carousel-carousel",
        ],
        layout: createLayout(groupBasicId, 0, 2, 36, 16, 4, 4),
        config: {
          showTitle: true,
          titleColor: "#123c69",
          titleFontSize: 16,
          titleFontWeight: 700,
          backgroundType: "color",
          backgroundColor: "rgba(255,255,255,0.72)",
          borderStyle: "solid",
          borderColor: "rgba(42,157,143,0.22)",
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
        },
      },
      {
        id: groupDataId,
        title: "数据与交互分组",
        widgetIds: [
          "mobile-test-link-link",
          "mobile-test-pagenavigator-page-navigator",
          "mobile-test-news-news",
          "mobile-test-toplist-top-list",
          "mobile-test-search-search",
          "mobile-test-queryfilter-query-filter",
          "mobile-test-datatable-data-table",
        ],
        layout: createLayout(groupDataId, 0, 18, 36, 18, 4, 4),
        config: {
          showTitle: true,
          titleColor: "#123c69",
          titleFontSize: 16,
          titleFontWeight: 700,
          backgroundType: "color",
          backgroundColor: "rgba(255,255,255,0.72)",
          borderStyle: "solid",
          borderColor: "rgba(69,123,157,0.22)",
          borderWidth: 1,
          borderRadius: 8,
          padding: 10,
        },
      },
    ],
    floatingModules: [
      {
        id: "mobile-test-floating-micro-app",
        type: "floatingModule",
        title: "微应用（悬浮）",
        layout: createLayout("mobile-test-floating-micro-app", 0, 0, 4, 4, 1, 1),
        config: {
          title: "微应用（悬浮）",
          showTitle: true,
          contentType: "microApp",
          microApp: {
            systemId: "mobile-test-system",
            moduleId: "floating-module",
            url: "about:blank",
            entry: "about:blank",
            props: { source: "floating-mobile-preview-test" },
            sync: false,
            alive: true,
          },
          defaultPosition: "bottom-right",
          positionRatio: { x: 0.84, y: 0.72 },
          width: 360,
          height: 420,
          collapsedWidth: 56,
          collapsedHeight: 56,
          collapsedIcon: "RobotOutlined",
          collapsedBgColor: "#2a9d8f",
          collapsedIconSize: 24,
          draggable: true,
          resizable: true,
          collapsible: true,
          closable: false,
          isExpanded: false,
          showHeader: true,
          theme: "light",
          borderRadius: 12,
          zIndex: 1000,
        },
      },
      {
        id: "mobile-test-floating-assistant-hub",
        type: "floatingModule",
        title: "助手中心",
        layout: createLayout("mobile-test-floating-assistant-hub", 0, 0, 4, 4, 1, 1),
        config: {
          title: "助手中心",
          showTitle: true,
          contentType: "localComponent",
          localComponent: {
            componentType: "assistantHub",
            componentProps: {
              title: "移动预览助手",
              entries: [
                { id: "entry-1", title: "组件检查", description: "查看手机端组件渲染" },
                { id: "entry-2", title: "问题记录", description: "记录适配问题" },
              ],
            },
          },
          defaultPosition: "bottom-left",
          positionRatio: { x: 0.04, y: 0.72 },
          width: 360,
          height: 460,
          collapsedWidth: 56,
          collapsedHeight: 56,
          collapsedIcon: "RobotOutlined",
          collapsedBgColor: "#123c69",
          collapsedIconSize: 24,
          draggable: true,
          resizable: true,
          collapsible: true,
          closable: false,
          isExpanded: false,
          showHeader: true,
          theme: "light",
          borderRadius: 12,
          zIndex: 1001,
        },
      },
    ],
    dashboardConfig: {
      title: "苍澜测试",
      backgroundType: "gradient",
      backgroundColor: "#f6f8fb",
      backgroundGradient: "linear-gradient(180deg, #eef6ff 0%, #f7fbf8 52%, #ffffff 100%)",
      themeMode: "light",
      themePreset: "blue",
      styleMode: "normal",
      styleTokens: {
        card: {
          background: "#ffffff",
          borderRadius: 8,
          borderColor: "#dbeafe",
          boxShadow: "0 8px 24px rgba(18, 60, 105, 0.08)",
        },
      },
    },
  };
};

const ensureSeededDashboards = () => {
  if (seedsInitialized) {
    return;
  }
  const seededDashboards = {
    canglan: {
      id: "canglan",
      title: "苍澜测试",
      publishedAt: "2026-01-19 16:58:02",
      widgets: [
        {
          id: "aec0f5e8-6837-4bfa-b797-870712be15db",
          type: "headerBar",
          title: "“沧澜”垂域新质生产力引擎",
          layout: {
            h: 2,
            i: "aec0f5e8-6837-4bfa-b797-870712be15db",
            w: 36,
            x: 0,
            y: 0,
            minH: 1,
            minW: 1,
          },
          config: {
            title: "头部栏",
            showTitle: false,
            textColor: "#ffffff",
            fontFamily: "YouSheBiaoTiHei",
            titleColor: "rgb(34,34,34)",
            headerTitle: "",
            backdropBlur: 0,
            backgroundType: "color",
            headerFontSize: 32,
            backgroundColor: "rgba(255,255,255,0)",
            backgroundImage: "",
            headerAlignment: "left",
            showUserProfile: true,
            backgroundRepeat: "no-repeat",
            showThemeSwitcher: false,
            titleUseGlobalConfig: false,
            backgroundUseGlobalConfig: false,
            navDataSource: "customApi",
          },
        },
        {
          id: "b4b2babb-ab78-42fb-ad21-1569467d18e8",
          type: "dataTable",
          title: "推理任务列表",
          layout: {
            w: 7,
            h: 9,
            x: 19,
            y: 15,
            minW: 6,
            minH: 4,
            i: "b4b2babb-ab78-42fb-ad21-1569467d18e8",
          },
          config: {
            title: "DataTable",
            showTitle: true,
            refreshInterval: 60,
            titleUseGlobalConfig: false,
            titleColor: "rgb(255,255,255)",
            titleFontSize: 16,
            titleFontWeight: 700,
            backgroundUseGlobalConfig: false,
            backgroundType: "color",
            backgroundColor: "rgba(0,0,0,0)",
            rowKey: "id",
            size: "small",
            bordered: false,
            scrollY: 160,
            dataSource: "customApi",
            paginationMode: "none",
            columns: [
              {
                title: "任务id",
                dataIndex: "id",
                type: "text",
                align: "left",
                sorter: false,
              },
              {
                title: "任务名称",
                dataIndex: "task name",
                type: "text",
                align: "left",
              },
              {
                title: "任务描述",
                dataIndex: "task description",
                type: "text",
                align: "left",
                sorter: false,
              },
            ],
            backdropBlur: 10,
            apiEndpoint:
              "http://can.yisa.com.cn:30080/Aurora/api/infer-task/list",
            apiMethod: "GET",
            apiListField: "data",
            apiQuery: '{\n  "page": 1,\n  "page_size": 30\n}',
          },
          refreshCount: 1,
          groupId: "group-1780364027990",
        },
        {
          id: "fd8c14e1-463b-43c1-be1a-bf79042e7af5",
          type: "chart",
          title: "万象 · 数据来源分布",
          layout: {
            w: 7,
            h: 9,
            x: 27,
            y: 15,
            minW: 4,
            minH: 4,
            i: "fd8c14e1-463b-43c1-be1a-bf79042e7af5",
          },
          config: {
            title: "基础折线图",
            showTitle: true,
            refreshInterval: 60,
            chartPreset: "pie",
            dataSource: "dataSource",
            chartTitle: "",
            chartSubTitle: "",
            gridTop: 0,
            gridBottom: 0,
            gridLeft: "0",
            gridRight: "0",
            showAxisLabel: true,
            showSplitLine: true,
            categoryField: "name",
            valueField: "count",
            smooth: true,
            showLegend: true,
            showTooltip: true,
            showLabel: true,
            showArea: false,
            areaOpacity: 20,
            lineWidth: 3,
            symbolSize: 10,
            colors: [
              "#1677ff",
              "#36cfc9",
              "#f59e0b",
              "#ef4444",
              "#8b5cf6",
              "#22c55e",
            ],
            nameField: "name",
            titleUseGlobalConfig: false,
            titleColor: "rgb(255,255,255)",
            apiEndpoint:
              "http://can.yisa.com.cn:30080/das-prod/api/v1/portal/data-statistics",
            backgroundUseGlobalConfig: false,
            backgroundType: "color",
            backgroundColor: "rgba(255,255,255,0)",
            dataSourceId: "8443ddde-27e2-498f-b62d-576965cdc2d2",
            timeout: 10000,
            legendPosition: "bottom",
            labelPosition: "outer",
            apiMethod: "GET",
            apiDataField: "data.sourceDistribution.items",
            backdropBlur: 10,
          },
          groupId: "group-1780364027990",
        },
        {
          id: "d4d41fb2-f037-4f28-8b53-b43c8aa0abab",
          type: "microApp",
          title: "对话框应用",
          layout: {
            i: "d4d41fb2-f037-4f28-8b53-b43c8aa0abab",
            x: 10,
            y: 7,
            w: 16,
            h: 4,
            minW: 1,
            minH: 1,
          },
          config: {
            title: "对话框应用",
            showTitle: false,
            refreshInterval: 1200,
            systemId: "f1e86847-b5da-426d-aee7-8fb66c2d3ffe",
            moduleId: "3eac3e94-4c24-4436-ac45-f48479a3fce0",
            microAppUrl: "http://can.yisa.com.cn:30080/Seaie/CanLan/ChatInput",
            microAppEntry:
              "http://can.yisa.com.cn:30080/Seaie/CanLan/ChatInput",
            sync: true,
            alive: true,
            icon: "AppstoreOutlined",
            forceIconOnly: false,
            titleUseGlobalConfig: false,
            eventRoutes: [],
            backgroundUseGlobalConfig: false,
            backgroundType: "color",
            backgroundColor: "#00000000",
            contentPadding: 5,
          },
        },
        {
          id: "0f769570-c0d2-4850-9e46-272a07b24fa7",
          type: "microApp",
          title: "乾宇-知识库",
          layout: {
            i: "0f769570-c0d2-4850-9e46-272a07b24fa7",
            x: 3,
            y: 24,
            w: 6,
            h: 9,
            minW: 1,
            minH: 1,
          },
          config: {
            title: "乾宇-知识库",
            showTitle: false,
            refreshInterval: 1200,
            systemId: "f1e86847-b5da-426d-aee7-8fb66c2d3ffe",
            moduleId: "4dcc267a-1c1b-4c11-99f2-16f189237392",
            microAppUrl:
              "http://can.yisa.com.cn:30080/Seaie/CanLan/knowledge-base",
            microAppEntry:
              "http://can.yisa.com.cn:30080/Seaie/CanLan/knowledge-base",
            sync: true,
            alive: true,
            icon: "",
            forceIconOnly: false,
            titleUseGlobalConfig: false,
            eventRoutes: [],
            backgroundUseGlobalConfig: false,
            backgroundGlobalThemeId: "6527ddd5-42e9-4023-a399-2d8581ec7b47",
            backgroundType: "color",
            backgroundColor: "#00000000",
            backgroundImage: null,
            contentPadding: 0,
          },
          groupId: "group-1780364027990",
        },
        {
          id: "0e5014cc-5ef5-4634-a150-f1fc3ace4cf0",
          type: "navGroup",
          title: "导航",
          layout: {
            w: 8,
            h: 9,
            x: 3,
            y: 15,
            minW: 4,
            minH: 4,
            i: "0e5014cc-5ef5-4634-a150-f1fc3ace4cf0",
          },
          config: {
            title: "导航组",
            showTitle: false,
            refreshInterval: 1200,
            layout: "grid",
            columns: 3,
            showLabel: true,
            iconSize: 42,
            itemIconColor: "#ffffff",
            itemGap: 12,
            titleUseGlobalConfig: false,
            titleColor: "#222222",
            backgroundUseGlobalConfig: false,
            backgroundType: "color",
            backgroundColor: "rgba(0,0,0,0)",
            contentPadding: 15,
            backdropBlur: 10,
            itemBgColor: "rgba(255,255,255,0.20)",
            itemTextColor: "#222",
            dataSource: "static",
            itemBorderRadius: 16,
            staticItems: [
              {
                name: "乾宇-创建应用",
                icon: "fill_moxingguanli",
                url: "/Seaie/create-app",
                iconBgColor: "rgb(255,255,255)",
                iconColor: "rgb(22,94,252)",
                textColor: "rgb(255,255,255)",
                systemId: "seale",
                openInNew: true,
              },
              {
                name: "乾宇-插件中心",
                icon: "morenyingyong",
                url: "/Seaie/tools",
                iconBgColor: "rgb(255,255,255)",
                iconColor: "rgb(22,94,252)",
                textColor: "rgb(255,255,255)",
                systemId: "seale",
                openInNew: true,
              },
              {
                name: "万象-工作台",
                icon: "gongzuotai-shujujianmo",
                url: "/DAS/#/datacleaning",
                iconBgColor: "rgb(255,255,255)",
                iconColor: "rgb(22,94,252)",
                textColor: "rgb(255,255,255)",
                systemId: "das",
                openInNew: true,
              },
              {
                name: "万象-我的资源",
                icon: "wodeziyuan-shujuziyuan",
                url: "/DAS/#/tablesource",
                iconBgColor: "rgb(255,255,255)",
                iconColor: "rgb(22,94,252)",
                textColor: "rgb(255,255,255)",
                systemId: "das",
                openInNew: true,
              },
              {
                name: "极光-训练管理",
                icon: "fill_gongzuotai",
                url: "/Aurora/#/workspace",
                iconBgColor: "rgb(255,255,255)",
                iconColor: "rgb(22,94,252)",
                textColor: "rgb(255,255,255)",
                systemId: "aurora",
                openInNew: true,
              },
              {
                name: "极光-算法仓库",
                icon: "fill_bushuguanli",
                url: "/Aurora/#/algorithm-repository",
                iconBgColor: "rgb(255,255,255)",
                iconColor: "rgb(22,94,252)",
                textColor: "rgb(255,255,255)",
                systemId: "aurora",
                openInNew: true,
              },
            ],
          },
          groupId: "group-1780364027990",
          refreshCount: 1,
        },
        {
          id: "ce04dde3-dfea-4fb9-a710-077fc7031e93",
          type: "microApp",
          title: "乾宇-知识库 副本",
          layout: {
            i: "ce04dde3-dfea-4fb9-a710-077fc7031e93",
            x: 11,
            y: 15,
            w: 7,
            h: 9,
            minW: 1,
            minH: 1,
          },
          config: {
            title: "乾宇-知识库 副本",
            showTitle: false,
            refreshInterval: 1200,
            systemId: "f1e86847-b5da-426d-aee7-8fb66c2d3ffe",
            moduleId: "4dcc267a-1c1b-4c11-99f2-16f189237392",
            microAppUrl:
              "http://can.yisa.com.cn:30080/Seaie/CanLan/knowledge-base",
            microAppEntry:
              "http://can.yisa.com.cn:30080/Seaie/CanLan/knowledge-base",
            sync: true,
            alive: true,
            icon: "",
            forceIconOnly: false,
            titleUseGlobalConfig: false,
            eventRoutes: [],
            backgroundUseGlobalConfig: false,
            backgroundGlobalThemeId: "6527ddd5-42e9-4023-a399-2d8581ec7b47",
            backgroundType: "color",
            backgroundColor: "#00000000",
            backgroundImage: null,
            contentPadding: 0,
          },
          groupId: "group-1780364027990",
          refreshCount: 0,
        },
      ],
      groups: [
        {
          id: "group-1780363356960",
          title: "logo",
          widgetIds: [],
          layout: {
            w: 4,
            h: 2,
            x: 16,
            y: 4,
            minW: 2,
            minH: 2,
            i: "group-1780363356960",
          },
          config: {
            showTitle: false,
            borderStyle: "none",
            borderWidth: 2,
            borderRadius: 8,
            backgroundType: "image",
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            titleUseGlobalConfig: false,
            backgroundUseGlobalConfig: false,
            backgroundImage:
              "http://can.yisa.com.cn:30080/canglan-trial/static/uploads/2026_06_02/092554_212773.png",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          },
        },
        {
          id: "group-1780364027990",
          title: "分组 4",
          widgetIds: [
            "0e5014cc-5ef5-4634-a150-f1fc3ace4cf0",
            "ce04dde3-dfea-4fb9-a710-077fc7031e93",
            "b4b2babb-ab78-42fb-ad21-1569467d18e8",
            "fd8c14e1-463b-43c1-be1a-bf79042e7af5",
            "0f769570-c0d2-4850-9e46-272a07b24fa7",
          ],
          layout: {
            w: 31,
            h: 11,
            x: 3,
            y: 13,
            minW: 2,
            minH: 2,
            i: "group-1780364027990",
          },
          config: {
            showTitle: false,
            borderStyle: "none",
            borderWidth: 2,
            borderRadius: 8,
            backgroundType: "color",
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            titleUseGlobalConfig: false,
            backgroundUseGlobalConfig: false,
          },
        },
      ],
      floatingModules: [
        {
          id: "floating-module-1777269270513",
          type: "floatingModule",
          title: "chat对话",
          layout: {
            i: "floating-module-1777269270513",
            x: 0,
            y: 0,
            w: 0,
            h: 0,
          },
          config: {
            contentType: "microApp",
            microApp: {
              systemId: "f1e86847-b5da-426d-aee7-8fb66c2d3ffe",
              moduleId: "c386a784-2aed-41c4-9e90-b8dd939c749e",
              url: "http://can.yisa.com.cn:30080/Seaie/CanLan/chat",
              entry: "http://can.yisa.com.cn:30080/Seaie/CanLan/chat",
            },
            icon: "http://can.yisa.com.cn:30080/canglan-trial/static/uploads/2026_04_16/144545_215065.gif",
            iconSvg: null,
            defaultPosition: "bottom-right",
            minWidth: 300,
            minHeight: 400,
            isExpanded: false,
            draggable: true,
            resizable: true,
            collapsible: true,
            showHeader: true,
            borderRadius: 12,
            zIndex: 9999,
            position: {
              x: 1751,
              y: 767,
            },
            positionRatio: {
              x: 1,
              y: 1,
            },
            showTitle: true,
            titleColor: "#222222",
            maxWidth: 800,
            maxHeight: 900,
            backgroundType: "color",
            backgroundColor: "rgb(255,255,255)",
            collapsedWidth: 80,
            collapsedHeight: 80,
            collapsedIcon: "",
            collapsedBgColor: "rgba(255,255,255,0)",
            collapsedIconSize: 80,
            backdropBlur: 10,
          },
        },
      ],
      dashboardConfig: {
        backgroundType: "image",
        title: "沧澜门户（新极简）",
        styleMode: "minimal",
        themeMode: "dark",
        baseColors: {
          primary: "#1890ff",
          brand: "#667eea",
          success: "#52c41a",
          warning: "#faad14",
          error: "#f5222d",
          info: "#1890ff",
        },
        styleTokens: {
          widget: {
            background: "rgba(116,143,184,0.20)",
            backdropFilter: "blur(23px)",
            borderRadius: 14,
            borderColor: "transparent",
            borderWidth: 1,
            titleColor: "rgba(255, 255, 255, 0.95)",
            textColor: "rgba(255, 255, 255, 0.75)",
          },
          card: {
            background: "rgba(116,143,184,0.20)",
            backdropFilter: "blur(23px)",
            borderRadius: 12,
          },
        },
        themePreset: "light",
        backgroundColor: "#f5f5f5",
        backgroundImage:
          "http://can.yisa.com.cn:30080/canglan-trial/static/uploads/2026_06_02/092333_554595.png",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        pageBackgroundUseGlobalConfig: false,
      },
    },
    pub_1: {
      id: "pub_1",
      title: "沧澜门户（极简）",
      widgets: [
        {
          id: "aec0f5e8-6837-4bfa-b797-870712be15db",
          type: "headerBar",
          title: "“沧澜”垂域新质生产力引擎",
          layout: {
            h: 2,
            i: "aec0f5e8-6837-4bfa-b797-870712be15db",
            w: 36,
            x: 0,
            y: 0,
            minH: 1,
            minW: 1,
          },
          config: {
            title: "顶部栏",
            showTitle: false,
            textColor: "#ffffff",
            fontFamily: "YouSheBiaoTiHei",
            titleColor: "rgb(34,34,34)",
            headerTitle: "“沧澜”垂域新质生产力引擎",
            backdropBlur: 20,
            backgroundType: "color",
            headerFontSize: 32,
            backgroundColor: "rgba(255,255,255,0.2)",
            backgroundImage: "",
            headerAlignment: "left",
            showUserProfile: true,
            backgroundRepeat: "no-repeat",
            showThemeSwitcher: false,
          },
          groupId: null,
        },
        {
          id: "6cfa3270-3f0a-49b6-b26d-6c42a64bde2b",
          type: "microApp",
          title: "门户对话框",
          layout: {
            h: 2,
            i: "6cfa3270-3f0a-49b6-b26d-6c42a64bde2b",
            w: 16,
            x: 10,
            y: 6,
            minH: 1,
            minW: 1,
          },
          config: {
            icon: "AppstoreOutlined",
            sync: true,
            alive: true,
            title: "门户对话框",
            moduleId: "7670dd74-b3a1-42a8-aaa0-7facaf8e46ff",
            systemId: "c666d5f4-1b82-448c-9b81-0529a6da6cb7",
            showTitle: false,
            eventRoutes: [],
            microAppUrl: "http://192.168.5.57:9998/ChatInput",
            forceIconOnly: false,
            microAppEntry: "http://192.168.5.57:9998/ChatInput",
            backgroundType: "color",
            backgroundColor: "#00000000",
            backgroundImage: "",
            refreshInterval: 60,
          },
          groupId: null,
        },
        {
          id: "ecf35776-fd20-4f2c-9345-62e31d13d6bf",
          type: "typography",
          title: "文本组件",
          layout: {
            h: 2,
            i: "ecf35776-fd20-4f2c-9345-62e31d13d6bf",
            w: 16,
            x: 10,
            y: 4,
            minH: 1,
            minW: 1,
          },
          config: {
            color: "#ffffff",
            level: 1,
            title: "文本组件",
            content: "沧澜，你的超级工作助手",
            fontSize: 32,
            showTitle: false,
            textAlign: "center",
            fontWeight: "bold",
            titleColor: "#222222",
            backdropBlur: 1,
            backgroundType: "color",
            backgroundColor: "rgba(255,255,255,0)",
            backgroundImage: "",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
          },
          groupId: null,
        },
        {
          id: "c8ec74c4-196d-4432-b2e6-765c88df6f85",
          type: "typography",
          title: "Typography",
          layout: {
            h: 2,
            i: "c8ec74c4-196d-4432-b2e6-765c88df6f85",
            w: 3,
            x: 8,
            y: 14,
            minH: 1,
            minW: 2,
          },
          config: {
            color: "#ffffff",
            level: 2,
            title: "文本组件",
            content: "推荐",
            fontSize: 22,
            showTitle: false,
            textAlign: "left",
            fontWeight: "bold",
            titleColor: "#222222",
            backdropBlur: 1,
            backgroundType: "color",
            backgroundColor: "rgba(255,255,255,0)",
          },
          groupId: null,
        },
        {
          id: "a3748fa7-4e03-402f-bdb9-c87fef4a74c7",
          type: "navGroup",
          title: "NavGroup",
          layout: {
            h: 5,
            i: "a3748fa7-4e03-402f-bdb9-c87fef4a74c7",
            w: 21,
            x: 8,
            y: 15,
            minH: 4,
            minW: 4,
          },
          config: {
            title: "导航组",
            layout: "tag",
            columns: 4,
            itemGap: 12,
            tagBlur: 16,
            iconSize: 32,
            tagColor: "rgba(255,255,255,0.2)",
            showLabel: true,
            showTitle: false,
            titleColor: "#222222",
            apiEndpoint:
              "http://192.168.5.60:29081/Seaie-api/canglan/recommend",
            backdropBlur: 1,
            tagTextColor: "rgb(255,255,255)",
            itemIconColor: "#ffffff",
            backgroundType: "color",
            backgroundColor: "rgba(0,0,0,0)",
            tagBorderRadius: 14,
          },
          groupId: null,
        },
      ],
      groups: [],
      floatingModules: [
        {
          id: "floating-module-1767761084553",
          type: "floatingModule",
          title: "chat对话",
          layout: {
            h: 0,
            i: "floating-module-1767761084553",
            w: 0,
            x: 0,
            y: 0,
          },
          config: {
            icon: "MessageOutlined",
            theme: "auto",
            zIndex: 9999,
            closable: true,
            maxWidth: 800,
            microApp: {
              url: "http://192.168.5.57:9998/chat",
              entry: "http://192.168.5.57:9998/chat",
              moduleId: "caf58685-6480-4b2c-95f2-efaa924359ad",
              systemId: "c666d5f4-1b82-448c-9b81-0529a6da6cb7",
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
            titleColor: "#222222",
            collapsible: true,
            contentType: "microApp",
            borderRadius: 12,
            collapsedIcon:
              "http://192.168.5.60:29081/canglan-trial/static/uploads/2026_01_27/181935_852535.gif",
            backgroundType: "image",
            collapsedWidth: 64,
            collapsedHeight: 64,
            defaultPosition: "bottom-right",
            backgroundRepeat: "no-repeat",
            collapsedBgColor: "rgba(22,119,255,0)",
            collapsedIconSize: 64,
          },
        },
      ],
      dashboardConfig: {
        title: "沧澜门户（极简）",
        backgroundType: "image",
        backgroundColor: "#f5f5f5",
        backgroundImage:
          "http://192.168.5.60:29081/canglan-trial/static/uploads/2026_01_26/113041_636364.png",
      },
      publishedAt: "2026-01-26 14:53:23",
    },
    pub_2: {
      id: "pub_2",
      title: "22",
      widgets: [
        {
          id: "882d2666-2a8d-4f77-97bd-927d3f748de7",
          type: "headerBar",
          title: "HeaderBar",
          layout: {
            w: 36,
            h: 2,
            x: 0,
            y: 0,
            minW: 1,
            minH: 1,
            i: "882d2666-2a8d-4f77-97bd-927d3f748de7",
          },
          config: {
            title: "导航栏",
            showTitle: false,
            headerTitle: "导航栏",
            fontFamily: "YouSheBiaoTiHei",
            backgroundType: "gradient",
            showNavMenu: false,
            navDataSource: "static",
            titleColor: "rgb(255,255,255)",
            backgroundColor: "#ffffff",
            backgroundGradient:
              "linear-gradient(to top, #30cfd0 0%, #330867 100%)",
            headerAlignment: "left",
            textColor: "rgb(255,255,255)",
          },
        },
        {
          id: "de3d57d2-a135-42e9-87e7-fa191f9acbb4",
          type: "microApp",
          title: "表单",
          layout: {
            i: "de3d57d2-a135-42e9-87e7-fa191f9acbb4",
            x: 0,
            y: 2,
            w: 36,
            h: 4,
            minW: 1,
            minH: 1,
          },
          config: {
            title: "表单",
            showTitle: true,
            refreshInterval: 60,
            systemId: "db_001",
            moduleId: "db_mod_001",
            microAppUrl: "http://localhost:8083/#/input-only",
            microAppEntry: "http://localhost:8083/#/input-only",
            sync: true,
            alive: true,
            icon: "http://192.168.13.31:8083/static/images/gongan.png",
          },
        },
        {
          id: "19d9384c-48e4-49d4-a89f-49173cd5c28a",
          type: "dataTable",
          title: "DataTable",
          layout: {
            w: 8,
            h: 7,
            x: 0,
            y: 6,
            minW: 6,
            minH: 4,
            i: "19d9384c-48e4-49d4-a89f-49173cd5c28a",
          },
          config: {
            title: "DataTable",
            showTitle: true,
            refreshInterval: 60,
          },
        },
        {
          id: "2433a113-03a1-4060-ae03-3ebb95471b84",
          type: "microApp",
          title: "结果页",
          layout: {
            i: "2433a113-03a1-4060-ae03-3ebb95471b84",
            x: 8,
            y: 6,
            w: 28,
            h: 11,
            minW: 1,
            minH: 1,
          },
          config: {
            title: "结果页",
            showTitle: true,
            refreshInterval: 60,
            systemId: "db_002",
            moduleId: "db_mod_002",
            microAppUrl: "http://192.168.13.31:8083/#/table-only",
            microAppEntry: "http://192.168.13.31:8083/",
            sync: true,
            alive: true,
            icon: "https://via.placeholder.com/300x200/FF9800/FFFFFF?text=财务报表",
          },
        },
      ],
      groups: [],
      floatingModules: [],
      dashboardConfig: {
        backgroundType: "image",
        backgroundColor: "rgba(255,255,255,0.20)",
        backgroundImage:
          "http://localhost:4001/uploads/1769589303012_x1rhzhyss.png",
        themeMode: "light",
        styleMode: "minimal",
        styleTokens: {
          widget: {
            background: "rgba(255,255,255,0.20)",
            backdropFilter: "blur(10px)",
            borderRadius: 12,
            borderColor: "rgba(65,123,214,0.28)",
            borderWidth: 1,
            boxShadow: "0px 6px 12px 0px rgba(42,44,46,0.09)",
            titleColor: "#222",
            textColor: "#222",
          },
          card: {
            background: "rgba(255,255,255,0.20)",
            backdropFilter: "blur(10px)",
            borderRadius: 10,
            borderColor: "rgba(255,255,255,0.20)",
            boxShadow: "0px 6px 12px 0px rgba(42,44,46,0.09)",
          },
        },
      },
    },
    pub_3: { id: "33", publishedAt: "2026-01-01 16:58:02" },
    pub_4: { id: "44", publishedAt: "2026-01-01 16:58:02" },
    pub_5: { id: "55", publishedAt: "2026-01-01 16:58:02" },
    pub_6: { id: "66", publishedAt: "2026-01-01 16:58:02" },
    pub_7: { id: "77", publishedAt: "2026-01-01 16:58:02" },
    pub_8: { id: "88", publishedAt: "2026-01-01 16:58:02" },
    pub_9: { id: "99", publishedAt: "2026-01-01 16:58:02" },
    pub_10: { id: "10", publishedAt: "2026-01-01 16:58:02" },
    pub_11: { id: "11", publishedAt: "2026-01-01 16:58:02" },
  };

  seededDashboards.canglan = buildCanglanTestDashboard();

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
      cover_url: `http://192.168.5.47:3003/70${Random.integer(1, 8)}.jpg`,
    };
  });
  seedsInitialized = true;
};

const formatTime = (value) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const buildVersionPayload = ({
  snapshot,
  coverUrl = "",
  updatedAt = "",
  publishedAt = "",
}) => ({
  snapshot: snapshot || {},
  coverUrl,
  updatedAt,
  publishedAt,
});

const buildLegacyPayload = (dashboard) => {
  const snapshot = {
    widgets: dashboard.widgets || [],
    groups: dashboard.groups || [],
    floatingModules: dashboard.floatingModules || [],
    dashboardConfig: dashboard.dashboardConfig || {},
  };
  const time =
    dashboard.updatedAt || dashboard.publishedAt || new Date().toISOString();
  const payload = {
    schemaVersion: 2,
    createdAt: dashboard.createdAt || time,
    updatedAt: time,
    draft: null,
    published: null,
  };
  if (Number(dashboard.status) === APP_STATUS_DRAFT) {
    payload.draft = buildVersionPayload({
      snapshot,
      coverUrl: dashboard.cover_url || "",
      updatedAt: time,
    });
  } else {
    payload.published = buildVersionPayload({
      snapshot,
      coverUrl: dashboard.cover_url || "",
      updatedAt: time,
      publishedAt: dashboard.publishedAt || time,
    });
  }
  return payload;
};

const getStoragePayload = (dashboard) => {
  if (!dashboard) {
    return null;
  }
  if (dashboard.storagePayload?.schemaVersion === 2) {
    return dashboard.storagePayload;
  }
  const payload = buildLegacyPayload(dashboard);
  dashboard.storagePayload = payload;
  return payload;
};

const snapshotSignature = (versionPayload) =>
  JSON.stringify(versionPayload?.snapshot || {});

const toTimeValue = (value) => {
  if (!value) {
    return null;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
};

const resolveStatus = (payload) => {
  const draft = payload?.draft;
  const published = payload?.published;
  if (draft && !published) {
    return { status: APP_STATUS_DRAFT, statusLabel: "暂存" };
  }
  if (published) {
    if (draft) {
      const draftUpdatedAt = toTimeValue(draft.updatedAt);
      const publishedAt = toTimeValue(published.publishedAt);
      if (
        (draftUpdatedAt && publishedAt && draftUpdatedAt > publishedAt) ||
        !publishedAt
      ) {
        return { status: APP_STATUS_PENDING, statusLabel: "待发布更新" };
      }
    }
    return { status: APP_STATUS_PUBLISHED, statusLabel: "已发布" };
  }
  return { status: APP_STATUS_DRAFT, statusLabel: "暂存" };
};

const getUpdatedAt = (payload) => {
  return (
    [
      payload?.updatedAt || "",
      payload?.draft?.updatedAt || "",
      payload?.published?.updatedAt || "",
      payload?.published?.publishedAt || "",
    ]
      .filter(Boolean)
      .sort()
      .slice(-1)[0] || ""
  );
};

const getVersionPayload = (dashboard, version = "draft") => {
  const payload = getStoragePayload(dashboard);
  if (!payload) {
    return null;
  }
  if (version === "published") {
    return payload.published || null;
  }
  return payload.draft || payload.published || null;
};

const formatDashboardRecord = (dashboard, fallbackId, version = "draft") => {
  if (!dashboard) {
    return null;
  }
  const payload = getStoragePayload(dashboard);
  const currentVersion = getVersionPayload(dashboard, version);
  if (!payload || !currentVersion) {
    return null;
  }
  const { status, statusLabel } = resolveStatus(payload);
  return {
    id: dashboard.id || fallbackId,
    title: dashboard.title || "未命名工作台",
    publishTime: payload.published?.publishedAt
      ? formatTime(payload.published.publishedAt)
      : "",
    publishedAt: payload.published?.publishedAt
      ? formatTime(payload.published.publishedAt)
      : "",
    updatedAt: formatTime(getUpdatedAt(payload)),
    status,
    statusLabel,
    hasDraft: Boolean(payload.draft),
    hasPublished: Boolean(payload.published),
    dashboardConfig: JSON.stringify(currentVersion.snapshot || {}),
    coverUrl: currentVersion.coverUrl || "",
    cover_url: currentVersion.coverUrl || "",
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
router.post("/v1/dashboard/publish", async (req, res) => {
  await req.sleep(0.5);

  try {
    const {
      id: bodyId,
      title,
      dashboardConfig,
      cover_url,
      action = "publish",
    } = req.body || {};
    if (!dashboardConfig || typeof dashboardConfig !== "string") {
      throw new Error("缺少 dashboardConfig 字符串");
    }
    let parsedSnapshot;
    try {
      parsedSnapshot = JSON.parse(dashboardConfig);
    } catch (err) {
      throw new Error("dashboardConfig 格式错误");
    }

    const trimmedId =
      typeof bodyId === "string" && bodyId.trim() ? bodyId.trim() : "";
    const existingRecord = trimmedId ? mockDashboards[trimmedId] : null;
    const id = trimmedId || `pub_${Date.now()}`;
    const now = new Date().toISOString();
    const record = existingRecord || { id, createdAt: now };
    const payload = getStoragePayload(record) || {
      schemaVersion: 2,
      createdAt: now,
      updatedAt: now,
      draft: null,
      published: null,
    };
    const normalizedCoverUrl =
      cover_url || payload.draft?.coverUrl || payload.published?.coverUrl || "";
    const nextDraft = buildVersionPayload({
      snapshot: parsedSnapshot,
      coverUrl: normalizedCoverUrl,
      updatedAt: now,
    });
    payload.updatedAt = now;
    payload.draft = nextDraft;

    if (action === "publish") {
      payload.published = buildVersionPayload({
        snapshot: parsedSnapshot,
        coverUrl: normalizedCoverUrl,
        updatedAt: now,
        publishedAt: now,
      });
    }

    const { status, statusLabel } = resolveStatus(payload);
    mockDashboards[id] = {
      ...record,
      id,
      title: title || parsedSnapshot?.dashboardConfig?.title || "未命名工作台",
      status,
      storagePayload: payload,
      cover_url: payload.draft?.coverUrl || payload.published?.coverUrl || "",
      createdAt: record.createdAt || now,
      updatedAt: now,
      publishedAt: payload.published?.publishedAt || record.publishedAt || null,
    };

    console.log("[Mock] Dashboard published:", {
      id,
      title,
      widgetCount: parsedSnapshot?.widgets?.length || 0,
      groupCount: parsedSnapshot?.groups?.length || 0,
      status,
    });

    req.json.code = 20000;
    req.json.message = action === "publish" ? "发布成功" : "保存成功";
    req.json.data = {
      id,
      publishTime: payload.published?.publishedAt
        ? formatTime(payload.published.publishedAt)
        : "",
      status,
      statusLabel,
      success: true,
      updatedAt: formatTime(now),
      cover_url: payload.draft?.coverUrl || payload.published?.coverUrl || "",
      hasDraft: Boolean(payload.draft),
      hasPublished: Boolean(payload.published),
    };
  } catch (error) {
    req.json.code = 1;
    req.json.message = "发布失败: " + error.message;
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
router.get("/v1/dashboard/publish/list", async (req, res) => {
  await req.sleep(0.3);

  const { page = 1, page_size = 10, keyword = "" } = req.query;
  const currentPage = parseInt(page, 10);
  const currentPageSize = parseInt(page_size, 10);

  ensureSeededDashboards();

  const allRecords = Object.values(mockDashboards).map((record) => {
    const payload = getStoragePayload(record);
    const { status, statusLabel } = resolveStatus(payload);
    const previewPayload = payload?.draft || payload?.published || {};
    const snapshot = previewPayload?.snapshot || {};
    const updatedAt =
      record.updatedAt || record.createdAt || record.publishedAt || "";
    return {
      id: record.id,
      title: record.title,
      publishTime: payload?.published?.publishedAt
        ? formatTime(payload.published.publishedAt)
        : "",
      publishedAt: payload?.published?.publishedAt
        ? formatTime(payload.published.publishedAt)
        : "",
      status,
      statusLabel,
      componentCount: Array.isArray(snapshot.widgets)
        ? snapshot.widgets.length
        : 0,
      cover_url: previewPayload.coverUrl || "",
      hasDraft: Boolean(payload?.draft),
      hasPublished: Boolean(payload?.published),
      updatedAt,
    };
  });

  const keywordString = String(keyword || "").toLowerCase();
  const filteredData = keywordString
    ? allRecords.filter(
        (item) =>
          item.title.toLowerCase().includes(keywordString) ||
          item.id.toLowerCase().includes(keywordString),
      )
    : allRecords;

  const sortedData = filteredData.sort((a, b) => {
    const timeA = new Date(a.updatedAt || "").getTime();
    const timeB = new Date(b.updatedAt || "").getTime();
    return timeB - timeA;
  });

  const total = sortedData.length;
  const startIndex = (currentPage - 1) * currentPageSize;
  const endIndex = startIndex + currentPageSize;
  const list = sortedData.slice(startIndex, endIndex).map((item) => ({
    id: item.id,
    title: item.title,
    publishTime: item.publishTime,
    publishedAt: item.publishedAt,
    updatedAt: formatTime(item.updatedAt),
    status: item.status,
    statusLabel: item.statusLabel,
    componentCount: item.componentCount,
    cover_url: item.cover_url,
    hasDraft: item.hasDraft,
    hasPublished: item.hasPublished,
  }));

  req.json.code = 20000;
  req.json.message = "获取成功";
  req.json.data = {
    list,
    total,
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
router.get("/v1/dashboard/publish", async (req, res) => {
  await req.sleep(0.3);

  const { id, version = "draft" } = req.query;

  ensureSeededDashboards();

  if (!id) {
    req.json.code = 1;
    req.json.message = "????: id";
    req.json.data = null;
    res.json(req.json);
    return;
  }

  const dashboard = mockDashboards[id];

  if (dashboard) {
    const record = formatDashboardRecord(dashboard, id, version);
    req.json.code = 20000;
    req.json.message = "获取成功";
    req.json.data = record;
  } else {
    req.json.code = 404;
    req.json.message = "未找到工作台";
    req.json.data = null;
  }

  res.json(req.json);
});

router.post("/v1/dashboard/publish/delete", async (req, res) => {
  await req.sleep(0.3);

  const { id, target = "all" } = req.body;

  if (!id) {
    req.json.code = 1;
    req.json.message = "缺少参数: id";
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  const dashboard = mockDashboards[id];
  if (!dashboard) {
    req.json.code = 1;
    req.json.message = "应用不存在";
    req.json.data = { success: false };
    res.json(req.json);
    return;
  }

  if (target === "draft") {
    const payload = getStoragePayload(dashboard);
    if (payload?.published) {
      payload.draft = null;
      payload.updatedAt = new Date().toISOString();
      const { status, statusLabel } = resolveStatus(payload);
      dashboard.status = status;
      dashboard.storagePayload = payload;
      dashboard.updatedAt = payload.updatedAt;
      dashboard.cover_url = payload.published?.coverUrl || "";
      console.log("[Mock] Dashboard draft deleted:", id);
      req.json.code = 20000;
      req.json.message = "删除成功";
      req.json.data = { success: true, status, statusLabel };
      res.json(req.json);
      return;
    }
  }

  delete mockDashboards[id];
  if (homepageStorage.user_001?.dashboardId === id) {
    delete homepageStorage.user_001;
  }
  console.log("[Mock] Dashboard deleted:", id);

  req.json.code = 20000;
  req.json.message = "删除成功";
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
router.post("/v1/dashboard/home/configuration-json", async (req, res) => {
  await req.sleep(0.3);

  try {
    const { json_str } = req.body || {};

    if (!json_str) {
      throw new Error("缺少参数: json_str");
    }

    // 保持原始字符串形态，便于与后端对齐
    const jsonString =
      typeof json_str === "string" ? json_str : JSON.stringify(json_str);

    // 解析 json_str 验证格式
    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonString);
    } catch (err) {
      throw new Error("json_str 格式错误，无法解析为 JSON");
    }

    // 模拟获取当前用户ID（实际应从 token 中获取）
    const userId = "user_001";
    const now = new Date().toISOString();

    // 检查是否已存在暂存数据
    const existingData = configurationJsonStorage[userId];
    const id = existingData?.id || "config_" + Date.now();

    // 保存或更新暂存数据
    configurationJsonStorage[userId] = {
      id,
      user_id: userId,
      json_str: jsonString,
      created_time: existingData?.created_time || now,
      update_time: now,
    };

    console.log("[Mock] Configuration JSON saved:", {
      id,
      userId,
      dataKeys: Object.keys(parsedJson),
    });

    req.json.code = 20000;
    req.json.message = "暂存成功";
    req.json.data = { id };
  } catch (error) {
    req.json.code = 1;
    req.json.message = "暂存失败: " + error.message;
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
router.get("/v1/dashboard/home/configuration-json", async (req, res) => {
  await req.sleep(0.3);

  // 模拟获取当前用户ID（实际应从 token 中获取）
  const userId = "user_001";

  const data = configurationJsonStorage[userId];

  if (data) {
    req.json.code = 20000;
    req.json.message = "获取成功";
    req.json.data = data;
  } else {
    req.json.code = 20000;
    req.json.message = "暂无暂存数据";
    req.json.data = null;
  }

  res.json(req.json);
});

// 将 mockDashboards 导出到全局，以便 export.js 可以访问
global.mockDashboards = mockDashboards;

module.exports = router;
router.post("/v1/dashboard/homepage/set", async (req, res) => {
  await req.sleep(0.3);

  const { id } = req.body || {};
  const dashboard = mockDashboards[id];
  const payload = getStoragePayload(dashboard);

  if (!dashboard || !payload?.published) {
    req.json.code = 1;
    req.json.message = "仅已发布应用可以设置为首页";
    req.json.data = null;
    res.json(req.json);
    return;
  }

  homepageStorage.user_001 = {
    dashboardId: id,
    setAt: formatTime(new Date().toISOString()),
  };

  req.json.code = 20000;
  req.json.message = "设置成功";
  req.json.data = homepageStorage.user_001;
  res.json(req.json);
});

router.get("/v1/dashboard/homepage/current", async (req, res) => {
  await req.sleep(0.3);

  ensureSeededDashboards();
  const setting = homepageStorage.user_001;
  // const dashboard = setting ? mockDashboards[setting.dashboardId] : null;
  const dashboard = mockDashboards["pub_1"];
  const record = dashboard
    ? formatDashboardRecord(dashboard, dashboard.id, "published")
    : null;

  req.json.code = 20000;
  req.json.message = "获取成功";
  req.json.data = record;
  res.json(req.json);
});
