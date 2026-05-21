const fs = require('fs');
const path = require('path');

const PORTAL_BUILDER_ROOT = path.join(__dirname, '..', '..', '..', 'portal-builder');
const PORTAL_BUILDER_SKILL_PATH = path.join(PORTAL_BUILDER_ROOT, 'SKILL.md');
const PORTAL_BUILDER_REFERENCE_PATHS = {
  widgetMap: path.join(PORTAL_BUILDER_ROOT, 'references', 'widget-map.md'),
  layoutRules: path.join(PORTAL_BUILDER_ROOT, 'references', 'layout-rules.md'),
  jsonSchema: path.join(PORTAL_BUILDER_ROOT, 'references', 'json-schema.md'),
};

const PORTAL_BUILDER_SNIPPET_LIMIT = 8;
const PORTAL_BUILDER_SNIPPET_MAX_CHARS = 1400;
const PROMPT_REFERENCE_LIMIT = 6;
const PROMPT_REFERENCE_MAX_CHARS = 1200;
const PROMPT_WIDGET_LIMIT = 12;
const PROMPT_ARRAY_LIMIT = 8;
const PROMPT_OBJECT_KEY_LIMIT = 18;
const PROMPT_STRING_MAX_CHARS = 240;
const GRID_COLUMNS = 36;

const FULL_WIDTH_WIDGET_TYPES = new Set(['headerBar', 'carousel', 'queryFilter', 'pageNavigator']);

const WIDGET_LAYOUT_PRESETS = {
  clock: { w: 4, h: 4, minW: 3, minH: 3 },
  stats: { w: 10, h: 6, minW: 6, minH: 5 },
  indicatorCard: { w: 8, h: 5, minW: 4, minH: 4 },
  chart: { w: 8, h: 9, minW: 4, minH: 6 },
  carousel: { w: 36, h: 12, minW: 12, minH: 8 },
  link: { w: 6, h: 4, minW: 4, minH: 3 },
  news: { w: 6, h: 10, minW: 6, minH: 6 },
  topList: { w: 5, h: 9, minW: 5, minH: 6 },
  search: { w: 8, h: 4, minW: 4, minH: 3 },
  queryFilter: { w: 36, h: 5, minW: 12, minH: 3 },
  dataTable: { w: 10, h: 8, minW: 6, minH: 6 },
  cardGrid: { w: 8, h: 6, minW: 6, minH: 4 },
  customForm: { w: 10, h: 8, minW: 6, minH: 6 },
  headerBar: { w: 36, h: 2, minW: 12, minH: 2 },
  typography: { w: 6, h: 3, minW: 3, minH: 2 },
  richText: { w: 8, h: 6, minW: 6, minH: 4 },
  microApp: { w: 12, h: 8, minW: 8, minH: 6 },
  floatingModule: { w: 8, h: 6, minW: 4, minH: 4 },
  pageNavigator: { w: 36, h: 3, minW: 12, minH: 2 },
  iconNav: { w: 2, h: 3, minW: 2, minH: 3 },
  navGroup: { w: 10, h: 10, minW: 6, minH: 6 },
  myDocuments: { w: 8, h: 6, minW: 6, minH: 4 },
};

const VALID_WIDGET_TYPES = new Set([
  'clock', 'stats', 'indicatorCard', 'chart', 'carousel', 'link', 'news', 'topList',
  'search', 'queryFilter', 'dataTable', 'cardGrid', 'customForm', 'headerBar',
  'typography', 'richText', 'microApp', 'floatingModule', 'pageNavigator',
  'iconNav', 'navGroup', 'myDocuments',
]);

const DEFAULT_THEME_BY_INTENT = {
  portal: 'business',
  dashboard: 'tech',
  management: 'light',
};

const THEME_PRESETS = {
  business: {
    page: {
      backgroundType: 'gradient',
      backgroundGradient: 'linear-gradient(180deg, #F4F7FB 0%, #EEF3F8 48%, #F7F9FC 100%)',
      themeMode: 'light',
      styleMode: 'minimal',
    },
    header: {
      backgroundType: 'gradient',
      backgroundGradient: 'linear-gradient(90deg, #08182f 0%, #0d2c54 54%, #133e73 100%)',
      textColor: '#FFFFFF',
      navTextColor: '#D8E3F1',
    },
    surface: '#FFFFFF',
    richTextColor: '#1B2F46',
    title: '#102A4C',
  },
  light: {
    page: {
      backgroundType: 'gradient',
      backgroundGradient: 'linear-gradient(180deg, #F7FAFF 0%, #FFFFFF 62%, #F2F6FB 100%)',
      themeMode: 'light',
      styleMode: 'minimal',
    },
    header: {
      backgroundType: 'gradient',
      backgroundGradient: 'linear-gradient(90deg, #F2F7FF 0%, #DFECFF 46%, #C9DCFF 100%)',
      textColor: '#12324D',
      navTextColor: '#36506D',
    },
    surface: '#FFFFFF',
    richTextColor: '#223244',
    title: '#1A3653',
  },
  dark: {
    page: {
      backgroundType: 'gradient',
      backgroundGradient: 'linear-gradient(180deg, #07111f 0%, #0d1f36 55%, #102946 100%)',
      themeMode: 'dark',
      styleMode: 'normal',
    },
    header: {
      backgroundType: 'gradient',
      backgroundGradient: 'linear-gradient(90deg, #061528 0%, #0B2A49 45%, #1A4F7A 100%)',
      textColor: '#EAF4FF',
      navTextColor: '#B5CCE6',
    },
    surface: '#0C1E33',
    richTextColor: '#E5EDF8',
    title: '#D8E9FF',
  },
  tech: {
    page: {
      backgroundType: 'gradient',
      backgroundGradient: 'linear-gradient(180deg, #030B14 0%, #071422 40%, #0A1B2F 100%)',
      themeMode: 'dark',
      styleMode: 'minimal',
    },
    header: {
      backgroundType: 'gradient',
      backgroundGradient: 'linear-gradient(90deg, #04111f 0%, #0a3a5e 48%, #12b5cb 100%)',
      textColor: '#9BE7FF',
      navTextColor: '#7DD9F5',
    },
    surface: '#070E1A',
    richTextColor: '#D9F6FF',
    title: '#00E5FF',
  },
};

const PORTAL_BUILDER_REFERENCE_DIGEST = {
  source: 'portal-builder/SKILL.md + references',
  outputShape: 'DashboardSnapshot = { widgets, groups, floatingModules, dashboardConfig? }',
  defaults: { groups: [], floatingModules: [] },
  layout: {
    gridColumns: 36,
    fullWidthTypes: ['headerBar', 'carousel', 'queryFilter', 'pageNavigator'],
    neverExceed: 'x + w <= 36',
    autoPlacement: 'Use row_max_h sequential placement to avoid overlap',
  },
  intentRecipes: {
    portal: 'headerBar + carousel + navGroup + news + richText',
    dashboard: 'indicatorCard/stats + chart + topList/dataTable',
    management: 'queryFilter + dataTable + pageNavigator',
  },
  widgetSelection: {
    multiIconEntry: 'navGroup',
    singleIconEntry: 'iconNav',
    avoidDefaultCardGrid: true,
  },
  fieldRules: {
    carousel: ['dataSourceType', 'autoplay.enabled', 'slides[].imageUrl'],
    navGroup: ['config.staticItems', 'staticItems[].icon'],
    queryFilter: ['queryFields', 'submitMethod', 'layoutCols'],
    dataTable: ['staticData', 'paginationMode', 'paginationConfig'],
  },
};

const PORTAL_BUILDER_RULES = [
  'Active skill: portal-builder.',
  'Strictly follow portal-builder/SKILL.md and references/widget-map.md, references/layout-rules.md, references/json-schema.md.',
  'Always return an import-ready DashboardSnapshot.',
  'Default to groups: [] and floatingModules: [] unless explicitly requested.',
  'Use compact 36-column layout and never return x + w > 36.',
  'Use the row_max_h layout algorithm when auto-placing widgets.',
  'Use navGroup for multi-entry icon portals and iconNav only for a single icon entry.',
  'Use current runtime field names instead of legacy fields.',
  'Do not use cardGrid as default main content unless explicitly requested.',
];

const CLEAR_INTENT_PATTERN = /(clear|reset|empty|wipe|remove all|clear page|reset page|清空|重置|恢复空白|只保留空白页面|清空页面|清空所有组件|清空工作台)/i;
const MANAGEMENT_PATTERNS = [/manage|admin|approval|workflow|list|filter|query|table|crud/i, /管理|后台|审批|列表|筛选|过滤|查询|表格|分页/i];
const DASHBOARD_PATTERNS = [/dashboard|monitor|cockpit|screen|bigscreen|board|kpi|trend|chart|realtime|map/i, /看板|大屏|监控|监测|态势|驾驶舱|实时|趋势|图表|指标|热力图|排名/i];

const THEME_PATTERNS = {
  tech: [/tech|digital|futur|cyber|netflow|monitor|cockpit/i, /科技|数字|未来|赛博|大屏|监控|网络流量/i],
  light: [/light|bright|clean|white/i, /浅色|明亮|清爽|简洁|白色/i],
  dark: [/dark|night|black/i, /深色|暗黑|黑色/i],
  business: [/enterprise|portal|homepage|website/i, /企业|门户|首页|官网|商务/i],
};

const CHART_TYPE_RULES = [
  { chartType: 'basic-line', patterns: [/line|trend|走势|趋势|折线/i] },
  { chartType: 'grouped-bar', patterns: [/bar|柱状|对比/i] },
  { chartType: 'stacked-bar', patterns: [/stack|堆叠|累计/i] },
  { chartType: 'pie', patterns: [/pie|占比|比例|饼图/i] },
  { chartType: 'donut', patterns: [/donut|ring|环形/i] },
  { chartType: 'basic-horizontal-bar', patterns: [/horizontal|横向|排行图/i] },
  { chartType: 'gauge', patterns: [/gauge|达成率|完成率|仪表盘/i] },
  { chartType: 'radar', patterns: [/radar|雷达/i] },
  { chartType: 'scatter', patterns: [/scatter|分布|散点/i] },
  { chartType: 'funnel', patterns: [/funnel|漏斗/i] },
  { chartType: 'area-map', patterns: [/map|region|area map|heatmap|地图|区域图|热力图/i] },
];

const WIDGET_KEYWORD_RULES = [
  { type: 'headerBar', patterns: [/header|top nav|navigation bar/i, /页头|顶部导航|导航栏/i] },
  { type: 'carousel', patterns: [/banner|carousel|slider/i, /轮播|banner|幻灯片/i] },
  { type: 'queryFilter', patterns: [/query|filter|search form/i, /筛选|过滤|查询条件|查询表单/i] },
  { type: 'dataTable', patterns: [/table|grid|list|detail list/i, /表格|列表|明细表|数据表/i] },
  { type: 'topList', patterns: [/top|ranking|leaderboard/i, /排行|排名|榜单|top/i] },
  { type: 'news', patterns: [/news|notice|announcement|feed/i, /新闻|动态|公告|资讯/i] },
  { type: 'richText', patterns: [/article|rich text|content|description|intro|footer/i, /富文本|说明|介绍|正文|页脚/i] },
  { type: 'stats', patterns: [/stats|summary|overview|aggregate/i, /统计|汇总|总览|概览/i] },
  { type: 'indicatorCard', patterns: [/kpi|metric|indicator card/i, /指标卡|kpi|指标卡片/i] },
  { type: 'chart', patterns: [/chart|plot|graph/i, /图表|曲线|柱状|饼图|热力图/i] },
  { type: 'pageNavigator', patterns: [/page nav|pagination|tab|navigator/i, /分页|页签|切换|导航器/i] },
  { type: 'cardGrid', patterns: [/card grid|image card|card list/i, /卡片网格|图文卡片|卡片列表/i] },
  { type: 'iconNav', patterns: [/single icon|icon button/i, /单个图标|图标按钮/i] },
];

const DEFAULT_PORTAL_ICON_BY_USAGE = {
  navGroup: 'icon-line_duixiang',
  iconNav: 'AppstoreOutlined',
};

const KNOWN_ICONFONT_BASE_NAMES = new Set([
  'line_xia',
  'line_huanjing',
  'line_bianji',
  'line_shuaxin',
  'line_daoru',
  'line_shuangxia',
  'line_shanchu',
  'line_duixiang',
  'line_yonghu',
  'line_tuichu',
  'line_jiansuo',
  'line_shezhi',
  'line_shang',
  'line_you',
  'line_zuo',
  'line_shangchuan',
  'fill_xiaoyan',
  'fill_guanbi',
  'fill_shaixuan',
  'fill_paixu',
  'fill_jinggao',
  'fill_yuandian',
  'fill_gongzuotai',
  'fill_shouye',
  'fill_bushuguanli',
  'fill_moxingguanli',
  'fill_yangbenguanli',
  'fill_yingyongguanli',
]);

const KNOWN_ANTD_ICON_NAMES = new Set([
  'AppstoreOutlined',
  'HomeOutlined',
  'DashboardOutlined',
  'DeploymentUnitOutlined',
  'ThunderboltOutlined',
  'BuildOutlined',
  'ApartmentOutlined',
  'BankOutlined',
  'GlobalOutlined',
  'SafetyCertificateOutlined',
  'LineChartOutlined',
  'ClusterOutlined',
  'AreaChartOutlined',
  'AuditOutlined',
  'CloudServerOutlined',
  'CustomerServiceOutlined',
  'ApiOutlined',
  'SearchOutlined',
  'SettingOutlined',
  'EditOutlined',
  'UploadOutlined',
  'UserOutlined',
  'DatabaseOutlined',
  'ReloadOutlined',
  'FileOutlined',
  'LogoutOutlined',
]);

const PORTAL_ICON_RULES = [
  {
    iconfont: 'icon-fill_shouye',
    antd: 'HomeOutlined',
    aliases: ['icon-fill_shouye', 'fill_shouye', 'HomeOutlined'],
    patterns: [/首页|主页|官网|网站|home|homepage|website/i],
  },
  {
    iconfont: 'icon-fill_gongzuotai',
    antd: 'DashboardOutlined',
    aliases: ['icon-fill_gongzuotai', 'fill_gongzuotai', 'DashboardOutlined'],
    patterns: [/工作台|看板|驾驶舱|dashboard|workspace|cockpit/i],
  },
  {
    iconfont: 'icon-fill_yingyongguanli',
    antd: 'AppstoreOutlined',
    aliases: ['icon-fill_yingyongguanli', 'fill_yingyongguanli', 'AppstoreOutlined'],
    patterns: [/应用|门户|服务|入口|生态|模块|app|portal|service|entry|module/i],
  },
  {
    iconfont: 'icon-fill_bushuguanli',
    antd: 'DeploymentUnitOutlined',
    aliases: ['icon-fill_bushuguanli', 'fill_bushuguanli', 'DeploymentUnitOutlined', 'BuildOutlined', 'CloudServerOutlined'],
    patterns: [/部署|运维|运营|工业|ops|operation|deploy|industry/i],
  },
  {
    iconfont: 'icon-fill_moxingguanli',
    antd: 'ClusterOutlined',
    aliases: ['icon-fill_moxingguanli', 'fill_moxingguanli', 'ClusterOutlined'],
    patterns: [/模型|方案|决策|中枢|solution|model|decision/i],
  },
  {
    iconfont: 'icon-fill_yangbenguanli',
    antd: 'FileOutlined',
    aliases: ['icon-fill_yangbenguanli', 'fill_yangbenguanli', 'FileOutlined'],
    patterns: [/样本|案例|文档|资料|sample|case|document|doc/i],
  },
  {
    iconfont: 'icon-line_huanjing',
    antd: 'ThunderboltOutlined',
    aliases: ['icon-line_huanjing', 'line_huanjing', 'ThunderboltOutlined', 'GlobalOutlined'],
    patterns: [/能源|环境|碳|绿色|energy|environment|carbon|green/i],
  },
  {
    iconfont: 'icon-line_yonghu',
    antd: 'UserOutlined',
    aliases: ['icon-line_yonghu', 'line_yonghu', 'UserOutlined', 'CustomerServiceOutlined'],
    patterns: [/用户|客户|团队|成员|个人|user|customer|team|member/i],
  },
  {
    iconfont: 'icon-line_jiansuo',
    antd: 'SearchOutlined',
    aliases: ['icon-line_jiansuo', 'line_jiansuo', 'SearchOutlined', 'AuditOutlined'],
    patterns: [/搜索|查询|检索|咨询|search|query|find|consult/i],
  },
  {
    iconfont: 'icon-line_shezhi',
    antd: 'SettingOutlined',
    aliases: ['icon-line_shezhi', 'line_shezhi', 'SettingOutlined'],
    patterns: [/设置|配置|setting|config/i],
  },
  {
    iconfont: 'icon-line_bianji',
    antd: 'EditOutlined',
    aliases: ['icon-line_bianji', 'line_bianji', 'EditOutlined'],
    patterns: [/编辑|修改|edit/i],
  },
  {
    iconfont: 'icon-line_shuaxin',
    antd: 'ReloadOutlined',
    aliases: ['icon-line_shuaxin', 'line_shuaxin', 'ReloadOutlined'],
    patterns: [/刷新|更新|同步|reload|refresh|sync/i],
  },
  {
    iconfont: 'icon-line_daoru',
    antd: 'UploadOutlined',
    aliases: ['icon-line_daoru', 'line_daoru', 'UploadOutlined'],
    patterns: [/导入|import/i],
  },
  {
    iconfont: 'icon-line_shangchuan',
    antd: 'UploadOutlined',
    aliases: ['icon-line_shangchuan', 'line_shangchuan', 'UploadOutlined'],
    patterns: [/上传|upload/i],
  },
  {
    iconfont: 'icon-fill_jinggao',
    antd: 'SafetyCertificateOutlined',
    aliases: ['icon-fill_jinggao', 'fill_jinggao', 'SafetyCertificateOutlined'],
    patterns: [/风险|告警|预警|安全|warning|risk|alert|alarm|safety/i],
  },
  {
    iconfont: 'icon-line_tuichu',
    antd: 'LogoutOutlined',
    aliases: ['icon-line_tuichu', 'line_tuichu', 'LogoutOutlined'],
    patterns: [/退出|登出|close|logout|exit/i],
  },
  {
    iconfont: 'icon-fill_shaixuan',
    antd: 'SearchOutlined',
    aliases: ['icon-fill_shaixuan', 'fill_shaixuan'],
    patterns: [/筛选|过滤|filter/i],
  },
  {
    iconfont: 'icon-fill_paixu',
    antd: 'AppstoreOutlined',
    aliases: ['icon-fill_paixu', 'fill_paixu'],
    patterns: [/排序|sort/i],
  },
  {
    iconfont: 'icon-line_duixiang',
    antd: 'DatabaseOutlined',
    aliases: ['icon-line_duixiang', 'line_duixiang', 'DatabaseOutlined', 'ApartmentOutlined', 'AreaChartOutlined', 'ApiOutlined', 'BankOutlined'],
    patterns: [/对象|资产|数据|供应链|园区|可视化|chart|data|asset|object|park|supply|visual/i],
  },
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const normalizeText = (value) => String(value || '').toLowerCase();
const containsChinese = (value) => /[\u4e00-\u9fff]/.test(String(value || ''));
const trimString = (value) => String(value || '').trim();

const normalizeIconfontName = (iconName = '') => {
  const trimmed = trimString(iconName);
  if (!trimmed) return '';
  if (trimmed.startsWith('icon-')) return trimmed;
  if (KNOWN_ICONFONT_BASE_NAMES.has(trimmed)) return `icon-${trimmed}`;
  return '';
};

const isAntdIconName = (iconName = '') => {
  const trimmed = trimString(iconName);
  return !!trimmed && (KNOWN_ANTD_ICON_NAMES.has(trimmed) || /(?:Outlined|Filled|TwoTone)$/.test(trimmed));
};

const matchesPortalIconRule = (rule, input = '') => {
  const trimmed = trimString(input);
  if (!trimmed) return false;
  const normalizedInput = normalizeText(trimmed);
  if ((rule.aliases || []).some((alias) => normalizeText(alias) === normalizedInput)) return true;
  return rule.patterns.some((pattern) => pattern.test(trimmed));
};

const findPortalIconRule = (...inputs) => {
  const values = inputs.map((value) => trimString(value)).filter(Boolean);
  for (const value of values) {
    const matchedRule = PORTAL_ICON_RULES.find((rule) => matchesPortalIconRule(rule, value));
    if (matchedRule) return matchedRule;
  }
  const combined = values.join(' ');
  return PORTAL_ICON_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(combined))) || null;
};

const resolvePortalIcon = ({ usage = 'navGroup', label = '', icon = '', prompt = '' } = {}) => {
  const rawIcon = trimString(icon);
  const normalizedIconfont = normalizeIconfontName(rawIcon);
  const semanticRule = findPortalIconRule(label, prompt);
  const explicitRule = findPortalIconRule(rawIcon);

  if (usage === 'navGroup') {
    if (normalizedIconfont) return normalizedIconfont;
    if (semanticRule?.iconfont) return semanticRule.iconfont;
    if (explicitRule?.iconfont) return explicitRule.iconfont;
    return DEFAULT_PORTAL_ICON_BY_USAGE.navGroup;
  }

  if (isAntdIconName(rawIcon)) return rawIcon;
  if (explicitRule?.antd) return explicitRule.antd;
  if (semanticRule?.antd) return semanticRule.antd;
  if (normalizedIconfont) return findPortalIconRule(normalizedIconfont)?.antd || DEFAULT_PORTAL_ICON_BY_USAGE.iconNav;
  return DEFAULT_PORTAL_ICON_BY_USAGE.iconNav;
};

const normalizeNavGroupItems = (staticItems, prompt = '') =>
  (Array.isArray(staticItems) ? staticItems : []).map((item, index) => ({
    ...item,
    id: item?.id || `nav-item-${index + 1}`,
    icon: resolvePortalIcon({
      usage: 'navGroup',
      label: item?.name || '',
      icon: item?.icon,
      prompt,
    }),
  }));

const safeReadTextFile = (filePath) => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`Failed to read file: ${filePath}`, error);
    return '';
  }
};

const splitMarkdownSections = (source, content) => {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const sections = [];
  let current = { source, heading: `${source}:root`, body: '' };
  const pushCurrent = () => {
    const body = current.body.trim();
    if (!body) return;
    sections.push({ source: current.source, heading: current.heading, body, text: `${current.heading}\n${body}` });
  };

  for (const line of lines) {
    if (/^#{1,4}\s+/.test(line)) {
      pushCurrent();
      current = { source, heading: line.replace(/^#+\s+/, '').trim(), body: '' };
      continue;
    }
    current.body += `${line}\n`;
  }

  pushCurrent();
  return sections;
};

const loadPortalBuilderRuntime = () => {
  const skillText = safeReadTextFile(PORTAL_BUILDER_SKILL_PATH);
  const widgetMapText = safeReadTextFile(PORTAL_BUILDER_REFERENCE_PATHS.widgetMap);
  const layoutRulesText = safeReadTextFile(PORTAL_BUILDER_REFERENCE_PATHS.layoutRules);
  const jsonSchemaText = safeReadTextFile(PORTAL_BUILDER_REFERENCE_PATHS.jsonSchema);

  return {
    skillText,
    references: { widgetMap: widgetMapText, layoutRules: layoutRulesText, jsonSchema: jsonSchemaText },
    sections: [
      ...splitMarkdownSections('skill', skillText),
      ...splitMarkdownSections('widget-map', widgetMapText),
      ...splitMarkdownSections('layout-rules', layoutRulesText),
      ...splitMarkdownSections('json-schema', jsonSchemaText),
    ],
  };
};

const PORTAL_BUILDER_RUNTIME = loadPortalBuilderRuntime();

const textMatches = (value, patterns) => (Array.isArray(patterns) ? patterns : []).some((pattern) => pattern.test(String(value || '')));
const detectClearIntent = (prompt = '') => CLEAR_INTENT_PATTERN.test(String(prompt || ''));
const inferIntent = (prompt = '') => detectClearIntent(prompt) ? 'clear' : (textMatches(prompt, MANAGEMENT_PATTERNS) ? 'management' : (textMatches(prompt, DASHBOARD_PATTERNS) ? 'dashboard' : 'portal'));
const inferChartType = (prompt = '') => CHART_TYPE_RULES.find((rule) => textMatches(prompt, rule.patterns))?.chartType || 'basic-line';

const TITLE_EXTRACTION_PATTERNS = [
  /(?:重命名为|重命名成|标题改为|标题改成|标题设置为|标题设为|页面标题改为|页面标题改成|页面标题设置为|页面标题设为|页面名改为|页面名改成|页面名设置为|页面名设为|命名为|命名成|标题为|标题是|页面标题为|页面标题是|页面名为|页面名是|叫做|叫)\s*[:：]?\s*["“']?([^\n,，。"'”]{2,40})/i,
  /(?:rename(?:\s+page)?(?:\s+to)?|change(?:\s+the)?\s+title(?:\s+to)?|set(?:\s+the)?\s+title(?:\s+to)?|named|called|title)\s*[:：]?\s*["“']?([^\n,，。"'”]{2,40})/i,
];

const RENAME_INTENT_PATTERNS = [
  /重命名|改标题|修改标题|标题改为|标题改成|标题设置为|标题设为|页面标题改为|页面标题改成|页面标题设置为|页面标题设为|页面名改为|页面名改成|页面名设置为|页面名设为/i,
  /(?:rename(?:\s+page)?|change(?:\s+the)?\s+title|update(?:\s+the)?\s+title|set(?:\s+the)?\s+title)/i,
];

const extractExplicitTitle = (prompt = '') => {
  const source = String(prompt || '').trim();
  if (!source) return '';

  for (const pattern of TITLE_EXTRACTION_PATTERNS) {
    const matched = source.match(pattern);
    if (matched?.[1]) {
      return matched[1]
        .trim()
        .replace(/^["“']+|["”']+$/g, '')
        .replace(/[。；;，,]+$/g, '')
        .trim();
    }
  }

  return '';
};

const detectRenameIntent = (prompt = '') => textMatches(prompt, RENAME_INTENT_PATTERNS);

const inferDefaultTitle = (prompt, intent) => {
  if (intent === 'management') return containsChinese(prompt) ? '业务管理工作台' : 'Business Management Workspace';
  if (intent === 'dashboard') return containsChinese(prompt) ? '区域态势监测大屏' : 'Regional Operations Dashboard';
  return containsChinese(prompt) ? '企业门户首页' : 'Enterprise Portal Homepage';
};

const inferTitle = (prompt, intent) => extractExplicitTitle(prompt) || inferDefaultTitle(prompt, intent);

const getSnapshotTitle = (snapshot) => {
  const dashboardTitle = trimString(snapshot?.dashboardConfig?.title);
  if (dashboardTitle) return dashboardTitle;
  const header = Array.isArray(snapshot?.widgets) ? snapshot.widgets.find((item) => item?.type === 'headerBar') : null;
  return trimString(header?.config?.headerTitle || header?.config?.title || header?.title);
};

const resolveTitleForTask = ({ prompt, intent, mode, currentSnapshot }) => {
  const currentTitle = getSnapshotTitle(currentSnapshot);
  const explicitTitle = extractExplicitTitle(prompt);
  const renameIntent = detectRenameIntent(prompt);

  if (mode === 'edit') {
    if (currentTitle && !renameIntent) return currentTitle;
    if (explicitTitle) return explicitTitle;
    if (currentTitle) return currentTitle;
  }

  return explicitTitle || inferDefaultTitle(prompt, intent);
};

const deriveRequestedWidgetTypes = (prompt = '') => {
  const hits = [];
  WIDGET_KEYWORD_RULES.forEach((rule) => {
    if (textMatches(prompt, rule.patterns)) hits.push(rule.type);
  });
  if (/(快捷入口|入口宫格|多个图标|多图标|portal entry|quick access|icon grid|navigation tiles)/i.test(String(prompt || ''))) hits.push('navGroup');
  if (/(单个图标|单入口|single icon|icon button)/i.test(String(prompt || ''))) hits.push('iconNav');
  return Array.from(new Set(hits.includes('navGroup') ? hits.filter((type) => type !== 'iconNav') : hits));
};

const compactPromptValue = (value, depth = 0) => {
  if (value == null) return value;
  if (typeof value === 'string') {
    return value.length > PROMPT_STRING_MAX_CHARS ? `${value.slice(0, PROMPT_STRING_MAX_CHARS)}...` : value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, PROMPT_ARRAY_LIMIT).map((item) => compactPromptValue(item, depth + 1));
  }
  if (depth >= 3) return '[Object]';
  const next = {};
  Object.entries(value).slice(0, PROMPT_OBJECT_KEY_LIMIT).forEach(([key, nestedValue]) => {
    next[key] = compactPromptValue(nestedValue, depth + 1);
  });
  return next;
};

const serializeSnapshotForPrompt = (snapshot) => ({
  dashboardConfig: compactPromptValue(snapshot?.dashboardConfig || {}),
  widgets: Array.isArray(snapshot?.widgets)
    ? snapshot.widgets.slice(0, PROMPT_WIDGET_LIMIT).map((widget) => ({
      id: widget?.id,
      type: widget?.type,
      title: widget?.title,
      layout: compactPromptValue(widget?.layout || {}),
      config: compactPromptValue(widget?.config || {}),
    }))
    : [],
  groups: Array.isArray(snapshot?.groups) ? snapshot.groups.length : 0,
  floatingModules: Array.isArray(snapshot?.floatingModules) ? snapshot.floatingModules.length : 0,
});

const serializeSelectedSectionsForPrompt = (sections) =>
  (Array.isArray(sections) ? sections : [])
    .slice(0, PROMPT_REFERENCE_LIMIT)
    .map((section) => ({
      source: section?.source,
      heading: section?.heading,
      excerpt: String(section?.excerpt || '').slice(0, PROMPT_REFERENCE_MAX_CHARS),
    }));

const scorePortalBuilderSection = (section, terms) => {
  const text = normalizeText(section.text);
  let score = 0;
  for (const term of terms) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm) continue;
    if (normalizeText(section.heading).includes(normalizedTerm)) score += 4;
    if (text.includes(normalizedTerm)) score += 2;
  }
  if (section.source === 'layout-rules') score += 1;
  if (section.source === 'json-schema') score += 1;
  return score;
};

const buildPortalBuilderContext = ({ prompt, mode, currentSnapshot }) => {
  const intent = inferIntent(prompt);
  const requestedWidgetTypes = deriveRequestedWidgetTypes(prompt);
  const existingWidgetTypes = Array.isArray(currentSnapshot?.widgets)
    ? Array.from(new Set(currentSnapshot.widgets.map((item) => item?.type).filter(Boolean)))
    : [];
  const currentTitle = getSnapshotTitle(currentSnapshot);
  const explicitRequestedTitle = extractExplicitTitle(prompt);
  const renameIntent = detectRenameIntent(prompt);

  const terms = Array.from(new Set([
    intent,
    mode,
    inferChartType(prompt),
    ...requestedWidgetTypes,
    ...existingWidgetTypes,
    'dashboardSnapshot',
    'layout',
    '36',
    'carousel',
    'navGroup',
    'queryFilter',
    'dataTable',
  ]));

  const selectedSections = PORTAL_BUILDER_RUNTIME.sections
    .map((section) => ({ ...section, score: scorePortalBuilderSection(section, terms) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, PORTAL_BUILDER_SNIPPET_LIMIT)
    .map((section) => ({
      source: section.source,
      heading: section.heading,
      excerpt: section.body.slice(0, PORTAL_BUILDER_SNIPPET_MAX_CHARS).trim(),
    }));

  return {
    intent,
    requestedWidgetTypes,
    existingWidgetTypes,
    chartType: inferChartType(prompt),
    titleRules: {
      currentTitle,
      explicitRequestedTitle,
      preserveExistingTitleOnEdit: Boolean(currentTitle),
      renameOnlyWhenUserExplicitlyRequests: true,
      keepSummaryTitleAlignedWithSnapshotTitle: true,
      renameIntent,
    },
    referenceDigest: PORTAL_BUILDER_REFERENCE_DIGEST,
    selectedSections,
  };
};

const buildSystemPrompt = (portalBuilderContext) => [
  'You are an AI assistant for a Portal Engine workspace.',
  'Your active server-side skill is portal-builder.',
  'Return JSON only. Do not use markdown fences.',
  'You must return an object with keys: reply, reasoning, summary, snapshot.',
  'reasoning must be short user-visible summaries, not hidden chain-of-thought.',
  'snapshot must preserve this shape: { widgets, groups, floatingModules, dashboardConfig?: {} }.',
  ...PORTAL_BUILDER_RULES,
  `Current inferred page intent: ${portalBuilderContext.intent}.`,
  `Requested widget types from the user: ${portalBuilderContext.requestedWidgetTypes.join(', ') || 'none explicitly requested'}.`,
  `Existing workspace widget types: ${portalBuilderContext.existingWidgetTypes.join(', ') || 'none'}.`,
  `Preferred chart type when relevant: ${portalBuilderContext.chartType}.`,
  `Current workspace title: ${portalBuilderContext.titleRules.currentTitle || 'none'}.`,
  `Explicit title requested by user: ${portalBuilderContext.titleRules.explicitRequestedTitle || 'none'}.`,
  `Explicit rename requested: ${portalBuilderContext.titleRules.renameIntent ? 'yes' : 'no'}.`,
  `Strict reference digest: ${JSON.stringify(PORTAL_BUILDER_REFERENCE_DIGEST)}.`,
  'Title policy: in create mode, if the user explicitly provides a title, you must use it; otherwise you may infer one.',
  'Title policy: in edit mode, if currentSnapshot.dashboardConfig.title is non-empty, preserve it by default.',
  'Only rename the page when the user explicitly asks to rename or change the title.',
  'summary.title, snapshot.dashboardConfig.title, headerBar.title, and headerBar.config.headerTitle must stay aligned.',
  'summary.widgetCount must equal snapshot.widgets.length.',
].join('\n');

const buildUserPrompt = ({ prompt, mode, currentSnapshot, messages, portalBuilderContext }) => JSON.stringify({
  task: prompt,
  mode,
  currentDate: new Date().toISOString(),
  conversationHistory: messages,
  currentSnapshot: serializeSnapshotForPrompt(currentSnapshot),
  activeSkill: 'portal-builder',
  skillRuntime: {
    intent: portalBuilderContext.intent,
    requestedWidgetTypes: portalBuilderContext.requestedWidgetTypes,
    existingWidgetTypes: portalBuilderContext.existingWidgetTypes,
    chartType: portalBuilderContext.chartType,
    titleRules: portalBuilderContext.titleRules,
    referenceDigest: portalBuilderContext.referenceDigest,
    selectedReferences: serializeSelectedSectionsForPrompt(portalBuilderContext.selectedSections),
  },
  outputRequirements: {
    replyLanguage: 'same_as_user',
    reasoningStepCountMax: 4,
    preserveCurrentSnapshotOnEdit: mode === 'edit',
    normalizeForCurrentRuntime: true,
    groupsDefaultEmpty: true,
    floatingModulesDefaultEmpty: true,
    followPortalBuilderReferencesStrictly: true,
    titlePolicy: {
      create: '如果用户明确指定标题，必须使用该标题；否则才允许推断标题。',
      edit: '如果当前快照已有标题，默认必须保留原标题，除非用户明确要求重命名页面。',
      alignment: 'summary.title、snapshot.dashboardConfig.title 和页面头部标题必须保持一致。',
    },
  },
});

const buildStreamPreviewSystemPrompt = (portalBuilderContext) => [
  'You are an AI assistant for a Portal Engine workspace.',
  'Your active server-side skill is portal-builder.',
  'Do not output JSON.',
  'Stream a concise visible planning narrative in the same language as the user.',
  'Explain intent, component mapping, 36-column layout strategy, theme direction, and what will be updated next.',
  `Current inferred page intent: ${portalBuilderContext.intent}.`,
  `Requested widget types from the user: ${portalBuilderContext.requestedWidgetTypes.join(', ') || 'none explicitly requested'}.`,
  `Existing workspace widget types: ${portalBuilderContext.existingWidgetTypes.join(', ') || 'none'}.`,
  `Preferred chart type when relevant: ${portalBuilderContext.chartType}.`,
  `Current workspace title: ${portalBuilderContext.titleRules.currentTitle || 'none'}.`,
  'When editing, keep the existing title unless the user explicitly requests renaming.',
].join('\n');

const buildStreamPreviewUserPrompt = ({ prompt, mode, currentSnapshot, messages, portalBuilderContext }) => JSON.stringify({
  task: prompt,
  mode,
  currentDate: new Date().toISOString(),
  conversationHistory: messages,
  currentSnapshotSummary: {
    title: currentSnapshot?.dashboardConfig?.title || '',
    widgetCount: Array.isArray(currentSnapshot?.widgets) ? currentSnapshot.widgets.length : 0,
    widgetTypes: portalBuilderContext.existingWidgetTypes,
  },
  currentSnapshot: serializeSnapshotForPrompt(currentSnapshot),
  activeSkill: 'portal-builder',
  skillRuntime: {
    intent: portalBuilderContext.intent,
    requestedWidgetTypes: portalBuilderContext.requestedWidgetTypes,
    existingWidgetTypes: portalBuilderContext.existingWidgetTypes,
    chartType: portalBuilderContext.chartType,
    titleRules: portalBuilderContext.titleRules,
    referenceDigest: portalBuilderContext.referenceDigest,
    selectedReferences: serializeSelectedSectionsForPrompt(portalBuilderContext.selectedSections),
  },
  outputRequirements: {
    replyLanguage: 'same_as_user',
    style: 'concise_live_reasoning',
    mentionConcreteChanges: true,
    mentionLayoutAndVisualDirection: true,
    noJson: true,
    titlePolicy: {
      edit: '编辑态默认保留当前标题，仅在用户明确要求改名时说明会修改标题。',
      alignment: '如果会改标题，必须同步说明 summary.title 和 snapshot.dashboardConfig.title 也会一致修改。',
    },
  },
});

const sanitizeNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const getLayoutPreset = (type, overrides = {}) => {
  const base = WIDGET_LAYOUT_PRESETS[type] || { w: 8, h: 6, minW: 4, minH: 4 };
  return {
    w: clamp(Math.round(sanitizeNumber(overrides.w, base.w)), 1, GRID_COLUMNS),
    h: Math.max(1, Math.round(sanitizeNumber(overrides.h, base.h))),
    minW: Math.max(1, Math.round(sanitizeNumber(overrides.minW, base.minW || 1))),
    minH: Math.max(1, Math.round(sanitizeNumber(overrides.minH, base.minH || 1))),
  };
};

const normalizeSnapshot = (snapshot) => ({
  widgets: Array.isArray(snapshot?.widgets) ? clone(snapshot.widgets) : [],
  groups: Array.isArray(snapshot?.groups) ? clone(snapshot.groups) : [],
  floatingModules: Array.isArray(snapshot?.floatingModules) ? clone(snapshot.floatingModules) : [],
  dashboardConfig: snapshot?.dashboardConfig ? clone(snapshot.dashboardConfig) : {},
});

const createEmptySnapshot = () => ({
  widgets: [],
  groups: [],
  floatingModules: [],
  dashboardConfig: {},
});

const resolveThemePresetByPrompt = (prompt, options = {}) => {
  const { defaultPreset = null } = options;
  if (textMatches(prompt, THEME_PATTERNS.tech)) return 'tech';
  if (textMatches(prompt, THEME_PATTERNS.light)) return 'light';
  if (textMatches(prompt, THEME_PATTERNS.dark)) return 'dark';
  if (textMatches(prompt, THEME_PATTERNS.business)) return 'business';
  return defaultPreset;
};

const ensureWidgetBackground = (config = {}, theme) => {
  const nextConfig = { ...config };
  if (!nextConfig.backgroundType) {
    if (nextConfig.backgroundGradient) {
      nextConfig.backgroundType = 'gradient';
    } else if (nextConfig.backgroundColor) {
      nextConfig.backgroundType = 'color';
    } else if (theme?.surface) {
      nextConfig.backgroundType = 'color';
      nextConfig.backgroundColor = theme.surface;
    }
  }
  if (nextConfig.backgroundType === 'color' && !nextConfig.backgroundColor && theme?.surface) {
    nextConfig.backgroundColor = theme.surface;
  }
  return nextConfig;
};

const ensureRichTextColor = (html, color) => {
  if (!html) return `<div style="color:${color};line-height:1.8"></div>`;
  if (!/style=/i.test(html)) return `<div style="color:${color};line-height:1.8">${html}</div>`;
  if (/color\s*:/i.test(html)) return html.replace(/color\s*:\s*#[0-9a-f]{3,8}/ig, `color:${color}`);
  return html.replace(/style="([^"]*)"/i, `style="color:${color};$1"`);
};

const applyThemeToWidgets = (snapshot, preset) => {
  const theme = THEME_PRESETS[preset];
  if (!theme || !Array.isArray(snapshot?.widgets)) return;

  snapshot.widgets = snapshot.widgets.map((widget) => {
    if (!widget || typeof widget !== 'object') return widget;
    const config = ensureWidgetBackground(widget.config, theme);
    const nextWidget = { ...widget, config: { ...config } };

    if (widget.type === 'headerBar') {
      nextWidget.config = { ...nextWidget.config, ...theme.header, showTitle: false, navDataSource: 'static' };
      return nextWidget;
    }

    if (['news', 'topList', 'dataTable', 'queryFilter', 'navGroup', 'stats', 'indicatorCard', 'chart', 'iconNav', 'cardGrid', 'myDocuments'].includes(widget.type)) {
      nextWidget.config = {
        ...nextWidget.config,
        titleColor: nextWidget.config.titleColor || theme.title,
        backgroundType: 'color',
        backgroundColor: nextWidget.config.backgroundColor || theme.surface,
      };
    }

    if (widget.type === 'richText') {
      nextWidget.config = {
        ...nextWidget.config,
        backgroundType: nextWidget.config.backgroundType || 'color',
        backgroundColor: nextWidget.config.backgroundColor || theme.surface,
        html: ensureRichTextColor(nextWidget.config.html, theme.richTextColor),
      };
    }

    return nextWidget;
  });
};

const applyThemeByPrompt = (snapshot, prompt, options = {}) => {
  const preset = resolveThemePresetByPrompt(prompt, options);
  if (!preset) return null;
  const theme = THEME_PRESETS[preset];
  if (!theme) return null;
  snapshot.dashboardConfig = { ...snapshot.dashboardConfig, ...theme.page };
  applyThemeToWidgets(snapshot, preset);
  return preset;
};

const reflowWidgetsCompact36 = (widgets) => {
  const nextWidgets = [];
  let currentX = 0;
  let currentY = 0;
  let rowMaxH = 0;

  for (const rawWidget of Array.isArray(widgets) ? widgets : []) {
    if (!rawWidget || typeof rawWidget !== 'object') continue;
    const preset = getLayoutPreset(rawWidget.type, rawWidget.layout || {});
    const widget = {
      ...rawWidget,
      layout: {
        i: String(rawWidget?.layout?.i || rawWidget.id || createId(`${rawWidget.type}-layout`)),
        x: 0,
        y: 0,
        w: preset.w,
        h: preset.h,
        minW: preset.minW,
        minH: preset.minH,
      },
    };

    if (FULL_WIDTH_WIDGET_TYPES.has(widget.type)) {
      widget.layout.w = GRID_COLUMNS;
      widget.layout.minW = Math.max(widget.layout.minW || 1, 12);
      if (currentX !== 0) {
        currentY += rowMaxH;
        currentX = 0;
        rowMaxH = 0;
      }
      widget.layout.x = 0;
      widget.layout.y = currentY;
      currentY += widget.layout.h;
      nextWidgets.push(widget);
      continue;
    }

    if (currentX + widget.layout.w > GRID_COLUMNS) {
      currentX = 0;
      currentY += rowMaxH;
      rowMaxH = 0;
    }

    widget.layout.x = currentX;
    widget.layout.y = currentY;
    currentX += widget.layout.w;
    rowMaxH = Math.max(rowMaxH, widget.layout.h);
    nextWidgets.push(widget);
  }

  return nextWidgets;
};

const createWidget = (type, title, config = {}, layoutOverrides = {}) => {
  const id = createId(type);
  const layout = getLayoutPreset(type, layoutOverrides);
  return {
    id,
    type,
    title,
    layout: {
      i: `${id}-layout`,
      x: 0,
      y: 0,
      w: layout.w,
      h: layout.h,
      minW: layout.minW,
      minH: layout.minH,
    },
    config,
  };
};

const createBannerSvgDataUrl = (colorA, colorB, colorC) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 720"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${colorA}"/><stop offset="50%" stop-color="${colorB}"/><stop offset="100%" stop-color="${colorC}"/></linearGradient></defs><rect width="1600" height="720" fill="url(#g)"/><circle cx="1330" cy="120" r="170" fill="rgba(255,255,255,0.08)"/><circle cx="1180" cy="230" r="110" fill="rgba(255,255,255,0.05)"/><path d="M0 600 C260 490 520 675 850 560 C1120 466 1360 520 1600 410 L1600 720 L0 720 Z" fill="rgba(255,255,255,0.10)"/><path d="M0 632 C250 528 520 700 860 590 C1120 505 1360 545 1600 452" stroke="rgba(255,255,255,0.24)" stroke-width="3" fill="none"/></svg>`,
  )}`;

const buildHeaderBar = (title, intent) => createWidget('headerBar', title, {
  title,
  showTitle: false,
  headerTitle: title,
  headerFontSize: intent === 'dashboard' ? 26 : 24,
  fontFamily: 'YouSheBiaoTiHei',
  headerAlignment: 'left',
  showNavMenu: intent === 'portal',
  navDataSource: 'static',
  showThemeSwitcher: false,
  showUserProfile: false,
  navItems: intent === 'portal'
    ? [
      { id: 'nav-home', name: '首页', url: '/' },
      { id: 'nav-business', name: '核心业务', url: '/business' },
      { id: 'nav-service', name: '产品服务', url: '/services' },
      { id: 'nav-news', name: '新闻资讯', url: '/news' },
      { id: 'nav-contact', name: '联系我们', url: '/contact' },
    ]
    : [],
});

const buildCarousel = () => createWidget('carousel', '首页轮播 Banner', {
  title: '首页轮播 Banner',
  showTitle: false,
  backgroundType: 'color',
  backgroundColor: '#0B1F3A',
  contentPadding: 0,
  refreshInterval: 60,
  dataSourceType: 'static',
  autoplay: { enabled: true, delay: 4800, pauseOnMouseEnter: true, disableOnInteraction: false },
  pagination: { enabled: true, type: 'bullets', clickable: true },
  navigation: { enabled: true },
  slidesPerView: 1,
  slidesPerGroup: 1,
  spaceBetween: 16,
  loop: true,
  effect: 'slide',
  textAlign: 'left',
  overlayStyle: 'gradient',
  overlayColor: 'rgba(6, 18, 35, 0.56)',
  buttonType: 'primary',
  slides: [
    { id: 'slide-1', title: '连接产业资源，构建可信赖的企业增长门户', description: '统一承载品牌展示、业务触达、产品服务和资讯传播。', imageUrl: createBannerSvgDataUrl('#071328', '#153865', '#3C6EA8'), buttonText: '查看品牌方案', buttonLink: '/about' },
    { id: 'slide-2', title: '业务、产品与案例统一展示，提升专业转化效率', description: '通过清晰层级和扁平化布局承载核心业务能力与解决方案。', imageUrl: createBannerSvgDataUrl('#09162D', '#113A67', '#97A5B6'), buttonText: '进入产品服务', buttonLink: '/services' },
    { id: 'slide-3', title: '新闻、案例与客户口碑联动，形成持续增长的内容引擎', description: '兼顾科技感与商务感，形成统一品牌认知。', imageUrl: createBannerSvgDataUrl('#050F1F', '#1A3765', '#5A7DA2'), buttonText: '查看最新动态', buttonLink: '/news' },
  ],
});

const buildNavGroup = (title, staticItems, options = {}) => createWidget('navGroup', title, {
  title,
  showTitle: true,
  titleColor: '#102A4C',
  backgroundType: 'color',
  backgroundColor: '#FFFFFF',
  contentPadding: 16,
  layout: 'grid',
  columns: options.columns || 4,
  showLabel: options.showLabel !== false,
  iconSize: options.iconSize || 38,
  itemGap: options.itemGap || 12,
  staticItems: normalizeNavGroupItems(staticItems, `${title} ${options.prompt || ''}`),
}, options.layout || {});

const buildNews = (title, options = {}) => createWidget('news', title, {
  title,
  showTitle: true,
  titleColor: '#102A4C',
  backgroundType: 'color',
  backgroundColor: '#FFFFFF',
  contentPadding: 16,
  refreshInterval: 60,
  maxItems: 5,
  showDate: true,
  showSource: true,
  dataSource: 'static',
  staticData: [
    { id: 'news-1', title: '企业门户品牌升级版正式发布', description: '新版首页完成视觉层级优化，提供统一访问入口。', source: '品牌中心', time: '2026-04-09', url: '#' },
    { id: 'news-2', title: '核心业务矩阵新增能源与园区两大行业方案', description: '围绕绿色转型与运营效率形成标准化交付模板。', source: '解决方案部', time: '2026-04-08', url: '#' },
    { id: 'news-3', title: '产品服务中心完成统一对外资料整合', description: '白皮书、手册和案例资料已同步上新。', source: '产品管理部', time: '2026-04-07', url: '#' },
    { id: 'news-4', title: '重点客户案例专题页上线', description: '覆盖制造、能源、园区三类场景。', source: '市场增长部', time: '2026-04-06', url: '#' },
    { id: 'news-5', title: '合作伙伴生态计划进入年度招募阶段', description: '进一步扩展服务协同能力。', source: '生态合作部', time: '2026-04-05', url: '#' },
  ],
}, options.layout || {});

const buildRichText = (title, html, options = {}) => createWidget('richText', title, {
  title,
  showTitle: false,
  backgroundType: options.backgroundType || 'color',
  ...(options.backgroundGradient ? { backgroundGradient: options.backgroundGradient } : {}),
  ...(options.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
  contentPadding: options.contentPadding ?? 18,
  html,
  placeholder: options.placeholder || '',
  minHeight: options.minHeight || 220,
  allowImageUpload: false,
}, options.layout || {});

const buildStats = (title, items, options = {}) => {
  const staticData = items.reduce((accumulator, item) => {
    accumulator[item.key] = item.value;
    return accumulator;
  }, {});

  return createWidget('stats', title, {
    title,
    showTitle: true,
    titleColor: options.titleColor || '#D8E9FF',
    backgroundType: 'color',
    backgroundColor: options.backgroundColor || '#0C1E33',
    contentPadding: 12,
    refreshInterval: 60,
    dataSource: 'static',
    layout: 'vertical',
    staticData,
    statsItems: items.map((item) => ({
      key: item.key,
      label: item.label,
      precision: item.precision ?? 0,
      trend: item.trend || 'stable',
      trendValue: item.trendValue,
      color: item.color,
      ...(item.value != null ? { value: item.value } : {}),
    })),
  }, options.layout || {});
};

const buildIndicatorCard = (title, value, description, color) => createWidget('indicatorCard', title, {
  showTitle: true,
  titleColor: '#7DD9F5',
  backgroundType: 'color',
  backgroundColor: '#080F1C',
  contentPadding: 12,
  dataSource: 'static',
  staticValue: value,
  staticDescription: description,
  valueField: 'value',
  descriptionField: 'description',
  indicatorValueFontSize: 34,
  indicatorDescriptionFontSize: 13,
  indicatorValueColor: color,
  indicatorDescriptionColor: '#5BA8C8',
  showTrend: false,
}, { w: 4, h: 5, minW: 3, minH: 4 });

const buildChart = (title, chartType, staticData, options = {}) => createWidget('chart', title, {
  title,
  showTitle: true,
  titleColor: options.titleColor || '#00E5FF',
  backgroundType: 'color',
  backgroundColor: options.backgroundColor || '#070E1A',
  contentPadding: 12,
  refreshInterval: 60,
  chartPreset: chartType,
  chartType,
  dataSource: 'static',
  staticData,
  ...(options.categoryField ? { categoryField: options.categoryField } : {}),
  ...(options.valueField ? { valueField: options.valueField } : {}),
  ...(options.valueFields ? { valueFields: options.valueFields } : {}),
  ...(options.extra || {}),
}, options.layout || {});

const buildTopList = (title, staticData, options = {}) => createWidget('topList', title, {
  title,
  showTitle: true,
  titleColor: options.titleColor || '#D8E9FF',
  backgroundType: 'color',
  backgroundColor: options.backgroundColor || '#0C1E33',
  contentPadding: 12,
  refreshInterval: 60,
  dataSource: 'static',
  rankingField: options.rankingField || 'rank',
  labelField: options.labelField || 'name',
  valueField: options.valueField || 'value',
  showRank: true,
  showTrend: options.showTrend !== false,
  maxItems: options.maxItems || staticData.length,
  staticData,
}, options.layout || {});

const buildQueryFilter = () => createWidget('queryFilter', '筛选条件', {
  title: '筛选条件',
  showTitle: false,
  titleColor: '#222222',
  backgroundType: 'color',
  backgroundColor: '#FFFFFF',
  contentPadding: 12,
  refreshInterval: 60,
  formLayout: 'vertical',
  labelVerticalAlign: 'top',
  labelTextAlign: 'left',
  labelWidth: 96,
  layoutCols: 4,
  submitButtonText: '查询',
  resetButtonText: '重置',
  showResetButton: true,
  buttonAlign: 'right',
  fieldSpacing: 16,
  submitMethod: 'eventRoute',
  apiMethod: 'GET',
  queryFields: [
    { id: 'query-field-status', type: 'select', label: '状态', field: 'status', placeholder: '请选择状态', dataSourceType: 'manual', manualOptions: [{ label: '全部', value: '' }, { label: '进行中', value: 'running' }, { label: '已完成', value: 'done' }] },
    { id: 'query-field-date', type: 'datePicker', label: '日期', field: 'date', pickerType: 'date' },
  ],
});

const buildDataTable = (title, options = {}) => createWidget('dataTable', title, {
  title,
  showTitle: true,
  titleColor: options.titleColor || '#222222',
  backgroundType: 'color',
  backgroundColor: options.backgroundColor || '#FFFFFF',
  contentPadding: 12,
  refreshInterval: options.refreshInterval || 60,
  columns: options.columns || [
    { key: 'name', title: '名称', dataIndex: 'name', width: 220 },
    { key: 'owner', title: '负责人', dataIndex: 'owner', width: 140 },
    { key: 'status', title: '状态', dataIndex: 'status', width: 120 },
    { key: 'updatedAt', title: '更新时间', dataIndex: 'updatedAt', width: 180 },
  ],
  ...(options.apiEndpoint
    ? { apiEndpoint: options.apiEndpoint, apiMethod: options.apiMethod || 'GET', ...(options.apiDataField ? { apiDataField: options.apiDataField } : {}), ...(options.apiListField ? { apiListField: options.apiListField } : {}) }
    : { staticData: options.staticData || [
      { key: '1', name: '示例数据 1', owner: '张三', status: '进行中', updatedAt: '2026-04-09 10:20' },
      { key: '2', name: '示例数据 2', owner: '李四', status: '已完成', updatedAt: '2026-04-09 09:35' },
      { key: '3', name: '示例数据 3', owner: '王五', status: '待处理', updatedAt: '2026-04-08 16:40' },
    ] }),
  paginationMode: options.paginationMode || 'pagination',
  ...(options.paginationMode === 'none' ? {} : { paginationConfig: options.paginationConfig || { page: 1, pageSize: 10, showTotal: true } }),
}, options.layout || {});

const buildPageNavigator = () => createWidget('pageNavigator', '分页导航', {
  showTitle: false,
  titleColor: '#222222',
  backgroundType: 'color',
  backgroundColor: '#FFFFFF',
  contentPadding: 12,
  displayMode: 'text',
  itemColor: '#222222',
  items: [{ name: '上一页', path: '' }, { name: '下一页', path: '' }],
});

const buildIconNav = (title = '快捷入口', options = {}) => createWidget('iconNav', title, {
  showTitle: false,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 16,
  icon: resolvePortalIcon({
    usage: 'iconNav',
    label: title,
    icon: options.icon,
    prompt: options.prompt,
  }),
  url: options.url || '/dashboard',
  openInNew: false,
  iconSize: 48,
  iconColor: options.iconColor || '#1677ff',
});

const buildCardGrid = () => createWidget('cardGrid', '卡片网格', {
  showTitle: true,
  titleColor: '#222222',
  backgroundColor: '#FFFFFF',
  backgroundType: 'color',
  contentPadding: 12,
  refreshInterval: 60,
});

const portalPrimaryItems = [
  { id: 'biz-1', name: '智慧能源', url: '/business/energy', icon: 'ThunderboltOutlined', iconBgColor: '#E8F1FF', iconColor: '#144A8C', textColor: '#1B2F46' },
  { id: 'biz-2', name: '工业运营', url: '/business/industry', icon: 'BuildOutlined', iconBgColor: '#EDF2F7', iconColor: '#4A5B6C', textColor: '#1B2F46' },
  { id: 'biz-3', name: '供应链协同', url: '/business/supply-chain', icon: 'ApartmentOutlined', iconBgColor: '#EAF5F3', iconColor: '#0F766E', textColor: '#1B2F46' },
  { id: 'biz-4', name: '数字园区', url: '/business/park', icon: 'BankOutlined', iconBgColor: '#EEF1F5', iconColor: '#334155', textColor: '#1B2F46' },
  { id: 'biz-5', name: '碳资产管理', url: '/business/carbon', icon: 'GlobalOutlined', iconBgColor: '#EDF8F1', iconColor: '#15803D', textColor: '#1B2F46' },
  { id: 'biz-6', name: '风险控制', url: '/business/risk', icon: 'SafetyCertificateOutlined', iconBgColor: '#EEF3FF', iconColor: '#1D4ED8', textColor: '#1B2F46' },
  { id: 'biz-7', name: '客户增长', url: '/business/customer-growth', icon: 'LineChartOutlined', iconBgColor: '#FFF4E8', iconColor: '#C2410C', textColor: '#1B2F46' },
  { id: 'biz-8', name: '决策中枢', url: '/business/decision', icon: 'ClusterOutlined', iconBgColor: '#F1EDFF', iconColor: '#6D28D9', textColor: '#1B2F46' },
];

const portalServiceItems = [
  { id: 'svc-1', name: '门户建设', url: '/services/portal', icon: 'AppstoreOutlined', iconBgColor: '#E8F1FF', iconColor: '#144A8C', textColor: '#1B2F46' },
  { id: 'svc-2', name: '品牌官网', url: '/services/website', icon: 'HomeOutlined', iconBgColor: '#EEF3FF', iconColor: '#1D4ED8', textColor: '#1B2F46' },
  { id: 'svc-3', name: '解决方案', url: '/services/solutions', icon: 'DeploymentUnitOutlined', iconBgColor: '#F5F3FF', iconColor: '#7C3AED', textColor: '#1B2F46' },
  { id: 'svc-4', name: '数据可视化', url: '/services/visual', icon: 'AreaChartOutlined', iconBgColor: '#EDF8F1', iconColor: '#15803D', textColor: '#1B2F46' },
  { id: 'svc-5', name: '咨询实施', url: '/services/consulting', icon: 'AuditOutlined', iconBgColor: '#FFF7ED', iconColor: '#C2410C', textColor: '#1B2F46' },
  { id: 'svc-6', name: '运维托管', url: '/services/ops', icon: 'CloudServerOutlined', iconBgColor: '#EEF2FF', iconColor: '#4338CA', textColor: '#1B2F46' },
  { id: 'svc-7', name: '客户成功', url: '/services/customer-success', icon: 'CustomerServiceOutlined', iconBgColor: '#F0FDF4', iconColor: '#166534', textColor: '#1B2F46' },
  { id: 'svc-8', name: '开放生态', url: '/services/ecosystem', icon: 'ApiOutlined', iconBgColor: '#EFF6FF', iconColor: '#1D4ED8', textColor: '#1B2F46' },
];

const buildPortalSnapshot = (title, prompt) => {
  const snapshot = createEmptySnapshot();
  snapshot.dashboardConfig.title = title;
  snapshot.widgets = [
    buildHeaderBar(title, 'portal'),
    buildCarousel(),
    buildNavGroup('核心业务展示', portalPrimaryItems, { layout: { w: 18, h: 10, minW: 8, minH: 8 } }),
    buildNavGroup('产品服务模块', portalServiceItems, { layout: { w: 18, h: 10, minW: 8, minH: 8 } }),
    buildNews('新闻资讯动态', { layout: { w: 12, h: 10, minW: 6, minH: 8 } }),
    buildRichText('成功案例展示', '<div style="color:#1B2F46;font-family:Arial,Helvetica,sans-serif;"><div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:16px;"><div><div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#7A8799;">Case Studies</div><h2 style="margin:6px 0 0;font-size:26px;line-height:1.2;color:#0F2747;">成功案例展示</h2></div><div style="font-size:13px;color:#5B6B7C;max-width:400px;text-align:right;line-height:1.7;">聚焦能源、制造、供应链与园区场景，以可量化结果构建企业公信力。</div></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;"><div style="background:linear-gradient(180deg,#F5F9FF 0%,#EDF4FE 100%);border:1px solid #D9E7FA;border-radius:16px;padding:18px;"><div style="font-size:11px;color:#51657C;letter-spacing:1px;">新能源集团</div><div style="margin-top:10px;font-size:18px;font-weight:700;color:#0F2747;">品牌门户重构</div><div style="margin-top:12px;font-size:13px;line-height:1.8;color:#5B6B7C;">完成官网、门户与客户服务入口统一设计，线索转化效率提升 32%。</div></div><div style="background:linear-gradient(180deg,#F8FAFC 0%,#EFF3F7 100%);border:1px solid #DEE6EE;border-radius:16px;padding:18px;"><div style="font-size:11px;color:#51657C;letter-spacing:1px;">高端制造企业</div><div style="margin-top:10px;font-size:18px;font-weight:700;color:#0F2747;">产品服务门户</div><div style="margin-top:12px;font-size:13px;line-height:1.8;color:#5B6B7C;">围绕产品矩阵、售后服务和文档中心搭建统一门户，客户查询路径缩短 40%。</div></div><div style="background:linear-gradient(180deg,#F4FBF8 0%,#EAF7F1 100%);border:1px solid #D8EEE3;border-radius:16px;padding:18px;"><div style="font-size:11px;color:#51657C;letter-spacing:1px;">城市产业园区</div><div style="margin-top:10px;font-size:18px;font-weight:700;color:#0F2747;">招商展示首页</div><div style="margin-top:12px;font-size:13px;line-height:1.8;color:#5B6B7C;">将招商政策、产业资源与典型项目联动呈现，提升园区品牌曝光与入驻咨询。</div></div></div></div>', { layout: { w: 24, h: 10, minW: 12, minH: 8 }, minHeight: 260, placeholder: '请输入成功案例内容' }),
    buildRichText('底部联系信息', '<div style="color:#C8D5E6;font-family:Arial,Helvetica,sans-serif;"><div style="display:grid;grid-template-columns:1.1fr 1fr 1fr;gap:28px;align-items:start;"><div><div style="font-size:18px;font-weight:700;color:#FFFFFF;letter-spacing:0.5px;margin-bottom:10px;">ENGIE Enterprise Portal</div><div style="font-size:12px;line-height:2;color:#8AA8C4;">围绕品牌形象、核心业务、产品服务与内容运营打造现代商务型门户体验。</div></div><div><div style="font-size:13px;font-weight:700;color:#FFFFFF;margin-bottom:10px;">联系方式</div><div style="font-size:12px;line-height:2.1;color:#A8BBCF;">电话：400-800-2026</div><div style="font-size:12px;line-height:2.1;color:#A8BBCF;">邮箱：portal@engie-enterprise.com</div><div style="font-size:12px;line-height:2.1;color:#A8BBCF;">商务合作：bd@engie-enterprise.com</div></div><div><div style="font-size:13px;font-weight:700;color:#FFFFFF;margin-bottom:10px;">地址与版权</div><div style="font-size:12px;line-height:2.1;color:#A8BBCF;">上海市浦东新区张江科技商务区 A 座 18F</div><div style="font-size:12px;line-height:2.1;color:#A8BBCF;">工作日：09:00 - 18:00</div><div style="margin-top:12px;font-size:11px;color:#6A82A0;">© 2026 ENGIE Enterprise. All Rights Reserved.</div></div></div></div>', { layout: { w: 36, h: 6, minW: 12, minH: 4 }, backgroundType: 'gradient', backgroundGradient: 'linear-gradient(90deg, #09172C 0%, #0D274A 48%, #112F57 100%)', contentPadding: 22, minHeight: 180, placeholder: '请输入底部信息' }),
  ];
  applyThemeByPrompt(snapshot, prompt, { defaultPreset: DEFAULT_THEME_BY_INTENT.portal });
  snapshot.widgets = reflowWidgetsCompact36(snapshot.widgets);
  return snapshot;
};

const buildDashboardSnapshot = (title, prompt) => {
  const chartType = inferChartType(prompt);
  const snapshot = createEmptySnapshot();
  snapshot.dashboardConfig.title = title;
  snapshot.widgets = [
    buildHeaderBar(title, 'dashboard'),
    buildStats('接入总览', [
      { key: 'deviceTotal', label: '设备总数', value: 12864, trend: 'up', trendValue: 6.2, color: '#3B82F6' },
      { key: 'onlineDevices', label: '在线设备', value: 12421, trend: 'up', trendValue: 3.8, color: '#22C55E' },
    ], { layout: { w: 8, h: 6, minW: 6, minH: 5 } }),
    buildStats('告警态势', [
      { key: 'todayAlerts', label: '今日告警', value: 138, trend: 'up', trendValue: 12.5, color: '#F59E0B' },
      { key: 'pendingEvents', label: '待处置事件', value: 26, trend: 'down', trendValue: 4.3, color: '#EF4444' },
    ], { layout: { w: 8, h: 6, minW: 6, minH: 5 } }),
    buildChart(chartType === 'area-map' ? '区域热力图' : '核心趋势图', chartType, chartType === 'area-map'
      ? [{ name: '市南区', value: 92 }, { name: '市北区', value: 118 }, { name: '崂山区', value: 86 }, { name: '城阳区', value: 135 }, { name: '黄岛区', value: 148 }]
      : [{ name: '09:00', value: 1820 }, { name: '10:00', value: 2380 }, { name: '11:00', value: 2640 }, { name: '12:00', value: 2410 }, { name: '13:00', value: 2870 }, { name: '14:00', value: 3250 }], {
      layout: { w: 20, h: 12, minW: 10, minH: 8 },
      categoryField: 'name',
      valueField: 'value',
      extra: chartType === 'area-map'
        ? { showLegend: false, showTooltip: true, showLabel: true, geoJsonSource: 'url', geoJsonUrl: '/maps/370200.geojson', geoJsonNameProperty: 'name', mapRoam: true, mapZoom: 1, mapAreaColor: '#0E2237', mapBorderColor: '#29527B', mapEmphasisAreaColor: '#3A8DFF', showVisualMap: true, visualMapMin: 50, visualMapMax: 160, visualMapStartColor: '#16385C', visualMapEndColor: '#58B6FF', colors: ['#1D4ED8', '#38BDF8', '#22D3EE', '#60A5FA'] }
        : { smooth: true, showLegend: false, showTooltip: true, colors: ['#00E5FF'] },
    }),
    buildTopList('区域告警排行', [
      { name: '黄岛区', value: 148, rank: 1, trend: 'up' },
      { name: '城阳区', value: 135, rank: 2, trend: 'up' },
      { name: '市北区', value: 118, rank: 3, trend: 'up' },
      { name: '即墨区', value: 109, rank: 4, trend: 'stable' },
      { name: '市南区', value: 92, rank: 5, trend: 'down' },
    ], { layout: { w: 8, h: 6, minW: 5, minH: 5 }, showTrend: true }),
    buildTopList('区域处置排行', [
      { name: '市南区', value: '96%', rank: 1, trend: 'up' },
      { name: '崂山区', value: '94%', rank: 2, trend: 'up' },
      { name: '市北区', value: '91%', rank: 3, trend: 'up' },
      { name: '黄岛区', value: '89%', rank: 4, trend: 'stable' },
      { name: '城阳区', value: '87%', rank: 5, trend: 'stable' },
    ], { layout: { w: 8, h: 6, minW: 5, minH: 5 }, showTrend: true }),
    buildDataTable('实时数据滚动', {
      titleColor: '#D8E9FF',
      backgroundColor: '#091A2E',
      refreshInterval: 1,
      apiEndpoint: '/api/demo/table',
      apiMethod: 'GET',
      apiListField: 'data.list',
      paginationMode: 'none',
      layout: { w: 36, h: 10, minW: 12, minH: 6 },
      columns: [
        { key: 'id', title: '编号', dataIndex: 'id', width: 120 },
        { key: 'name', title: '任务名称', dataIndex: 'name', width: 260 },
        { key: 'owner', title: '负责人', dataIndex: 'owner', width: 120 },
        { key: 'category', title: '分类', dataIndex: 'category', width: 130 },
        { key: 'status', title: '状态', dataIndex: 'status', width: 120 },
        { key: 'score', title: '评分', dataIndex: 'score', width: 120 },
        { key: 'updateTime', title: '更新时间', dataIndex: 'updateTime', width: 180 },
      ],
    }),
  ];
  applyThemeByPrompt(snapshot, prompt, { defaultPreset: DEFAULT_THEME_BY_INTENT.dashboard });
  snapshot.widgets = reflowWidgetsCompact36(snapshot.widgets);
  return snapshot;
};

const buildManagementSnapshot = (title, prompt) => {
  const snapshot = createEmptySnapshot();
  snapshot.dashboardConfig.title = title;
  snapshot.widgets = [
    buildHeaderBar(title, 'management'),
    buildQueryFilter(),
    buildDataTable('业务数据列表', {
      layout: { w: 36, h: 10, minW: 12, minH: 6 },
      staticData: [
        { key: '1', name: '项目审批单 A', owner: '张三', status: '进行中', updatedAt: '2026-04-09 10:20' },
        { key: '2', name: '采购申请单 B', owner: '李四', status: '已完成', updatedAt: '2026-04-09 09:35' },
        { key: '3', name: '变更工单 C', owner: '王五', status: '待处理', updatedAt: '2026-04-08 16:40' },
      ],
    }),
    buildPageNavigator(),
  ];
  applyThemeByPrompt(snapshot, prompt, { defaultPreset: DEFAULT_THEME_BY_INTENT.management });
  snapshot.widgets = reflowWidgetsCompact36(snapshot.widgets);
  return snapshot;
};

const hasWidgetType = (snapshot, type) => Array.isArray(snapshot?.widgets) && snapshot.widgets.some((item) => item?.type === type);

const buildWidgetByType = (type, prompt, intent, options = {}) => {
  const resolvedTitle = trimString(options.title) || inferTitle(prompt, intent);

  switch (type) {
    case 'headerBar': return buildHeaderBar(resolvedTitle, intent);
    case 'carousel': return buildCarousel();
    case 'navGroup': return buildNavGroup('快捷入口', portalPrimaryItems.slice(0, 8), { layout: { w: 18, h: 10, minW: 8, minH: 8 } });
    case 'iconNav': return buildIconNav();
    case 'news': return buildNews('新闻资讯', { layout: { w: 12, h: 10, minW: 6, minH: 8 } });
    case 'richText': return buildRichText('说明信息', '<div style="color:#1B2F46;line-height:1.8"><h3 style="color:#1677ff">说明信息</h3><p>这里可以放公告、介绍、欢迎语或操作说明。</p></div>', { layout: { w: 18, h: 8, minW: 8, minH: 6 }, minHeight: 220 });
    case 'queryFilter': return buildQueryFilter();
    case 'dataTable': return buildDataTable('业务数据列表', { layout: { w: 36, h: 8, minW: 12, minH: 6 } });
    case 'stats': return buildStats('统计概览', [
      { key: 'metricA', label: '今日新增', value: 128, trend: 'up', trendValue: 5.6, color: '#3B82F6' },
      { key: 'metricB', label: '累计总数', value: 2456, trend: 'up', trendValue: 2.1, color: '#22C55E' },
    ], { layout: { w: 10, h: 6, minW: 6, minH: 5 } });
    case 'indicatorCard': return buildIndicatorCard('核心指标', '22,522', '今日销售额', '#1890FF');
    case 'chart': return buildChart('趋势图', inferChartType(prompt), [{ name: '周一', value: 120 }, { name: '周二', value: 168 }, { name: '周三', value: 152 }, { name: '周四', value: 210 }, { name: '周五', value: 268 }], { categoryField: 'name', valueField: 'value' });
    case 'topList': return buildTopList('排行列表', [{ name: '华东大区', value: 856000, rank: 1, trend: 'up' }, { name: '华南大区', value: 792000, rank: 2, trend: 'up' }, { name: '华北大区', value: 724000, rank: 3, trend: 'stable' }], { layout: { w: 8, h: 9, minW: 5, minH: 6 } });
    case 'pageNavigator': return buildPageNavigator();
    case 'cardGrid': return buildCardGrid();
    default: return null;
  }
};

const ensureIntentRecipe = (snapshot, intent, prompt, options = {}) => {
  const recipe = intent === 'management'
    ? ['headerBar', 'queryFilter', 'dataTable', 'pageNavigator']
    : intent === 'dashboard'
      ? ['headerBar', 'stats', 'chart', 'topList', 'dataTable']
      : ['headerBar', 'carousel', 'navGroup', 'news', 'richText'];

  recipe.forEach((type) => {
    if (!hasWidgetType(snapshot, type)) {
      const widget = buildWidgetByType(type, prompt, intent, options);
      if (widget) snapshot.widgets.push(widget);
    }
  });
};

const buildCreateSnapshot = (intent, title, prompt) => {
  if (intent === 'clear') return createEmptySnapshot();
  if (intent === 'management') return buildManagementSnapshot(title, prompt);
  if (intent === 'dashboard') return buildDashboardSnapshot(title, prompt);
  return buildPortalSnapshot(title, prompt);
};

const updateHeaderTitle = (snapshot, title, intent) => {
  const header = Array.isArray(snapshot?.widgets) ? snapshot.widgets.find((item) => item?.type === 'headerBar') : null;
  if (!header) {
    snapshot.widgets.unshift(buildHeaderBar(title, intent));
    return;
  }
  header.title = title;
  header.config = { ...header.config, title, headerTitle: title };
};

const buildEditSnapshot = (currentSnapshot, prompt) => {
  const intent = inferIntent(prompt);
  if (intent === 'clear') return createEmptySnapshot();
  const requestedTypes = deriveRequestedWidgetTypes(prompt);
  const snapshot = normalizeSnapshot(currentSnapshot);
  const title = resolveTitleForTask({
    prompt,
    intent,
    mode: 'edit',
    currentSnapshot: snapshot,
  });

  snapshot.dashboardConfig.title = title;
  if (!Array.isArray(snapshot.widgets)) snapshot.widgets = [];
  updateHeaderTitle(snapshot, title, intent);

  if (requestedTypes.length) {
    requestedTypes.forEach((type) => {
      if (!hasWidgetType(snapshot, type)) {
        const widget = buildWidgetByType(type, prompt, intent, { title });
        if (widget) snapshot.widgets.push(widget);
      }
    });
  } else {
    ensureIntentRecipe(snapshot, intent, prompt, { title });
  }

  applyThemeByPrompt(snapshot, prompt, { defaultPreset: DEFAULT_THEME_BY_INTENT[intent] || null });
  snapshot.widgets = reflowWidgetsCompact36(snapshot.widgets);
  snapshot.groups = Array.isArray(snapshot.groups) ? snapshot.groups : [];
  snapshot.floatingModules = Array.isArray(snapshot.floatingModules) ? snapshot.floatingModules : [];
  return snapshot;
};

const fallbackGenerateResult = ({ prompt, mode, currentSnapshot }) => {
  const intent = inferIntent(prompt);
  const title = inferTitle(prompt, intent);
  const snapshot = mode === 'create' ? buildCreateSnapshot(intent, title, prompt) : buildEditSnapshot(currentSnapshot, prompt);
  const widgetTypes = Array.from(new Set(snapshot.widgets.map((item) => item.type)));
  const chinese = containsChinese(prompt);

  return {
    reply: intent === 'clear'
      ? (chinese ? '已清空当前工作台并返回空白快照。' : 'Cleared the current workspace and returned an empty snapshot.')
      : mode === 'create'
        ? (chinese ? `已按 portal-builder 规则生成「${title}」页面结构。` : `Created a "${title}" page skeleton following the portal-builder rules.`)
        : (chinese ? `已按 portal-builder 规则更新当前工作台，当前标题为「${snapshot.dashboardConfig?.title || title}」。` : `Updated the current workspace using the portal-builder rules. Current title: "${snapshot.dashboardConfig?.title || title}".`),
    reasoning: [
      { title: chinese ? '意图识别' : 'Intent', content: chinese ? `识别为 ${intent === 'portal' ? '企业门户' : intent === 'dashboard' ? '数据看板/大屏' : intent === 'management' ? '管理后台' : '清空页面'} 场景。` : `Classified the request as ${intent}.` },
      { title: chinese ? '组件映射' : 'Component mapping', content: chinese ? `组件选择遵循 portal-builder 规范，当前结果包含：${widgetTypes.join('、') || '无组件'}。` : `Component selection follows the portal-builder references. Current widgets: ${widgetTypes.join(', ') || 'none'}.` },
      { title: chinese ? '布局与字段' : 'Layout and fields', content: chinese ? '已使用 compact 36 列布局并按关键组件字段规则归一化输出。' : 'Applied the compact 36-column layout and normalized key widget fields.' },
    ],
    summary: {
      title: intent === 'clear' ? '' : (snapshot.dashboardConfig?.title || title),
      widgetCount: snapshot.widgets.length,
      widgetTypes,
      mode: mode === 'create' ? 'create' : 'edit',
    },
    snapshot,
  };
};

module.exports = {
  GRID_COLUMNS,
  VALID_WIDGET_TYPES,
  WIDGET_LAYOUT_PRESETS,
  PORTAL_BUILDER_REFERENCE_DIGEST,
  applyThemeByPrompt,
  buildPortalBuilderContext,
  buildStreamPreviewSystemPrompt,
  buildStreamPreviewUserPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  createEmptySnapshot,
  detectClearIntent,
  detectRenameIntent,
  extractExplicitTitle,
  fallbackGenerateResult,
  getSnapshotTitle,
  inferIntent,
  inferTitle,
  inferChartType,
  deriveRequestedWidgetTypes,
  reflowWidgetsCompact36,
  serializeSelectedSectionsForPrompt,
  serializeSnapshotForPrompt,
};
