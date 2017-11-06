/**
 * @type class BaseMongodb
 * @author danhuang
 * @time 2012-12-26
 * @desc desc base_mongodb.js
 */
var Util = require('./config')
  , mongodb = require('mongodb')
  , db

module.exports = function () {
  var self = this
  /**
   *
   * 根据主键id值查询数据库的一条记录
   * @param tableName string
   * @param id number
   * @param callback function
   * @return null
   */
  this.findOneById = function (tableName, id, callback) {
    connection(function (db) {
      db.collection(tableName, function (err, collection) {
        var mongoId = new mongodb.ObjectID(id)
        var cursor = collection.find({'_id': mongoId})
        cursor.toArray(function (err, docs) {
          console.log(123)
          console.log(err)
          if (err) {
            callback(false)
          } else {
            var row = {}
            if (docs && docs.length !== 0) {
              row = self.filterSelfRow(docs.shift())
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
  this.insert = function (tableName, rowInfo, callback) {
    connection(function (db) {
      db.collection(tableName, function (err, collection) {
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

  this.modify = function (tableName, id, rowInfo, callback) {
    connection(function (db) {
      db.collection(tableName, function (err, collection) {
        var mongoId = new mongodb.ObjectID(id)
        collection.update({'_id': mongoId}, rowInfo, {safe: true}, function (err) {
          if (err) {
            callback(false)
          } else {
            callback(true)
          }
        })
      })
    })

    this.update = function (tableName, id, rowInfo, callback) {
      connection(function (db) {
        db.collection(tableName, function (err, collection) {
          var mongoId = new mongodb.ObjectID(id)
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
   *
   * @desc 删除数据库的一条数据
   * @param tableName string
   * @param id number
   * @param rowInfo json
   * @param callback function
   * @return null
   */
  this.remove = function (tableName, id, callback) {
    connection(function (db) {
      db.collection(tableName, function (err, collection) {
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

  this.find = function (tableName, whereJson, orderByJson, limitJson, fieldsJson, callback) {
    if (whereJson['id']) {
      whereJson['_id'] = new mongodb.ObjectID(whereJson['id'])
      delete whereJson['id']
    }
    var retArr = []
    connection(function (db) {
      db.collection(tableName, function (err, collection) {
        var cursor = collection.find(whereJson, fieldsJson)
        if (orderByJson) {
          cursor.sort(orderByJson)
        }
        if (limitJson) {
          var skip = limitJson['skip'] ? limitJson['skip'] : 0
          cursor.limit(limitJson['num']).skip(skip)
        }
        cursor.toArray(function (err, docs) {
          if (err) {
            callback(false)
          } else {
            if (docs) {
              for (var i = 0; i < docs.length; i++) {
                row = self.filterSelfRow(docs[i])
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

  this.filterSelfRow = function (rowInfo) {
    console.log(rowInfo)
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
  function connection (callback) {
    if (!db) {
      var dbConfig = Util.get('main.json','json', 'db')
      /* 获取mysql配置信息 */

      var host = dbConfig['host']
        , port = dbConfig['port']
        , dbName = dbConfig['db_name']
        , server = new mongodb.Server(host, port)
      dbClient = new mongodb.Db(dbName, server, {safe: false})
      dbClient.open(function (err, dbObject) {
        db = dbObject
        callback(dbObject)
        console.log('connection success')
      })
    } else {
      callback(db)
    }
  }
}