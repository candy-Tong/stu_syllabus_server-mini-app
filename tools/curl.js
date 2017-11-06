/**
 *
 * @author danhuang 2013-03-08
 * @class for http get or post
 *
 */
var request = require('request')
var querystring = require('querystring')

module.exports = {
  get: function () {
    // 获取get方法的参数 url、get和callback
    var url = arguments[0]
      , get = arguments[1]
      , callback = arguments[2]
    if (!callback && typeof get == 'function') {
      get = {}
      callback = arguments[1]
    }

    if (!url) {
      callback('')
    }

    var params = {}
    // 为url后缀添加?或者&符号
    if (get) {
      if (url.indexOf('?') > -1) {
        url = url + '&'
      } else {
        url = url + '?'
      }
    }
    url = encodeURI(url + querystring.stringify(get))

    params['url'] = url
    params['json'] = true
    // 调用request请求资源
    request.get(params, function (error, response, result) {
      if (error) {
        console.log(error)
        callback(result)
      } else {
        callback(result)
      }
    })
  },

  post: function () {
    // 获取get方法的参数 url、get和callback
    var url = arguments[0]
      , post = arguments[1]
      , callback = arguments[2]
    if (!callback && typeof post == 'function') {
      post = {}
      callback = arguments[1]
    }

    if (!url) {
      callback('')
    }

    var params = {}

    params['url'] = url
    params['json'] = true
    params['form'] = post

    request.post(params, function (error, response, result) {
      if (error) {
        callback(result)
      } else {
        callback(result)
      }
    })
  },

  postJSON: function () {
    // 获取get方法的参数 url、get和callback
    var url = arguments[0]
      , post = arguments[1]
      , callback = arguments[2]
    if (!callback && typeof post == 'function') {
      post = {}
      callback = arguments[1]
    }

    if (!url) {
      callback('')
    }

    var params = {}

    params['url'] = url
    params['json'] = true
    params['form'] = JSON.stringify(post)

    request.post(params, function (error, response, result) {
      if (error) {
        callback(result)
      } else {
        callback(result)
      }
    })
  },

  form_post: function () {
    var url = arguments[0]
      , data = arguments[1]
      , callback = arguments[2]
    if (!callback && typeof data == 'function') {
      data = {}
      callback = arguments[1]
    }

    if (!url) {
      callback('')
    }

    var request = request.post(url)
    var form = request.form()
    for (var key in data) {
      form.append(key, data[key])
    }
  }
}
