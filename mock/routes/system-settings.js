var express = require("express");
var router = express.Router();

// ============================================
// 系统设置相关接口
// ============================================

/**
 * @api {post} /common/edit-sys-info 修改系统信息
 * @apiName editSysInfo
 * @apiGroup SystemSettings
 * @apiDescription 修改系统基本信息
 */
router.post("/common/edit-sys-info", async function (req, res, next) {
  await req.sleep(0.5);

  const { id, sys_name, sys_description, logo } = req.body;

  // 这里模拟数据更新成功
  req.json.code = 20000;
  req.json.message = "系统信息更新成功";

  res.json(req.json);
});

/**
 * @api {post} /common/edit-sys-scene 新增/修改应用场景
 * @apiName editSysScene
 * @apiGroup SystemSettings
 * @apiDescription 新增或修改应用场景
 */
router.post("/common/edit-sys-scene", async function (req, res, next) {
  await req.sleep(0.5);

  const { id, scene_name } = req.body;

  req.json.code = 20000;
  req.json.message = id ? "应用场景修改成功" : "应用场景新增成功";

  res.json(req.json);
});

/**
 * @api {post} /common/delete-sys-scene 删除应用场景
 * @apiName deleteSysScene
 * @apiGroup SystemSettings
 * @apiDescription 删除指定应用场景
 */
router.post("/common/delete-sys-scene", async function (req, res, next) {
  await req.sleep(0.3);

  const { id } = req.body;

  req.json.code = 20000;
  req.json.message = "应用场景删除成功";

  res.json(req.json);
});

/**
 * @api {post} /common/edit-sys-model 新增/修改系统通用模型
 * @apiName editSysModel
 * @apiGroup SystemSettings
 * @apiDescription 新增或修改系统通用模型（大语言模型、目标检测模型、图文关联模型）
 */
router.post("/common/edit-sys-model", async function (req, res, next) {
  await req.sleep(0.5);

  const { id, model_type, model_name, api_key, api_url, context_max_len } = req.body;

  // 验证 model_type
  if (![1, 2, 3].includes(model_type)) {
    req.json.code = 40000;
    req.json.message = "模型类型错误";
    return res.json(req.json);
  }

  req.json.code = 20000;
  req.json.message = id ? "模型信息修改成功" : "模型信息新增成功";

  res.json(req.json);
});

/**
 * @api {post} /common/delete-sys-model 删除系统通用模型
 * @apiName deleteSysModel
 * @apiGroup SystemSettings
 * @apiDescription 删除指定系统通用模型
 */
router.post("/common/delete-sys-model", async function (req, res, next) {
  await req.sleep(0.3);

  const { id } = req.body;

  req.json.code = 20000;
  req.json.message = "模型删除成功";

  res.json(req.json);
});

/**
 * @api {post} /common/set-default-sys-model 设置默认系统模型
 * @apiName setDefaultSysModel
 * @apiGroup SystemSettings
 * @apiDescription 设置指定模型为默认模型（同一类型的其他模型会自动取消默认）
 */
router.post("/common/set-default-sys-model", async function (req, res, next) {
  await req.sleep(0.3);

  const { id, model_type } = req.body;

  // 验证 model_type
  if (![1, 2, 3].includes(model_type)) {
    req.json.code = 40000;
    req.json.message = "模型类型错误";
    return res.json(req.json);
  }

  req.json.code = 20000;
  req.json.message = "默认模型设置成功";

  res.json(req.json);
});

/**
 * @api {get} /common/get-model-labels 获取模型支持的类别标签
 * @apiName getModelLabels
 * @apiGroup SystemSettings
 * @apiDescription 获取指定模型支持的类别标签列表（主要用于目标检测模型）
 */
router.get("/common/get-model-labels", async function (req, res, next) {
  await req.sleep(0.5);

  const { model_id } = req.query;

  // 模拟不同模型返回不同的标签数据
  const labelData = {
    2: [ // YOLO-v8 模型的标签
      { index: 0, label_en: "person", label_zh: "人" },
      { index: 1, label_en: "bicycle", label_zh: "自行车" },
      { index: 2, label_en: "car", label_zh: "汽车" },
      { index: 3, label_en: "motorcycle", label_zh: "摩托车" },
      { index: 4, label_en: "airplane", label_zh: "飞机" },
      { index: 5, label_en: "bus", label_zh: "公交车" },
      { index: 6, label_en: "train", label_zh: "火车" },
      { index: 7, label_en: "truck", label_zh: "卡车" },
      { index: 8, label_en: "boat", label_zh: "船" },
      { index: 9, label_en: "traffic light", label_zh: "红绿灯" },
      { index: 10, label_en: "fire hydrant", label_zh: "消防栓" },
      { index: 11, label_en: "stop sign", label_zh: "停止标志" },
      { index: 12, label_en: "parking meter", label_zh: "停车计时器" },
      { index: 13, label_en: "bench", label_zh: "长凳" },
      { index: 14, label_en: "bird", label_zh: "鸟" },
      { index: 15, label_en: "cat", label_zh: "猫" },
      { index: 16, label_en: "dog", label_zh: "狗" },
      { index: 17, label_en: "horse", label_zh: "马" },
      { index: 18, label_en: "sheep", label_zh: "羊" },
      { index: 19, label_en: "cow", label_zh: "牛" }
    ]
  };

  req.json.code = 20000;
  req.json.data = labelData[model_id] || [];

  res.json(req.json);
});

// ============================================
// 素材库标签设置接口
// ============================================

/**
 * @api {post} /common/edit-label-class 新增/修改标签类别
 * @apiName editLabelClass
 * @apiGroup SystemSettings
 * @apiDescription 新增或修改标签类别（分类）
 */
router.post("/common/edit-label-class", async function (req, res, next) {
  await req.sleep(0.5);

  const { id, class_name } = req.body;

  req.json.code = 20000;
  req.json.message = id ? "标签类别修改成功" : "标签类别新增成功";
  req.json.data = {
    id: id || Date.now().toString(),
    class_name: class_name
  };

  res.json(req.json);
});

/**
 * @api {post} /common/delete-label-class 删除标签类别
 * @apiName deleteLabelClass
 * @apiGroup SystemSettings
 * @apiDescription 删除指定标签类别
 */
router.post("/common/delete-label-class", async function (req, res, next) {
  await req.sleep(0.3);

  const { id } = req.body;

  req.json.code = 20000;
  req.json.message = "标签类别删除成功";

  res.json(req.json);
});

/**
 * @api {post} /common/edit-label 新增/修改标签
 * @apiName editLabel
 * @apiGroup SystemSettings
 * @apiDescription 新增或修改标签
 */
router.post("/common/edit-label", async function (req, res, next) {
  await req.sleep(0.5);

  const { id, sys_label_class_id, label_en, label_zh } = req.body;

  req.json.code = 20000;
  req.json.message = id ? "标签修改成功" : "标签新增成功";
  req.json.data = {
    id: id || Date.now().toString(),
    sys_label_class_id: sys_label_class_id,
    label_en: label_en,
    label_zh: label_zh
  };

  res.json(req.json);
});

/**
 * @api {post} /common/delete-label 删除标签
 * @apiName deleteLabel
 * @apiGroup SystemSettings
 * @apiDescription 删除指定标签
 */
router.post("/common/delete-label", async function (req, res, next) {
  await req.sleep(0.3);

  const { id } = req.body;

  req.json.code = 20000;
  req.json.message = "标签删除成功";

  res.json(req.json);
});

module.exports = router;
