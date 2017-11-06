var express = require('express')
var querystring = require('querystring')
var router = express.Router()
var fs = require('fs')
let config = require(global.PATH['TOOLS'] + '/config')
let BaseModelClass = require(global.PATH['MODEL'] + '/baseModel')

/* GET users listing. */
router.get('/update_log', function (req, res) {
  let log = config.get('update_log.json', 'json', 'log')
  console.log(log)
  console.log(log.length)
  res.end(JSON.stringify({
    'is_error': false,
    'result': {
      'log': log
    }
  }))
})
/**
 * 获取最新的文章
 */
router.get('/show', function (req, res) {

  let articleModel = new BaseModelClass('article')
  articleModel.find({}, {time: -1}, {num: 1}, {}, function (article) {
    console.log(article)
    if (article)
      res.end(JSON.stringify({
        is_error: false,
        result: {
          name:article[0].name,
          content: article[0].content
        }
      }))
  })
})

router.post('/add_article', function (req, res) {
  console.log(req)
  let name = req.query.name
  let content = req.query.content
  let time = new Date()
  let articleModel = new BaseModelClass('article')
  articleModel.insert({
    name: name,
    content: content,
    time: time
  }, function (article) {
    console.log(article)
    res.end(JSON.stringify({
      is_error:false
    }))
  })
})

module.exports = router
