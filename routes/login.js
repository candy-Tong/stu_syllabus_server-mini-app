let express = require('express')
let router = express.Router()
let curl = require(global.PATH['TOOLS'] + '/curl')
let config = require(global.PATH['TOOLS'] + '/config')
let status=require(global.PATH['TOOLS']+'/status')

// 登录
let ERROR_OTHER = 0
let ERROR_PASSWORD_CHANGE = 1
let ERROR_USER_COUNT = 2
let ERROR_IN_OPENID = 3
let ERROR_NO_JS_CODE = 4
// 绑定账号
let ERROR_PASSWORD = 5
// 数据库
let ERROR_DATABASE_FIND = 1000
let ERROR_DATABASE_INSERT = 1001


/**
 * wx.login 后自动调用，用户无感
 * 返回token
 * token 用户凭证
 */
router.get('/first', function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'})//设置response编码为utf-8
  let error_msg = ''
  let error_code
  let js_code = request.query.js_code
  let mini = config.get('main.json', 'json', 'mini')
  let week = status.getWeek()
  if (js_code) {
    curl.get('https://api.weixin.qq.com/sns/jscode2session?appid=' + mini.appid + '&secret=' + mini.appSecret + '&js_code=' + js_code + '&grant_type=authorization_code', function (result) {
      if (result.errcode) {
        result.error_msg = result.errmsg
        response.status(400)
        response.end(JSON.stringify({
          'is_error': true,
          'error_msg': result.errmsg,
          'error_code': ERROR_IN_OPENID
        }))
      }
      console.log(result)
      let BaseModelClass = require(global.PATH['MODEL'] + '/baseModel')
      let userModel = new BaseModelClass('users')
      let token
      userModel.find({'openId': result.openid}, '', '', {}, function (user) {
        if (user !== false) {
          if (user.length !== 0) {
            // 已存在token
            token = user[0].token

            userModel.modify(user[0].id, {$set: {session_key: result.session_key}}, function () {

            })
            // 是否存在账号密码
            if (user[0].account && user[0].password) {
              // 验证账号密码
              curl.post('https://stuapps.com/credit/api/v2/sync_syllabus', {
                username: user[0].account,
                password: user[0].password,
                years: '2016-2017',
                semester: 1,
                submit: 'query',
              }, function (res) {
                console.log(res)
                if (res.ERROR) {
                  if (res.ERROR === 'the password is wrong') {
                    error_msg = '密码已修改'
                    error_code = ERROR_PASSWORD_CHANGE
                    response.status(400)
                  } else {
                    error_msg = '账号密码验证失败，服务器发生错误，非密码错误'
                    error_code = ERROR_OTHER
                  }
                  response.end(JSON.stringify({
                    'is_error': false,
                    'error_msg': error_msg,
                    'error_code': error_code,
                    'result': {
                      'token': token,
                      'account': user[0].account,
                      'password': user[0].password,
                      'week': week
                    }
                  }))
                } else {
                  // 汕大账号密码正确
                  response.end(JSON.stringify({
                    'is_error': false,
                    'result': {
                      'token': token,
                      'account': user[0].account,
                      'password': user[0].password,
                      'week': week
                    }
                  }))
                }
              })
              return
            } else {
              response.end(JSON.stringify({
                'is_error': false,
                'result': {
                  'token': token,
                  'week': week
                }
              }))
            }

          } else {
            // 不存在token, 生成token
            const exec = require('child_process').exec
            exec('head -n 80 /dev/urandom | tr -dc A-Za-z0-9 | head -c 168', function (err, stdout) {
              token = stdout
              // 用户信息写入数据库
              userModel.insert({
                'token': token,
                'openId': result.openid,
                'session_key': result.session_key,
              }, function (res) {
                if (res === false) {
                  error_msg = 'insert 发生错误'
                  error_code = ERROR_DATABASE_INSERT
                  console.log('insert 发生错误')
                  response.end(JSON.stringify({
                    'is_error': true,
                    'error_msg': error_msg,
                    'error_code': error_code
                  }))
                } else {
                  response.end(JSON.stringify({
                    'is_error': false,
                    'result': {
                      'token': token,
                      'week': week
                    }
                  }))
                }
              })
            })
          }
        } else {
          error_msg = '查询数据库失败'
          error_code = ERROR_DATABASE_FIND
          response.end(JSON.stringify({
            'is_error': true,
            'error_msg': error_msg,
            'error_code': error_code
          }))
        }
      })
    })
  } else {
    response.end(JSON.stringify({
      'is_error': true,
      'error_msg': '没有js_code',
      'error_code': ERROR_NO_JS_CODE
    }))
  }
})

router.get('/auto_login', function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'})//设置response编码为utf-8
  let token = request.query.token
  let BaseModelClass = require(global.PATH['MODEL'] + '/baseModel')
  let users = new BaseModelClass('users')
  let error_msg = ''
  let error_code
  let week = status.getWeek()
  users.find({'token': token}, '', '', {}, function (user) {
    if (user !== false) {
      console.log(user)
      if (user.length === 1) {

        curl.post('https://stuapps.com/credit/api/v2/sync_syllabus', {
          username: user[0].account,
          password: user[0].password,
          years: '2016-2017',
          semester: 1,
          submit: 'query',
        }, function (res) {
          // console.log(res)
          if (res.ERROR) {
            if (res.ERROR === 'the password is wrong') {
              error_msg = '密码已修改'
              error_code = ERROR_PASSWORD_CHANGE
              response.status(400)
            } else {
              error_msg = '账号密码验证失败，服务器发生错误，非密码错误'
              error_code = ERROR_OTHER
            }
            response.end(JSON.stringify({
              'is_error': true,
              'error_msg': error_msg,
              'error_code': error_code,
              'result': {
                'account': user[0].account,
                'password': user[0].password,
                'week': week
              }
            }))
          } else {
            // 汕大账号密码正确
            response.end(JSON.stringify({
              'is_error': false,
              'result': {
                'account': user[0].account,
                'password': user[0].password,
                'week': week
              }
            }))
          }
        })
        return
      } else {
        console.log('查询到重复用户记录或没有相关记录')
        error_msg = '查询到重复用户记录或没有相关记录'
        error_code = ERROR_USER_COUNT
      }
    } else {
      console.log('查询数据库出现错误')
      error_msg = '查询数据库出现错误'
      error_code = ERROR_DATABASE_FIND
    }
    // 发生错误
    response.end(JSON.stringify({
      'is_error': true,
      'error_msg': error_msg,
      'error_code': error_code
    }))

  })
})

router.get('/bind', function (request, response) {
  response.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'})//设置response编码为utf-8
  let error_code
  console.log()
  let token = request.query.token
  let account = request.query.account
  let password = request.query.password
  console.log(account)
  console.log(password)
  let BaseModelClass = require(global.PATH['MODEL'] + '/baseModel')
  let users = new BaseModelClass('users')
  let error_msg = ''
  users.find({'token': token}, '', '', {}, function (user) {
    if (user !== false) {
      if (user.length === 1) {
        // 检验账号密码是否正确
        //   url: global.stuUrl + '/credit/api/v2/syllabus',
        curl.post('https://stuapps.com/credit/api/v2/sync_syllabus', {
          username: account,
          password: password,
          years: '2016-2017',
          semester: 1,
          submit: 'query',
        }, function (res) {
          console.log(res)
          if (res.ERROR) {
            if (res.ERROR === 'the password is wrong') {
              error_msg = '账号密码不正确'
              error_code = ERROR_PASSWORD
              response.status(400)
            } else {
              error_msg = '验证失败，服务器发生错误，非密码错误'
              error_code = ERROR_OTHER
            }
            if (error_msg) {
              response.end(JSON.stringify({
                'is_error': true,
                'error_msg': error_msg,
                'error_code': error_code
              }))
            }
          } else {
            // 汕大账号密码正确
            users.modify(user[0].id, {
              $set: {account: account, password: password}
            }, function (status) {
              if (status) {
                response.end(JSON.stringify({
                  'is_error': false
                }))
              } else {
                // 发生错误
                error_msg = '插入数据库失败'
                error_code = ERROR_DATABASE_INSERT
              }
              if (error_msg) {
                response.end(JSON.stringify({
                  'is_error': true,
                  'error_msg': error_msg,
                  'error_code': error_code
                }))
              }
            })
          }
          // 发生错误
          if (error_msg) {
            response.end(JSON.stringify({
              'is_error': true,
              'result': {
                'error_msg': error_msg
              }
            }))
          }
        })

        return
      } else {
        console.log('查询到重复用户记录或没有相关记录')
        error_msg = '查询到重复用户记录或没有相关记录'
        error_code = ERROR_USER_COUNT
      }
    } else {
      console.log('查询数据库出现错误')
      error_msg = '查询数据库出现错误'
      error_code = ERROR_DATABASE_FIND
    }
    // 发生错误
    response.end(JSON.stringify({
      'is_error': true,
      'result': {
        'error_msg': error_msg
      }
    }))
  })
})

router.get('/oa', function (req, response) {
  let keyword = req.query.keyword,
    row_start = req.query.row_start,
    row_end = req.query.row_end
  curl.get('https://wechat.stu.edu.cn/webservice_oa/oa_stu_/GetDOC?token= &subcompany_id=0&keyword=' + keyword + '&row_start=' + row_start + '&row_end=' + row_end, function (res) {
    // response.end(JSON.stringify(res))
    response.json(res)
  })

  // res.redirect('https://wechat.stu.edu.cn/webservice_oa/oa_stu_/GetDOC?token= &subcompany_id=0&keyword='+keyword+'&row_start='+row_start+'&row_end='+row_end)
})

module.exports = router
