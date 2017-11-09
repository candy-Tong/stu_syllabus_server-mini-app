let express = require('express')
let path = require('path')
// let favicon = require('serve-favicon')
let fs = require('fs')
let logger = require('morgan')
let cookieParser = require('cookie-parser')
let bodyParser = require('body-parser')
// let multer = require('multer')



global.PATH = {
  'CONF': path.resolve(__dirname, './conf'),
  'TOOLS': path.resolve(__dirname, './tools'),
  'MODEL': path.resolve(__dirname, './model'),
  'LOG': path.resolve(__dirname, './log'),
  'ROUTES': path.resolve(__dirname, './routes')
}

// 路由
let login = require(global.PATH['ROUTES'] + '/login')
let users = require(global.PATH['ROUTES'] + '/users')
let common = require(global.PATH['ROUTES'] + '/common')
let classes = require(global.PATH['ROUTES'] + '/classes')

let app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'jade')

// 日志

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
let accessLogStream = fs.createWriteStream(path.join(__dirname, 'log/access.log'), {flags: 'a'})
app.use(logger('common', {stream: accessLogStream}))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))
// app.use(multer()) // for parsing multipart/form-data

app.use('/wechat/mini/login', login)
app.use('/users', users)
app.use('/common', common)
app.use('/classes', classes)

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  let err = new Error('Not Found')
  err.status = 404
  next(err)
})

// error handler
app.use(function (err, req, res) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

let classes_notify = require(global['PATH']['TOOLS'] + '/classes_notify')
let notifier = new classes_notify()

module.exports = app

