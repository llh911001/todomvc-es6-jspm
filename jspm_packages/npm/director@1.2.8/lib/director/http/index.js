/* */ 
(function(Buffer) {
  var events = require("events"),
      qs = require("querystring"),
      util = require("util"),
      BaseRouter = require("../router").Router,
      responses = require("./responses");
  exports.methods = require("./methods");
  Object.keys(responses).forEach(function(name) {
    exports[name] = responses[name];
  });
  var Router = exports.Router = function(routes) {
    this.params = {};
    this.routes = {};
    this.methods = ['on', 'after', 'before'];
    this.scope = [];
    this._methods = {};
    this.recurse = 'forward';
    this._attach = [];
    this.extend(exports.methods.concat(['before', 'after']));
    this.configure();
    this.mount(routes || {});
  };
  util.inherits(Router, BaseRouter);
  Router.prototype.configure = function(options) {
    options = options || {};
    this.stream = options.stream || false;
    return BaseRouter.prototype.configure.call(this, options);
  };
  Router.prototype.on = function(method, path) {
    var args = Array.prototype.slice.call(arguments, 2),
        route = args.pop(),
        options = args.pop(),
        accept;
    if (options) {
      if (options.stream) {
        route.stream = true;
      }
      if (options.accept) {
        this._hasAccepts = true;
        accept = options.accept;
        route.accept = (Array.isArray(accept) ? accept : [accept]).map(function(a) {
          return typeof a === 'string' ? RegExp(a) : a;
        });
      }
    }
    if (typeof path !== 'string' && !path.source) {
      path = '';
    }
    BaseRouter.prototype.on.call(this, method, path, route);
  };
  Router.prototype.attach = function(func) {
    this._attach.push(func);
  };
  Router.prototype.dispatch = function(req, res, callback) {
    var method = req.method === 'HEAD' ? 'get' : req.method.toLowerCase(),
        thisArg = {
          req: req,
          res: res
        },
        self = this,
        contentType,
        runlist,
        stream,
        error,
        fns,
        url;
    try {
      url = decodeURI(req.url.split('?', 1)[0]);
    } catch (ex) {
      url = null;
    }
    if (url && this._hasAccepts) {
      contentType = req.headers['content-type'];
      fns = this.traverse(method, url, this.routes, '', function(route) {
        return !route.accept || route.accept.some(function(a) {
          return a.test(contentType);
        });
      });
    } else if (url) {
      fns = this.traverse(method, url, this.routes, '');
    }
    if (this._attach) {
      for (var i = 0; i < this._attach.length; i++) {
        this._attach[i].call(thisArg);
      }
    }
    if (!fns || fns.length === 0) {
      error = new exports.NotFound('Could not find path: ' + req.url);
      if (typeof this.notfound === 'function') {
        this.notfound.call(thisArg, callback);
      } else if (callback) {
        callback.call(thisArg, error, req, res);
      }
      return false;
    }
    if (this.recurse === 'forward') {
      fns = fns.reverse();
    }
    runlist = this.runlist(fns);
    stream = this.stream || runlist.some(function(fn) {
      return fn.stream === true;
    });
    function parseAndInvoke() {
      error = self.parse(req);
      if (error) {
        if (callback) {
          callback.call(thisArg, error, req, res);
        }
        return false;
      }
      self.invoke(runlist, thisArg, callback);
    }
    if (!stream) {
      if (req.readable) {
        req.once('end', parseAndInvoke);
        req.resume();
      } else {
        parseAndInvoke();
      }
    } else {
      this.invoke(runlist, thisArg, callback);
    }
    return true;
  };
  Router.prototype.parsers = {
    'application/x-www-form-urlencoded': qs.parse,
    'application/json': JSON.parse
  };
  Router.prototype.parse = function(req) {
    function mime(req) {
      var str = req.headers['content-type'] || '';
      return str.split(';')[0];
    }
    var parser = this.parsers[mime(req)],
        body;
    if (parser) {
      req.body = req.body || '';
      if (req.chunks) {
        req.chunks.forEach(function(chunk) {
          req.body += chunk;
        });
      }
      if ('string' === typeof req.body) {
        try {
          req.body = req.body && req.body.length ? parser(req.body) : {};
        } catch (err) {
          return new exports.BadRequest('Malformed data');
        }
      }
    }
  };
})(require("buffer").Buffer);
