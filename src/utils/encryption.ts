import JSEncrypt from "jsencrypt";
import CryptoJS from 'crypto-js'

const thisKeyPair = new JSEncrypt({
  // RSA 位数，这里要跟后端对应
  default_key_size: '2048'
})

// 非对称加密
const rsaUtil = {
  // 公钥加密
  encrypt: function (text: string | object, publicKey: string) {
    if (text instanceof Object) {
      text = JSON.stringify(text);
    }
    thisKeyPair.setPublicKey(publicKey);
    return thisKeyPair.encrypt((text as string));
  },
  // 私钥解密
  decrypt: function (text: string, privateKey: string) {
    thisKeyPair.setPrivateKey(privateKey);
    let decString = thisKeyPair.decrypt(text) || "";
    if (decString.charAt(0) === "{" || decString.charAt(0) === "[") {
      decString = JSON.parse(decString);
    }
    return decString;
  }
};

// 对称加密
const aesUtil = {

  // 固定key 必须是16位
  key: '3Rr0zlmzO1ITAeYQ',

  // 获取 随机key
  getKey: function (length = 16) {
    const random = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let str = '';
    for (let i = 0; i < length; i++) {
      str = str + random.charAt(Math.random() * random.length)
    }
    return str;
  },

  // 加密
  encrypt: function (text: string, key: string) {
    const encrypted = CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(text),
      CryptoJS.enc.Utf8.parse(key || this.key),
      {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    return encrypted.toString();
  },

  // 解密
  decrypt: function (text: string, key: string) {
    let decString = ''
    try {
      const decrypted = CryptoJS.AES.decrypt(
        text,
        CryptoJS.enc.Utf8.parse(key || this.key),
        {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        }
      );
      decString = CryptoJS.enc.Utf8.stringify(decrypted).toString();
      if (decString.charAt(0) === "{" || decString.charAt(0) === "[") {
        decString = JSON.parse(decString);
      }
    } catch (error) {
      console.warn('解密失败', error)
    }
    return decString;
  }
};

// 用非对称加密key   用对称加密数据
const encryptData = (pubKey: string, params: string) => {

  const aesKey = aesUtil.getKey();

  // 使用服务器端公钥加密 AES 加密密钥
  const encryptedKey = rsaUtil.encrypt(
    aesKey,
    pubKey
  );

  // 使用 AES 加密密钥 和 AES 算法加密数据
  const encryptedData = aesUtil.encrypt(params, aesKey);

  return {
    key: encryptedKey,
    data: encryptedData,
  }
}

export {
  encryptData,
  rsaUtil,
  aesUtil,
};
