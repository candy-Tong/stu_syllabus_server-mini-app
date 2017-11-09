let Util = require(global.PATH['TOOLS'] + '/config.js')
  , mongodb = require('mongodb')
  , db

//定义类
class BaseModelClass {
  constructor (tableName) {    //constructor 构造方法
    this.tableName = tableName
    this.connection(function (database) {
      db = database
    })
  }

  /**
   *
   * 根据主键id值查询数据库的一条记录
   * @param id number
   * @param callback function
   * @return null
   */
  findOneById (id, callback) {
    let that = this
    this.connection(function (db) {
      db.collection(that.tableName, function (err, collection) {
        let mongoId = new mongodb.ObjectID(id)
        let cursor = collection.find({'_id': mongoId})
        cursor.toArray(function (err, docs) {
          console.log(err)
          if (err) {
            callback(false)
          } else {
            let row = {}
            if (docs && docs.length !== 0) {
              row = this.filterSelfRow(docs.shift())
            }
            callback(row)
          }
        })
        cursor.rewind()
      })
    })
  }

  /**
   *
   * @desc 向数据库插入数据
   * @param tableName string
   * @param rowInfo json
   * @param callback function
   * @return null
   */
  insert (rowInfo, callback) {
    let that = this
    this.connection(function (db) {
      db.collection(that.tableName, function (err, collection) {
        collection.insert(rowInfo, function (err, objects) {
          if (err) {
            callback(false)
          } else {
            callback(objects)
          }
        })
      })
    })
  }

  /**
   * 修改数据
   * @param id
   * @param rowInfo
   * @param callback
   */
  modify (id, rowInfo, callback) {
    let that = this
    this.connection(function (db) {
      db.collection(that.tableName, function (err, collection) {
        let mongoId = new mongodb.ObjectID(id)
        collection.update({'_id': mongoId}, rowInfo, {safe: true}, function (err) {
          if (err) {
            callback(false)
          } else {
            callback(true)
          }
        })
      })
    })
  }

  /**
   * 修改数据
   * @param id
   * @param rowInfo
   * @param callback
   */
  update (conditionJSON, rowInfo, settingJSON, callback) {
    let that = this
    this.connection(function (db) {
      db.collection(that.tableName, function (err, collection) {
        if (!settingJSON) {
          settingJSON = {safe: true}
        } else if (!settingJSON['safe']) {
          settingJSON['safe'] = true
        }
        collection.update(conditionJSON, rowInfo, settingJSON, function (err) {
          if (err) {
            callback(false)
          } else {
            callback(true)
          }
        })
      })
    })
  }

  /**
   * 聚合管道
   * @param pipeline
   * @param callback
   */
  aggregate (pipeline, callback) {
    let that = this
    this.connection(function (db) {
      db.collection(that.tableName, function (err, collection) {
        collection.aggregate(pipeline,function (err,res){
          if (err) {
            callback(err)
          } else {
            callback(err,res)
          }
        })
      })
    })
  }

  /**
   *
   * @desc 删除数据库的一条数据
   * @param tableName string
   * @param id number
   * @param rowInfo json
   * @param callback function
   * @return null
   */
  remove (id, callback) {
    var that = this
    this.connection(function (db) {
      db.collection(that.tableName, function (err, collection) {
        var mongoId = new mongodb.ObjectID(id)
        collection.remove({'_id': mongoId}, function (err) {
          if (err) {
            callback(false)
          } else {
            callback(true)
          }
        })
      })
    })
  }

  find (whereJson, orderByJson, limitJson, fieldsJson, callback) {
    let that = this
    if (whereJson['id']) {
      whereJson['_id'] = new mongodb.ObjectID(whereJson['id'])
      delete whereJson['id']
    }
    let retArr = []
    this.connection(function (db) {
      db.collection(that.tableName, function (err, collection) {
        if (err) {
          return
        }
        let cursor = collection.find(whereJson, fieldsJson)
        if (orderByJson) {
          cursor.sort(orderByJson)
        }
        if (limitJson) {
          let skip = limitJson['skip'] ? limitJson['skip'] : 0
          cursor.limit(limitJson['num']).skip(skip)
        }
        cursor.toArray(function (err, docs) {
          if (err) {
            callback(false)
          } else {
            if (docs) {
              let row
              for (let i = 0; i < docs.length; i++) {
                row = that.filterSelfRow(docs[i])
                retArr.push(row)
              }
            }
            callback(retArr)
          }
        })
        cursor.rewind()
      })
    })
  }

  filterSelfRow (rowInfo) {
    // console.log(rowInfo)
    if (rowInfo['_id']) {
      rowInfo['id'] = rowInfo['_id']
      delete rowInfo['_id']
    }
    return rowInfo
  }

  /**
   *
   * 数据库连接构造函数
   */
  connection (callback) {
    if (!db) {
      let dbConfig = Util.get('main.json', 'json', 'db')
      /* 获取mysql配置信息 */

      let host = dbConfig['host']
        , port = dbConfig['port']
        , dbName = dbConfig['db_name']
        , server = new mongodb.Server(host, port)
      this.dbClient = new mongodb.Db(dbName, server, {safe: false})
      this.dbClient.open(function (err, dbObject) {
        db = dbObject
        callback(dbObject)
        console.log('connection success')
      })
    } else {
      callback(db)
    }
  }
}

module.exports = BaseModelClass