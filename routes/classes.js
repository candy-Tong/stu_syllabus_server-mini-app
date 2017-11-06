let express = require('express')
let router = express.Router()
let BaseModelClass = require(global.PATH['MODEL'] + '/baseModel')
let classesModel = new BaseModelClass('classes')
let formIdModel = new BaseModelClass('formId')

/* GET users listing. */

// 存储新的formId
router.get('/form_id', function (req, res) {

  let token = req.query.token
  let form_id = req.query.form_id
  let curDate = new Date()
  let deadline = curDate.setDate(curDate.getDate() + 6)
  let openId
  let usersModel = new BaseModelClass('users')
  if (form_id === 'the formId is a mock one') {
    console.log('阻止测试formId')
    return
  }
  usersModel.find({'token': token}, '', '', {}, function (users) {
    if (users !== false) {
      if (users.length !== 0) {
        // 已存在token
        openId = users[0].openId
        let formIdModel = new BaseModelClass('formId')
        formIdModel.update({openId: openId}, {
          '$push': {'form_id_list': {'form_id': form_id, 'deadline': deadline}},
          '$set': {'openId': openId, 'account': users[0].account}
        }, {'upsert': true}, function (obj) {
          if (obj) {
            formIdModel.aggregate([{$unwind: '$form_id_list'}, {
              $group: {
                _id: '$account',
                count: {$sum: 1}
              }
            }, {$sort: {count: -1}}, {$limit: 1}], function (err, user) {
              user = user[0]
              res.end(JSON.stringify({
                is_error: false,
                result: {
                  max_account: user._id,
                  max_num: user.count
                }
              }))
            })
          } else {
            res.end(JSON.stringify({
              'is_error': true,
              'error_msg': '更新错误'
            }))
          }
        })
      } else {
        res.end(JSON.stringify({
          'is_error': true,
          'error_msg': '用户数量不正确'
        }))
      }
    } else {
      res.end(JSON.stringify({
        'is_error': true,
        'error_msg': '查询失败'
      }))
    }
  })
})

// 课程提醒总开关
router.get('/showNotify', function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'})//设置response编码为utf-8
  let account = req.query.account
  let showNotify = req.query.showNotify === 'true'
  if (!account) {
    res.end(JSON.stringify({
      is_error: true,
      error_msg: '没有account'
    }))
    return
  }
  if (!showNotify && showNotify !== false) {
    res.end(JSON.stringify({
      is_error: true,
      error_msg: '没有showNotify'
    }))
    return
  }
  formIdModel.update({account: account}, {$set: {showNotify: showNotify}}, '', function (bool) {
    if (!bool) {
      res.end(JSON.stringify({
        is_error: true,
        error_msg: '查询不到用户formId，或者查询到重复用户formId'
      }))
      return
    }
    res.end(JSON.stringify({
      is_error: false
    }))
  })
})

// 查询formId数量
router.get('/notify_num', function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'})//设置response编码为utf-8
  let account = req.query.account
  formIdModel.find({'account': account}, '', '', '', function (users_formId) {
    if (users_formId.length > 1) {
      res.end(JSON.stringify({
        is_error: true,
        error_msg: '或者查询到重复用户formId'
      }))
      return
    }
    formIdModel.aggregate([{$unwind: '$form_id_list'}, {
      $group: {
        _id: '$account',
        count: {$sum: 1}
      }
    }, {$sort: {count: -1}}, {$limit: 1}], function (err, user) {
      if (!user || user.length !== 1) {
        res.end(JSON.stringify({
          is_error: true,
          error_msg: '查询不到用户，或者查询到重复用户'
        }))
        return
      }
      user = user[0]
      if (users_formId) {
        users_formId = users_formId[0]
      }
      console.log(users_formId)
      res.end(JSON.stringify({
        is_error: false,
        result: {
          notify_num: users_formId && users_formId.form_id_list ? users_formId.form_id_list.length : 0,
          max_account: user._id,
          max_num: user.count
        }
      }))
    })
  })

})

// 缓存课程
router.get('/classes', function (req, res) {
  // 参数检查
  if (!req.query.classes) {
    res.end(JSON.stringify({
      'is_error': true,
      'error_msg': '没有课程'
    }))
    return
  } else if (!req.query.account) {
    res.end(JSON.stringify({
      'is_error': true,
      'error_msg': '没有账号'
    }))
    return
  } else if (!req.query.year) {
    res.end(JSON.stringify({
      'is_error': true,
      'error_msg': '没有学年'
    }))
    return
  } else if (!req.query.semester) {
    res.end(JSON.stringify({
      'is_error': true,
      'error_msg': '没有学期'
    }))
    return
  }

  let classes = JSON.parse(req.query.classes).classes
  let account = req.query.account
  let year = req.query.year
  let semester = req.query.semester

  // let classesList=[]
  classes.forEach(function (singleClass) {
    let classObj = {}
    // 构造 class_schedule —— 课程时间
    let class_schedule = []
    singleClass['class_schedule'].forEach(function (value) {
      let singleSchedule = {}

      singleSchedule['original_time'] = value['original_time']

      // 构造 time ，将其课程时间分开并 改为Integer类型
      let times = []
      value['time'].split('').forEach(function (time) {
        if (time === '0') {
          time = 10
        } else if (time === 'A') {
          time = 11
        } else if (time === 'B') {
          time = 12
        } else if (time === 'C') {
          time = 13
        }
        times.push(Number(time))
      })
      singleSchedule['times'] = splitTime(times)
      // 可能存在一天内两节相同课程的时候

      singleSchedule['notice'] = []
      singleSchedule['times'].forEach(function (value) {
        singleSchedule['notice'].push(value[0])
      })

      singleSchedule['day_in_week'] = Number(value['day_in_week'])

      // 构造 课程周数
      let weeks = []
      value['weeks'].split('').forEach(function (week, index) {
        if (week === '1') {
          weeks.push(index + 1)
        }
      })
      singleSchedule['weeks'] = weeks

      class_schedule.push(singleSchedule)
    })
    classObj['class_schedule'] = class_schedule

    // 其他
    classObj['credit'] = Number(singleClass['credit'])
    classObj['from_credit_system'] = singleClass['from_credit_system']
    classObj['class_id'] = singleClass['id']
    classObj['year'] = year
    classObj['semester'] = Number(semester)

    classObj['code'] = /\[.*\]/.exec(singleClass['name'])[0]
    classObj['name'] = singleClass['name'].replace(/\[.*\]/, '')

    classObj['room'] = singleClass['room']
    classObj['teacher'] = singleClass['teacher']

    classObj['teacher'] = singleClass['teacher']

    // 写入课程
    classesModel.update(
      {class_id: classObj['class_id'], code: classObj['code'], year: classObj['year'], semester: classObj['semester']},
      {'$set': classObj, '$addToSet': {'member': account}},
      {'upsert': true},
      function (obj) {
        if (obj) {
          res.end(JSON.stringify({
            is_error: false
          }))
        } else {
          res.end(JSON.stringify({
            is_error: true,
            error_msg: '更新课程错误'
          }))
        }
      }
    )
  })
})

// 更新某个课程的提醒状态
router.get('/updataClassesNotify', function (req, res) {
  let class_id = req.query.class_id
  let account = req.query.account
  let show_notify = req.query.show_notify === 'true'
  console.log(class_id)
  if (show_notify) {
    classesModel.update({class_id: class_id}, {$addToSet: {notifyMember: account}}, '', function (bool) {
      if (bool) {
        res.end(JSON.stringify({
          is_error: false
        }))
      } else {
        res.end(JSON.stringify({
          is_error: true,
          error_msg: '更新课程提醒状态失败'
        }))
      }
    })
  } else {
    classesModel.update({class_id: class_id}, {$pull: {notifyMember: account}}, '', function (bool) {
      if (bool) {
        res.end(JSON.stringify({
          is_error: false
        }))
      } else {
        res.end(JSON.stringify({
          is_error: true,
          error_msg: '更新课程提醒状态失败'
        }))
      }
    })
  }
})

// 获取用户所有课程提醒状态
router.get('/getAllNotifyStatus', function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'})//设置response编码为utf-8
  let account = req.query.account
  classesModel.aggregate([
    {$unwind: '$member'},
    {$match: {'member': account}}
  ], function (err, lessones) {
    if (err) {
      console.log(err)
      return
    }
    let notifyStatus = lessones.map(function (lesson) {
      let showNotify
      if (lesson.notifyMember) {
        console.log(lesson.notifyMember)
        showNotify = lesson.notifyMember.find(function (value) {
          return value === account
        })
        showNotify = showNotify === undefined ? false : showNotify
      } else {
        showNotify = false
      }
      return {
        name: lesson.name,
        class_id: lesson.class_id,
        showNotify: showNotify
      }
    })
    console.log(notifyStatus)
    res.end(JSON.stringify({
      is_error: false,
      result: {
        notifyStatus: notifyStatus
      }
    }))
  })
})

function splitTime (time) {
  let timeList = []
  let lesson = []
  lesson.push(time[0])
  for (let i = 1; i < time.length; i++) {
    if (time[i] - time[i - 1] === 1) {
      // 符合
      lesson.push(time[i])
      continue
    } else {
      // 分割
      timeList.push(lesson)
      lesson = []
      lesson.push(time[i])
    }
  }
  timeList.push(lesson)
  return timeList
}

module.exports = router