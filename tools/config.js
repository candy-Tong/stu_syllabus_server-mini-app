var fs = require('fs')

var configJson
var CONFIG = {}

/**
 *
 * 读取配置文件信息
 * @param filename 配置文件名
 * @param type 配置文件类型
 * @param key 获取返回的主键值
 */
function get(){
  var fileName = arguments[0],
    type     = arguments[1],
    key      = arguments[2] ? arguments[2] : ''
  var filePath = global.PATH['CONF']+ '/' + fileName
  // 从cache中获取数据
  var cacheData = getCache(filePath, fileName, key)
  if(cacheData){
    return cacheData
  }
  // 读取配置文件信息，并做缓存
  switch(type){
    case 'conf' :
      return getConf(fileName, filePath, key)
    case 'json' :
      return getJson(fileName, filePath, key)
  }
}

/**
 *
 * 获取conf类型的配置文件内容
 * @param fileName 配置文件名
 * @param filePath 配置文件路径
 * @param key 获取返回的主键值
 */
function getConf(fileName, filePath, key){
  try{
    var r = [],
      q = require('querystring'),
      f = fs.readFileSync(filePath, 'utf8'),
      v = q.parse(f, '[', ']'),
      t
  }catch(e){
    console.log(e)
    return ''
  }
  for (var i in v) {
    if (i != '' && v[i] != '') {
      r = {}
      t = q.parse(i, v[i], '=')
      for (var j in t) {
        if (j != '' && t[j] != '')
          r[j] = t[j]
      }
    }
  }
  cache(filePath, fileName, r)
  return r[key] ? r[key] : r
}

/**
 *
 * 获取json配置文件类型的内容
 * @param fileName 配置文件名
 * @param filePath 配置文件路径
 * @param key 获取返回的主键值
 */
function getJson(fileName, filePath, key){
  try{
    var str = fs.readFileSync(filePath, 'utf8')
    configJson = JSON.parse(str)
  }catch(e){
    console.log(e)
    return ''
  }
  cache(filePath, fileName, configJson)
  return configJson[key] ? configJson[key] : configJson
}

/**
 *
 * 获取缓存文件中的数据
 * @param fileName 配置文件名
 * @param filePath 配置文件路径
 * @param key 获取返回的主键值
 */
function getCache(filePath, fileName, key){
  var stat = fs.statSync(filePath)
  var timestamp = Date.parse(stat['mtime'])
  if(CONFIG[fileName+timestamp]){
    return CONFIG[fileName+timestamp][key] ? CONFIG[fileName+timestamp][key] : CONFIG[fileName+timestamp]
  }
  return null
}

/**
 *
 * 缓存配置文件内容
 * @param fileName 配置文件名
 * @param filePath 配置文件路径
 * @param key 获取返回的主键值
 */
function cache(filePath, fileName, data){
  var stat = fs.statSync(filePath)
  var timestamp = Date.parse(stat['mtime'])
  if(data){
    CONFIG[fileName+timestamp] = data
  }
}

// 暴露外部调用接口get
exports.get = get 
