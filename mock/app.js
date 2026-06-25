var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const cors = require('cors');

var indexRouter = require("./routes/index").router;
var dataBoard = require("./routes/dataBoard");
var homeRouter = require("./routes/home");
var systemSettingsRouter = require("./routes/system-settings");
var publishRouter = require("./routes/publish");
var uploadRouter = require("./routes/upload");
var microAppRouter = require("./routes/micro-app");
var agentChatRouter = require("./routes/agent-chat");
var dataSourceRouter = require("./routes/data-source");
var globalConfigRouter = require("./routes/global-config");
var localComponentLibraryRouter = require("./routes/local-component-library");

var baseApi = "/";
var app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(cors());
app.use(logger("dev"));
app.use(express.json());
app.use(
  express.urlencoded({
    extended: false,
  })
);
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("*", function (req, res, next) {
  const { origin, Origin, referer, Referer } = req.headers;
  const allowOrigin = origin || Origin || referer || Referer || "*";
  res.header("Access-Control-Allow-Origin", allowOrigin);
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Admin-Token, Page-Name"
  );
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Credentials", true);
  res.header("X-Powered-By", "Express");

  req.json = {
    code: 20000,
    status: 0,
    message: "ok",
  };

  req.sleep = function (time) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(null);
      }, time * 1000);
    });
  };

  if (req.method == "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

let lastTime = Date.now();
app.use("*", function (req, res, next) {
  let nowTime = Date.now();
  if (nowTime - lastTime > 10000) {
    lastTime = nowTime;
    res.header("authorization", nowTime);
  }
  next();
});

app.use(baseApi, indexRouter);
app.use(baseApi, dataBoard);
app.use(baseApi, homeRouter);
app.use(baseApi, systemSettingsRouter);
app.use(baseApi, publishRouter);
app.use(baseApi, uploadRouter);
app.use(baseApi, microAppRouter);
app.use(baseApi, agentChatRouter);
app.use(baseApi, dataSourceRouter);
app.use(baseApi, globalConfigRouter);
app.use(baseApi, localComponentLibraryRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
