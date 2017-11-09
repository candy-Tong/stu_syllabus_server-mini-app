let schedule = require('node-schedule')
let fs = require('fs')

let BaseModelClass = require(global.PATH['MODEL'] + '/baseModel')
let status = require(global.PATH['TOOLS'] + '/status')
let curl = require(global.PATH['TOOLS'] + '/curl')
let config = require(global.PATH['TOOLS'] + '/config')

// let formIdModel=new BaseModelClass('formId')
let classesModel = new BaseModelClass('classes')
let formIdModel = new BaseModelClass('formId')

let access_token
let miniConfig = config.get('main.json', 'json', 'mini')
let appid = miniConfig.appid
let secret = miniConfig.appSecret
let template_id = miniConfig.template_id

//定义类
class ClassesNotify {
  constructor () {    //constructor 构造方法
    get_access_token()
    Schedule_Send_Notice()
  }
}

// 私有方法
/**
 *  获取access_token
 */
function get_access_token () {
  curl.get('https://api.weixin.qq.com/cgi-bin/token', {
    grant_type: 'client_credential',
    appid: appid,
    secret: secret
  }, function (res) {
    console.log(res)
    access_token = res.access_token
    setTimeout(function () {
      get_access_token()
    }, 7000 * 1000)
  })
}

/**
 *  发送课程提醒
 */
function Schedule_Send_Notice () {
  schedule.scheduleJob('30 * * * *', function () {
    // 日志
    console.log('课程提醒时间，准备写入日志文件')
    fs.writeFileSync(global['PATH']['LOG'] + '/notice.log', '\n\n' + new Date().toLocaleString() + '\n', {flag: 'a'})

    let year = status.getYear()
    let semester = status.getSemester()
    let week = status.getWeek()
    let nextClass = status.getNextClassNum().time
    let nexHourClass = status.getNextHourClassNum().time
    // let nextClass = 8
    let weekNum = new Date().getDay()
    // let weekNum = 2

    if (nextClass === nexHourClass) {
      console.log(nextClass+' --- '+nexHourClass)
      console.log('\t未到提醒时间\n')
      return
    }
    fs.writeFileSync(global['PATH']['LOG'] + '/notice.log', '周数: ' + week + '\t', {flag: 'a'})
    fs.writeFileSync(global['PATH']['LOG'] + '/notice.log', '星期: ' + weekNum + '\t', {flag: 'a'})
    fs.writeFileSync(global['PATH']['LOG'] + '/notice.log', '下一节课: ' + nextClass + '\n', {flag: 'a'})
    // 查找出需要提醒的课程
    classesModel.aggregate([{$unwind: '$class_schedule'},
      {$unwind: '$class_schedule.notice'},
      {
        $match: {
          year: year,
          semester: semester,
          'class_schedule.day_in_week': weekNum,
          'class_schedule.weeks': {$in: [week]},
          'class_schedule.notice': nextClass
        }
      },
      {
        $group: {
          '_id': '$class_id',
          'name': {$first: '$name'},
          'class_schedule': {$first: '$class_schedule'},
          'room': {$first: '$room'},
          'teacher': {$first: '$teacher'},
          'account': {$first: '$notifyMember'}
        }
      }], function (err, res) {
      if (err) {
        console.log('管道阶段发生错误')
        console.log(err)
        return
      }
      // console.log(res)
      if (res.length === 0) {
        fs.writeFileSync(global['PATH']['LOG'] + '/notice.log', '没有需要提醒的课程' + '\n', {flag: 'a'})
      }

      // console.log(res[0])
      // 遍历需要提醒的课程组合
      res.forEach(function (lesson) {

        // 查找出需要提醒的用户的 openid 和 对应的 formId
        formIdModel.find({'account': {$in: lesson.account}, 'showNotify': true}, '', '', '', function (users_formId) {
          // console.log(users_formId)
          // 提醒的课程写入日志
          fs.writeFileSync(global['PATH']['LOG'] + '/notice.log', lesson._id + '\t', {flag: 'a'})
          fs.writeFileSync(global['PATH']['LOG'] + '/notice.log', lesson.name + '\n', {flag: 'a'})

          if (users_formId.length > 0) {
            users_formId.forEach(function (value) {
              // 提醒的用户写入日志
              fs.writeFileSync(global['PATH']['LOG'] + '/notice.log', value.account + '\t', {flag: 'a'})
              let openId = value.openId

              let curTime = new Date().getTime()
              let form_id = value.form_id_list.find(function (formId) {
                return formId['deadline'] > curTime
              })
              if (form_id) {
                curl.postJSON('https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=' + access_token,
                  {
                    'touser': openId,
                    'template_id': template_id,
                    'form_id': form_id.form_id,
                    'data': {
                      'keyword1': {
                        'value': lesson.name,
                        'color': '#173177'
                      },
                      'keyword2': {
                        'value': changeTime(lesson.class_schedule.times, nextClass),
                        'color': '#173177'
                      },
                      'keyword3': {
                        'value': decodeURI(lesson.room),
                        'color': '#173177'
                      },
                      'keyword4': {
                        'value': decodeURI(lesson.teacher),
                        'color': '#173177'
                      }
                    }
                  },
                  function (res) {
                    console.log(res)
                    if(res.errcode===0){
                      // 删除已经使用的formId,和过期的formId
                      let deleteList = value.form_id_list.filter(function (formId) {
                        return formId['deadline'] <= curTime
                      })
                      deleteList.push(form_id.form_id)
                      formIdModel.update({'openId': openId}, {$pull: {'form_id_list': {'form_id': {$in: deleteList}}}}, '', function (res) {

                        if (!res) {
                          console.log('删除formId失败')
                        }
                      })
                    }else {
                      console.log('发送模板消息失败')
                    }


                  })

              } else {
                console.log('该用户form_id 不足，openid：' + openId)
              }
            })

            // 日志格式控制
            fs.writeFileSync(global['PATH']['LOG'] + '\n', {flag: 'a'})

          }
        })
      })

    })
  })
}

function changeTime (time, nextClass) {
  nextClass = time.find(function (value) {
    return value[0] === nextClass
  })
  let begin_time = status.changeTime(nextClass[0]).begin
  let end_time = status.changeTime(nextClass[nextClass.length - 1]).end
  return begin_time + '-' + end_time
}

module.exports = ClassesNotify