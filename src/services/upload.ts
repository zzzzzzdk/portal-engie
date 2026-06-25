// 文件上传相关接口服务
import ajax from '../utils/axios.config';

// 上传图片响应
export interface UploadImageResponse {
  url: string;
  filename: string;
  originalName?: string;
  size: number;
  mimetype?: string;
}

/**
 * 上传图片
 * @param file 图片文件
 * @returns 上传结果
 */
export const uploadImage = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return ajax<UploadImageResponse>({
    method: 'post',
    url: '/v1/upload/images',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};
