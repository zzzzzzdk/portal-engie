const express = require('express');
const router = express.Router();
const Mock = require('mockjs');
const Random = Mock.Random;

router.get('/databoard/algorithm', async (req, res) => {
  await req.sleep(0.1);
  const {
    data
  } = Mock.mock({
    'data|30': [{
      'id|+1': 1,
      'name': '@ctitle(2, 5)',
      "total": Random.integer(100, 300),
      "model_total": Random.integer(100, 300),
      "workflow_total": Random.integer(100, 300),
      'train_total': Random.integer(100, 300)
    }]
  });
  req.json.data = data;
  req.json.total = Random.integer(2000, 6000);
  req.json.model_total = 166;
  req.json.workflow_total = 3277;
  req.json.train_total = 1534;
  res.json(req.json);
});


router.get('/databoard/event-alert', async (req, res) => {
  await req.sleep(1);
  req.json.data = {
    day: {
      count: 333,
      change_count: -10
    },
    week: {
      count: 3333,
      change_count: 1000
    },
    month: {
      count: 23,
      change_count: -10000
    },
    data: Mock.mock({
      'data|30': [{
        'time': '@date("MM-dd")',
        'count|1-100': 100
      }]
    }).data
  }
  res.json(req.json);
});

router.get('/databoard/task', async (req, res) => {
  await req.sleep(1);
  req.json.data = {
    total: 300,
    start_total: 123,
    stop_total: 457,
    change_total: 123,
    data: [
      { id: 1, name: "拉横幅", count: 123 },
      { id: 2, name: "闯红灯", count: 23 },
      { id: 3, name: "打架", count: 554 },
      { id: 4, name: "订婚讹诈", count: 23 },
      { id: 5, name: "相亲讹诈", count: 24 },
      { id: 1, name: "拉横幅", count: 123 },
      { id: 2, name: "闯红灯", count: 23 },
      { id: 3, name: "打架", count: 554 },
      { id: 4, name: "订婚讹诈", count: 23 },
      { id: 5, name: "相亲讹诈", count: 24 },
    ]
  }
  res.json(req.json);
});

router.get('/databoard/gpus', async (req, res) => {
  await req.sleep(0.1);
  // const {
  //   data
  // } = Mock.mock({
  //   'data|30': [{
  //     'id|+1': 1,
  //     'name': 'xxxxxx',
  //     "children": [
  //       { id: 'id|+1', alg_count: 12, total: 59, used_total: 12, },
  //       { id: 'id|+1', alg_count: 13, total: 59, used_total: 23, },
  //       { id: 'id|+1', alg_count: 14, total: 59, used_total: 33, },
  //       { id: 'id|+1', alg_count: 15, total: 59, used_total: 43, },
  //     ]
  //   }]
  // });
  const data = [
    {
      id: "1",
      name: "xxxxxxxx",
      children: [
        { id: 2, alg_count: 12, total: 59, used_total: 12, },
        { id: 2, alg_count: 12, total: 59, used_total: 12, },
        { id: 2, alg_count: 12, total: 59, used_total: 12, },
        { id: 2, alg_count: 12, total: 59, used_total: 12, },
      ]
    },
    {
      id: "2",
      name: "xxxxxxxx",
      children: []
    },
    {
      id: "2",
      name: "xxxxxxxx",
      children: [
        { id: 2, alg_count: 12, total: 59, used_total: 12, },
        { id: 2, alg_count: 12, total: 59, used_total: 12, },
        { id: 2, alg_count: 12, total: 59, used_total: 12, },
        { id: 2, alg_count: 12, total: 59, used_total: 12, },
        { id: 2, alg_count: 12, total: 59, used_total: 12, },
      ]
    },
    {
      id: "2",
      name: "xxxxxxxx",
      children: []
    },
  ]
  req.json.data = data;
  req.json.total = Random.integer(2000, 6000);
  await req.sleep(2)
  res.json(req.json);
});


module.exports = router;
