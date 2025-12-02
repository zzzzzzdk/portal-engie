import Cookies from 'js-cookie'

// 各个系统不重复
const TokenKey = 'YSTOKEN'
const RefreshTokenKey = 'YISAREFRESHTOKEN'
const IDKey = 'YISAUSERID'


/*
* 获取token，兼容三种方式
* 1、后端设置token在cookie中 后端实现续期
* 2、后端设置token在url中    后端实现续期
* 3、后端设置token和refresh_token在url中   后端用了jwt做不了续期，前段实现续期
*/
export function getToken() {

  let apisix_token = ''
  let refresh_token = ''

  function extractTokenFromSearch(search: string) {
    if (apisix_token) {
      return
    }
    try {
      // Check if search contains '?' before splitting
      if (search && search.includes('?')) {
        const query = search.split('?')[1]
        // Check if query exists before splitting
        if (query) {
          const arr = query.split('&')
          arr.forEach(item => {
            const arr2 = item.split('=')
            if (arr2.length > 1) {
              if (arr2[0] === 'apisix_token') {
                apisix_token = arr2[1].split('/')[0]
              }
              if (arr2[0] === 'refresh_token') {
                refresh_token = arr2[1].split('/')[0]
              }
            }
          })
        }
      }
    } catch (error) {
      console.error('Error extracting token from search:', error)
    }
  }
  extractTokenFromSearch(window.location.search)
  extractTokenFromSearch(window.location.hash)

  if (refresh_token) {
    setRToken(refresh_token)
  }

  if (apisix_token) {
    setToken(apisix_token)
    return apisix_token
  }

  return Cookies.get(TokenKey)
}

export function getRToken() {
  return Cookies.get(RefreshTokenKey)
}

export function setToken(token: string, expires?: number) {
  Cookies.set(TokenKey, token, { expires: expires })
}

export function setRToken(token: string, expires?: number) {
  Cookies.set(RefreshTokenKey, token, { expires: expires })
}

export function setID(id: string, expires?: number) {
  Cookies.set(IDKey, id, { expires: expires })
}

export function getID() {
  return Cookies.get(IDKey)
}

export function removeToken() {
  Cookies.remove(RefreshTokenKey)
  Cookies.remove(TokenKey)
  Cookies.remove(IDKey)
}


export default {

  getToken,
  getRToken,
  setToken,
  setRToken,
  setID,
  getID,
  removeToken

}
