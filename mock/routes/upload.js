const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, uniqueName);
  }
});

// 文件过滤器 - 只允许图片
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (jpeg, png, gif, webp, svg)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制 10MB
  }
});

/**
 * @api {post} /v1/upload/images 上传图片
 * @apiName uploadImage
 * @apiGroup Upload
 *
 * @apiParam {File} file 图片文件
 *
 * @apiSuccess {Number} code 状态码
 * @apiSuccess {String} message 消息
 * @apiSuccess {Object} data 返回数据
 * @apiSuccess {String} data.url 图片访问地址
 * @apiSuccess {String} data.filename 文件名
 * @apiSuccess {Number} data.size 文件大小(字节)
 */
router.post('/v1/upload/images', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      req.json.code = 1;
      req.json.message = '请选择要上传的图片';
      return res.json(req.json);
    }

    // 构建访问 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

    req.json.code = 0;
    req.json.message = '上传成功';
    req.json.data = {
      url: imageUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    };

    console.log('[Mock] Image uploaded:', {
      filename: req.file.filename,
      size: req.file.size,
      url: imageUrl
    });

    res.json(req.json);
  } catch (error) {
    req.json.code = 1;
    req.json.message = '上传失败: ' + error.message;
    res.json(req.json);
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      req.json.code = 1;
      req.json.message = '文件大小超过限制 (最大 10MB)';
    } else {
      req.json.code = 1;
      req.json.message = '上传错误: ' + error.message;
    }
  } else if (error) {
    req.json.code = 1;
    req.json.message = error.message;
  }
  res.json(req.json);
});

module.exports = router;
