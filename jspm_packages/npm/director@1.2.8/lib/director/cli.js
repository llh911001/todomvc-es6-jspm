/* */ 
var util = require("util"),
    BaseRouter = require("./router").Router;
var Router = exports.Router = function(routes) {
  BaseRouter.call(this, routes);
  this.recurse = false;
};
util.inherits(Router, BaseRouter);
Router.prototype.configure = function(options) {
  options = options || {};
  BaseRouter.prototype.configure.call(this, options);
  this.delimiter = '\\s';
  return this;
};
Router.prototype.dispatch = function(method, path, tty, callback) {
  path = ' ' + path;
  var fns = this.traverse(method, path, this.routes, '');
  if (!fns || fns.length === 0) {
    if (typeof this.notfound === 'function') {
      this.notfound.call({
        tty: tty,
        cmd: path
      }, callback);
    } else if (callback) {
      callback(new Error('Could not find path: ' + path));
    }
    return false;
  }
  if (this.recurse === 'forward') {
    fns = fns.reverse();
  }
  this.invoke(this.runlist(fns), {
    tty: tty,
    cmd: path
  }, callback);
  return true;
};
