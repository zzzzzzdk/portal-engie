const express = require('express');
const {
  getLocalComponentLibraryState,
  nowText,
  setLocalComponentLibraryState,
} = require('../config/local-component-library-state');

const router = express.Router();

const normalizeText = (value) => String(value || '').trim();

const buildCategoryList = (state) => {
  return state.categories
    .slice()
    .sort((prev, next) => prev.sort - next.sort)
    .map((category) => ({
      ...category,
      templateCount: state.templates.filter((template) => template.categoryId === category.id).length,
    }));
};

router.get('/v1/component-templates/categories', async (req, res) => {
  await req.sleep(0.15);
  const state = getLocalComponentLibraryState();
  req.json.code = 20000;
  req.json.data = buildCategoryList(state);
  res.json(req.json);
});

router.post('/v1/component-templates/categories', async (req, res) => {
  await req.sleep(0.15);
  const state = getLocalComponentLibraryState();
  const name = normalizeText(req.body?.name);

  if (!name) {
    req.json.code = 40000;
    req.json.message = '分类名称不能为空';
    req.json.data = null;
    return res.json(req.json);
  }

  if (state.categories.some((category) => category.name === name)) {
    req.json.code = 40000;
    req.json.message = '分类名称已存在';
    req.json.data = null;
    return res.json(req.json);
  }

  const now = nowText();
  const category = {
    id: `category-${Date.now()}`,
    name,
    sort: state.categories.length,
    builtIn: false,
    createdAt: now,
    updatedAt: now,
  };

  state.categories.push(category);
  setLocalComponentLibraryState(state);

  req.json.code = 20000;
  req.json.data = {
    ...category,
    templateCount: 0,
  };
  res.json(req.json);
});

router.post('/v1/component-templates/categories/delete', async (req, res) => {
  await req.sleep(0.15);
  const state = getLocalComponentLibraryState();
  const id = normalizeText(req.body?.id);
  const category = state.categories.find((item) => item.id === id);

  if (!category) {
    req.json.code = 40004;
    req.json.message = '分类不存在';
    req.json.data = null;
    return res.json(req.json);
  }

  if (category.builtIn) {
    req.json.code = 40000;
    req.json.message = '默认分类不允许删除';
    req.json.data = null;
    return res.json(req.json);
  }

  if (state.templates.some((template) => template.categoryId === id)) {
    req.json.code = 40000;
    req.json.message = '分类下仍有组件，请先删除组件';
    req.json.data = null;
    return res.json(req.json);
  }

  state.categories = state.categories
    .filter((item) => item.id !== id)
    .map((item, index) => ({
      ...item,
      sort: index,
    }));
  setLocalComponentLibraryState(state);

  req.json.code = 20000;
  req.json.data = { success: true };
  res.json(req.json);
});

router.get('/v1/component-templates/templates', async (req, res) => {
  await req.sleep(0.15);
  const state = getLocalComponentLibraryState();
  const keyword = normalizeText(req.query?.keyword).toLowerCase();
  const categoryId = normalizeText(req.query?.categoryId);

  const templates = state.templates.filter((template) => {
    if (categoryId && template.categoryId !== categoryId) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return template.name.toLowerCase().includes(keyword);
  });

  req.json.code = 20000;
  req.json.data = templates;
  res.json(req.json);
});

router.get('/v1/component-templates/templates/:id', async (req, res) => {
  await req.sleep(0.15);
  const state = getLocalComponentLibraryState();
  const id = normalizeText(req.params?.id);
  const template = state.templates.find((item) => item.id === id) || null;

  req.json.code = 20000;
  req.json.data = template;
  res.json(req.json);
});

router.post('/v1/component-templates/templates', async (req, res) => {
  await req.sleep(0.15);
  const state = getLocalComponentLibraryState();
  const name = normalizeText(req.body?.name);
  const categoryId = normalizeText(req.body?.categoryId);
  const sourceSignature = normalizeText(req.body?.sourceSignature);
  const snapshot = req.body?.snapshot;

  if (!name) {
    req.json.code = 40000;
    req.json.message = '组件名称不能为空';
    req.json.data = null;
    return res.json(req.json);
  }

  if (!categoryId) {
    req.json.code = 40000;
    req.json.message = '请选择分类';
    req.json.data = null;
    return res.json(req.json);
  }

  if (!state.categories.some((category) => category.id === categoryId)) {
    req.json.code = 40004;
    req.json.message = '分类不存在';
    req.json.data = null;
    return res.json(req.json);
  }

  if (!snapshot || !snapshot.scope) {
    req.json.code = 40000;
    req.json.message = '模板快照数据不完整';
    req.json.data = null;
    return res.json(req.json);
  }

  if (!sourceSignature) {
    req.json.code = 40000;
    req.json.message = '模板快照签名不能为空';
    req.json.data = null;
    return res.json(req.json);
  }

  if (
    state.templates.some(
      (template) => template.categoryId === categoryId && normalizeText(template.name) === name,
    )
  ) {
    req.json.code = 40000;
    req.json.message = '同一分类下不允许模板重名';
    req.json.data = null;
    return res.json(req.json);
  }

  const now = nowText();
  const template = {
    id: `local-template-${Date.now()}`,
    name,
    categoryId,
    scope: snapshot.scope,
    sourceSignature,
    createdAt: now,
    updatedAt: now,
    snapshot,
  };

  state.templates.unshift(template);
  setLocalComponentLibraryState(state);

  req.json.code = 20000;
  req.json.data = template;
  res.json(req.json);
});

router.post('/v1/component-templates/templates/delete', async (req, res) => {
  await req.sleep(0.15);
  const state = getLocalComponentLibraryState();
  const id = normalizeText(req.body?.id);

  if (!state.templates.some((template) => template.id === id)) {
    req.json.code = 40004;
    req.json.message = '模板不存在';
    req.json.data = null;
    return res.json(req.json);
  }

  state.templates = state.templates.filter((template) => template.id !== id);
  setLocalComponentLibraryState(state);

  req.json.code = 20000;
  req.json.data = { success: true };
  res.json(req.json);
});

module.exports = router;
