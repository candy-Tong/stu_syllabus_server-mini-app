// 开学时间
let SEMESTER_BEGIN = '2017/9/25'
let CLASSES_TIME = [
  {
    time: 1,
    begin: '8:00',
    end: '8:45'
  },
  {
    time: 2,
    begin: '8:55',
    end: '9:40'
  },
  {
    time: 3,
    begin: '10:00',
    end: '10:45'
  },
  {
    time: 4,
    begin: '11:55',
    end: '11:40'
  },
  {
    time: 5,
    begin: '11:50',
    end: '12:35'
  },
  {
    time: 6,
    begin: '14:00',
    end: '14:45'
  },
  {
    time: 7,
    begin: '14:55',
    end: '15:40'
  },
  {
    time: 8,
    begin: '16:00',
    end: '16:45'
  },
  {
    time: 9,
    begin: '16:55',
    end: '17:40'
  },
  {
    time: 10,
    begin: '17:50',
    end: '18:35'
  },
  {
    time: 11,
    begin: '19:20',
    end: '20:05'
  },
  {
    time: 12,
    begin: '20:15',
    end: '21:00'
  },
  {
    time: 13,
    begin: '21:10',
    end: '21:55'
  }
]

class statusClass {
  constructor () {}

  getYear () {
    let curYear = new Date().getFullYear()
    let year = curYear + '-' + (curYear + 1)
    return year
  }

  getSemester () {
    let semester_index
    let this_month = new Date().getMonth + 1
    if (this_month < 8) {
      semester_index = 2
    } else if (this_month < 9) {
      semester_index = 3
    } else {
      semester_index = 1
    }
    return semester_index
  }

  getWeek () {
    let begin_date = new Date(SEMESTER_BEGIN)
    let curDate = new Date()
    let week = Math.ceil((curDate - begin_date) / 1000 / 3600 / 24 / 7)
    return week > 16 ? 16 : week
  }

  /**
   *
   * @returns {
   *    time : 1,
   *    begin: '8:00',
   *    end: '8:45'
   * }
   */
  getNextClassNum () {
    let curTime = new Date()
    let hour = curTime.getHours()
    let min = curTime.getMinutes()
    let class_time = CLASSES_TIME.find(function (value) {
      let [begin_hour, begin_min] = value['begin'].split(':')
      begin_hour = Number(begin_hour)
      begin_min = Number(begin_min)

      if (hour < begin_hour) {
        return true // 下一节课
      } else if (hour > begin_hour) {
        return false
      } else {
        return min < begin_min
      }
    })
    return class_time ? class_time : 14
  }

  changeTime (classTimeNum) {
    return CLASSES_TIME[classTimeNum - 1]
  }
}

let status = new statusClass()

module.exports = status