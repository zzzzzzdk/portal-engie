const express = require('express');
const router = express.Router();

/**
 * 获取数据资产信息
 * GET /api/home/get-data-asset-info
 */
router.get('/home/get-data-asset-info', async (req, res) => {
  await req.sleep(0.3);
  req.json.data = {
    sample_total: 1126,           // 素材库数量
    sample_detail_total: 23550,   // 数据总量
    labeled_sample_total: 8730,   // 已标注样本数
    label_total: 30,              // 标注类别数
  };
  res.json(req.json);
});

/**
 * 获取训练工作台信息
 * GET /api/home/get-train-workbench-info
 */
router.get('/home/get-train-workbench-info', async (req, res) => {
  await req.sleep(0.3);
  req.json.data = {
    train_project_total: 80,        // 训练项目数量
    train_task_total: 130,          // 训练任务数量
    train_task_running_total: 6,    // 训练中的数量
  };
  res.json(req.json);
});

/**
 * 获取模型仓库信息
 * GET /api/home/get-model-repo-info
 */
router.get('/home/get-model-repo-info', async (req, res) => {
  await req.sleep(0.3);
  req.json.data = {
    model_total: 20,       // 模型数量
    model_type_total: 2,   // 模型类型数量
  };
  res.json(req.json);
});

/**
 * 获取算法仓库信息
 * GET /api/home/get-algo-repo-info
 */
router.get('/home/get-algo-repo-info', async (req, res) => {
  await req.sleep(0.3);
  req.json.data = {
    algo_total: 35,            // 算法数量
    algo_deploy_total: 130,    // 算法部署次数
    offline_export_total: 35,  // 离线导出次数
    api_total: 5,              // API次数
    online_issue_total: 10,    // 在线下发次数
  };
  res.json(req.json);
});

module.exports = router;
