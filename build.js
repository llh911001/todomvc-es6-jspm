/* */ 
"format global";
"exports $traceurRuntime";
(function(global) {
  'use strict';
  if (global.$traceurRuntime) {
    return ;
  }
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $Object.defineProperties;
  var $defineProperty = $Object.defineProperty;
  var $freeze = $Object.freeze;
  var $getOwnPropertyDescriptor = $Object.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $Object.getOwnPropertyNames;
  var $keys = $Object.keys;
  var $hasOwnProperty = $Object.prototype.hasOwnProperty;
  var $toString = $Object.prototype.toString;
  var $preventExtensions = Object.preventExtensions;
  var $seal = Object.seal;
  var $isExtensible = Object.isExtensible;
  var $apply = Function.prototype.call.bind(Function.prototype.apply);
  function $bind(operand, thisArg, args) {
    var argArray = [thisArg];
    for (var i = 0; i < args.length; i++) {
      argArray[i + 1] = args[i];
    }
    var func = $apply(Function.prototype.bind, operand, argArray);
    return func;
  }
  function $construct(func, argArray) {
    var object = new ($bind(func, null, argArray));
    return object;
  }
  var counter = 0;
  function newUniqueString() {
    return '__$' + Math.floor(Math.random() * 1e9) + '$' + ++counter + '$__';
  }
  var privateNames = $create(null);
  function isPrivateName(s) {
    return privateNames[s];
  }
  function createPrivateName() {
    var s = newUniqueString();
    privateNames[s] = true;
    return s;
  }
  var CONTINUATION_TYPE = Object.create(null);
  function createContinuation(operand, thisArg, argsArray) {
    return [CONTINUATION_TYPE, operand, thisArg, argsArray];
  }
  function isContinuation(object) {
    return object && object[0] === CONTINUATION_TYPE;
  }
  var isTailRecursiveName = null;
  function setupProperTailCalls() {
    isTailRecursiveName = createPrivateName();
    Function.prototype.call = initTailRecursiveFunction(function call(thisArg) {
      var result = tailCall(function(thisArg) {
        var argArray = [];
        for (var i = 1; i < arguments.length; ++i) {
          argArray[i - 1] = arguments[i];
        }
        var continuation = createContinuation(this, thisArg, argArray);
        return continuation;
      }, this, arguments);
      return result;
    });
    Function.prototype.apply = initTailRecursiveFunction(function apply(thisArg, argArray) {
      var result = tailCall(function(thisArg, argArray) {
        var continuation = createContinuation(this, thisArg, argArray);
        return continuation;
      }, this, arguments);
      return result;
    });
  }
  function initTailRecursiveFunction(func) {
    if (isTailRecursiveName === null) {
      setupProperTailCalls();
    }
    func[isTailRecursiveName] = true;
    return func;
  }
  function isTailRecursive(func) {
    return !!func[isTailRecursiveName];
  }
  function tailCall(func, thisArg, argArray) {
    var continuation = argArray[0];
    if (isContinuation(continuation)) {
      continuation = $apply(func, thisArg, continuation[3]);
      return continuation;
    }
    continuation = createContinuation(func, thisArg, argArray);
    while (true) {
      if (isTailRecursive(func)) {
        continuation = $apply(func, continuation[2], [continuation]);
      } else {
        continuation = $apply(func, continuation[2], continuation[3]);
      }
      if (!isContinuation(continuation)) {
        return continuation;
      }
      func = continuation[1];
    }
  }
  function construct() {
    var object;
    if (isTailRecursive(this)) {
      object = $construct(this, [createContinuation(null, null, arguments)]);
    } else {
      object = $construct(this, arguments);
    }
    return object;
  }
  var $traceurRuntime = {
    initTailRecursiveFunction: initTailRecursiveFunction,
    call: tailCall,
    continuation: createContinuation,
    construct: construct
  };
  (function() {
    function nonEnum(value) {
      return {
        configurable: true,
        enumerable: false,
        value: value,
        writable: true
      };
    }
    var method = nonEnum;
    var symbolInternalProperty = newUniqueString();
    var symbolDescriptionProperty = newUniqueString();
    var symbolDataProperty = newUniqueString();
    var symbolValues = $create(null);
    function isShimSymbol(symbol) {
      return typeof symbol === 'object' && symbol instanceof SymbolValue;
    }
    function typeOf(v) {
      if (isShimSymbol(v))
        return 'symbol';
      return typeof v;
    }
    function Symbol(description) {
      var value = new SymbolValue(description);
      if (!(this instanceof Symbol))
        return value;
      throw new TypeError('Symbol cannot be new\'ed');
    }
    $defineProperty(Symbol.prototype, 'constructor', nonEnum(Symbol));
    $defineProperty(Symbol.prototype, 'toString', method(function() {
      var symbolValue = this[symbolDataProperty];
      return symbolValue[symbolInternalProperty];
    }));
    $defineProperty(Symbol.prototype, 'valueOf', method(function() {
      var symbolValue = this[symbolDataProperty];
      if (!symbolValue)
        throw TypeError('Conversion from symbol to string');
      if (!getOption('symbols'))
        return symbolValue[symbolInternalProperty];
      return symbolValue;
    }));
    function SymbolValue(description) {
      var key = newUniqueString();
      $defineProperty(this, symbolDataProperty, {value: this});
      $defineProperty(this, symbolInternalProperty, {value: key});
      $defineProperty(this, symbolDescriptionProperty, {value: description});
      freeze(this);
      symbolValues[key] = this;
    }
    $defineProperty(SymbolValue.prototype, 'constructor', nonEnum(Symbol));
    $defineProperty(SymbolValue.prototype, 'toString', {
      value: Symbol.prototype.toString,
      enumerable: false
    });
    $defineProperty(SymbolValue.prototype, 'valueOf', {
      value: Symbol.prototype.valueOf,
      enumerable: false
    });
    var hashProperty = createPrivateName();
    var hashPropertyDescriptor = {value: undefined};
    var hashObjectProperties = {
      hash: {value: undefined},
      self: {value: undefined}
    };
    var hashCounter = 0;
    function getOwnHashObject(object) {
      var hashObject = object[hashProperty];
      if (hashObject && hashObject.self === object)
        return hashObject;
      if ($isExtensible(object)) {
        hashObjectProperties.hash.value = hashCounter++;
        hashObjectProperties.self.value = object;
        hashPropertyDescriptor.value = $create(null, hashObjectProperties);
        $defineProperty(object, hashProperty, hashPropertyDescriptor);
        return hashPropertyDescriptor.value;
      }
      return undefined;
    }
    function freeze(object) {
      getOwnHashObject(object);
      return $freeze.apply(this, arguments);
    }
    function preventExtensions(object) {
      getOwnHashObject(object);
      return $preventExtensions.apply(this, arguments);
    }
    function seal(object) {
      getOwnHashObject(object);
      return $seal.apply(this, arguments);
    }
    freeze(SymbolValue.prototype);
    function isSymbolString(s) {
      return symbolValues[s] || privateNames[s];
    }
    function toProperty(name) {
      if (isShimSymbol(name))
        return name[symbolInternalProperty];
      return name;
    }
    function removeSymbolKeys(array) {
      var rv = [];
      for (var i = 0; i < array.length; i++) {
        if (!isSymbolString(array[i])) {
          rv.push(array[i]);
        }
      }
      return rv;
    }
    function getOwnPropertyNames(object) {
      return removeSymbolKeys($getOwnPropertyNames(object));
    }
    function keys(object) {
      return removeSymbolKeys($keys(object));
    }
    function getOwnPropertySymbols(object) {
      var rv = [];
      var names = $getOwnPropertyNames(object);
      for (var i = 0; i < names.length; i++) {
        var symbol = symbolValues[names[i]];
        if (symbol) {
          rv.push(symbol);
        }
      }
      return rv;
    }
    function getOwnPropertyDescriptor(object, name) {
      return $getOwnPropertyDescriptor(object, toProperty(name));
    }
    function hasOwnProperty(name) {
      return $hasOwnProperty.call(this, toProperty(name));
    }
    function getOption(name) {
      return global.$traceurRuntime.options[name];
    }
    function defineProperty(object, name, descriptor) {
      if (isShimSymbol(name)) {
        name = name[symbolInternalProperty];
      }
      $defineProperty(object, name, descriptor);
      return object;
    }
    function polyfillObject(Object) {
      $defineProperty(Object, 'defineProperty', {value: defineProperty});
      $defineProperty(Object, 'getOwnPropertyNames', {value: getOwnPropertyNames});
      $defineProperty(Object, 'getOwnPropertyDescriptor', {value: getOwnPropertyDescriptor});
      $defineProperty(Object.prototype, 'hasOwnProperty', {value: hasOwnProperty});
      $defineProperty(Object, 'freeze', {value: freeze});
      $defineProperty(Object, 'preventExtensions', {value: preventExtensions});
      $defineProperty(Object, 'seal', {value: seal});
      $defineProperty(Object, 'keys', {value: keys});
    }
    function exportStar(object) {
      for (var i = 1; i < arguments.length; i++) {
        var names = $getOwnPropertyNames(arguments[i]);
        for (var j = 0; j < names.length; j++) {
          var name = names[j];
          if (name === '__esModule' || isSymbolString(name))
            continue;
          (function(mod, name) {
            $defineProperty(object, name, {
              get: function() {
                return mod[name];
              },
              enumerable: true
            });
          })(arguments[i], names[j]);
        }
      }
      return object;
    }
    function isObject(x) {
      return x != null && (typeof x === 'object' || typeof x === 'function');
    }
    function toObject(x) {
      if (x == null)
        throw $TypeError();
      return $Object(x);
    }
    function checkObjectCoercible(argument) {
      if (argument == null) {
        throw new TypeError('Value cannot be converted to an Object');
      }
      return argument;
    }
    function polyfillSymbol(global, Symbol) {
      if (!global.Symbol) {
        global.Symbol = Symbol;
        Object.getOwnPropertySymbols = getOwnPropertySymbols;
      }
      if (!global.Symbol.iterator) {
        global.Symbol.iterator = Symbol('Symbol.iterator');
      }
      if (!global.Symbol.observer) {
        global.Symbol.observer = Symbol('Symbol.observer');
      }
    }
    function setupGlobals(global) {
      polyfillSymbol(global, Symbol);
      global.Reflect = global.Reflect || {};
      global.Reflect.global = global.Reflect.global || global;
      polyfillObject(global.Object);
    }
    setupGlobals(global);
    global.$traceurRuntime = {
      call: tailCall,
      checkObjectCoercible: checkObjectCoercible,
      construct: construct,
      continuation: createContinuation,
      createPrivateName: createPrivateName,
      defineProperties: $defineProperties,
      defineProperty: $defineProperty,
      exportStar: exportStar,
      getOwnHashObject: getOwnHashObject,
      getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
      getOwnPropertyNames: $getOwnPropertyNames,
      initTailRecursiveFunction: initTailRecursiveFunction,
      isObject: isObject,
      isPrivateName: isPrivateName,
      isSymbolString: isSymbolString,
      keys: $keys,
      options: {},
      setupGlobals: setupGlobals,
      toObject: toObject,
      toProperty: toProperty,
      typeof: typeOf
    };
  })();
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
(function() {
  function buildFromEncodedParts(opt_scheme, opt_userInfo, opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
    var out = [];
    if (opt_scheme) {
      out.push(opt_scheme, ':');
    }
    if (opt_domain) {
      out.push('//');
      if (opt_userInfo) {
        out.push(opt_userInfo, '@');
      }
      out.push(opt_domain);
      if (opt_port) {
        out.push(':', opt_port);
      }
    }
    if (opt_path) {
      out.push(opt_path);
    }
    if (opt_queryData) {
      out.push('?', opt_queryData);
    }
    if (opt_fragment) {
      out.push('#', opt_fragment);
    }
    return out.join('');
  }
  ;
  var splitRe = new RegExp('^' + '(?:' + '([^:/?#.]+)' + ':)?' + '(?://' + '(?:([^/?#]*)@)?' + '([\\w\\d\\-\\u0100-\\uffff.%]*)' + '(?::([0-9]+))?' + ')?' + '([^?#]+)?' + '(?:\\?([^#]*))?' + '(?:#(.*))?' + '$');
  var ComponentIndex = {
    SCHEME: 1,
    USER_INFO: 2,
    DOMAIN: 3,
    PORT: 4,
    PATH: 5,
    QUERY_DATA: 6,
    FRAGMENT: 7
  };
  function split(uri) {
    return (uri.match(splitRe));
  }
  function removeDotSegments(path) {
    if (path === '/')
      return '/';
    var leadingSlash = path[0] === '/' ? '/' : '';
    var trailingSlash = path.slice(-1) === '/' ? '/' : '';
    var segments = path.split('/');
    var out = [];
    var up = 0;
    for (var pos = 0; pos < segments.length; pos++) {
      var segment = segments[pos];
      switch (segment) {
        case '':
        case '.':
          break;
        case '..':
          if (out.length)
            out.pop();
          else
            up++;
          break;
        default:
          out.push(segment);
      }
    }
    if (!leadingSlash) {
      while (up-- > 0) {
        out.unshift('..');
      }
      if (out.length === 0)
        out.push('.');
    }
    return leadingSlash + out.join('/') + trailingSlash;
  }
  function joinAndCanonicalizePath(parts) {
    var path = parts[ComponentIndex.PATH] || '';
    path = removeDotSegments(path);
    parts[ComponentIndex.PATH] = path;
    return buildFromEncodedParts(parts[ComponentIndex.SCHEME], parts[ComponentIndex.USER_INFO], parts[ComponentIndex.DOMAIN], parts[ComponentIndex.PORT], parts[ComponentIndex.PATH], parts[ComponentIndex.QUERY_DATA], parts[ComponentIndex.FRAGMENT]);
  }
  function canonicalizeUrl(url) {
    var parts = split(url);
    return joinAndCanonicalizePath(parts);
  }
  function resolveUrl(base, url) {
    var parts = split(url);
    var baseParts = split(base);
    if (parts[ComponentIndex.SCHEME]) {
      return joinAndCanonicalizePath(parts);
    } else {
      parts[ComponentIndex.SCHEME] = baseParts[ComponentIndex.SCHEME];
    }
    for (var i = ComponentIndex.SCHEME; i <= ComponentIndex.PORT; i++) {
      if (!parts[i]) {
        parts[i] = baseParts[i];
      }
    }
    if (parts[ComponentIndex.PATH][0] == '/') {
      return joinAndCanonicalizePath(parts);
    }
    var path = baseParts[ComponentIndex.PATH];
    var index = path.lastIndexOf('/');
    path = path.slice(0, index + 1) + parts[ComponentIndex.PATH];
    parts[ComponentIndex.PATH] = path;
    return joinAndCanonicalizePath(parts);
  }
  function isAbsolute(name) {
    if (!name)
      return false;
    if (name[0] === '/')
      return true;
    var parts = split(name);
    if (parts[ComponentIndex.SCHEME])
      return true;
    return false;
  }
  $traceurRuntime.canonicalizeUrl = canonicalizeUrl;
  $traceurRuntime.isAbsolute = isAbsolute;
  $traceurRuntime.removeDotSegments = removeDotSegments;
  $traceurRuntime.resolveUrl = resolveUrl;
})();
(function(global) {
  'use strict';
  var $__1 = $traceurRuntime,
      canonicalizeUrl = $__1.canonicalizeUrl,
      resolveUrl = $__1.resolveUrl,
      isAbsolute = $__1.isAbsolute;
  var moduleInstantiators = Object.create(null);
  var baseURL;
  if (global.location && global.location.href)
    baseURL = resolveUrl(global.location.href, './');
  else
    baseURL = '';
  function UncoatedModuleEntry(url, uncoatedModule) {
    this.url = url;
    this.value_ = uncoatedModule;
  }
  function ModuleEvaluationError(erroneousModuleName, cause) {
    this.message = this.constructor.name + ': ' + this.stripCause(cause) + ' in ' + erroneousModuleName;
    if (!(cause instanceof ModuleEvaluationError) && cause.stack)
      this.stack = this.stripStack(cause.stack);
    else
      this.stack = '';
  }
  ModuleEvaluationError.prototype = Object.create(Error.prototype);
  ModuleEvaluationError.prototype.constructor = ModuleEvaluationError;
  ModuleEvaluationError.prototype.stripError = function(message) {
    return message.replace(/.*Error:/, this.constructor.name + ':');
  };
  ModuleEvaluationError.prototype.stripCause = function(cause) {
    if (!cause)
      return '';
    if (!cause.message)
      return cause + '';
    return this.stripError(cause.message);
  };
  ModuleEvaluationError.prototype.loadedBy = function(moduleName) {
    this.stack += '\n loaded by ' + moduleName;
  };
  ModuleEvaluationError.prototype.stripStack = function(causeStack) {
    var stack = [];
    causeStack.split('\n').some((function(frame) {
      if (/UncoatedModuleInstantiator/.test(frame))
        return true;
      stack.push(frame);
    }));
    stack[0] = this.stripError(stack[0]);
    return stack.join('\n');
  };
  function beforeLines(lines, number) {
    var result = [];
    var first = number - 3;
    if (first < 0)
      first = 0;
    for (var i = first; i < number; i++) {
      result.push(lines[i]);
    }
    return result;
  }
  function afterLines(lines, number) {
    var last = number + 1;
    if (last > lines.length - 1)
      last = lines.length - 1;
    var result = [];
    for (var i = number; i <= last; i++) {
      result.push(lines[i]);
    }
    return result;
  }
  function columnSpacing(columns) {
    var result = '';
    for (var i = 0; i < columns - 1; i++) {
      result += '-';
    }
    return result;
  }
  function UncoatedModuleInstantiator(url, func) {
    UncoatedModuleEntry.call(this, url, null);
    this.func = func;
  }
  UncoatedModuleInstantiator.prototype = Object.create(UncoatedModuleEntry.prototype);
  UncoatedModuleInstantiator.prototype.getUncoatedModule = function() {
    var $__0 = this;
    if (this.value_)
      return this.value_;
    try {
      var relativeRequire;
      if (typeof $traceurRuntime !== undefined && $traceurRuntime.require) {
        relativeRequire = $traceurRuntime.require.bind(null, this.url);
      }
      return this.value_ = this.func.call(global, relativeRequire);
    } catch (ex) {
      if (ex instanceof ModuleEvaluationError) {
        ex.loadedBy(this.url);
        throw ex;
      }
      if (ex.stack) {
        var lines = this.func.toString().split('\n');
        var evaled = [];
        ex.stack.split('\n').some((function(frame, index) {
          if (frame.indexOf('UncoatedModuleInstantiator.getUncoatedModule') > 0)
            return true;
          var m = /(at\s[^\s]*\s).*>:(\d*):(\d*)\)/.exec(frame);
          if (m) {
            var line = parseInt(m[2], 10);
            evaled = evaled.concat(beforeLines(lines, line));
            if (index === 1) {
              evaled.push(columnSpacing(m[3]) + '^ ' + $__0.url);
            } else {
              evaled.push(columnSpacing(m[3]) + '^');
            }
            evaled = evaled.concat(afterLines(lines, line));
            evaled.push('= = = = = = = = =');
          } else {
            evaled.push(frame);
          }
        }));
        ex.stack = evaled.join('\n');
      }
      throw new ModuleEvaluationError(this.url, ex);
    }
  };
  function getUncoatedModuleInstantiator(name) {
    if (!name)
      return ;
    var url = ModuleStore.normalize(name);
    return moduleInstantiators[url];
  }
  ;
  var moduleInstances = Object.create(null);
  var liveModuleSentinel = {};
  function Module(uncoatedModule) {
    var isLive = arguments[1];
    var coatedModule = Object.create(null);
    Object.getOwnPropertyNames(uncoatedModule).forEach((function(name) {
      var getter,
          value;
      if (isLive === liveModuleSentinel) {
        var descr = Object.getOwnPropertyDescriptor(uncoatedModule, name);
        if (descr.get)
          getter = descr.get;
      }
      if (!getter) {
        value = uncoatedModule[name];
        getter = function() {
          return value;
        };
      }
      Object.defineProperty(coatedModule, name, {
        get: getter,
        enumerable: true
      });
    }));
    Object.preventExtensions(coatedModule);
    return coatedModule;
  }
  var ModuleStore = {
    normalize: function(name, refererName, refererAddress) {
      if (typeof name !== 'string')
        throw new TypeError('module name must be a string, not ' + typeof name);
      if (isAbsolute(name))
        return canonicalizeUrl(name);
      if (/[^\.]\/\.\.\//.test(name)) {
        throw new Error('module name embeds /../: ' + name);
      }
      if (name[0] === '.' && refererName)
        return resolveUrl(refererName, name);
      return canonicalizeUrl(name);
    },
    get: function(normalizedName) {
      var m = getUncoatedModuleInstantiator(normalizedName);
      if (!m)
        return undefined;
      var moduleInstance = moduleInstances[m.url];
      if (moduleInstance)
        return moduleInstance;
      moduleInstance = Module(m.getUncoatedModule(), liveModuleSentinel);
      return moduleInstances[m.url] = moduleInstance;
    },
    set: function(normalizedName, module) {
      normalizedName = String(normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, (function() {
        return module;
      }));
      moduleInstances[normalizedName] = module;
    },
    get baseURL() {
      return baseURL;
    },
    set baseURL(v) {
      baseURL = String(v);
    },
    registerModule: function(name, deps, func) {
      var normalizedName = ModuleStore.normalize(name);
      if (moduleInstantiators[normalizedName])
        throw new Error('duplicate module named ' + normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, func);
    },
    bundleStore: Object.create(null),
    register: function(name, deps, func) {
      if (!deps || !deps.length && !func.length) {
        this.registerModule(name, deps, func);
      } else {
        this.bundleStore[name] = {
          deps: deps,
          execute: function() {
            var $__0 = arguments;
            var depMap = {};
            deps.forEach((function(dep, index) {
              return depMap[dep] = $__0[index];
            }));
            var registryEntry = func.call(this, depMap);
            registryEntry.execute.call(this);
            return registryEntry.exports;
          }
        };
      }
    },
    getAnonymousModule: function(func) {
      return new Module(func.call(global), liveModuleSentinel);
    },
    getForTesting: function(name) {
      var $__0 = this;
      if (!this.testingPrefix_) {
        Object.keys(moduleInstances).some((function(key) {
          var m = /(traceur@[^\/]*\/)/.exec(key);
          if (m) {
            $__0.testingPrefix_ = m[1];
            return true;
          }
        }));
      }
      return this.get(this.testingPrefix_ + name);
    }
  };
  var moduleStoreModule = new Module({ModuleStore: ModuleStore});
  ModuleStore.set('@traceur/src/runtime/ModuleStore.js', moduleStoreModule);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
  };
  $traceurRuntime.ModuleStore = ModuleStore;
  global.System = {
    register: ModuleStore.register.bind(ModuleStore),
    registerModule: ModuleStore.registerModule.bind(ModuleStore),
    get: ModuleStore.get,
    set: ModuleStore.set,
    normalize: ModuleStore.normalize
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
System.registerModule("traceur-runtime@0.0.88/src/runtime/async.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/async.js";
  if (typeof $traceurRuntime !== 'object') {
    throw new Error('traceur runtime not found.');
  }
  var $createPrivateName = $traceurRuntime.createPrivateName;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $create = Object.create;
  var thisName = $createPrivateName();
  var argsName = $createPrivateName();
  var observeName = $createPrivateName();
  function AsyncGeneratorFunction() {}
  function AsyncGeneratorFunctionPrototype() {}
  AsyncGeneratorFunction.prototype = AsyncGeneratorFunctionPrototype;
  AsyncGeneratorFunctionPrototype.constructor = AsyncGeneratorFunction;
  $defineProperty(AsyncGeneratorFunctionPrototype, 'constructor', {enumerable: false});
  var AsyncGeneratorContext = (function() {
    function AsyncGeneratorContext(observer) {
      var $__0 = this;
      this.decoratedObserver = $traceurRuntime.createDecoratedGenerator(observer, (function() {
        $__0.done = true;
      }));
      this.done = false;
      this.inReturn = false;
    }
    return ($traceurRuntime.createClass)(AsyncGeneratorContext, {
      throw: function(error) {
        if (!this.inReturn) {
          throw error;
        }
      },
      yield: function(value) {
        if (this.done) {
          this.inReturn = true;
          throw undefined;
        }
        var result;
        try {
          result = this.decoratedObserver.next(value);
        } catch (e) {
          this.done = true;
          throw e;
        }
        if (result === undefined) {
          return ;
        }
        if (result.done) {
          this.done = true;
          this.inReturn = true;
          throw undefined;
        }
        return result.value;
      },
      yieldFor: function(observable) {
        var ctx = this;
        return $traceurRuntime.observeForEach(observable[$traceurRuntime.toProperty(Symbol.observer)].bind(observable), function(value) {
          if (ctx.done) {
            this.return();
            return ;
          }
          var result;
          try {
            result = ctx.decoratedObserver.next(value);
          } catch (e) {
            ctx.done = true;
            throw e;
          }
          if (result === undefined) {
            return ;
          }
          if (result.done) {
            ctx.done = true;
          }
          return result;
        });
      }
    }, {});
  }());
  AsyncGeneratorFunctionPrototype.prototype[Symbol.observer] = function(observer) {
    var observe = this[observeName];
    var ctx = new AsyncGeneratorContext(observer);
    $traceurRuntime.schedule((function() {
      return observe(ctx);
    })).then((function(value) {
      if (!ctx.done) {
        ctx.decoratedObserver.return(value);
      }
    })).catch((function(error) {
      if (!ctx.done) {
        ctx.decoratedObserver.throw(error);
      }
    }));
    return ctx.decoratedObserver;
  };
  $defineProperty(AsyncGeneratorFunctionPrototype.prototype, Symbol.observer, {enumerable: false});
  function initAsyncGeneratorFunction(functionObject) {
    functionObject.prototype = $create(AsyncGeneratorFunctionPrototype.prototype);
    functionObject.__proto__ = AsyncGeneratorFunctionPrototype;
    return functionObject;
  }
  function createAsyncGeneratorInstance(observe, functionObject) {
    for (var args = [],
        $__2 = 2; $__2 < arguments.length; $__2++)
      args[$__2 - 2] = arguments[$__2];
    var object = $create(functionObject.prototype);
    object[thisName] = this;
    object[argsName] = args;
    object[observeName] = observe;
    return object;
  }
  function observeForEach(observe, next) {
    return new Promise((function(resolve, reject) {
      var generator = observe({
        next: function(value) {
          return next.call(generator, value);
        },
        throw: function(error) {
          reject(error);
        },
        return: function(value) {
          resolve(value);
        }
      });
    }));
  }
  function schedule(asyncF) {
    return Promise.resolve().then(asyncF);
  }
  var generator = Symbol();
  var onDone = Symbol();
  var DecoratedGenerator = (function() {
    function DecoratedGenerator(_generator, _onDone) {
      this[generator] = _generator;
      this[onDone] = _onDone;
    }
    return ($traceurRuntime.createClass)(DecoratedGenerator, {
      next: function(value) {
        var result = this[generator].next(value);
        if (result !== undefined && result.done) {
          this[onDone].call(this);
        }
        return result;
      },
      throw: function(error) {
        this[onDone].call(this);
        return this[generator].throw(error);
      },
      return: function(value) {
        this[onDone].call(this);
        return this[generator].return(value);
      }
    }, {});
  }());
  function createDecoratedGenerator(generator, onDone) {
    return new DecoratedGenerator(generator, onDone);
  }
  $traceurRuntime.initAsyncGeneratorFunction = initAsyncGeneratorFunction;
  $traceurRuntime.createAsyncGeneratorInstance = createAsyncGeneratorInstance;
  $traceurRuntime.observeForEach = observeForEach;
  $traceurRuntime.schedule = schedule;
  $traceurRuntime.createDecoratedGenerator = createDecoratedGenerator;
  return {};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/classes.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/classes.js";
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $getOwnPropertyDescriptor = $traceurRuntime.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $traceurRuntime.getOwnPropertyNames;
  var $getPrototypeOf = Object.getPrototypeOf;
  var $__0 = Object,
      getOwnPropertyNames = $__0.getOwnPropertyNames,
      getOwnPropertySymbols = $__0.getOwnPropertySymbols;
  function superDescriptor(homeObject, name) {
    var proto = $getPrototypeOf(homeObject);
    do {
      var result = $getOwnPropertyDescriptor(proto, name);
      if (result)
        return result;
      proto = $getPrototypeOf(proto);
    } while (proto);
    return undefined;
  }
  function superConstructor(ctor) {
    return ctor.__proto__;
  }
  function superGet(self, homeObject, name) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor) {
      if (!descriptor.get)
        return descriptor.value;
      return descriptor.get.call(self);
    }
    return undefined;
  }
  function superSet(self, homeObject, name, value) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor && descriptor.set) {
      descriptor.set.call(self, value);
      return value;
    }
    throw $TypeError(("super has no setter '" + name + "'."));
  }
  function forEachPropertyKey(object, f) {
    getOwnPropertyNames(object).forEach(f);
    getOwnPropertySymbols(object).forEach(f);
  }
  function getDescriptors(object) {
    var descriptors = {};
    forEachPropertyKey(object, (function(key) {
      descriptors[key] = $getOwnPropertyDescriptor(object, key);
      descriptors[key].enumerable = false;
    }));
    return descriptors;
  }
  var nonEnum = {enumerable: false};
  function makePropertiesNonEnumerable(object) {
    forEachPropertyKey(object, (function(key) {
      $defineProperty(object, key, nonEnum);
    }));
  }
  function createClass(ctor, object, staticObject, superClass) {
    $defineProperty(object, 'constructor', {
      value: ctor,
      configurable: true,
      enumerable: false,
      writable: true
    });
    if (arguments.length > 3) {
      if (typeof superClass === 'function')
        ctor.__proto__ = superClass;
      ctor.prototype = $create(getProtoParent(superClass), getDescriptors(object));
    } else {
      makePropertiesNonEnumerable(object);
      ctor.prototype = object;
    }
    $defineProperty(ctor, 'prototype', {
      configurable: false,
      writable: false
    });
    return $defineProperties(ctor, getDescriptors(staticObject));
  }
  function getProtoParent(superClass) {
    if (typeof superClass === 'function') {
      var prototype = superClass.prototype;
      if ($Object(prototype) === prototype || prototype === null)
        return superClass.prototype;
      throw new $TypeError('super prototype must be an Object or null');
    }
    if (superClass === null)
      return null;
    throw new $TypeError(("Super expression must either be null or a function, not " + typeof superClass + "."));
  }
  $traceurRuntime.createClass = createClass;
  $traceurRuntime.superConstructor = superConstructor;
  $traceurRuntime.superGet = superGet;
  $traceurRuntime.superSet = superSet;
  return {};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/destructuring.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/destructuring.js";
  function iteratorToArray(iter) {
    var rv = [];
    var i = 0;
    var tmp;
    while (!(tmp = iter.next()).done) {
      rv[i++] = tmp.value;
    }
    return rv;
  }
  $traceurRuntime.iteratorToArray = iteratorToArray;
  return {};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/generators.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/generators.js";
  if (typeof $traceurRuntime !== 'object') {
    throw new Error('traceur runtime not found.');
  }
  var createPrivateName = $traceurRuntime.createPrivateName;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $create = Object.create;
  var $TypeError = TypeError;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var ST_NEWBORN = 0;
  var ST_EXECUTING = 1;
  var ST_SUSPENDED = 2;
  var ST_CLOSED = 3;
  var END_STATE = -2;
  var RETHROW_STATE = -3;
  function getInternalError(state) {
    return new Error('Traceur compiler bug: invalid state in state machine: ' + state);
  }
  var RETURN_SENTINEL = {};
  function GeneratorContext() {
    this.state = 0;
    this.GState = ST_NEWBORN;
    this.storedException = undefined;
    this.finallyFallThrough = undefined;
    this.sent_ = undefined;
    this.returnValue = undefined;
    this.oldReturnValue = undefined;
    this.tryStack_ = [];
  }
  GeneratorContext.prototype = {
    pushTry: function(catchState, finallyState) {
      if (finallyState !== null) {
        var finallyFallThrough = null;
        for (var i = this.tryStack_.length - 1; i >= 0; i--) {
          if (this.tryStack_[i].catch !== undefined) {
            finallyFallThrough = this.tryStack_[i].catch;
            break;
          }
        }
        if (finallyFallThrough === null)
          finallyFallThrough = RETHROW_STATE;
        this.tryStack_.push({
          finally: finallyState,
          finallyFallThrough: finallyFallThrough
        });
      }
      if (catchState !== null) {
        this.tryStack_.push({catch: catchState});
      }
    },
    popTry: function() {
      this.tryStack_.pop();
    },
    maybeUncatchable: function() {
      if (this.storedException === RETURN_SENTINEL) {
        throw RETURN_SENTINEL;
      }
    },
    get sent() {
      this.maybeThrow();
      return this.sent_;
    },
    set sent(v) {
      this.sent_ = v;
    },
    get sentIgnoreThrow() {
      return this.sent_;
    },
    maybeThrow: function() {
      if (this.action === 'throw') {
        this.action = 'next';
        throw this.sent_;
      }
    },
    end: function() {
      switch (this.state) {
        case END_STATE:
          return this;
        case RETHROW_STATE:
          throw this.storedException;
        default:
          throw getInternalError(this.state);
      }
    },
    handleException: function(ex) {
      this.GState = ST_CLOSED;
      this.state = END_STATE;
      throw ex;
    },
    wrapYieldStar: function(iterator) {
      var ctx = this;
      return {
        next: function(v) {
          return iterator.next(v);
        },
        throw: function(e) {
          var result;
          if (e === RETURN_SENTINEL) {
            if (iterator.return) {
              result = iterator.return(ctx.returnValue);
              if (!result.done) {
                ctx.returnValue = ctx.oldReturnValue;
                return result;
              }
              ctx.returnValue = result.value;
            }
            throw e;
          }
          if (iterator.throw) {
            return iterator.throw(e);
          }
          iterator.return && iterator.return();
          throw $TypeError('Inner iterator does not have a throw method');
        }
      };
    }
  };
  function nextOrThrow(ctx, moveNext, action, x) {
    switch (ctx.GState) {
      case ST_EXECUTING:
        throw new Error(("\"" + action + "\" on executing generator"));
      case ST_CLOSED:
        if (action == 'next') {
          return {
            value: undefined,
            done: true
          };
        }
        if (x === RETURN_SENTINEL) {
          return {
            value: ctx.returnValue,
            done: true
          };
        }
        throw x;
      case ST_NEWBORN:
        if (action === 'throw') {
          ctx.GState = ST_CLOSED;
          if (x === RETURN_SENTINEL) {
            return {
              value: ctx.returnValue,
              done: true
            };
          }
          throw x;
        }
        if (x !== undefined)
          throw $TypeError('Sent value to newborn generator');
      case ST_SUSPENDED:
        ctx.GState = ST_EXECUTING;
        ctx.action = action;
        ctx.sent = x;
        var value;
        try {
          value = moveNext(ctx);
        } catch (ex) {
          if (ex === RETURN_SENTINEL) {
            value = ctx;
          } else {
            throw ex;
          }
        }
        var done = value === ctx;
        if (done)
          value = ctx.returnValue;
        ctx.GState = done ? ST_CLOSED : ST_SUSPENDED;
        return {
          value: value,
          done: done
        };
    }
  }
  var ctxName = createPrivateName();
  var moveNextName = createPrivateName();
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  $defineProperty(GeneratorFunctionPrototype, 'constructor', nonEnum(GeneratorFunction));
  GeneratorFunctionPrototype.prototype = {
    constructor: GeneratorFunctionPrototype,
    next: function(v) {
      return nextOrThrow(this[ctxName], this[moveNextName], 'next', v);
    },
    throw: function(v) {
      return nextOrThrow(this[ctxName], this[moveNextName], 'throw', v);
    },
    return: function(v) {
      this[ctxName].oldReturnValue = this[ctxName].returnValue;
      this[ctxName].returnValue = v;
      return nextOrThrow(this[ctxName], this[moveNextName], 'throw', RETURN_SENTINEL);
    }
  };
  $defineProperties(GeneratorFunctionPrototype.prototype, {
    constructor: {enumerable: false},
    next: {enumerable: false},
    throw: {enumerable: false},
    return: {enumerable: false}
  });
  Object.defineProperty(GeneratorFunctionPrototype.prototype, Symbol.iterator, nonEnum(function() {
    return this;
  }));
  function createGeneratorInstance(innerFunction, functionObject, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new GeneratorContext();
    var object = $create(functionObject.prototype);
    object[ctxName] = ctx;
    object[moveNextName] = moveNext;
    return object;
  }
  function initGeneratorFunction(functionObject) {
    functionObject.prototype = $create(GeneratorFunctionPrototype.prototype);
    functionObject.__proto__ = GeneratorFunctionPrototype;
    return functionObject;
  }
  function AsyncFunctionContext() {
    GeneratorContext.call(this);
    this.err = undefined;
    var ctx = this;
    ctx.result = new Promise(function(resolve, reject) {
      ctx.resolve = resolve;
      ctx.reject = reject;
    });
  }
  AsyncFunctionContext.prototype = $create(GeneratorContext.prototype);
  AsyncFunctionContext.prototype.end = function() {
    switch (this.state) {
      case END_STATE:
        this.resolve(this.returnValue);
        break;
      case RETHROW_STATE:
        this.reject(this.storedException);
        break;
      default:
        this.reject(getInternalError(this.state));
    }
  };
  AsyncFunctionContext.prototype.handleException = function() {
    this.state = RETHROW_STATE;
  };
  function asyncWrap(innerFunction, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new AsyncFunctionContext();
    ctx.createCallback = function(newState) {
      return function(value) {
        ctx.state = newState;
        ctx.value = value;
        moveNext(ctx);
      };
    };
    ctx.errback = function(err) {
      handleCatch(ctx, err);
      moveNext(ctx);
    };
    moveNext(ctx);
    return ctx.result;
  }
  function getMoveNext(innerFunction, self) {
    return function(ctx) {
      while (true) {
        try {
          return innerFunction.call(self, ctx);
        } catch (ex) {
          handleCatch(ctx, ex);
        }
      }
    };
  }
  function handleCatch(ctx, ex) {
    ctx.storedException = ex;
    var last = ctx.tryStack_[ctx.tryStack_.length - 1];
    if (!last) {
      ctx.handleException(ex);
      return ;
    }
    ctx.state = last.catch !== undefined ? last.catch : last.finally;
    if (last.finallyFallThrough !== undefined)
      ctx.finallyFallThrough = last.finallyFallThrough;
  }
  $traceurRuntime.asyncWrap = asyncWrap;
  $traceurRuntime.initGeneratorFunction = initGeneratorFunction;
  $traceurRuntime.createGeneratorInstance = createGeneratorInstance;
  return {};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/relativeRequire.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/relativeRequire.js";
  var path;
  function relativeRequire(callerPath, requiredPath) {
    path = path || typeof require !== 'undefined' && require('path');
    function isDirectory(path) {
      return path.slice(-1) === '/';
    }
    function isAbsolute(path) {
      return path[0] === '/';
    }
    function isRelative(path) {
      return path[0] === '.';
    }
    if (isDirectory(requiredPath) || isAbsolute(requiredPath))
      return ;
    return isRelative(requiredPath) ? require(path.resolve(path.dirname(callerPath), requiredPath)) : require(requiredPath);
  }
  $traceurRuntime.require = relativeRequire;
  return {};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/spread.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/spread.js";
  function spread() {
    var rv = [],
        j = 0,
        iterResult;
    for (var i = 0; i < arguments.length; i++) {
      var valueToSpread = $traceurRuntime.checkObjectCoercible(arguments[i]);
      if (typeof valueToSpread[$traceurRuntime.toProperty(Symbol.iterator)] !== 'function') {
        throw new TypeError('Cannot spread non-iterable object.');
      }
      var iter = valueToSpread[$traceurRuntime.toProperty(Symbol.iterator)]();
      while (!(iterResult = iter.next()).done) {
        rv[j++] = iterResult.value;
      }
    }
    return rv;
  }
  $traceurRuntime.spread = spread;
  return {};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/template.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/template.js";
  var $__0 = Object,
      defineProperty = $__0.defineProperty,
      freeze = $__0.freeze;
  var slice = Array.prototype.slice;
  var map = Object.create(null);
  function getTemplateObject(raw) {
    var cooked = arguments[1];
    var key = raw.join('${}');
    var templateObject = map[key];
    if (templateObject)
      return templateObject;
    if (!cooked) {
      cooked = slice.call(raw);
    }
    return map[key] = freeze(defineProperty(cooked, 'raw', {value: freeze(raw)}));
  }
  $traceurRuntime.getTemplateObject = getTemplateObject;
  return {};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/type-assertions.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/type-assertions.js";
  var types = {
    any: {name: 'any'},
    boolean: {name: 'boolean'},
    number: {name: 'number'},
    string: {name: 'string'},
    symbol: {name: 'symbol'},
    void: {name: 'void'}
  };
  var GenericType = (function() {
    function GenericType(type, argumentTypes) {
      this.type = type;
      this.argumentTypes = argumentTypes;
    }
    return ($traceurRuntime.createClass)(GenericType, {}, {});
  }());
  var typeRegister = Object.create(null);
  function genericType(type) {
    for (var argumentTypes = [],
        $__1 = 1; $__1 < arguments.length; $__1++)
      argumentTypes[$__1 - 1] = arguments[$__1];
    var typeMap = typeRegister;
    var key = $traceurRuntime.getOwnHashObject(type).hash;
    if (!typeMap[key]) {
      typeMap[key] = Object.create(null);
    }
    typeMap = typeMap[key];
    for (var i = 0; i < argumentTypes.length - 1; i++) {
      key = $traceurRuntime.getOwnHashObject(argumentTypes[i]).hash;
      if (!typeMap[key]) {
        typeMap[key] = Object.create(null);
      }
      typeMap = typeMap[key];
    }
    var tail = argumentTypes[argumentTypes.length - 1];
    key = $traceurRuntime.getOwnHashObject(tail).hash;
    if (!typeMap[key]) {
      typeMap[key] = new GenericType(type, argumentTypes);
    }
    return typeMap[key];
  }
  $traceurRuntime.GenericType = GenericType;
  $traceurRuntime.genericType = genericType;
  $traceurRuntime.type = types;
  return {};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/runtime-modules.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/runtime-modules.js";
  System.get("traceur-runtime@0.0.88/src/runtime/relativeRequire.js");
  System.get("traceur-runtime@0.0.88/src/runtime/spread.js");
  System.get("traceur-runtime@0.0.88/src/runtime/destructuring.js");
  System.get("traceur-runtime@0.0.88/src/runtime/classes.js");
  System.get("traceur-runtime@0.0.88/src/runtime/async.js");
  System.get("traceur-runtime@0.0.88/src/runtime/generators.js");
  System.get("traceur-runtime@0.0.88/src/runtime/template.js");
  System.get("traceur-runtime@0.0.88/src/runtime/type-assertions.js");
  return {};
});
System.get("traceur-runtime@0.0.88/src/runtime/runtime-modules.js" + '');
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/utils.js";
  var $ceil = Math.ceil;
  var $floor = Math.floor;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $pow = Math.pow;
  var $min = Math.min;
  var toObject = $traceurRuntime.toObject;
  function toUint32(x) {
    return x >>> 0;
  }
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function isCallable(x) {
    return typeof x === 'function';
  }
  function isNumber(x) {
    return typeof x === 'number';
  }
  function toInteger(x) {
    x = +x;
    if ($isNaN(x))
      return 0;
    if (x === 0 || !$isFinite(x))
      return x;
    return x > 0 ? $floor(x) : $ceil(x);
  }
  var MAX_SAFE_LENGTH = $pow(2, 53) - 1;
  function toLength(x) {
    var len = toInteger(x);
    return len < 0 ? 0 : $min(len, MAX_SAFE_LENGTH);
  }
  function checkIterable(x) {
    return !isObject(x) ? undefined : x[Symbol.iterator];
  }
  function isConstructor(x) {
    return isCallable(x);
  }
  function createIteratorResultObject(value, done) {
    return {
      value: value,
      done: done
    };
  }
  function maybeDefine(object, name, descr) {
    if (!(name in object)) {
      Object.defineProperty(object, name, descr);
    }
  }
  function maybeDefineMethod(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  function maybeDefineConst(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
  function maybeAddFunctions(object, functions) {
    for (var i = 0; i < functions.length; i += 2) {
      var name = functions[i];
      var value = functions[i + 1];
      maybeDefineMethod(object, name, value);
    }
  }
  function maybeAddConsts(object, consts) {
    for (var i = 0; i < consts.length; i += 2) {
      var name = consts[i];
      var value = consts[i + 1];
      maybeDefineConst(object, name, value);
    }
  }
  function maybeAddIterator(object, func, Symbol) {
    if (!Symbol || !Symbol.iterator || object[Symbol.iterator])
      return ;
    if (object['@@iterator'])
      func = object['@@iterator'];
    Object.defineProperty(object, Symbol.iterator, {
      value: func,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  var polyfills = [];
  function registerPolyfill(func) {
    polyfills.push(func);
  }
  function polyfillAll(global) {
    polyfills.forEach((function(f) {
      return f(global);
    }));
  }
  return {
    get toObject() {
      return toObject;
    },
    get toUint32() {
      return toUint32;
    },
    get isObject() {
      return isObject;
    },
    get isCallable() {
      return isCallable;
    },
    get isNumber() {
      return isNumber;
    },
    get toInteger() {
      return toInteger;
    },
    get toLength() {
      return toLength;
    },
    get checkIterable() {
      return checkIterable;
    },
    get isConstructor() {
      return isConstructor;
    },
    get createIteratorResultObject() {
      return createIteratorResultObject;
    },
    get maybeDefine() {
      return maybeDefine;
    },
    get maybeDefineMethod() {
      return maybeDefineMethod;
    },
    get maybeDefineConst() {
      return maybeDefineConst;
    },
    get maybeAddFunctions() {
      return maybeAddFunctions;
    },
    get maybeAddConsts() {
      return maybeAddConsts;
    },
    get maybeAddIterator() {
      return maybeAddIterator;
    },
    get registerPolyfill() {
      return registerPolyfill;
    },
    get polyfillAll() {
      return polyfillAll;
    }
  };
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/Map.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/Map.js";
  var $__0 = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js"),
      isObject = $__0.isObject,
      maybeAddIterator = $__0.maybeAddIterator,
      registerPolyfill = $__0.registerPolyfill;
  var getOwnHashObject = $traceurRuntime.getOwnHashObject;
  var $hasOwnProperty = Object.prototype.hasOwnProperty;
  var deletedSentinel = {};
  function lookupIndex(map, key) {
    if (isObject(key)) {
      var hashObject = getOwnHashObject(key);
      return hashObject && map.objectIndex_[hashObject.hash];
    }
    if (typeof key === 'string')
      return map.stringIndex_[key];
    return map.primitiveIndex_[key];
  }
  function initMap(map) {
    map.entries_ = [];
    map.objectIndex_ = Object.create(null);
    map.stringIndex_ = Object.create(null);
    map.primitiveIndex_ = Object.create(null);
    map.deletedCount_ = 0;
  }
  var Map = (function() {
    function Map() {
      var $__10,
          $__11;
      var iterable = arguments[0];
      if (!isObject(this))
        throw new TypeError('Map called on incompatible type');
      if ($hasOwnProperty.call(this, 'entries_')) {
        throw new TypeError('Map can not be reentrantly initialised');
      }
      initMap(this);
      if (iterable !== null && iterable !== undefined) {
        var $__5 = true;
        var $__6 = false;
        var $__7 = undefined;
        try {
          for (var $__3 = void 0,
              $__2 = (iterable)[$traceurRuntime.toProperty(Symbol.iterator)](); !($__5 = ($__3 = $__2.next()).done); $__5 = true) {
            var $__9 = $__3.value,
                key = ($__10 = $__9[$traceurRuntime.toProperty(Symbol.iterator)](), ($__11 = $__10.next()).done ? void 0 : $__11.value),
                value = ($__11 = $__10.next()).done ? void 0 : $__11.value;
            {
              this.set(key, value);
            }
          }
        } catch ($__8) {
          $__6 = true;
          $__7 = $__8;
        } finally {
          try {
            if (!$__5 && $__2.return != null) {
              $__2.return();
            }
          } finally {
            if ($__6) {
              throw $__7;
            }
          }
        }
      }
    }
    return ($traceurRuntime.createClass)(Map, {
      get size() {
        return this.entries_.length / 2 - this.deletedCount_;
      },
      get: function(key) {
        var index = lookupIndex(this, key);
        if (index !== undefined)
          return this.entries_[index + 1];
      },
      set: function(key, value) {
        var objectMode = isObject(key);
        var stringMode = typeof key === 'string';
        var index = lookupIndex(this, key);
        if (index !== undefined) {
          this.entries_[index + 1] = value;
        } else {
          index = this.entries_.length;
          this.entries_[index] = key;
          this.entries_[index + 1] = value;
          if (objectMode) {
            var hashObject = getOwnHashObject(key);
            var hash = hashObject.hash;
            this.objectIndex_[hash] = index;
          } else if (stringMode) {
            this.stringIndex_[key] = index;
          } else {
            this.primitiveIndex_[key] = index;
          }
        }
        return this;
      },
      has: function(key) {
        return lookupIndex(this, key) !== undefined;
      },
      delete: function(key) {
        var objectMode = isObject(key);
        var stringMode = typeof key === 'string';
        var index;
        var hash;
        if (objectMode) {
          var hashObject = getOwnHashObject(key);
          if (hashObject) {
            index = this.objectIndex_[hash = hashObject.hash];
            delete this.objectIndex_[hash];
          }
        } else if (stringMode) {
          index = this.stringIndex_[key];
          delete this.stringIndex_[key];
        } else {
          index = this.primitiveIndex_[key];
          delete this.primitiveIndex_[key];
        }
        if (index !== undefined) {
          this.entries_[index] = deletedSentinel;
          this.entries_[index + 1] = undefined;
          this.deletedCount_++;
          return true;
        }
        return false;
      },
      clear: function() {
        initMap(this);
      },
      forEach: function(callbackFn) {
        var thisArg = arguments[1];
        for (var i = 0; i < this.entries_.length; i += 2) {
          var key = this.entries_[i];
          var value = this.entries_[i + 1];
          if (key === deletedSentinel)
            continue;
          callbackFn.call(thisArg, value, key, this);
        }
      },
      entries: $traceurRuntime.initGeneratorFunction(function $__12() {
        var i,
            key,
            value;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                i = 0;
                $ctx.state = 12;
                break;
              case 12:
                $ctx.state = (i < this.entries_.length) ? 8 : -2;
                break;
              case 4:
                i += 2;
                $ctx.state = 12;
                break;
              case 8:
                key = this.entries_[i];
                value = this.entries_[i + 1];
                $ctx.state = 9;
                break;
              case 9:
                $ctx.state = (key === deletedSentinel) ? 4 : 6;
                break;
              case 6:
                $ctx.state = 2;
                return [key, value];
              case 2:
                $ctx.maybeThrow();
                $ctx.state = 4;
                break;
              default:
                return $ctx.end();
            }
        }, $__12, this);
      }),
      keys: $traceurRuntime.initGeneratorFunction(function $__13() {
        var i,
            key,
            value;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                i = 0;
                $ctx.state = 12;
                break;
              case 12:
                $ctx.state = (i < this.entries_.length) ? 8 : -2;
                break;
              case 4:
                i += 2;
                $ctx.state = 12;
                break;
              case 8:
                key = this.entries_[i];
                value = this.entries_[i + 1];
                $ctx.state = 9;
                break;
              case 9:
                $ctx.state = (key === deletedSentinel) ? 4 : 6;
                break;
              case 6:
                $ctx.state = 2;
                return key;
              case 2:
                $ctx.maybeThrow();
                $ctx.state = 4;
                break;
              default:
                return $ctx.end();
            }
        }, $__13, this);
      }),
      values: $traceurRuntime.initGeneratorFunction(function $__14() {
        var i,
            key,
            value;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                i = 0;
                $ctx.state = 12;
                break;
              case 12:
                $ctx.state = (i < this.entries_.length) ? 8 : -2;
                break;
              case 4:
                i += 2;
                $ctx.state = 12;
                break;
              case 8:
                key = this.entries_[i];
                value = this.entries_[i + 1];
                $ctx.state = 9;
                break;
              case 9:
                $ctx.state = (key === deletedSentinel) ? 4 : 6;
                break;
              case 6:
                $ctx.state = 2;
                return value;
              case 2:
                $ctx.maybeThrow();
                $ctx.state = 4;
                break;
              default:
                return $ctx.end();
            }
        }, $__14, this);
      })
    }, {});
  }());
  Object.defineProperty(Map.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Map.prototype.entries
  });
  function polyfillMap(global) {
    var $__9 = global,
        Object = $__9.Object,
        Symbol = $__9.Symbol;
    if (!global.Map)
      global.Map = Map;
    var mapPrototype = global.Map.prototype;
    if (mapPrototype.entries === undefined)
      global.Map = Map;
    if (mapPrototype.entries) {
      maybeAddIterator(mapPrototype, mapPrototype.entries, Symbol);
      maybeAddIterator(Object.getPrototypeOf(new global.Map().entries()), function() {
        return this;
      }, Symbol);
    }
  }
  registerPolyfill(polyfillMap);
  return {
    get Map() {
      return Map;
    },
    get polyfillMap() {
      return polyfillMap;
    }
  };
});
System.get("traceur-runtime@0.0.88/src/runtime/polyfills/Map.js" + '');
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/Set.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/Set.js";
  var $__0 = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js"),
      isObject = $__0.isObject,
      maybeAddIterator = $__0.maybeAddIterator,
      registerPolyfill = $__0.registerPolyfill;
  var Map = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/Map.js").Map;
  var getOwnHashObject = $traceurRuntime.getOwnHashObject;
  var $hasOwnProperty = Object.prototype.hasOwnProperty;
  function initSet(set) {
    set.map_ = new Map();
  }
  var Set = (function() {
    function Set() {
      var iterable = arguments[0];
      if (!isObject(this))
        throw new TypeError('Set called on incompatible type');
      if ($hasOwnProperty.call(this, 'map_')) {
        throw new TypeError('Set can not be reentrantly initialised');
      }
      initSet(this);
      if (iterable !== null && iterable !== undefined) {
        var $__7 = true;
        var $__8 = false;
        var $__9 = undefined;
        try {
          for (var $__5 = void 0,
              $__4 = (iterable)[$traceurRuntime.toProperty(Symbol.iterator)](); !($__7 = ($__5 = $__4.next()).done); $__7 = true) {
            var item = $__5.value;
            {
              this.add(item);
            }
          }
        } catch ($__10) {
          $__8 = true;
          $__9 = $__10;
        } finally {
          try {
            if (!$__7 && $__4.return != null) {
              $__4.return();
            }
          } finally {
            if ($__8) {
              throw $__9;
            }
          }
        }
      }
    }
    return ($traceurRuntime.createClass)(Set, {
      get size() {
        return this.map_.size;
      },
      has: function(key) {
        return this.map_.has(key);
      },
      add: function(key) {
        this.map_.set(key, key);
        return this;
      },
      delete: function(key) {
        return this.map_.delete(key);
      },
      clear: function() {
        return this.map_.clear();
      },
      forEach: function(callbackFn) {
        var thisArg = arguments[1];
        var $__2 = this;
        return this.map_.forEach((function(value, key) {
          callbackFn.call(thisArg, key, key, $__2);
        }));
      },
      values: $traceurRuntime.initGeneratorFunction(function $__12() {
        var $__13,
            $__14;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                $__13 = $ctx.wrapYieldStar(this.map_.keys()[Symbol.iterator]());
                $ctx.sent = void 0;
                $ctx.action = 'next';
                $ctx.state = 12;
                break;
              case 12:
                $__14 = $__13[$ctx.action]($ctx.sentIgnoreThrow);
                $ctx.state = 9;
                break;
              case 9:
                $ctx.state = ($__14.done) ? 3 : 2;
                break;
              case 3:
                $ctx.sent = $__14.value;
                $ctx.state = -2;
                break;
              case 2:
                $ctx.state = 12;
                return $__14.value;
              default:
                return $ctx.end();
            }
        }, $__12, this);
      }),
      entries: $traceurRuntime.initGeneratorFunction(function $__15() {
        var $__16,
            $__17;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                $__16 = $ctx.wrapYieldStar(this.map_.entries()[Symbol.iterator]());
                $ctx.sent = void 0;
                $ctx.action = 'next';
                $ctx.state = 12;
                break;
              case 12:
                $__17 = $__16[$ctx.action]($ctx.sentIgnoreThrow);
                $ctx.state = 9;
                break;
              case 9:
                $ctx.state = ($__17.done) ? 3 : 2;
                break;
              case 3:
                $ctx.sent = $__17.value;
                $ctx.state = -2;
                break;
              case 2:
                $ctx.state = 12;
                return $__17.value;
              default:
                return $ctx.end();
            }
        }, $__15, this);
      })
    }, {});
  }());
  Object.defineProperty(Set.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  Object.defineProperty(Set.prototype, 'keys', {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  function polyfillSet(global) {
    var $__11 = global,
        Object = $__11.Object,
        Symbol = $__11.Symbol;
    if (!global.Set)
      global.Set = Set;
    var setPrototype = global.Set.prototype;
    if (setPrototype.values) {
      maybeAddIterator(setPrototype, setPrototype.values, Symbol);
      maybeAddIterator(Object.getPrototypeOf(new global.Set().values()), function() {
        return this;
      }, Symbol);
    }
  }
  registerPolyfill(polyfillSet);
  return {
    get Set() {
      return Set;
    },
    get polyfillSet() {
      return polyfillSet;
    }
  };
});
System.get("traceur-runtime@0.0.88/src/runtime/polyfills/Set.js" + '');
System.registerModule("traceur-runtime@0.0.88/node_modules/rsvp/lib/rsvp/asap.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/node_modules/rsvp/lib/rsvp/asap.js";
  var len = 0;
  function asap(callback, arg) {
    queue[len] = callback;
    queue[len + 1] = arg;
    len += 2;
    if (len === 2) {
      scheduleFlush();
    }
  }
  var $__default = asap;
  var browserGlobal = (typeof window !== 'undefined') ? window : {};
  var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
  var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';
  function useNextTick() {
    return function() {
      process.nextTick(flush);
    };
  }
  function useMutationObserver() {
    var iterations = 0;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode('');
    observer.observe(node, {characterData: true});
    return function() {
      node.data = (iterations = ++iterations % 2);
    };
  }
  function useMessageChannel() {
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    return function() {
      channel.port2.postMessage(0);
    };
  }
  function useSetTimeout() {
    return function() {
      setTimeout(flush, 1);
    };
  }
  var queue = new Array(1000);
  function flush() {
    for (var i = 0; i < len; i += 2) {
      var callback = queue[i];
      var arg = queue[i + 1];
      callback(arg);
      queue[i] = undefined;
      queue[i + 1] = undefined;
    }
    len = 0;
  }
  var scheduleFlush;
  if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
    scheduleFlush = useNextTick();
  } else if (BrowserMutationObserver) {
    scheduleFlush = useMutationObserver();
  } else if (isWorker) {
    scheduleFlush = useMessageChannel();
  } else {
    scheduleFlush = useSetTimeout();
  }
  return {get default() {
      return $__default;
    }};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/Promise.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/Promise.js";
  var async = System.get("traceur-runtime@0.0.88/node_modules/rsvp/lib/rsvp/asap.js").default;
  var registerPolyfill = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js").registerPolyfill;
  var promiseRaw = {};
  function isPromise(x) {
    return x && typeof x === 'object' && x.status_ !== undefined;
  }
  function idResolveHandler(x) {
    return x;
  }
  function idRejectHandler(x) {
    throw x;
  }
  function chain(promise) {
    var onResolve = arguments[1] !== (void 0) ? arguments[1] : idResolveHandler;
    var onReject = arguments[2] !== (void 0) ? arguments[2] : idRejectHandler;
    var deferred = getDeferred(promise.constructor);
    switch (promise.status_) {
      case undefined:
        throw TypeError;
      case 0:
        promise.onResolve_.push(onResolve, deferred);
        promise.onReject_.push(onReject, deferred);
        break;
      case +1:
        promiseEnqueue(promise.value_, [onResolve, deferred]);
        break;
      case -1:
        promiseEnqueue(promise.value_, [onReject, deferred]);
        break;
    }
    return deferred.promise;
  }
  function getDeferred(C) {
    if (this === $Promise) {
      var promise = promiseInit(new $Promise(promiseRaw));
      return {
        promise: promise,
        resolve: (function(x) {
          promiseResolve(promise, x);
        }),
        reject: (function(r) {
          promiseReject(promise, r);
        })
      };
    } else {
      var result = {};
      result.promise = new C((function(resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
      }));
      return result;
    }
  }
  function promiseSet(promise, status, value, onResolve, onReject) {
    promise.status_ = status;
    promise.value_ = value;
    promise.onResolve_ = onResolve;
    promise.onReject_ = onReject;
    return promise;
  }
  function promiseInit(promise) {
    return promiseSet(promise, 0, undefined, [], []);
  }
  var Promise = (function() {
    function Promise(resolver) {
      if (resolver === promiseRaw)
        return ;
      if (typeof resolver !== 'function')
        throw new TypeError;
      var promise = promiseInit(this);
      try {
        resolver((function(x) {
          promiseResolve(promise, x);
        }), (function(r) {
          promiseReject(promise, r);
        }));
      } catch (e) {
        promiseReject(promise, e);
      }
    }
    return ($traceurRuntime.createClass)(Promise, {
      catch: function(onReject) {
        return this.then(undefined, onReject);
      },
      then: function(onResolve, onReject) {
        if (typeof onResolve !== 'function')
          onResolve = idResolveHandler;
        if (typeof onReject !== 'function')
          onReject = idRejectHandler;
        var that = this;
        var constructor = this.constructor;
        return chain(this, function(x) {
          x = promiseCoerce(constructor, x);
          return x === that ? onReject(new TypeError) : isPromise(x) ? x.then(onResolve, onReject) : onResolve(x);
        }, onReject);
      }
    }, {
      resolve: function(x) {
        if (this === $Promise) {
          if (isPromise(x)) {
            return x;
          }
          return promiseSet(new $Promise(promiseRaw), +1, x);
        } else {
          return new this(function(resolve, reject) {
            resolve(x);
          });
        }
      },
      reject: function(r) {
        if (this === $Promise) {
          return promiseSet(new $Promise(promiseRaw), -1, r);
        } else {
          return new this((function(resolve, reject) {
            reject(r);
          }));
        }
      },
      all: function(values) {
        var deferred = getDeferred(this);
        var resolutions = [];
        try {
          var makeCountdownFunction = function(i) {
            return (function(x) {
              resolutions[i] = x;
              if (--count === 0)
                deferred.resolve(resolutions);
            });
          };
          var count = 0;
          var i = 0;
          var $__6 = true;
          var $__7 = false;
          var $__8 = undefined;
          try {
            for (var $__4 = void 0,
                $__3 = (values)[$traceurRuntime.toProperty(Symbol.iterator)](); !($__6 = ($__4 = $__3.next()).done); $__6 = true) {
              var value = $__4.value;
              {
                var countdownFunction = makeCountdownFunction(i);
                this.resolve(value).then(countdownFunction, (function(r) {
                  deferred.reject(r);
                }));
                ++i;
                ++count;
              }
            }
          } catch ($__9) {
            $__7 = true;
            $__8 = $__9;
          } finally {
            try {
              if (!$__6 && $__3.return != null) {
                $__3.return();
              }
            } finally {
              if ($__7) {
                throw $__8;
              }
            }
          }
          if (count === 0) {
            deferred.resolve(resolutions);
          }
        } catch (e) {
          deferred.reject(e);
        }
        return deferred.promise;
      },
      race: function(values) {
        var deferred = getDeferred(this);
        try {
          for (var i = 0; i < values.length; i++) {
            this.resolve(values[i]).then((function(x) {
              deferred.resolve(x);
            }), (function(r) {
              deferred.reject(r);
            }));
          }
        } catch (e) {
          deferred.reject(e);
        }
        return deferred.promise;
      }
    });
  }());
  var $Promise = Promise;
  var $PromiseReject = $Promise.reject;
  function promiseResolve(promise, x) {
    promiseDone(promise, +1, x, promise.onResolve_);
  }
  function promiseReject(promise, r) {
    promiseDone(promise, -1, r, promise.onReject_);
  }
  function promiseDone(promise, status, value, reactions) {
    if (promise.status_ !== 0)
      return ;
    promiseEnqueue(value, reactions);
    promiseSet(promise, status, value);
  }
  function promiseEnqueue(value, tasks) {
    async((function() {
      for (var i = 0; i < tasks.length; i += 2) {
        promiseHandle(value, tasks[i], tasks[i + 1]);
      }
    }));
  }
  function promiseHandle(value, handler, deferred) {
    try {
      var result = handler(value);
      if (result === deferred.promise)
        throw new TypeError;
      else if (isPromise(result))
        chain(result, deferred.resolve, deferred.reject);
      else
        deferred.resolve(result);
    } catch (e) {
      try {
        deferred.reject(e);
      } catch (e) {}
    }
  }
  var thenableSymbol = '@@thenable';
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function promiseCoerce(constructor, x) {
    if (!isPromise(x) && isObject(x)) {
      var then;
      try {
        then = x.then;
      } catch (r) {
        var promise = $PromiseReject.call(constructor, r);
        x[thenableSymbol] = promise;
        return promise;
      }
      if (typeof then === 'function') {
        var p = x[thenableSymbol];
        if (p) {
          return p;
        } else {
          var deferred = getDeferred(constructor);
          x[thenableSymbol] = deferred.promise;
          try {
            then.call(x, deferred.resolve, deferred.reject);
          } catch (r) {
            deferred.reject(r);
          }
          return deferred.promise;
        }
      }
    }
    return x;
  }
  function polyfillPromise(global) {
    if (!global.Promise)
      global.Promise = Promise;
  }
  registerPolyfill(polyfillPromise);
  return {
    get Promise() {
      return Promise;
    },
    get polyfillPromise() {
      return polyfillPromise;
    }
  };
});
System.get("traceur-runtime@0.0.88/src/runtime/polyfills/Promise.js" + '');
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/StringIterator.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/StringIterator.js";
  var $__0 = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js"),
      createIteratorResultObject = $__0.createIteratorResultObject,
      isObject = $__0.isObject;
  var toProperty = $traceurRuntime.toProperty;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var iteratedString = Symbol('iteratedString');
  var stringIteratorNextIndex = Symbol('stringIteratorNextIndex');
  var StringIterator = (function() {
    var $__2;
    function StringIterator() {}
    return ($traceurRuntime.createClass)(StringIterator, ($__2 = {}, Object.defineProperty($__2, "next", {
      value: function() {
        var o = this;
        if (!isObject(o) || !hasOwnProperty.call(o, iteratedString)) {
          throw new TypeError('this must be a StringIterator object');
        }
        var s = o[toProperty(iteratedString)];
        if (s === undefined) {
          return createIteratorResultObject(undefined, true);
        }
        var position = o[toProperty(stringIteratorNextIndex)];
        var len = s.length;
        if (position >= len) {
          o[toProperty(iteratedString)] = undefined;
          return createIteratorResultObject(undefined, true);
        }
        var first = s.charCodeAt(position);
        var resultString;
        if (first < 0xD800 || first > 0xDBFF || position + 1 === len) {
          resultString = String.fromCharCode(first);
        } else {
          var second = s.charCodeAt(position + 1);
          if (second < 0xDC00 || second > 0xDFFF) {
            resultString = String.fromCharCode(first);
          } else {
            resultString = String.fromCharCode(first) + String.fromCharCode(second);
          }
        }
        o[toProperty(stringIteratorNextIndex)] = position + resultString.length;
        return createIteratorResultObject(resultString, false);
      },
      configurable: true,
      enumerable: true,
      writable: true
    }), Object.defineProperty($__2, Symbol.iterator, {
      value: function() {
        return this;
      },
      configurable: true,
      enumerable: true,
      writable: true
    }), $__2), {});
  }());
  function createStringIterator(string) {
    var s = String(string);
    var iterator = Object.create(StringIterator.prototype);
    iterator[toProperty(iteratedString)] = s;
    iterator[toProperty(stringIteratorNextIndex)] = 0;
    return iterator;
  }
  return {get createStringIterator() {
      return createStringIterator;
    }};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/String.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/String.js";
  var createStringIterator = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/StringIterator.js").createStringIterator;
  var $__1 = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__1.maybeAddFunctions,
      maybeAddIterator = $__1.maybeAddIterator,
      registerPolyfill = $__1.registerPolyfill;
  var $toString = Object.prototype.toString;
  var $indexOf = String.prototype.indexOf;
  var $lastIndexOf = String.prototype.lastIndexOf;
  function startsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) == start;
  }
  function endsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var pos = stringLength;
    if (arguments.length > 1) {
      var position = arguments[1];
      if (position !== undefined) {
        pos = position ? Number(position) : 0;
        if (isNaN(pos)) {
          pos = 0;
        }
      }
    }
    var end = Math.min(Math.max(pos, 0), stringLength);
    var start = end - searchLength;
    if (start < 0) {
      return false;
    }
    return $lastIndexOf.call(string, searchString, start) == start;
  }
  function includes(search) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    if (search && $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (pos != pos) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    if (searchLength + start > stringLength) {
      return false;
    }
    return $indexOf.call(string, searchString, pos) != -1;
  }
  function repeat(count) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var n = count ? Number(count) : 0;
    if (isNaN(n)) {
      n = 0;
    }
    if (n < 0 || n == Infinity) {
      throw RangeError();
    }
    if (n == 0) {
      return '';
    }
    var result = '';
    while (n--) {
      result += string;
    }
    return result;
  }
  function codePointAt(position) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var size = string.length;
    var index = position ? Number(position) : 0;
    if (isNaN(index)) {
      index = 0;
    }
    if (index < 0 || index >= size) {
      return undefined;
    }
    var first = string.charCodeAt(index);
    var second;
    if (first >= 0xD800 && first <= 0xDBFF && size > index + 1) {
      second = string.charCodeAt(index + 1);
      if (second >= 0xDC00 && second <= 0xDFFF) {
        return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
      }
    }
    return first;
  }
  function raw(callsite) {
    var raw = callsite.raw;
    var len = raw.length >>> 0;
    if (len === 0)
      return '';
    var s = '';
    var i = 0;
    while (true) {
      s += raw[i];
      if (i + 1 === len)
        return s;
      s += arguments[++i];
    }
  }
  function fromCodePoint(_) {
    var codeUnits = [];
    var floor = Math.floor;
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
      return '';
    }
    while (++index < length) {
      var codePoint = Number(arguments[index]);
      if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || floor(codePoint) != codePoint) {
        throw RangeError('Invalid code point: ' + codePoint);
      }
      if (codePoint <= 0xFFFF) {
        codeUnits.push(codePoint);
      } else {
        codePoint -= 0x10000;
        highSurrogate = (codePoint >> 10) + 0xD800;
        lowSurrogate = (codePoint % 0x400) + 0xDC00;
        codeUnits.push(highSurrogate, lowSurrogate);
      }
    }
    return String.fromCharCode.apply(null, codeUnits);
  }
  function stringPrototypeIterator() {
    var o = $traceurRuntime.checkObjectCoercible(this);
    var s = String(o);
    return createStringIterator(s);
  }
  function polyfillString(global) {
    var String = global.String;
    maybeAddFunctions(String.prototype, ['codePointAt', codePointAt, 'endsWith', endsWith, 'includes', includes, 'repeat', repeat, 'startsWith', startsWith]);
    maybeAddFunctions(String, ['fromCodePoint', fromCodePoint, 'raw', raw]);
    maybeAddIterator(String.prototype, stringPrototypeIterator, Symbol);
  }
  registerPolyfill(polyfillString);
  return {
    get startsWith() {
      return startsWith;
    },
    get endsWith() {
      return endsWith;
    },
    get includes() {
      return includes;
    },
    get repeat() {
      return repeat;
    },
    get codePointAt() {
      return codePointAt;
    },
    get raw() {
      return raw;
    },
    get fromCodePoint() {
      return fromCodePoint;
    },
    get stringPrototypeIterator() {
      return stringPrototypeIterator;
    },
    get polyfillString() {
      return polyfillString;
    }
  };
});
System.get("traceur-runtime@0.0.88/src/runtime/polyfills/String.js" + '');
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/ArrayIterator.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/ArrayIterator.js";
  var $__0 = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js"),
      toObject = $__0.toObject,
      toUint32 = $__0.toUint32,
      createIteratorResultObject = $__0.createIteratorResultObject;
  var ARRAY_ITERATOR_KIND_KEYS = 1;
  var ARRAY_ITERATOR_KIND_VALUES = 2;
  var ARRAY_ITERATOR_KIND_ENTRIES = 3;
  var ArrayIterator = (function() {
    var $__2;
    function ArrayIterator() {}
    return ($traceurRuntime.createClass)(ArrayIterator, ($__2 = {}, Object.defineProperty($__2, "next", {
      value: function() {
        var iterator = toObject(this);
        var array = iterator.iteratorObject_;
        if (!array) {
          throw new TypeError('Object is not an ArrayIterator');
        }
        var index = iterator.arrayIteratorNextIndex_;
        var itemKind = iterator.arrayIterationKind_;
        var length = toUint32(array.length);
        if (index >= length) {
          iterator.arrayIteratorNextIndex_ = Infinity;
          return createIteratorResultObject(undefined, true);
        }
        iterator.arrayIteratorNextIndex_ = index + 1;
        if (itemKind == ARRAY_ITERATOR_KIND_VALUES)
          return createIteratorResultObject(array[index], false);
        if (itemKind == ARRAY_ITERATOR_KIND_ENTRIES)
          return createIteratorResultObject([index, array[index]], false);
        return createIteratorResultObject(index, false);
      },
      configurable: true,
      enumerable: true,
      writable: true
    }), Object.defineProperty($__2, Symbol.iterator, {
      value: function() {
        return this;
      },
      configurable: true,
      enumerable: true,
      writable: true
    }), $__2), {});
  }());
  function createArrayIterator(array, kind) {
    var object = toObject(array);
    var iterator = new ArrayIterator;
    iterator.iteratorObject_ = object;
    iterator.arrayIteratorNextIndex_ = 0;
    iterator.arrayIterationKind_ = kind;
    return iterator;
  }
  function entries() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_ENTRIES);
  }
  function keys() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_KEYS);
  }
  function values() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_VALUES);
  }
  return {
    get entries() {
      return entries;
    },
    get keys() {
      return keys;
    },
    get values() {
      return values;
    }
  };
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/Array.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/Array.js";
  var $__0 = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/ArrayIterator.js"),
      entries = $__0.entries,
      keys = $__0.keys,
      jsValues = $__0.values;
  var $__1 = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js"),
      checkIterable = $__1.checkIterable,
      isCallable = $__1.isCallable,
      isConstructor = $__1.isConstructor,
      maybeAddFunctions = $__1.maybeAddFunctions,
      maybeAddIterator = $__1.maybeAddIterator,
      registerPolyfill = $__1.registerPolyfill,
      toInteger = $__1.toInteger,
      toLength = $__1.toLength,
      toObject = $__1.toObject;
  function from(arrLike) {
    var mapFn = arguments[1];
    var thisArg = arguments[2];
    var C = this;
    var items = toObject(arrLike);
    var mapping = mapFn !== undefined;
    var k = 0;
    var arr,
        len;
    if (mapping && !isCallable(mapFn)) {
      throw TypeError();
    }
    if (checkIterable(items)) {
      arr = isConstructor(C) ? new C() : [];
      var $__5 = true;
      var $__6 = false;
      var $__7 = undefined;
      try {
        for (var $__3 = void 0,
            $__2 = (items)[$traceurRuntime.toProperty(Symbol.iterator)](); !($__5 = ($__3 = $__2.next()).done); $__5 = true) {
          var item = $__3.value;
          {
            if (mapping) {
              arr[k] = mapFn.call(thisArg, item, k);
            } else {
              arr[k] = item;
            }
            k++;
          }
        }
      } catch ($__8) {
        $__6 = true;
        $__7 = $__8;
      } finally {
        try {
          if (!$__5 && $__2.return != null) {
            $__2.return();
          }
        } finally {
          if ($__6) {
            throw $__7;
          }
        }
      }
      arr.length = k;
      return arr;
    }
    len = toLength(items.length);
    arr = isConstructor(C) ? new C(len) : new Array(len);
    for (; k < len; k++) {
      if (mapping) {
        arr[k] = typeof thisArg === 'undefined' ? mapFn(items[k], k) : mapFn.call(thisArg, items[k], k);
      } else {
        arr[k] = items[k];
      }
    }
    arr.length = len;
    return arr;
  }
  function of() {
    for (var items = [],
        $__9 = 0; $__9 < arguments.length; $__9++)
      items[$__9] = arguments[$__9];
    var C = this;
    var len = items.length;
    var arr = isConstructor(C) ? new C(len) : new Array(len);
    for (var k = 0; k < len; k++) {
      arr[k] = items[k];
    }
    arr.length = len;
    return arr;
  }
  function fill(value) {
    var start = arguments[1] !== (void 0) ? arguments[1] : 0;
    var end = arguments[2];
    var object = toObject(this);
    var len = toLength(object.length);
    var fillStart = toInteger(start);
    var fillEnd = end !== undefined ? toInteger(end) : len;
    fillStart = fillStart < 0 ? Math.max(len + fillStart, 0) : Math.min(fillStart, len);
    fillEnd = fillEnd < 0 ? Math.max(len + fillEnd, 0) : Math.min(fillEnd, len);
    while (fillStart < fillEnd) {
      object[fillStart] = value;
      fillStart++;
    }
    return object;
  }
  function find(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg);
  }
  function findIndex(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg, true);
  }
  function findHelper(self, predicate) {
    var thisArg = arguments[2];
    var returnIndex = arguments[3] !== (void 0) ? arguments[3] : false;
    var object = toObject(self);
    var len = toLength(object.length);
    if (!isCallable(predicate)) {
      throw TypeError();
    }
    for (var i = 0; i < len; i++) {
      var value = object[i];
      if (predicate.call(thisArg, value, i, object)) {
        return returnIndex ? i : value;
      }
    }
    return returnIndex ? -1 : undefined;
  }
  function polyfillArray(global) {
    var $__10 = global,
        Array = $__10.Array,
        Object = $__10.Object,
        Symbol = $__10.Symbol;
    var values = jsValues;
    if (Symbol && Symbol.iterator && Array.prototype[Symbol.iterator]) {
      values = Array.prototype[Symbol.iterator];
    }
    maybeAddFunctions(Array.prototype, ['entries', entries, 'keys', keys, 'values', values, 'fill', fill, 'find', find, 'findIndex', findIndex]);
    maybeAddFunctions(Array, ['from', from, 'of', of]);
    maybeAddIterator(Array.prototype, values, Symbol);
    maybeAddIterator(Object.getPrototypeOf([].values()), function() {
      return this;
    }, Symbol);
  }
  registerPolyfill(polyfillArray);
  return {
    get from() {
      return from;
    },
    get of() {
      return of;
    },
    get fill() {
      return fill;
    },
    get find() {
      return find;
    },
    get findIndex() {
      return findIndex;
    },
    get polyfillArray() {
      return polyfillArray;
    }
  };
});
System.get("traceur-runtime@0.0.88/src/runtime/polyfills/Array.js" + '');
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/Object.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/Object.js";
  var $__0 = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__0.maybeAddFunctions,
      registerPolyfill = $__0.registerPolyfill;
  var $__1 = $traceurRuntime,
      defineProperty = $__1.defineProperty,
      getOwnPropertyDescriptor = $__1.getOwnPropertyDescriptor,
      getOwnPropertyNames = $__1.getOwnPropertyNames,
      isPrivateName = $__1.isPrivateName,
      keys = $__1.keys;
  function is(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    return left !== left && right !== right;
  }
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      var props = source == null ? [] : keys(source);
      var p = void 0,
          length = props.length;
      for (p = 0; p < length; p++) {
        var name = props[p];
        if (isPrivateName(name))
          continue;
        target[name] = source[name];
      }
    }
    return target;
  }
  function mixin(target, source) {
    var props = getOwnPropertyNames(source);
    var p,
        descriptor,
        length = props.length;
    for (p = 0; p < length; p++) {
      var name = props[p];
      if (isPrivateName(name))
        continue;
      descriptor = getOwnPropertyDescriptor(source, props[p]);
      defineProperty(target, props[p], descriptor);
    }
    return target;
  }
  function polyfillObject(global) {
    var Object = global.Object;
    maybeAddFunctions(Object, ['assign', assign, 'is', is, 'mixin', mixin]);
  }
  registerPolyfill(polyfillObject);
  return {
    get is() {
      return is;
    },
    get assign() {
      return assign;
    },
    get mixin() {
      return mixin;
    },
    get polyfillObject() {
      return polyfillObject;
    }
  };
});
System.get("traceur-runtime@0.0.88/src/runtime/polyfills/Object.js" + '');
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/Number.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/Number.js";
  var $__0 = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js"),
      isNumber = $__0.isNumber,
      maybeAddConsts = $__0.maybeAddConsts,
      maybeAddFunctions = $__0.maybeAddFunctions,
      registerPolyfill = $__0.registerPolyfill,
      toInteger = $__0.toInteger;
  var $abs = Math.abs;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
  var MIN_SAFE_INTEGER = -Math.pow(2, 53) + 1;
  var EPSILON = Math.pow(2, -52);
  function NumberIsFinite(number) {
    return isNumber(number) && $isFinite(number);
  }
  function isInteger(number) {
    return NumberIsFinite(number) && toInteger(number) === number;
  }
  function NumberIsNaN(number) {
    return isNumber(number) && $isNaN(number);
  }
  function isSafeInteger(number) {
    if (NumberIsFinite(number)) {
      var integral = toInteger(number);
      if (integral === number)
        return $abs(integral) <= MAX_SAFE_INTEGER;
    }
    return false;
  }
  function polyfillNumber(global) {
    var Number = global.Number;
    maybeAddConsts(Number, ['MAX_SAFE_INTEGER', MAX_SAFE_INTEGER, 'MIN_SAFE_INTEGER', MIN_SAFE_INTEGER, 'EPSILON', EPSILON]);
    maybeAddFunctions(Number, ['isFinite', NumberIsFinite, 'isInteger', isInteger, 'isNaN', NumberIsNaN, 'isSafeInteger', isSafeInteger]);
  }
  registerPolyfill(polyfillNumber);
  return {
    get MAX_SAFE_INTEGER() {
      return MAX_SAFE_INTEGER;
    },
    get MIN_SAFE_INTEGER() {
      return MIN_SAFE_INTEGER;
    },
    get EPSILON() {
      return EPSILON;
    },
    get isFinite() {
      return NumberIsFinite;
    },
    get isInteger() {
      return isInteger;
    },
    get isNaN() {
      return NumberIsNaN;
    },
    get isSafeInteger() {
      return isSafeInteger;
    },
    get polyfillNumber() {
      return polyfillNumber;
    }
  };
});
System.get("traceur-runtime@0.0.88/src/runtime/polyfills/Number.js" + '');
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/fround.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/fround.js";
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $__0 = Math,
      LN2 = $__0.LN2,
      abs = $__0.abs,
      floor = $__0.floor,
      log = $__0.log,
      min = $__0.min,
      pow = $__0.pow;
  function packIEEE754(v, ebits, fbits) {
    var bias = (1 << (ebits - 1)) - 1,
        s,
        e,
        f,
        ln,
        i,
        bits,
        str,
        bytes;
    function roundToEven(n) {
      var w = floor(n),
          f = n - w;
      if (f < 0.5)
        return w;
      if (f > 0.5)
        return w + 1;
      return w % 2 ? w + 1 : w;
    }
    if (v !== v) {
      e = (1 << ebits) - 1;
      f = pow(2, fbits - 1);
      s = 0;
    } else if (v === Infinity || v === -Infinity) {
      e = (1 << ebits) - 1;
      f = 0;
      s = (v < 0) ? 1 : 0;
    } else if (v === 0) {
      e = 0;
      f = 0;
      s = (1 / v === -Infinity) ? 1 : 0;
    } else {
      s = v < 0;
      v = abs(v);
      if (v >= pow(2, 1 - bias)) {
        e = min(floor(log(v) / LN2), 1023);
        f = roundToEven(v / pow(2, e) * pow(2, fbits));
        if (f / pow(2, fbits) >= 2) {
          e = e + 1;
          f = 1;
        }
        if (e > bias) {
          e = (1 << ebits) - 1;
          f = 0;
        } else {
          e = e + bias;
          f = f - pow(2, fbits);
        }
      } else {
        e = 0;
        f = roundToEven(v / pow(2, 1 - bias - fbits));
      }
    }
    bits = [];
    for (i = fbits; i; i -= 1) {
      bits.push(f % 2 ? 1 : 0);
      f = floor(f / 2);
    }
    for (i = ebits; i; i -= 1) {
      bits.push(e % 2 ? 1 : 0);
      e = floor(e / 2);
    }
    bits.push(s ? 1 : 0);
    bits.reverse();
    str = bits.join('');
    bytes = [];
    while (str.length) {
      bytes.push(parseInt(str.substring(0, 8), 2));
      str = str.substring(8);
    }
    return bytes;
  }
  function unpackIEEE754(bytes, ebits, fbits) {
    var bits = [],
        i,
        j,
        b,
        str,
        bias,
        s,
        e,
        f;
    for (i = bytes.length; i; i -= 1) {
      b = bytes[i - 1];
      for (j = 8; j; j -= 1) {
        bits.push(b % 2 ? 1 : 0);
        b = b >> 1;
      }
    }
    bits.reverse();
    str = bits.join('');
    bias = (1 << (ebits - 1)) - 1;
    s = parseInt(str.substring(0, 1), 2) ? -1 : 1;
    e = parseInt(str.substring(1, 1 + ebits), 2);
    f = parseInt(str.substring(1 + ebits), 2);
    if (e === (1 << ebits) - 1) {
      return f !== 0 ? NaN : s * Infinity;
    } else if (e > 0) {
      return s * pow(2, e - bias) * (1 + f / pow(2, fbits));
    } else if (f !== 0) {
      return s * pow(2, -(bias - 1)) * (f / pow(2, fbits));
    } else {
      return s < 0 ? -0 : 0;
    }
  }
  function unpackF32(b) {
    return unpackIEEE754(b, 8, 23);
  }
  function packF32(v) {
    return packIEEE754(v, 8, 23);
  }
  function fround(x) {
    if (x === 0 || !$isFinite(x) || $isNaN(x)) {
      return x;
    }
    return unpackF32(packF32(Number(x)));
  }
  return {get fround() {
      return fround;
    }};
});
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/Math.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/Math.js";
  var jsFround = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/fround.js").fround;
  var $__1 = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__1.maybeAddFunctions,
      registerPolyfill = $__1.registerPolyfill,
      toUint32 = $__1.toUint32;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $__2 = Math,
      abs = $__2.abs,
      ceil = $__2.ceil,
      exp = $__2.exp,
      floor = $__2.floor,
      log = $__2.log,
      pow = $__2.pow,
      sqrt = $__2.sqrt;
  function clz32(x) {
    x = toUint32(+x);
    if (x == 0)
      return 32;
    var result = 0;
    if ((x & 0xFFFF0000) === 0) {
      x <<= 16;
      result += 16;
    }
    ;
    if ((x & 0xFF000000) === 0) {
      x <<= 8;
      result += 8;
    }
    ;
    if ((x & 0xF0000000) === 0) {
      x <<= 4;
      result += 4;
    }
    ;
    if ((x & 0xC0000000) === 0) {
      x <<= 2;
      result += 2;
    }
    ;
    if ((x & 0x80000000) === 0) {
      x <<= 1;
      result += 1;
    }
    ;
    return result;
  }
  function imul(x, y) {
    x = toUint32(+x);
    y = toUint32(+y);
    var xh = (x >>> 16) & 0xffff;
    var xl = x & 0xffff;
    var yh = (y >>> 16) & 0xffff;
    var yl = y & 0xffff;
    return xl * yl + (((xh * yl + xl * yh) << 16) >>> 0) | 0;
  }
  function sign(x) {
    x = +x;
    if (x > 0)
      return 1;
    if (x < 0)
      return -1;
    return x;
  }
  function log10(x) {
    return log(x) * 0.434294481903251828;
  }
  function log2(x) {
    return log(x) * 1.442695040888963407;
  }
  function log1p(x) {
    x = +x;
    if (x < -1 || $isNaN(x)) {
      return NaN;
    }
    if (x === 0 || x === Infinity) {
      return x;
    }
    if (x === -1) {
      return -Infinity;
    }
    var result = 0;
    var n = 50;
    if (x < 0 || x > 1) {
      return log(1 + x);
    }
    for (var i = 1; i < n; i++) {
      if ((i % 2) === 0) {
        result -= pow(x, i) / i;
      } else {
        result += pow(x, i) / i;
      }
    }
    return result;
  }
  function expm1(x) {
    x = +x;
    if (x === -Infinity) {
      return -1;
    }
    if (!$isFinite(x) || x === 0) {
      return x;
    }
    return exp(x) - 1;
  }
  function cosh(x) {
    x = +x;
    if (x === 0) {
      return 1;
    }
    if ($isNaN(x)) {
      return NaN;
    }
    if (!$isFinite(x)) {
      return Infinity;
    }
    if (x < 0) {
      x = -x;
    }
    if (x > 21) {
      return exp(x) / 2;
    }
    return (exp(x) + exp(-x)) / 2;
  }
  function sinh(x) {
    x = +x;
    if (!$isFinite(x) || x === 0) {
      return x;
    }
    return (exp(x) - exp(-x)) / 2;
  }
  function tanh(x) {
    x = +x;
    if (x === 0)
      return x;
    if (!$isFinite(x))
      return sign(x);
    var exp1 = exp(x);
    var exp2 = exp(-x);
    return (exp1 - exp2) / (exp1 + exp2);
  }
  function acosh(x) {
    x = +x;
    if (x < 1)
      return NaN;
    if (!$isFinite(x))
      return x;
    return log(x + sqrt(x + 1) * sqrt(x - 1));
  }
  function asinh(x) {
    x = +x;
    if (x === 0 || !$isFinite(x))
      return x;
    if (x > 0)
      return log(x + sqrt(x * x + 1));
    return -log(-x + sqrt(x * x + 1));
  }
  function atanh(x) {
    x = +x;
    if (x === -1) {
      return -Infinity;
    }
    if (x === 1) {
      return Infinity;
    }
    if (x === 0) {
      return x;
    }
    if ($isNaN(x) || x < -1 || x > 1) {
      return NaN;
    }
    return 0.5 * log((1 + x) / (1 - x));
  }
  function hypot(x, y) {
    var length = arguments.length;
    var args = new Array(length);
    var max = 0;
    for (var i = 0; i < length; i++) {
      var n = arguments[i];
      n = +n;
      if (n === Infinity || n === -Infinity)
        return Infinity;
      n = abs(n);
      if (n > max)
        max = n;
      args[i] = n;
    }
    if (max === 0)
      max = 1;
    var sum = 0;
    var compensation = 0;
    for (var i = 0; i < length; i++) {
      var n = args[i] / max;
      var summand = n * n - compensation;
      var preliminary = sum + summand;
      compensation = (preliminary - sum) - summand;
      sum = preliminary;
    }
    return sqrt(sum) * max;
  }
  function trunc(x) {
    x = +x;
    if (x > 0)
      return floor(x);
    if (x < 0)
      return ceil(x);
    return x;
  }
  var fround,
      f32;
  if (typeof Float32Array === 'function') {
    f32 = new Float32Array(1);
    fround = function(x) {
      f32[0] = Number(x);
      return f32[0];
    };
  } else {
    fround = jsFround;
  }
  function cbrt(x) {
    x = +x;
    if (x === 0)
      return x;
    var negate = x < 0;
    if (negate)
      x = -x;
    var result = pow(x, 1 / 3);
    return negate ? -result : result;
  }
  function polyfillMath(global) {
    var Math = global.Math;
    maybeAddFunctions(Math, ['acosh', acosh, 'asinh', asinh, 'atanh', atanh, 'cbrt', cbrt, 'clz32', clz32, 'cosh', cosh, 'expm1', expm1, 'fround', fround, 'hypot', hypot, 'imul', imul, 'log10', log10, 'log1p', log1p, 'log2', log2, 'sign', sign, 'sinh', sinh, 'tanh', tanh, 'trunc', trunc]);
  }
  registerPolyfill(polyfillMath);
  return {
    get clz32() {
      return clz32;
    },
    get imul() {
      return imul;
    },
    get sign() {
      return sign;
    },
    get log10() {
      return log10;
    },
    get log2() {
      return log2;
    },
    get log1p() {
      return log1p;
    },
    get expm1() {
      return expm1;
    },
    get cosh() {
      return cosh;
    },
    get sinh() {
      return sinh;
    },
    get tanh() {
      return tanh;
    },
    get acosh() {
      return acosh;
    },
    get asinh() {
      return asinh;
    },
    get atanh() {
      return atanh;
    },
    get hypot() {
      return hypot;
    },
    get trunc() {
      return trunc;
    },
    get fround() {
      return fround;
    },
    get cbrt() {
      return cbrt;
    },
    get polyfillMath() {
      return polyfillMath;
    }
  };
});
System.get("traceur-runtime@0.0.88/src/runtime/polyfills/Math.js" + '');
System.registerModule("traceur-runtime@0.0.88/src/runtime/polyfills/polyfills.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.88/src/runtime/polyfills/polyfills.js";
  var polyfillAll = System.get("traceur-runtime@0.0.88/src/runtime/polyfills/utils.js").polyfillAll;
  polyfillAll(Reflect.global);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
    polyfillAll(global);
  };
  return {};
});
System.get("traceur-runtime@0.0.88/src/runtime/polyfills/polyfills.js" + '');

(function(global) {

  var defined = {};

  // indexOf polyfill for IE8
  var indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++)
      if (this[i] === item)
        return i;
    return -1;
  }

  function dedupe(deps) {
    var newDeps = [];
    for (var i = 0, l = deps.length; i < l; i++)
      if (indexOf.call(newDeps, deps[i]) == -1)
        newDeps.push(deps[i])
    return newDeps;
  }

  function register(name, deps, declare, execute) {
    if (typeof name != 'string')
      throw "System.register provided no module name";

    var entry;

    // dynamic
    if (typeof declare == 'boolean') {
      entry = {
        declarative: false,
        deps: deps,
        execute: execute,
        executingRequire: declare
      };
    }
    else {
      // ES6 declarative
      entry = {
        declarative: true,
        deps: deps,
        declare: declare
      };
    }

    entry.name = name;

    // we never overwrite an existing define
    if (!(name in defined))
      defined[name] = entry; 

    entry.deps = dedupe(entry.deps);

    // we have to normalize dependencies
    // (assume dependencies are normalized for now)
    // entry.normalizedDeps = entry.deps.map(normalize);
    entry.normalizedDeps = entry.deps;
  }

  function buildGroups(entry, groups) {
    groups[entry.groupIndex] = groups[entry.groupIndex] || [];

    if (indexOf.call(groups[entry.groupIndex], entry) != -1)
      return;

    groups[entry.groupIndex].push(entry);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];

      // not in the registry means already linked / ES6
      if (!depEntry || depEntry.evaluated)
        continue;

      // now we know the entry is in our unlinked linkage group
      var depGroupIndex = entry.groupIndex + (depEntry.declarative != entry.declarative);

      // the group index of an entry is always the maximum
      if (depEntry.groupIndex === undefined || depEntry.groupIndex < depGroupIndex) {

        // if already in a group, remove from the old group
        if (depEntry.groupIndex !== undefined) {
          groups[depEntry.groupIndex].splice(indexOf.call(groups[depEntry.groupIndex], depEntry), 1);

          // if the old group is empty, then we have a mixed depndency cycle
          if (groups[depEntry.groupIndex].length == 0)
            throw new TypeError("Mixed dependency cycle detected");
        }

        depEntry.groupIndex = depGroupIndex;
      }

      buildGroups(depEntry, groups);
    }
  }

  function link(name) {
    var startEntry = defined[name];

    startEntry.groupIndex = 0;

    var groups = [];

    buildGroups(startEntry, groups);

    var curGroupDeclarative = !!startEntry.declarative == groups.length % 2;
    for (var i = groups.length - 1; i >= 0; i--) {
      var group = groups[i];
      for (var j = 0; j < group.length; j++) {
        var entry = group[j];

        // link each group
        if (curGroupDeclarative)
          linkDeclarativeModule(entry);
        else
          linkDynamicModule(entry);
      }
      curGroupDeclarative = !curGroupDeclarative; 
    }
  }

  // module binding records
  var moduleRecords = {};
  function getOrCreateModuleRecord(name) {
    return moduleRecords[name] || (moduleRecords[name] = {
      name: name,
      dependencies: [],
      exports: {}, // start from an empty module and extend
      importers: []
    })
  }

  function linkDeclarativeModule(entry) {
    // only link if already not already started linking (stops at circular)
    if (entry.module)
      return;

    var module = entry.module = getOrCreateModuleRecord(entry.name);
    var exports = entry.module.exports;

    var declaration = entry.declare.call(global, function(name, value) {
      module.locked = true;
      exports[name] = value;

      for (var i = 0, l = module.importers.length; i < l; i++) {
        var importerModule = module.importers[i];
        if (!importerModule.locked) {
          var importerIndex = indexOf.call(importerModule.dependencies, module);
          importerModule.setters[importerIndex](exports);
        }
      }

      module.locked = false;
      return value;
    });

    module.setters = declaration.setters;
    module.execute = declaration.execute;

    if (!module.setters || !module.execute)
      throw new TypeError("Invalid System.register form for " + entry.name);

    // now link all the module dependencies
    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      var depEntry = defined[depName];
      var depModule = moduleRecords[depName];

      // work out how to set depExports based on scenarios...
      var depExports;

      if (depModule) {
        depExports = depModule.exports;
      }
      else if (depEntry && !depEntry.declarative) {
        if (depEntry.module.exports && depEntry.module.exports.__esModule)
          depExports = depEntry.module.exports;
        else
          depExports = { 'default': depEntry.module.exports, __useDefault: true };
      }
      // in the module registry
      else if (!depEntry) {
        depExports = load(depName);
      }
      // we have an entry -> link
      else {
        linkDeclarativeModule(depEntry);
        depModule = depEntry.module;
        depExports = depModule.exports;
      }

      // only declarative modules have dynamic bindings
      if (depModule && depModule.importers) {
        depModule.importers.push(module);
        module.dependencies.push(depModule);
      }
      else
        module.dependencies.push(null);

      // run the setter for this dependency
      if (module.setters[i])
        module.setters[i](depExports);
    }
  }

  // An analog to loader.get covering execution of all three layers (real declarative, simulated declarative, simulated dynamic)
  function getModule(name) {
    var exports;
    var entry = defined[name];

    if (!entry) {
      exports = load(name);
      if (!exports)
        throw new Error("Unable to load dependency " + name + ".");
    }

    else {
      if (entry.declarative)
        ensureEvaluated(name, []);

      else if (!entry.evaluated)
        linkDynamicModule(entry);

      exports = entry.module.exports;
    }

    if ((!entry || entry.declarative) && exports && exports.__useDefault)
      return exports['default'];

    return exports;
  }

  function linkDynamicModule(entry) {
    if (entry.module)
      return;

    var exports = {};

    var module = entry.module = { exports: exports, id: entry.name };

    // AMD requires execute the tree first
    if (!entry.executingRequire) {
      for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
        var depName = entry.normalizedDeps[i];
        var depEntry = defined[depName];
        if (depEntry)
          linkDynamicModule(depEntry);
      }
    }

    // now execute
    entry.evaluated = true;
    var output = entry.execute.call(global, function(name) {
      for (var i = 0, l = entry.deps.length; i < l; i++) {
        if (entry.deps[i] != name)
          continue;
        return getModule(entry.normalizedDeps[i]);
      }
      throw new TypeError('Module ' + name + ' not declared as a dependency.');
    }, exports, module);

    if (output)
      module.exports = output;
  }

  /*
   * Given a module, and the list of modules for this current branch,
   *  ensure that each of the dependencies of this module is evaluated
   *  (unless one is a circular dependency already in the list of seen
   *  modules, in which case we execute it)
   *
   * Then we evaluate the module itself depth-first left to right 
   * execution to match ES6 modules
   */
  function ensureEvaluated(moduleName, seen) {
    var entry = defined[moduleName];

    // if already seen, that means it's an already-evaluated non circular dependency
    if (!entry || entry.evaluated || !entry.declarative)
      return;

    // this only applies to declarative modules which late-execute

    seen.push(moduleName);

    for (var i = 0, l = entry.normalizedDeps.length; i < l; i++) {
      var depName = entry.normalizedDeps[i];
      if (indexOf.call(seen, depName) == -1) {
        if (!defined[depName])
          load(depName);
        else
          ensureEvaluated(depName, seen);
      }
    }

    if (entry.evaluated)
      return;

    entry.evaluated = true;
    entry.module.execute.call(global);
  }

  // magical execution function
  var modules = {};
  function load(name) {
    if (modules[name])
      return modules[name];

    var entry = defined[name];

    // first we check if this module has already been defined in the registry
    if (!entry)
      throw "Module " + name + " not present.";

    // recursively ensure that the module and all its 
    // dependencies are linked (with dependency group handling)
    link(name);

    // now handle dependency execution in correct order
    ensureEvaluated(name, []);

    // remove from the registry
    defined[name] = undefined;

    var module = entry.module.exports;

    if (!module || !entry.declarative && module.__esModule !== true)
      module = { 'default': module, __useDefault: true };

    // return the defined module object
    return modules[name] = module;
  };

  return function(mains, declare) {

    var System;
    var System = {
      register: register, 
      get: load, 
      set: function(name, module) {
        modules[name] = module; 
      },
      newModule: function(module) {
        return module;
      },
      global: global 
    };
    System.set('@empty', {});

    declare(System);

    for (var i = 0; i < mains.length; i++)
      load(mains[i]);
  }

})(typeof window != 'undefined' ? window : global)
/* (['mainModule'], function(System) {
  System.register(...);
}); */

(['js/app'], function(System) {

(function() {
function define(){};  define.amd = {};
(function(global, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = global.document ? factory(global, true) : function(w) {
      if (!w.document) {
        throw new Error("jQuery requires a window with a document");
      }
      return factory(w);
    };
  } else {
    factory(global);
  }
}(typeof window !== "undefined" ? window : this, function(window, noGlobal) {
  var arr = [];
  var slice = arr.slice;
  var concat = arr.concat;
  var push = arr.push;
  var indexOf = arr.indexOf;
  var class2type = {};
  var toString = class2type.toString;
  var hasOwn = class2type.hasOwnProperty;
  var support = {};
  var document = window.document,
      version = "2.1.4",
      jQuery = function(selector, context) {
        return new jQuery.fn.init(selector, context);
      },
      rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,
      rmsPrefix = /^-ms-/,
      rdashAlpha = /-([\da-z])/gi,
      fcamelCase = function(all, letter) {
        return letter.toUpperCase();
      };
  jQuery.fn = jQuery.prototype = {
    jquery: version,
    constructor: jQuery,
    selector: "",
    length: 0,
    toArray: function() {
      return slice.call(this);
    },
    get: function(num) {
      return num != null ? (num < 0 ? this[num + this.length] : this[num]) : slice.call(this);
    },
    pushStack: function(elems) {
      var ret = jQuery.merge(this.constructor(), elems);
      ret.prevObject = this;
      ret.context = this.context;
      return ret;
    },
    each: function(callback, args) {
      return jQuery.each(this, callback, args);
    },
    map: function(callback) {
      return this.pushStack(jQuery.map(this, function(elem, i) {
        return callback.call(elem, i, elem);
      }));
    },
    slice: function() {
      return this.pushStack(slice.apply(this, arguments));
    },
    first: function() {
      return this.eq(0);
    },
    last: function() {
      return this.eq(-1);
    },
    eq: function(i) {
      var len = this.length,
          j = +i + (i < 0 ? len : 0);
      return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
    },
    end: function() {
      return this.prevObject || this.constructor(null);
    },
    push: push,
    sort: arr.sort,
    splice: arr.splice
  };
  jQuery.extend = jQuery.fn.extend = function() {
    var options,
        name,
        src,
        copy,
        copyIsArray,
        clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;
    if (typeof target === "boolean") {
      deep = target;
      target = arguments[i] || {};
      i++;
    }
    if (typeof target !== "object" && !jQuery.isFunction(target)) {
      target = {};
    }
    if (i === length) {
      target = this;
      i--;
    }
    for (; i < length; i++) {
      if ((options = arguments[i]) != null) {
        for (name in options) {
          src = target[name];
          copy = options[name];
          if (target === copy) {
            continue;
          }
          if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
            if (copyIsArray) {
              copyIsArray = false;
              clone = src && jQuery.isArray(src) ? src : [];
            } else {
              clone = src && jQuery.isPlainObject(src) ? src : {};
            }
            target[name] = jQuery.extend(deep, clone, copy);
          } else if (copy !== undefined) {
            target[name] = copy;
          }
        }
      }
    }
    return target;
  };
  jQuery.extend({
    expando: "jQuery" + (version + Math.random()).replace(/\D/g, ""),
    isReady: true,
    error: function(msg) {
      throw new Error(msg);
    },
    noop: function() {},
    isFunction: function(obj) {
      return jQuery.type(obj) === "function";
    },
    isArray: Array.isArray,
    isWindow: function(obj) {
      return obj != null && obj === obj.window;
    },
    isNumeric: function(obj) {
      return !jQuery.isArray(obj) && (obj - parseFloat(obj) + 1) >= 0;
    },
    isPlainObject: function(obj) {
      if (jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow(obj)) {
        return false;
      }
      if (obj.constructor && !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")) {
        return false;
      }
      return true;
    },
    isEmptyObject: function(obj) {
      var name;
      for (name in obj) {
        return false;
      }
      return true;
    },
    type: function(obj) {
      if (obj == null) {
        return obj + "";
      }
      return typeof obj === "object" || typeof obj === "function" ? class2type[toString.call(obj)] || "object" : typeof obj;
    },
    globalEval: function(code) {
      var script,
          indirect = eval;
      code = jQuery.trim(code);
      if (code) {
        if (code.indexOf("use strict") === 1) {
          script = document.createElement("script");
          script.text = code;
          document.head.appendChild(script).parentNode.removeChild(script);
        } else {
          indirect(code);
        }
      }
    },
    camelCase: function(string) {
      return string.replace(rmsPrefix, "ms-").replace(rdashAlpha, fcamelCase);
    },
    nodeName: function(elem, name) {
      return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
    },
    each: function(obj, callback, args) {
      var value,
          i = 0,
          length = obj.length,
          isArray = isArraylike(obj);
      if (args) {
        if (isArray) {
          for (; i < length; i++) {
            value = callback.apply(obj[i], args);
            if (value === false) {
              break;
            }
          }
        } else {
          for (i in obj) {
            value = callback.apply(obj[i], args);
            if (value === false) {
              break;
            }
          }
        }
      } else {
        if (isArray) {
          for (; i < length; i++) {
            value = callback.call(obj[i], i, obj[i]);
            if (value === false) {
              break;
            }
          }
        } else {
          for (i in obj) {
            value = callback.call(obj[i], i, obj[i]);
            if (value === false) {
              break;
            }
          }
        }
      }
      return obj;
    },
    trim: function(text) {
      return text == null ? "" : (text + "").replace(rtrim, "");
    },
    makeArray: function(arr, results) {
      var ret = results || [];
      if (arr != null) {
        if (isArraylike(Object(arr))) {
          jQuery.merge(ret, typeof arr === "string" ? [arr] : arr);
        } else {
          push.call(ret, arr);
        }
      }
      return ret;
    },
    inArray: function(elem, arr, i) {
      return arr == null ? -1 : indexOf.call(arr, elem, i);
    },
    merge: function(first, second) {
      var len = +second.length,
          j = 0,
          i = first.length;
      for (; j < len; j++) {
        first[i++] = second[j];
      }
      first.length = i;
      return first;
    },
    grep: function(elems, callback, invert) {
      var callbackInverse,
          matches = [],
          i = 0,
          length = elems.length,
          callbackExpect = !invert;
      for (; i < length; i++) {
        callbackInverse = !callback(elems[i], i);
        if (callbackInverse !== callbackExpect) {
          matches.push(elems[i]);
        }
      }
      return matches;
    },
    map: function(elems, callback, arg) {
      var value,
          i = 0,
          length = elems.length,
          isArray = isArraylike(elems),
          ret = [];
      if (isArray) {
        for (; i < length; i++) {
          value = callback(elems[i], i, arg);
          if (value != null) {
            ret.push(value);
          }
        }
      } else {
        for (i in elems) {
          value = callback(elems[i], i, arg);
          if (value != null) {
            ret.push(value);
          }
        }
      }
      return concat.apply([], ret);
    },
    guid: 1,
    proxy: function(fn, context) {
      var tmp,
          args,
          proxy;
      if (typeof context === "string") {
        tmp = fn[context];
        context = fn;
        fn = tmp;
      }
      if (!jQuery.isFunction(fn)) {
        return undefined;
      }
      args = slice.call(arguments, 2);
      proxy = function() {
        return fn.apply(context || this, args.concat(slice.call(arguments)));
      };
      proxy.guid = fn.guid = fn.guid || jQuery.guid++;
      return proxy;
    },
    now: Date.now,
    support: support
  });
  jQuery.each("Boolean Number String Function Array Date RegExp Object Error".split(" "), function(i, name) {
    class2type["[object " + name + "]"] = name.toLowerCase();
  });
  function isArraylike(obj) {
    var length = "length" in obj && obj.length,
        type = jQuery.type(obj);
    if (type === "function" || jQuery.isWindow(obj)) {
      return false;
    }
    if (obj.nodeType === 1 && length) {
      return true;
    }
    return type === "array" || length === 0 || typeof length === "number" && length > 0 && (length - 1) in obj;
  }
  var Sizzle = (function(window) {
    var i,
        support,
        Expr,
        getText,
        isXML,
        tokenize,
        compile,
        select,
        outermostContext,
        sortInput,
        hasDuplicate,
        setDocument,
        document,
        docElem,
        documentIsHTML,
        rbuggyQSA,
        rbuggyMatches,
        matches,
        contains,
        expando = "sizzle" + 1 * new Date(),
        preferredDoc = window.document,
        dirruns = 0,
        done = 0,
        classCache = createCache(),
        tokenCache = createCache(),
        compilerCache = createCache(),
        sortOrder = function(a, b) {
          if (a === b) {
            hasDuplicate = true;
          }
          return 0;
        },
        MAX_NEGATIVE = 1 << 31,
        hasOwn = ({}).hasOwnProperty,
        arr = [],
        pop = arr.pop,
        push_native = arr.push,
        push = arr.push,
        slice = arr.slice,
        indexOf = function(list, elem) {
          var i = 0,
              len = list.length;
          for (; i < len; i++) {
            if (list[i] === elem) {
              return i;
            }
          }
          return -1;
        },
        booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
        whitespace = "[\\x20\\t\\r\\n\\f]",
        characterEncoding = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",
        identifier = characterEncoding.replace("w", "w#"),
        attributes = "\\[" + whitespace + "*(" + characterEncoding + ")(?:" + whitespace + "*([*^$|!~]?=)" + whitespace + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace + "*\\]",
        pseudos = ":(" + characterEncoding + ")(?:\\((" + "('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" + "((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" + ".*" + ")\\)|)",
        rwhitespace = new RegExp(whitespace + "+", "g"),
        rtrim = new RegExp("^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g"),
        rcomma = new RegExp("^" + whitespace + "*," + whitespace + "*"),
        rcombinators = new RegExp("^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*"),
        rattributeQuotes = new RegExp("=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g"),
        rpseudo = new RegExp(pseudos),
        ridentifier = new RegExp("^" + identifier + "$"),
        matchExpr = {
          "ID": new RegExp("^#(" + characterEncoding + ")"),
          "CLASS": new RegExp("^\\.(" + characterEncoding + ")"),
          "TAG": new RegExp("^(" + characterEncoding.replace("w", "w*") + ")"),
          "ATTR": new RegExp("^" + attributes),
          "PSEUDO": new RegExp("^" + pseudos),
          "CHILD": new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i"),
          "bool": new RegExp("^(?:" + booleans + ")$", "i"),
          "needsContext": new RegExp("^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i")
        },
        rinputs = /^(?:input|select|textarea|button)$/i,
        rheader = /^h\d$/i,
        rnative = /^[^{]+\{\s*\[native \w/,
        rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
        rsibling = /[+~]/,
        rescape = /'|\\/g,
        runescape = new RegExp("\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig"),
        funescape = function(_, escaped, escapedWhitespace) {
          var high = "0x" + escaped - 0x10000;
          return high !== high || escapedWhitespace ? escaped : high < 0 ? String.fromCharCode(high + 0x10000) : String.fromCharCode(high >> 10 | 0xD800, high & 0x3FF | 0xDC00);
        },
        unloadHandler = function() {
          setDocument();
        };
    try {
      push.apply((arr = slice.call(preferredDoc.childNodes)), preferredDoc.childNodes);
      arr[preferredDoc.childNodes.length].nodeType;
    } catch (e) {
      push = {apply: arr.length ? function(target, els) {
          push_native.apply(target, slice.call(els));
        } : function(target, els) {
          var j = target.length,
              i = 0;
          while ((target[j++] = els[i++])) {}
          target.length = j - 1;
        }};
    }
    function Sizzle(selector, context, results, seed) {
      var match,
          elem,
          m,
          nodeType,
          i,
          groups,
          old,
          nid,
          newContext,
          newSelector;
      if ((context ? context.ownerDocument || context : preferredDoc) !== document) {
        setDocument(context);
      }
      context = context || document;
      results = results || [];
      nodeType = context.nodeType;
      if (typeof selector !== "string" || !selector || nodeType !== 1 && nodeType !== 9 && nodeType !== 11) {
        return results;
      }
      if (!seed && documentIsHTML) {
        if (nodeType !== 11 && (match = rquickExpr.exec(selector))) {
          if ((m = match[1])) {
            if (nodeType === 9) {
              elem = context.getElementById(m);
              if (elem && elem.parentNode) {
                if (elem.id === m) {
                  results.push(elem);
                  return results;
                }
              } else {
                return results;
              }
            } else {
              if (context.ownerDocument && (elem = context.ownerDocument.getElementById(m)) && contains(context, elem) && elem.id === m) {
                results.push(elem);
                return results;
              }
            }
          } else if (match[2]) {
            push.apply(results, context.getElementsByTagName(selector));
            return results;
          } else if ((m = match[3]) && support.getElementsByClassName) {
            push.apply(results, context.getElementsByClassName(m));
            return results;
          }
        }
        if (support.qsa && (!rbuggyQSA || !rbuggyQSA.test(selector))) {
          nid = old = expando;
          newContext = context;
          newSelector = nodeType !== 1 && selector;
          if (nodeType === 1 && context.nodeName.toLowerCase() !== "object") {
            groups = tokenize(selector);
            if ((old = context.getAttribute("id"))) {
              nid = old.replace(rescape, "\\$&");
            } else {
              context.setAttribute("id", nid);
            }
            nid = "[id='" + nid + "'] ";
            i = groups.length;
            while (i--) {
              groups[i] = nid + toSelector(groups[i]);
            }
            newContext = rsibling.test(selector) && testContext(context.parentNode) || context;
            newSelector = groups.join(",");
          }
          if (newSelector) {
            try {
              push.apply(results, newContext.querySelectorAll(newSelector));
              return results;
            } catch (qsaError) {} finally {
              if (!old) {
                context.removeAttribute("id");
              }
            }
          }
        }
      }
      return select(selector.replace(rtrim, "$1"), context, results, seed);
    }
    function createCache() {
      var keys = [];
      function cache(key, value) {
        if (keys.push(key + " ") > Expr.cacheLength) {
          delete cache[keys.shift()];
        }
        return (cache[key + " "] = value);
      }
      return cache;
    }
    function markFunction(fn) {
      fn[expando] = true;
      return fn;
    }
    function assert(fn) {
      var div = document.createElement("div");
      try {
        return !!fn(div);
      } catch (e) {
        return false;
      } finally {
        if (div.parentNode) {
          div.parentNode.removeChild(div);
        }
        div = null;
      }
    }
    function addHandle(attrs, handler) {
      var arr = attrs.split("|"),
          i = attrs.length;
      while (i--) {
        Expr.attrHandle[arr[i]] = handler;
      }
    }
    function siblingCheck(a, b) {
      var cur = b && a,
          diff = cur && a.nodeType === 1 && b.nodeType === 1 && (~b.sourceIndex || MAX_NEGATIVE) - (~a.sourceIndex || MAX_NEGATIVE);
      if (diff) {
        return diff;
      }
      if (cur) {
        while ((cur = cur.nextSibling)) {
          if (cur === b) {
            return -1;
          }
        }
      }
      return a ? 1 : -1;
    }
    function createInputPseudo(type) {
      return function(elem) {
        var name = elem.nodeName.toLowerCase();
        return name === "input" && elem.type === type;
      };
    }
    function createButtonPseudo(type) {
      return function(elem) {
        var name = elem.nodeName.toLowerCase();
        return (name === "input" || name === "button") && elem.type === type;
      };
    }
    function createPositionalPseudo(fn) {
      return markFunction(function(argument) {
        argument = +argument;
        return markFunction(function(seed, matches) {
          var j,
              matchIndexes = fn([], seed.length, argument),
              i = matchIndexes.length;
          while (i--) {
            if (seed[(j = matchIndexes[i])]) {
              seed[j] = !(matches[j] = seed[j]);
            }
          }
        });
      });
    }
    function testContext(context) {
      return context && typeof context.getElementsByTagName !== "undefined" && context;
    }
    support = Sizzle.support = {};
    isXML = Sizzle.isXML = function(elem) {
      var documentElement = elem && (elem.ownerDocument || elem).documentElement;
      return documentElement ? documentElement.nodeName !== "HTML" : false;
    };
    setDocument = Sizzle.setDocument = function(node) {
      var hasCompare,
          parent,
          doc = node ? node.ownerDocument || node : preferredDoc;
      if (doc === document || doc.nodeType !== 9 || !doc.documentElement) {
        return document;
      }
      document = doc;
      docElem = doc.documentElement;
      parent = doc.defaultView;
      if (parent && parent !== parent.top) {
        if (parent.addEventListener) {
          parent.addEventListener("unload", unloadHandler, false);
        } else if (parent.attachEvent) {
          parent.attachEvent("onunload", unloadHandler);
        }
      }
      documentIsHTML = !isXML(doc);
      support.attributes = assert(function(div) {
        div.className = "i";
        return !div.getAttribute("className");
      });
      support.getElementsByTagName = assert(function(div) {
        div.appendChild(doc.createComment(""));
        return !div.getElementsByTagName("*").length;
      });
      support.getElementsByClassName = rnative.test(doc.getElementsByClassName);
      support.getById = assert(function(div) {
        docElem.appendChild(div).id = expando;
        return !doc.getElementsByName || !doc.getElementsByName(expando).length;
      });
      if (support.getById) {
        Expr.find["ID"] = function(id, context) {
          if (typeof context.getElementById !== "undefined" && documentIsHTML) {
            var m = context.getElementById(id);
            return m && m.parentNode ? [m] : [];
          }
        };
        Expr.filter["ID"] = function(id) {
          var attrId = id.replace(runescape, funescape);
          return function(elem) {
            return elem.getAttribute("id") === attrId;
          };
        };
      } else {
        delete Expr.find["ID"];
        Expr.filter["ID"] = function(id) {
          var attrId = id.replace(runescape, funescape);
          return function(elem) {
            var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
            return node && node.value === attrId;
          };
        };
      }
      Expr.find["TAG"] = support.getElementsByTagName ? function(tag, context) {
        if (typeof context.getElementsByTagName !== "undefined") {
          return context.getElementsByTagName(tag);
        } else if (support.qsa) {
          return context.querySelectorAll(tag);
        }
      } : function(tag, context) {
        var elem,
            tmp = [],
            i = 0,
            results = context.getElementsByTagName(tag);
        if (tag === "*") {
          while ((elem = results[i++])) {
            if (elem.nodeType === 1) {
              tmp.push(elem);
            }
          }
          return tmp;
        }
        return results;
      };
      Expr.find["CLASS"] = support.getElementsByClassName && function(className, context) {
        if (documentIsHTML) {
          return context.getElementsByClassName(className);
        }
      };
      rbuggyMatches = [];
      rbuggyQSA = [];
      if ((support.qsa = rnative.test(doc.querySelectorAll))) {
        assert(function(div) {
          docElem.appendChild(div).innerHTML = "<a id='" + expando + "'></a>" + "<select id='" + expando + "-\f]' msallowcapture=''>" + "<option selected=''></option></select>";
          if (div.querySelectorAll("[msallowcapture^='']").length) {
            rbuggyQSA.push("[*^$]=" + whitespace + "*(?:''|\"\")");
          }
          if (!div.querySelectorAll("[selected]").length) {
            rbuggyQSA.push("\\[" + whitespace + "*(?:value|" + booleans + ")");
          }
          if (!div.querySelectorAll("[id~=" + expando + "-]").length) {
            rbuggyQSA.push("~=");
          }
          if (!div.querySelectorAll(":checked").length) {
            rbuggyQSA.push(":checked");
          }
          if (!div.querySelectorAll("a#" + expando + "+*").length) {
            rbuggyQSA.push(".#.+[+~]");
          }
        });
        assert(function(div) {
          var input = doc.createElement("input");
          input.setAttribute("type", "hidden");
          div.appendChild(input).setAttribute("name", "D");
          if (div.querySelectorAll("[name=d]").length) {
            rbuggyQSA.push("name" + whitespace + "*[*^$|!~]?=");
          }
          if (!div.querySelectorAll(":enabled").length) {
            rbuggyQSA.push(":enabled", ":disabled");
          }
          div.querySelectorAll("*,:x");
          rbuggyQSA.push(",.*:");
        });
      }
      if ((support.matchesSelector = rnative.test((matches = docElem.matches || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.oMatchesSelector || docElem.msMatchesSelector)))) {
        assert(function(div) {
          support.disconnectedMatch = matches.call(div, "div");
          matches.call(div, "[s!='']:x");
          rbuggyMatches.push("!=", pseudos);
        });
      }
      rbuggyQSA = rbuggyQSA.length && new RegExp(rbuggyQSA.join("|"));
      rbuggyMatches = rbuggyMatches.length && new RegExp(rbuggyMatches.join("|"));
      hasCompare = rnative.test(docElem.compareDocumentPosition);
      contains = hasCompare || rnative.test(docElem.contains) ? function(a, b) {
        var adown = a.nodeType === 9 ? a.documentElement : a,
            bup = b && b.parentNode;
        return a === bup || !!(bup && bup.nodeType === 1 && (adown.contains ? adown.contains(bup) : a.compareDocumentPosition && a.compareDocumentPosition(bup) & 16));
      } : function(a, b) {
        if (b) {
          while ((b = b.parentNode)) {
            if (b === a) {
              return true;
            }
          }
        }
        return false;
      };
      sortOrder = hasCompare ? function(a, b) {
        if (a === b) {
          hasDuplicate = true;
          return 0;
        }
        var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
        if (compare) {
          return compare;
        }
        compare = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1;
        if (compare & 1 || (!support.sortDetached && b.compareDocumentPosition(a) === compare)) {
          if (a === doc || a.ownerDocument === preferredDoc && contains(preferredDoc, a)) {
            return -1;
          }
          if (b === doc || b.ownerDocument === preferredDoc && contains(preferredDoc, b)) {
            return 1;
          }
          return sortInput ? (indexOf(sortInput, a) - indexOf(sortInput, b)) : 0;
        }
        return compare & 4 ? -1 : 1;
      } : function(a, b) {
        if (a === b) {
          hasDuplicate = true;
          return 0;
        }
        var cur,
            i = 0,
            aup = a.parentNode,
            bup = b.parentNode,
            ap = [a],
            bp = [b];
        if (!aup || !bup) {
          return a === doc ? -1 : b === doc ? 1 : aup ? -1 : bup ? 1 : sortInput ? (indexOf(sortInput, a) - indexOf(sortInput, b)) : 0;
        } else if (aup === bup) {
          return siblingCheck(a, b);
        }
        cur = a;
        while ((cur = cur.parentNode)) {
          ap.unshift(cur);
        }
        cur = b;
        while ((cur = cur.parentNode)) {
          bp.unshift(cur);
        }
        while (ap[i] === bp[i]) {
          i++;
        }
        return i ? siblingCheck(ap[i], bp[i]) : ap[i] === preferredDoc ? -1 : bp[i] === preferredDoc ? 1 : 0;
      };
      return doc;
    };
    Sizzle.matches = function(expr, elements) {
      return Sizzle(expr, null, null, elements);
    };
    Sizzle.matchesSelector = function(elem, expr) {
      if ((elem.ownerDocument || elem) !== document) {
        setDocument(elem);
      }
      expr = expr.replace(rattributeQuotes, "='$1']");
      if (support.matchesSelector && documentIsHTML && (!rbuggyMatches || !rbuggyMatches.test(expr)) && (!rbuggyQSA || !rbuggyQSA.test(expr))) {
        try {
          var ret = matches.call(elem, expr);
          if (ret || support.disconnectedMatch || elem.document && elem.document.nodeType !== 11) {
            return ret;
          }
        } catch (e) {}
      }
      return Sizzle(expr, document, null, [elem]).length > 0;
    };
    Sizzle.contains = function(context, elem) {
      if ((context.ownerDocument || context) !== document) {
        setDocument(context);
      }
      return contains(context, elem);
    };
    Sizzle.attr = function(elem, name) {
      if ((elem.ownerDocument || elem) !== document) {
        setDocument(elem);
      }
      var fn = Expr.attrHandle[name.toLowerCase()],
          val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ? fn(elem, name, !documentIsHTML) : undefined;
      return val !== undefined ? val : support.attributes || !documentIsHTML ? elem.getAttribute(name) : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
    };
    Sizzle.error = function(msg) {
      throw new Error("Syntax error, unrecognized expression: " + msg);
    };
    Sizzle.uniqueSort = function(results) {
      var elem,
          duplicates = [],
          j = 0,
          i = 0;
      hasDuplicate = !support.detectDuplicates;
      sortInput = !support.sortStable && results.slice(0);
      results.sort(sortOrder);
      if (hasDuplicate) {
        while ((elem = results[i++])) {
          if (elem === results[i]) {
            j = duplicates.push(i);
          }
        }
        while (j--) {
          results.splice(duplicates[j], 1);
        }
      }
      sortInput = null;
      return results;
    };
    getText = Sizzle.getText = function(elem) {
      var node,
          ret = "",
          i = 0,
          nodeType = elem.nodeType;
      if (!nodeType) {
        while ((node = elem[i++])) {
          ret += getText(node);
        }
      } else if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
        if (typeof elem.textContent === "string") {
          return elem.textContent;
        } else {
          for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
            ret += getText(elem);
          }
        }
      } else if (nodeType === 3 || nodeType === 4) {
        return elem.nodeValue;
      }
      return ret;
    };
    Expr = Sizzle.selectors = {
      cacheLength: 50,
      createPseudo: markFunction,
      match: matchExpr,
      attrHandle: {},
      find: {},
      relative: {
        ">": {
          dir: "parentNode",
          first: true
        },
        " ": {dir: "parentNode"},
        "+": {
          dir: "previousSibling",
          first: true
        },
        "~": {dir: "previousSibling"}
      },
      preFilter: {
        "ATTR": function(match) {
          match[1] = match[1].replace(runescape, funescape);
          match[3] = (match[3] || match[4] || match[5] || "").replace(runescape, funescape);
          if (match[2] === "~=") {
            match[3] = " " + match[3] + " ";
          }
          return match.slice(0, 4);
        },
        "CHILD": function(match) {
          match[1] = match[1].toLowerCase();
          if (match[1].slice(0, 3) === "nth") {
            if (!match[3]) {
              Sizzle.error(match[0]);
            }
            match[4] = +(match[4] ? match[5] + (match[6] || 1) : 2 * (match[3] === "even" || match[3] === "odd"));
            match[5] = +((match[7] + match[8]) || match[3] === "odd");
          } else if (match[3]) {
            Sizzle.error(match[0]);
          }
          return match;
        },
        "PSEUDO": function(match) {
          var excess,
              unquoted = !match[6] && match[2];
          if (matchExpr["CHILD"].test(match[0])) {
            return null;
          }
          if (match[3]) {
            match[2] = match[4] || match[5] || "";
          } else if (unquoted && rpseudo.test(unquoted) && (excess = tokenize(unquoted, true)) && (excess = unquoted.indexOf(")", unquoted.length - excess) - unquoted.length)) {
            match[0] = match[0].slice(0, excess);
            match[2] = unquoted.slice(0, excess);
          }
          return match.slice(0, 3);
        }
      },
      filter: {
        "TAG": function(nodeNameSelector) {
          var nodeName = nodeNameSelector.replace(runescape, funescape).toLowerCase();
          return nodeNameSelector === "*" ? function() {
            return true;
          } : function(elem) {
            return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
          };
        },
        "CLASS": function(className) {
          var pattern = classCache[className + " "];
          return pattern || (pattern = new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)")) && classCache(className, function(elem) {
            return pattern.test(typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "");
          });
        },
        "ATTR": function(name, operator, check) {
          return function(elem) {
            var result = Sizzle.attr(elem, name);
            if (result == null) {
              return operator === "!=";
            }
            if (!operator) {
              return true;
            }
            result += "";
            return operator === "=" ? result === check : operator === "!=" ? result !== check : operator === "^=" ? check && result.indexOf(check) === 0 : operator === "*=" ? check && result.indexOf(check) > -1 : operator === "$=" ? check && result.slice(-check.length) === check : operator === "~=" ? (" " + result.replace(rwhitespace, " ") + " ").indexOf(check) > -1 : operator === "|=" ? result === check || result.slice(0, check.length + 1) === check + "-" : false;
          };
        },
        "CHILD": function(type, what, argument, first, last) {
          var simple = type.slice(0, 3) !== "nth",
              forward = type.slice(-4) !== "last",
              ofType = what === "of-type";
          return first === 1 && last === 0 ? function(elem) {
            return !!elem.parentNode;
          } : function(elem, context, xml) {
            var cache,
                outerCache,
                node,
                diff,
                nodeIndex,
                start,
                dir = simple !== forward ? "nextSibling" : "previousSibling",
                parent = elem.parentNode,
                name = ofType && elem.nodeName.toLowerCase(),
                useCache = !xml && !ofType;
            if (parent) {
              if (simple) {
                while (dir) {
                  node = elem;
                  while ((node = node[dir])) {
                    if (ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) {
                      return false;
                    }
                  }
                  start = dir = type === "only" && !start && "nextSibling";
                }
                return true;
              }
              start = [forward ? parent.firstChild : parent.lastChild];
              if (forward && useCache) {
                outerCache = parent[expando] || (parent[expando] = {});
                cache = outerCache[type] || [];
                nodeIndex = cache[0] === dirruns && cache[1];
                diff = cache[0] === dirruns && cache[2];
                node = nodeIndex && parent.childNodes[nodeIndex];
                while ((node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop())) {
                  if (node.nodeType === 1 && ++diff && node === elem) {
                    outerCache[type] = [dirruns, nodeIndex, diff];
                    break;
                  }
                }
              } else if (useCache && (cache = (elem[expando] || (elem[expando] = {}))[type]) && cache[0] === dirruns) {
                diff = cache[1];
              } else {
                while ((node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop())) {
                  if ((ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) && ++diff) {
                    if (useCache) {
                      (node[expando] || (node[expando] = {}))[type] = [dirruns, diff];
                    }
                    if (node === elem) {
                      break;
                    }
                  }
                }
              }
              diff -= last;
              return diff === first || (diff % first === 0 && diff / first >= 0);
            }
          };
        },
        "PSEUDO": function(pseudo, argument) {
          var args,
              fn = Expr.pseudos[pseudo] || Expr.setFilters[pseudo.toLowerCase()] || Sizzle.error("unsupported pseudo: " + pseudo);
          if (fn[expando]) {
            return fn(argument);
          }
          if (fn.length > 1) {
            args = [pseudo, pseudo, "", argument];
            return Expr.setFilters.hasOwnProperty(pseudo.toLowerCase()) ? markFunction(function(seed, matches) {
              var idx,
                  matched = fn(seed, argument),
                  i = matched.length;
              while (i--) {
                idx = indexOf(seed, matched[i]);
                seed[idx] = !(matches[idx] = matched[i]);
              }
            }) : function(elem) {
              return fn(elem, 0, args);
            };
          }
          return fn;
        }
      },
      pseudos: {
        "not": markFunction(function(selector) {
          var input = [],
              results = [],
              matcher = compile(selector.replace(rtrim, "$1"));
          return matcher[expando] ? markFunction(function(seed, matches, context, xml) {
            var elem,
                unmatched = matcher(seed, null, xml, []),
                i = seed.length;
            while (i--) {
              if ((elem = unmatched[i])) {
                seed[i] = !(matches[i] = elem);
              }
            }
          }) : function(elem, context, xml) {
            input[0] = elem;
            matcher(input, null, xml, results);
            input[0] = null;
            return !results.pop();
          };
        }),
        "has": markFunction(function(selector) {
          return function(elem) {
            return Sizzle(selector, elem).length > 0;
          };
        }),
        "contains": markFunction(function(text) {
          text = text.replace(runescape, funescape);
          return function(elem) {
            return (elem.textContent || elem.innerText || getText(elem)).indexOf(text) > -1;
          };
        }),
        "lang": markFunction(function(lang) {
          if (!ridentifier.test(lang || "")) {
            Sizzle.error("unsupported lang: " + lang);
          }
          lang = lang.replace(runescape, funescape).toLowerCase();
          return function(elem) {
            var elemLang;
            do {
              if ((elemLang = documentIsHTML ? elem.lang : elem.getAttribute("xml:lang") || elem.getAttribute("lang"))) {
                elemLang = elemLang.toLowerCase();
                return elemLang === lang || elemLang.indexOf(lang + "-") === 0;
              }
            } while ((elem = elem.parentNode) && elem.nodeType === 1);
            return false;
          };
        }),
        "target": function(elem) {
          var hash = window.location && window.location.hash;
          return hash && hash.slice(1) === elem.id;
        },
        "root": function(elem) {
          return elem === docElem;
        },
        "focus": function(elem) {
          return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
        },
        "enabled": function(elem) {
          return elem.disabled === false;
        },
        "disabled": function(elem) {
          return elem.disabled === true;
        },
        "checked": function(elem) {
          var nodeName = elem.nodeName.toLowerCase();
          return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
        },
        "selected": function(elem) {
          if (elem.parentNode) {
            elem.parentNode.selectedIndex;
          }
          return elem.selected === true;
        },
        "empty": function(elem) {
          for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
            if (elem.nodeType < 6) {
              return false;
            }
          }
          return true;
        },
        "parent": function(elem) {
          return !Expr.pseudos["empty"](elem);
        },
        "header": function(elem) {
          return rheader.test(elem.nodeName);
        },
        "input": function(elem) {
          return rinputs.test(elem.nodeName);
        },
        "button": function(elem) {
          var name = elem.nodeName.toLowerCase();
          return name === "input" && elem.type === "button" || name === "button";
        },
        "text": function(elem) {
          var attr;
          return elem.nodeName.toLowerCase() === "input" && elem.type === "text" && ((attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text");
        },
        "first": createPositionalPseudo(function() {
          return [0];
        }),
        "last": createPositionalPseudo(function(matchIndexes, length) {
          return [length - 1];
        }),
        "eq": createPositionalPseudo(function(matchIndexes, length, argument) {
          return [argument < 0 ? argument + length : argument];
        }),
        "even": createPositionalPseudo(function(matchIndexes, length) {
          var i = 0;
          for (; i < length; i += 2) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        }),
        "odd": createPositionalPseudo(function(matchIndexes, length) {
          var i = 1;
          for (; i < length; i += 2) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        }),
        "lt": createPositionalPseudo(function(matchIndexes, length, argument) {
          var i = argument < 0 ? argument + length : argument;
          for (; --i >= 0; ) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        }),
        "gt": createPositionalPseudo(function(matchIndexes, length, argument) {
          var i = argument < 0 ? argument + length : argument;
          for (; ++i < length; ) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        })
      }
    };
    Expr.pseudos["nth"] = Expr.pseudos["eq"];
    for (i in {
      radio: true,
      checkbox: true,
      file: true,
      password: true,
      image: true
    }) {
      Expr.pseudos[i] = createInputPseudo(i);
    }
    for (i in {
      submit: true,
      reset: true
    }) {
      Expr.pseudos[i] = createButtonPseudo(i);
    }
    function setFilters() {}
    setFilters.prototype = Expr.filters = Expr.pseudos;
    Expr.setFilters = new setFilters();
    tokenize = Sizzle.tokenize = function(selector, parseOnly) {
      var matched,
          match,
          tokens,
          type,
          soFar,
          groups,
          preFilters,
          cached = tokenCache[selector + " "];
      if (cached) {
        return parseOnly ? 0 : cached.slice(0);
      }
      soFar = selector;
      groups = [];
      preFilters = Expr.preFilter;
      while (soFar) {
        if (!matched || (match = rcomma.exec(soFar))) {
          if (match) {
            soFar = soFar.slice(match[0].length) || soFar;
          }
          groups.push((tokens = []));
        }
        matched = false;
        if ((match = rcombinators.exec(soFar))) {
          matched = match.shift();
          tokens.push({
            value: matched,
            type: match[0].replace(rtrim, " ")
          });
          soFar = soFar.slice(matched.length);
        }
        for (type in Expr.filter) {
          if ((match = matchExpr[type].exec(soFar)) && (!preFilters[type] || (match = preFilters[type](match)))) {
            matched = match.shift();
            tokens.push({
              value: matched,
              type: type,
              matches: match
            });
            soFar = soFar.slice(matched.length);
          }
        }
        if (!matched) {
          break;
        }
      }
      return parseOnly ? soFar.length : soFar ? Sizzle.error(selector) : tokenCache(selector, groups).slice(0);
    };
    function toSelector(tokens) {
      var i = 0,
          len = tokens.length,
          selector = "";
      for (; i < len; i++) {
        selector += tokens[i].value;
      }
      return selector;
    }
    function addCombinator(matcher, combinator, base) {
      var dir = combinator.dir,
          checkNonElements = base && dir === "parentNode",
          doneName = done++;
      return combinator.first ? function(elem, context, xml) {
        while ((elem = elem[dir])) {
          if (elem.nodeType === 1 || checkNonElements) {
            return matcher(elem, context, xml);
          }
        }
      } : function(elem, context, xml) {
        var oldCache,
            outerCache,
            newCache = [dirruns, doneName];
        if (xml) {
          while ((elem = elem[dir])) {
            if (elem.nodeType === 1 || checkNonElements) {
              if (matcher(elem, context, xml)) {
                return true;
              }
            }
          }
        } else {
          while ((elem = elem[dir])) {
            if (elem.nodeType === 1 || checkNonElements) {
              outerCache = elem[expando] || (elem[expando] = {});
              if ((oldCache = outerCache[dir]) && oldCache[0] === dirruns && oldCache[1] === doneName) {
                return (newCache[2] = oldCache[2]);
              } else {
                outerCache[dir] = newCache;
                if ((newCache[2] = matcher(elem, context, xml))) {
                  return true;
                }
              }
            }
          }
        }
      };
    }
    function elementMatcher(matchers) {
      return matchers.length > 1 ? function(elem, context, xml) {
        var i = matchers.length;
        while (i--) {
          if (!matchers[i](elem, context, xml)) {
            return false;
          }
        }
        return true;
      } : matchers[0];
    }
    function multipleContexts(selector, contexts, results) {
      var i = 0,
          len = contexts.length;
      for (; i < len; i++) {
        Sizzle(selector, contexts[i], results);
      }
      return results;
    }
    function condense(unmatched, map, filter, context, xml) {
      var elem,
          newUnmatched = [],
          i = 0,
          len = unmatched.length,
          mapped = map != null;
      for (; i < len; i++) {
        if ((elem = unmatched[i])) {
          if (!filter || filter(elem, context, xml)) {
            newUnmatched.push(elem);
            if (mapped) {
              map.push(i);
            }
          }
        }
      }
      return newUnmatched;
    }
    function setMatcher(preFilter, selector, matcher, postFilter, postFinder, postSelector) {
      if (postFilter && !postFilter[expando]) {
        postFilter = setMatcher(postFilter);
      }
      if (postFinder && !postFinder[expando]) {
        postFinder = setMatcher(postFinder, postSelector);
      }
      return markFunction(function(seed, results, context, xml) {
        var temp,
            i,
            elem,
            preMap = [],
            postMap = [],
            preexisting = results.length,
            elems = seed || multipleContexts(selector || "*", context.nodeType ? [context] : context, []),
            matcherIn = preFilter && (seed || !selector) ? condense(elems, preMap, preFilter, context, xml) : elems,
            matcherOut = matcher ? postFinder || (seed ? preFilter : preexisting || postFilter) ? [] : results : matcherIn;
        if (matcher) {
          matcher(matcherIn, matcherOut, context, xml);
        }
        if (postFilter) {
          temp = condense(matcherOut, postMap);
          postFilter(temp, [], context, xml);
          i = temp.length;
          while (i--) {
            if ((elem = temp[i])) {
              matcherOut[postMap[i]] = !(matcherIn[postMap[i]] = elem);
            }
          }
        }
        if (seed) {
          if (postFinder || preFilter) {
            if (postFinder) {
              temp = [];
              i = matcherOut.length;
              while (i--) {
                if ((elem = matcherOut[i])) {
                  temp.push((matcherIn[i] = elem));
                }
              }
              postFinder(null, (matcherOut = []), temp, xml);
            }
            i = matcherOut.length;
            while (i--) {
              if ((elem = matcherOut[i]) && (temp = postFinder ? indexOf(seed, elem) : preMap[i]) > -1) {
                seed[temp] = !(results[temp] = elem);
              }
            }
          }
        } else {
          matcherOut = condense(matcherOut === results ? matcherOut.splice(preexisting, matcherOut.length) : matcherOut);
          if (postFinder) {
            postFinder(null, results, matcherOut, xml);
          } else {
            push.apply(results, matcherOut);
          }
        }
      });
    }
    function matcherFromTokens(tokens) {
      var checkContext,
          matcher,
          j,
          len = tokens.length,
          leadingRelative = Expr.relative[tokens[0].type],
          implicitRelative = leadingRelative || Expr.relative[" "],
          i = leadingRelative ? 1 : 0,
          matchContext = addCombinator(function(elem) {
            return elem === checkContext;
          }, implicitRelative, true),
          matchAnyContext = addCombinator(function(elem) {
            return indexOf(checkContext, elem) > -1;
          }, implicitRelative, true),
          matchers = [function(elem, context, xml) {
            var ret = (!leadingRelative && (xml || context !== outermostContext)) || ((checkContext = context).nodeType ? matchContext(elem, context, xml) : matchAnyContext(elem, context, xml));
            checkContext = null;
            return ret;
          }];
      for (; i < len; i++) {
        if ((matcher = Expr.relative[tokens[i].type])) {
          matchers = [addCombinator(elementMatcher(matchers), matcher)];
        } else {
          matcher = Expr.filter[tokens[i].type].apply(null, tokens[i].matches);
          if (matcher[expando]) {
            j = ++i;
            for (; j < len; j++) {
              if (Expr.relative[tokens[j].type]) {
                break;
              }
            }
            return setMatcher(i > 1 && elementMatcher(matchers), i > 1 && toSelector(tokens.slice(0, i - 1).concat({value: tokens[i - 2].type === " " ? "*" : ""})).replace(rtrim, "$1"), matcher, i < j && matcherFromTokens(tokens.slice(i, j)), j < len && matcherFromTokens((tokens = tokens.slice(j))), j < len && toSelector(tokens));
          }
          matchers.push(matcher);
        }
      }
      return elementMatcher(matchers);
    }
    function matcherFromGroupMatchers(elementMatchers, setMatchers) {
      var bySet = setMatchers.length > 0,
          byElement = elementMatchers.length > 0,
          superMatcher = function(seed, context, xml, results, outermost) {
            var elem,
                j,
                matcher,
                matchedCount = 0,
                i = "0",
                unmatched = seed && [],
                setMatched = [],
                contextBackup = outermostContext,
                elems = seed || byElement && Expr.find["TAG"]("*", outermost),
                dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
                len = elems.length;
            if (outermost) {
              outermostContext = context !== document && context;
            }
            for (; i !== len && (elem = elems[i]) != null; i++) {
              if (byElement && elem) {
                j = 0;
                while ((matcher = elementMatchers[j++])) {
                  if (matcher(elem, context, xml)) {
                    results.push(elem);
                    break;
                  }
                }
                if (outermost) {
                  dirruns = dirrunsUnique;
                }
              }
              if (bySet) {
                if ((elem = !matcher && elem)) {
                  matchedCount--;
                }
                if (seed) {
                  unmatched.push(elem);
                }
              }
            }
            matchedCount += i;
            if (bySet && i !== matchedCount) {
              j = 0;
              while ((matcher = setMatchers[j++])) {
                matcher(unmatched, setMatched, context, xml);
              }
              if (seed) {
                if (matchedCount > 0) {
                  while (i--) {
                    if (!(unmatched[i] || setMatched[i])) {
                      setMatched[i] = pop.call(results);
                    }
                  }
                }
                setMatched = condense(setMatched);
              }
              push.apply(results, setMatched);
              if (outermost && !seed && setMatched.length > 0 && (matchedCount + setMatchers.length) > 1) {
                Sizzle.uniqueSort(results);
              }
            }
            if (outermost) {
              dirruns = dirrunsUnique;
              outermostContext = contextBackup;
            }
            return unmatched;
          };
      return bySet ? markFunction(superMatcher) : superMatcher;
    }
    compile = Sizzle.compile = function(selector, match) {
      var i,
          setMatchers = [],
          elementMatchers = [],
          cached = compilerCache[selector + " "];
      if (!cached) {
        if (!match) {
          match = tokenize(selector);
        }
        i = match.length;
        while (i--) {
          cached = matcherFromTokens(match[i]);
          if (cached[expando]) {
            setMatchers.push(cached);
          } else {
            elementMatchers.push(cached);
          }
        }
        cached = compilerCache(selector, matcherFromGroupMatchers(elementMatchers, setMatchers));
        cached.selector = selector;
      }
      return cached;
    };
    select = Sizzle.select = function(selector, context, results, seed) {
      var i,
          tokens,
          token,
          type,
          find,
          compiled = typeof selector === "function" && selector,
          match = !seed && tokenize((selector = compiled.selector || selector));
      results = results || [];
      if (match.length === 1) {
        tokens = match[0] = match[0].slice(0);
        if (tokens.length > 2 && (token = tokens[0]).type === "ID" && support.getById && context.nodeType === 9 && documentIsHTML && Expr.relative[tokens[1].type]) {
          context = (Expr.find["ID"](token.matches[0].replace(runescape, funescape), context) || [])[0];
          if (!context) {
            return results;
          } else if (compiled) {
            context = context.parentNode;
          }
          selector = selector.slice(tokens.shift().value.length);
        }
        i = matchExpr["needsContext"].test(selector) ? 0 : tokens.length;
        while (i--) {
          token = tokens[i];
          if (Expr.relative[(type = token.type)]) {
            break;
          }
          if ((find = Expr.find[type])) {
            if ((seed = find(token.matches[0].replace(runescape, funescape), rsibling.test(tokens[0].type) && testContext(context.parentNode) || context))) {
              tokens.splice(i, 1);
              selector = seed.length && toSelector(tokens);
              if (!selector) {
                push.apply(results, seed);
                return results;
              }
              break;
            }
          }
        }
      }
      (compiled || compile(selector, match))(seed, context, !documentIsHTML, results, rsibling.test(selector) && testContext(context.parentNode) || context);
      return results;
    };
    support.sortStable = expando.split("").sort(sortOrder).join("") === expando;
    support.detectDuplicates = !!hasDuplicate;
    setDocument();
    support.sortDetached = assert(function(div1) {
      return div1.compareDocumentPosition(document.createElement("div")) & 1;
    });
    if (!assert(function(div) {
      div.innerHTML = "<a href='#'></a>";
      return div.firstChild.getAttribute("href") === "#";
    })) {
      addHandle("type|href|height|width", function(elem, name, isXML) {
        if (!isXML) {
          return elem.getAttribute(name, name.toLowerCase() === "type" ? 1 : 2);
        }
      });
    }
    if (!support.attributes || !assert(function(div) {
      div.innerHTML = "<input/>";
      div.firstChild.setAttribute("value", "");
      return div.firstChild.getAttribute("value") === "";
    })) {
      addHandle("value", function(elem, name, isXML) {
        if (!isXML && elem.nodeName.toLowerCase() === "input") {
          return elem.defaultValue;
        }
      });
    }
    if (!assert(function(div) {
      return div.getAttribute("disabled") == null;
    })) {
      addHandle(booleans, function(elem, name, isXML) {
        var val;
        if (!isXML) {
          return elem[name] === true ? name.toLowerCase() : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
        }
      });
    }
    return Sizzle;
  })(window);
  jQuery.find = Sizzle;
  jQuery.expr = Sizzle.selectors;
  jQuery.expr[":"] = jQuery.expr.pseudos;
  jQuery.unique = Sizzle.uniqueSort;
  jQuery.text = Sizzle.getText;
  jQuery.isXMLDoc = Sizzle.isXML;
  jQuery.contains = Sizzle.contains;
  var rneedsContext = jQuery.expr.match.needsContext;
  var rsingleTag = (/^<(\w+)\s*\/?>(?:<\/\1>|)$/);
  var risSimple = /^.[^:#\[\.,]*$/;
  function winnow(elements, qualifier, not) {
    if (jQuery.isFunction(qualifier)) {
      return jQuery.grep(elements, function(elem, i) {
        return !!qualifier.call(elem, i, elem) !== not;
      });
    }
    if (qualifier.nodeType) {
      return jQuery.grep(elements, function(elem) {
        return (elem === qualifier) !== not;
      });
    }
    if (typeof qualifier === "string") {
      if (risSimple.test(qualifier)) {
        return jQuery.filter(qualifier, elements, not);
      }
      qualifier = jQuery.filter(qualifier, elements);
    }
    return jQuery.grep(elements, function(elem) {
      return (indexOf.call(qualifier, elem) >= 0) !== not;
    });
  }
  jQuery.filter = function(expr, elems, not) {
    var elem = elems[0];
    if (not) {
      expr = ":not(" + expr + ")";
    }
    return elems.length === 1 && elem.nodeType === 1 ? jQuery.find.matchesSelector(elem, expr) ? [elem] : [] : jQuery.find.matches(expr, jQuery.grep(elems, function(elem) {
      return elem.nodeType === 1;
    }));
  };
  jQuery.fn.extend({
    find: function(selector) {
      var i,
          len = this.length,
          ret = [],
          self = this;
      if (typeof selector !== "string") {
        return this.pushStack(jQuery(selector).filter(function() {
          for (i = 0; i < len; i++) {
            if (jQuery.contains(self[i], this)) {
              return true;
            }
          }
        }));
      }
      for (i = 0; i < len; i++) {
        jQuery.find(selector, self[i], ret);
      }
      ret = this.pushStack(len > 1 ? jQuery.unique(ret) : ret);
      ret.selector = this.selector ? this.selector + " " + selector : selector;
      return ret;
    },
    filter: function(selector) {
      return this.pushStack(winnow(this, selector || [], false));
    },
    not: function(selector) {
      return this.pushStack(winnow(this, selector || [], true));
    },
    is: function(selector) {
      return !!winnow(this, typeof selector === "string" && rneedsContext.test(selector) ? jQuery(selector) : selector || [], false).length;
    }
  });
  var rootjQuery,
      rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,
      init = jQuery.fn.init = function(selector, context) {
        var match,
            elem;
        if (!selector) {
          return this;
        }
        if (typeof selector === "string") {
          if (selector[0] === "<" && selector[selector.length - 1] === ">" && selector.length >= 3) {
            match = [null, selector, null];
          } else {
            match = rquickExpr.exec(selector);
          }
          if (match && (match[1] || !context)) {
            if (match[1]) {
              context = context instanceof jQuery ? context[0] : context;
              jQuery.merge(this, jQuery.parseHTML(match[1], context && context.nodeType ? context.ownerDocument || context : document, true));
              if (rsingleTag.test(match[1]) && jQuery.isPlainObject(context)) {
                for (match in context) {
                  if (jQuery.isFunction(this[match])) {
                    this[match](context[match]);
                  } else {
                    this.attr(match, context[match]);
                  }
                }
              }
              return this;
            } else {
              elem = document.getElementById(match[2]);
              if (elem && elem.parentNode) {
                this.length = 1;
                this[0] = elem;
              }
              this.context = document;
              this.selector = selector;
              return this;
            }
          } else if (!context || context.jquery) {
            return (context || rootjQuery).find(selector);
          } else {
            return this.constructor(context).find(selector);
          }
        } else if (selector.nodeType) {
          this.context = this[0] = selector;
          this.length = 1;
          return this;
        } else if (jQuery.isFunction(selector)) {
          return typeof rootjQuery.ready !== "undefined" ? rootjQuery.ready(selector) : selector(jQuery);
        }
        if (selector.selector !== undefined) {
          this.selector = selector.selector;
          this.context = selector.context;
        }
        return jQuery.makeArray(selector, this);
      };
  init.prototype = jQuery.fn;
  rootjQuery = jQuery(document);
  var rparentsprev = /^(?:parents|prev(?:Until|All))/,
      guaranteedUnique = {
        children: true,
        contents: true,
        next: true,
        prev: true
      };
  jQuery.extend({
    dir: function(elem, dir, until) {
      var matched = [],
          truncate = until !== undefined;
      while ((elem = elem[dir]) && elem.nodeType !== 9) {
        if (elem.nodeType === 1) {
          if (truncate && jQuery(elem).is(until)) {
            break;
          }
          matched.push(elem);
        }
      }
      return matched;
    },
    sibling: function(n, elem) {
      var matched = [];
      for (; n; n = n.nextSibling) {
        if (n.nodeType === 1 && n !== elem) {
          matched.push(n);
        }
      }
      return matched;
    }
  });
  jQuery.fn.extend({
    has: function(target) {
      var targets = jQuery(target, this),
          l = targets.length;
      return this.filter(function() {
        var i = 0;
        for (; i < l; i++) {
          if (jQuery.contains(this, targets[i])) {
            return true;
          }
        }
      });
    },
    closest: function(selectors, context) {
      var cur,
          i = 0,
          l = this.length,
          matched = [],
          pos = rneedsContext.test(selectors) || typeof selectors !== "string" ? jQuery(selectors, context || this.context) : 0;
      for (; i < l; i++) {
        for (cur = this[i]; cur && cur !== context; cur = cur.parentNode) {
          if (cur.nodeType < 11 && (pos ? pos.index(cur) > -1 : cur.nodeType === 1 && jQuery.find.matchesSelector(cur, selectors))) {
            matched.push(cur);
            break;
          }
        }
      }
      return this.pushStack(matched.length > 1 ? jQuery.unique(matched) : matched);
    },
    index: function(elem) {
      if (!elem) {
        return (this[0] && this[0].parentNode) ? this.first().prevAll().length : -1;
      }
      if (typeof elem === "string") {
        return indexOf.call(jQuery(elem), this[0]);
      }
      return indexOf.call(this, elem.jquery ? elem[0] : elem);
    },
    add: function(selector, context) {
      return this.pushStack(jQuery.unique(jQuery.merge(this.get(), jQuery(selector, context))));
    },
    addBack: function(selector) {
      return this.add(selector == null ? this.prevObject : this.prevObject.filter(selector));
    }
  });
  function sibling(cur, dir) {
    while ((cur = cur[dir]) && cur.nodeType !== 1) {}
    return cur;
  }
  jQuery.each({
    parent: function(elem) {
      var parent = elem.parentNode;
      return parent && parent.nodeType !== 11 ? parent : null;
    },
    parents: function(elem) {
      return jQuery.dir(elem, "parentNode");
    },
    parentsUntil: function(elem, i, until) {
      return jQuery.dir(elem, "parentNode", until);
    },
    next: function(elem) {
      return sibling(elem, "nextSibling");
    },
    prev: function(elem) {
      return sibling(elem, "previousSibling");
    },
    nextAll: function(elem) {
      return jQuery.dir(elem, "nextSibling");
    },
    prevAll: function(elem) {
      return jQuery.dir(elem, "previousSibling");
    },
    nextUntil: function(elem, i, until) {
      return jQuery.dir(elem, "nextSibling", until);
    },
    prevUntil: function(elem, i, until) {
      return jQuery.dir(elem, "previousSibling", until);
    },
    siblings: function(elem) {
      return jQuery.sibling((elem.parentNode || {}).firstChild, elem);
    },
    children: function(elem) {
      return jQuery.sibling(elem.firstChild);
    },
    contents: function(elem) {
      return elem.contentDocument || jQuery.merge([], elem.childNodes);
    }
  }, function(name, fn) {
    jQuery.fn[name] = function(until, selector) {
      var matched = jQuery.map(this, fn, until);
      if (name.slice(-5) !== "Until") {
        selector = until;
      }
      if (selector && typeof selector === "string") {
        matched = jQuery.filter(selector, matched);
      }
      if (this.length > 1) {
        if (!guaranteedUnique[name]) {
          jQuery.unique(matched);
        }
        if (rparentsprev.test(name)) {
          matched.reverse();
        }
      }
      return this.pushStack(matched);
    };
  });
  var rnotwhite = (/\S+/g);
  var optionsCache = {};
  function createOptions(options) {
    var object = optionsCache[options] = {};
    jQuery.each(options.match(rnotwhite) || [], function(_, flag) {
      object[flag] = true;
    });
    return object;
  }
  jQuery.Callbacks = function(options) {
    options = typeof options === "string" ? (optionsCache[options] || createOptions(options)) : jQuery.extend({}, options);
    var memory,
        fired,
        firing,
        firingStart,
        firingLength,
        firingIndex,
        list = [],
        stack = !options.once && [],
        fire = function(data) {
          memory = options.memory && data;
          fired = true;
          firingIndex = firingStart || 0;
          firingStart = 0;
          firingLength = list.length;
          firing = true;
          for (; list && firingIndex < firingLength; firingIndex++) {
            if (list[firingIndex].apply(data[0], data[1]) === false && options.stopOnFalse) {
              memory = false;
              break;
            }
          }
          firing = false;
          if (list) {
            if (stack) {
              if (stack.length) {
                fire(stack.shift());
              }
            } else if (memory) {
              list = [];
            } else {
              self.disable();
            }
          }
        },
        self = {
          add: function() {
            if (list) {
              var start = list.length;
              (function add(args) {
                jQuery.each(args, function(_, arg) {
                  var type = jQuery.type(arg);
                  if (type === "function") {
                    if (!options.unique || !self.has(arg)) {
                      list.push(arg);
                    }
                  } else if (arg && arg.length && type !== "string") {
                    add(arg);
                  }
                });
              })(arguments);
              if (firing) {
                firingLength = list.length;
              } else if (memory) {
                firingStart = start;
                fire(memory);
              }
            }
            return this;
          },
          remove: function() {
            if (list) {
              jQuery.each(arguments, function(_, arg) {
                var index;
                while ((index = jQuery.inArray(arg, list, index)) > -1) {
                  list.splice(index, 1);
                  if (firing) {
                    if (index <= firingLength) {
                      firingLength--;
                    }
                    if (index <= firingIndex) {
                      firingIndex--;
                    }
                  }
                }
              });
            }
            return this;
          },
          has: function(fn) {
            return fn ? jQuery.inArray(fn, list) > -1 : !!(list && list.length);
          },
          empty: function() {
            list = [];
            firingLength = 0;
            return this;
          },
          disable: function() {
            list = stack = memory = undefined;
            return this;
          },
          disabled: function() {
            return !list;
          },
          lock: function() {
            stack = undefined;
            if (!memory) {
              self.disable();
            }
            return this;
          },
          locked: function() {
            return !stack;
          },
          fireWith: function(context, args) {
            if (list && (!fired || stack)) {
              args = args || [];
              args = [context, args.slice ? args.slice() : args];
              if (firing) {
                stack.push(args);
              } else {
                fire(args);
              }
            }
            return this;
          },
          fire: function() {
            self.fireWith(this, arguments);
            return this;
          },
          fired: function() {
            return !!fired;
          }
        };
    return self;
  };
  jQuery.extend({
    Deferred: function(func) {
      var tuples = [["resolve", "done", jQuery.Callbacks("once memory"), "resolved"], ["reject", "fail", jQuery.Callbacks("once memory"), "rejected"], ["notify", "progress", jQuery.Callbacks("memory")]],
          state = "pending",
          promise = {
            state: function() {
              return state;
            },
            always: function() {
              deferred.done(arguments).fail(arguments);
              return this;
            },
            then: function() {
              var fns = arguments;
              return jQuery.Deferred(function(newDefer) {
                jQuery.each(tuples, function(i, tuple) {
                  var fn = jQuery.isFunction(fns[i]) && fns[i];
                  deferred[tuple[1]](function() {
                    var returned = fn && fn.apply(this, arguments);
                    if (returned && jQuery.isFunction(returned.promise)) {
                      returned.promise().done(newDefer.resolve).fail(newDefer.reject).progress(newDefer.notify);
                    } else {
                      newDefer[tuple[0] + "With"](this === promise ? newDefer.promise() : this, fn ? [returned] : arguments);
                    }
                  });
                });
                fns = null;
              }).promise();
            },
            promise: function(obj) {
              return obj != null ? jQuery.extend(obj, promise) : promise;
            }
          },
          deferred = {};
      promise.pipe = promise.then;
      jQuery.each(tuples, function(i, tuple) {
        var list = tuple[2],
            stateString = tuple[3];
        promise[tuple[1]] = list.add;
        if (stateString) {
          list.add(function() {
            state = stateString;
          }, tuples[i ^ 1][2].disable, tuples[2][2].lock);
        }
        deferred[tuple[0]] = function() {
          deferred[tuple[0] + "With"](this === deferred ? promise : this, arguments);
          return this;
        };
        deferred[tuple[0] + "With"] = list.fireWith;
      });
      promise.promise(deferred);
      if (func) {
        func.call(deferred, deferred);
      }
      return deferred;
    },
    when: function(subordinate) {
      var i = 0,
          resolveValues = slice.call(arguments),
          length = resolveValues.length,
          remaining = length !== 1 || (subordinate && jQuery.isFunction(subordinate.promise)) ? length : 0,
          deferred = remaining === 1 ? subordinate : jQuery.Deferred(),
          updateFunc = function(i, contexts, values) {
            return function(value) {
              contexts[i] = this;
              values[i] = arguments.length > 1 ? slice.call(arguments) : value;
              if (values === progressValues) {
                deferred.notifyWith(contexts, values);
              } else if (!(--remaining)) {
                deferred.resolveWith(contexts, values);
              }
            };
          },
          progressValues,
          progressContexts,
          resolveContexts;
      if (length > 1) {
        progressValues = new Array(length);
        progressContexts = new Array(length);
        resolveContexts = new Array(length);
        for (; i < length; i++) {
          if (resolveValues[i] && jQuery.isFunction(resolveValues[i].promise)) {
            resolveValues[i].promise().done(updateFunc(i, resolveContexts, resolveValues)).fail(deferred.reject).progress(updateFunc(i, progressContexts, progressValues));
          } else {
            --remaining;
          }
        }
      }
      if (!remaining) {
        deferred.resolveWith(resolveContexts, resolveValues);
      }
      return deferred.promise();
    }
  });
  var readyList;
  jQuery.fn.ready = function(fn) {
    jQuery.ready.promise().done(fn);
    return this;
  };
  jQuery.extend({
    isReady: false,
    readyWait: 1,
    holdReady: function(hold) {
      if (hold) {
        jQuery.readyWait++;
      } else {
        jQuery.ready(true);
      }
    },
    ready: function(wait) {
      if (wait === true ? --jQuery.readyWait : jQuery.isReady) {
        return ;
      }
      jQuery.isReady = true;
      if (wait !== true && --jQuery.readyWait > 0) {
        return ;
      }
      readyList.resolveWith(document, [jQuery]);
      if (jQuery.fn.triggerHandler) {
        jQuery(document).triggerHandler("ready");
        jQuery(document).off("ready");
      }
    }
  });
  function completed() {
    document.removeEventListener("DOMContentLoaded", completed, false);
    window.removeEventListener("load", completed, false);
    jQuery.ready();
  }
  jQuery.ready.promise = function(obj) {
    if (!readyList) {
      readyList = jQuery.Deferred();
      if (document.readyState === "complete") {
        setTimeout(jQuery.ready);
      } else {
        document.addEventListener("DOMContentLoaded", completed, false);
        window.addEventListener("load", completed, false);
      }
    }
    return readyList.promise(obj);
  };
  jQuery.ready.promise();
  var access = jQuery.access = function(elems, fn, key, value, chainable, emptyGet, raw) {
    var i = 0,
        len = elems.length,
        bulk = key == null;
    if (jQuery.type(key) === "object") {
      chainable = true;
      for (i in key) {
        jQuery.access(elems, fn, i, key[i], true, emptyGet, raw);
      }
    } else if (value !== undefined) {
      chainable = true;
      if (!jQuery.isFunction(value)) {
        raw = true;
      }
      if (bulk) {
        if (raw) {
          fn.call(elems, value);
          fn = null;
        } else {
          bulk = fn;
          fn = function(elem, key, value) {
            return bulk.call(jQuery(elem), value);
          };
        }
      }
      if (fn) {
        for (; i < len; i++) {
          fn(elems[i], key, raw ? value : value.call(elems[i], i, fn(elems[i], key)));
        }
      }
    }
    return chainable ? elems : bulk ? fn.call(elems) : len ? fn(elems[0], key) : emptyGet;
  };
  jQuery.acceptData = function(owner) {
    return owner.nodeType === 1 || owner.nodeType === 9 || !(+owner.nodeType);
  };
  function Data() {
    Object.defineProperty(this.cache = {}, 0, {get: function() {
        return {};
      }});
    this.expando = jQuery.expando + Data.uid++;
  }
  Data.uid = 1;
  Data.accepts = jQuery.acceptData;
  Data.prototype = {
    key: function(owner) {
      if (!Data.accepts(owner)) {
        return 0;
      }
      var descriptor = {},
          unlock = owner[this.expando];
      if (!unlock) {
        unlock = Data.uid++;
        try {
          descriptor[this.expando] = {value: unlock};
          Object.defineProperties(owner, descriptor);
        } catch (e) {
          descriptor[this.expando] = unlock;
          jQuery.extend(owner, descriptor);
        }
      }
      if (!this.cache[unlock]) {
        this.cache[unlock] = {};
      }
      return unlock;
    },
    set: function(owner, data, value) {
      var prop,
          unlock = this.key(owner),
          cache = this.cache[unlock];
      if (typeof data === "string") {
        cache[data] = value;
      } else {
        if (jQuery.isEmptyObject(cache)) {
          jQuery.extend(this.cache[unlock], data);
        } else {
          for (prop in data) {
            cache[prop] = data[prop];
          }
        }
      }
      return cache;
    },
    get: function(owner, key) {
      var cache = this.cache[this.key(owner)];
      return key === undefined ? cache : cache[key];
    },
    access: function(owner, key, value) {
      var stored;
      if (key === undefined || ((key && typeof key === "string") && value === undefined)) {
        stored = this.get(owner, key);
        return stored !== undefined ? stored : this.get(owner, jQuery.camelCase(key));
      }
      this.set(owner, key, value);
      return value !== undefined ? value : key;
    },
    remove: function(owner, key) {
      var i,
          name,
          camel,
          unlock = this.key(owner),
          cache = this.cache[unlock];
      if (key === undefined) {
        this.cache[unlock] = {};
      } else {
        if (jQuery.isArray(key)) {
          name = key.concat(key.map(jQuery.camelCase));
        } else {
          camel = jQuery.camelCase(key);
          if (key in cache) {
            name = [key, camel];
          } else {
            name = camel;
            name = name in cache ? [name] : (name.match(rnotwhite) || []);
          }
        }
        i = name.length;
        while (i--) {
          delete cache[name[i]];
        }
      }
    },
    hasData: function(owner) {
      return !jQuery.isEmptyObject(this.cache[owner[this.expando]] || {});
    },
    discard: function(owner) {
      if (owner[this.expando]) {
        delete this.cache[owner[this.expando]];
      }
    }
  };
  var data_priv = new Data();
  var data_user = new Data();
  var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
      rmultiDash = /([A-Z])/g;
  function dataAttr(elem, key, data) {
    var name;
    if (data === undefined && elem.nodeType === 1) {
      name = "data-" + key.replace(rmultiDash, "-$1").toLowerCase();
      data = elem.getAttribute(name);
      if (typeof data === "string") {
        try {
          data = data === "true" ? true : data === "false" ? false : data === "null" ? null : +data + "" === data ? +data : rbrace.test(data) ? jQuery.parseJSON(data) : data;
        } catch (e) {}
        data_user.set(elem, key, data);
      } else {
        data = undefined;
      }
    }
    return data;
  }
  jQuery.extend({
    hasData: function(elem) {
      return data_user.hasData(elem) || data_priv.hasData(elem);
    },
    data: function(elem, name, data) {
      return data_user.access(elem, name, data);
    },
    removeData: function(elem, name) {
      data_user.remove(elem, name);
    },
    _data: function(elem, name, data) {
      return data_priv.access(elem, name, data);
    },
    _removeData: function(elem, name) {
      data_priv.remove(elem, name);
    }
  });
  jQuery.fn.extend({
    data: function(key, value) {
      var i,
          name,
          data,
          elem = this[0],
          attrs = elem && elem.attributes;
      if (key === undefined) {
        if (this.length) {
          data = data_user.get(elem);
          if (elem.nodeType === 1 && !data_priv.get(elem, "hasDataAttrs")) {
            i = attrs.length;
            while (i--) {
              if (attrs[i]) {
                name = attrs[i].name;
                if (name.indexOf("data-") === 0) {
                  name = jQuery.camelCase(name.slice(5));
                  dataAttr(elem, name, data[name]);
                }
              }
            }
            data_priv.set(elem, "hasDataAttrs", true);
          }
        }
        return data;
      }
      if (typeof key === "object") {
        return this.each(function() {
          data_user.set(this, key);
        });
      }
      return access(this, function(value) {
        var data,
            camelKey = jQuery.camelCase(key);
        if (elem && value === undefined) {
          data = data_user.get(elem, key);
          if (data !== undefined) {
            return data;
          }
          data = data_user.get(elem, camelKey);
          if (data !== undefined) {
            return data;
          }
          data = dataAttr(elem, camelKey, undefined);
          if (data !== undefined) {
            return data;
          }
          return ;
        }
        this.each(function() {
          var data = data_user.get(this, camelKey);
          data_user.set(this, camelKey, value);
          if (key.indexOf("-") !== -1 && data !== undefined) {
            data_user.set(this, key, value);
          }
        });
      }, null, value, arguments.length > 1, null, true);
    },
    removeData: function(key) {
      return this.each(function() {
        data_user.remove(this, key);
      });
    }
  });
  jQuery.extend({
    queue: function(elem, type, data) {
      var queue;
      if (elem) {
        type = (type || "fx") + "queue";
        queue = data_priv.get(elem, type);
        if (data) {
          if (!queue || jQuery.isArray(data)) {
            queue = data_priv.access(elem, type, jQuery.makeArray(data));
          } else {
            queue.push(data);
          }
        }
        return queue || [];
      }
    },
    dequeue: function(elem, type) {
      type = type || "fx";
      var queue = jQuery.queue(elem, type),
          startLength = queue.length,
          fn = queue.shift(),
          hooks = jQuery._queueHooks(elem, type),
          next = function() {
            jQuery.dequeue(elem, type);
          };
      if (fn === "inprogress") {
        fn = queue.shift();
        startLength--;
      }
      if (fn) {
        if (type === "fx") {
          queue.unshift("inprogress");
        }
        delete hooks.stop;
        fn.call(elem, next, hooks);
      }
      if (!startLength && hooks) {
        hooks.empty.fire();
      }
    },
    _queueHooks: function(elem, type) {
      var key = type + "queueHooks";
      return data_priv.get(elem, key) || data_priv.access(elem, key, {empty: jQuery.Callbacks("once memory").add(function() {
          data_priv.remove(elem, [type + "queue", key]);
        })});
    }
  });
  jQuery.fn.extend({
    queue: function(type, data) {
      var setter = 2;
      if (typeof type !== "string") {
        data = type;
        type = "fx";
        setter--;
      }
      if (arguments.length < setter) {
        return jQuery.queue(this[0], type);
      }
      return data === undefined ? this : this.each(function() {
        var queue = jQuery.queue(this, type, data);
        jQuery._queueHooks(this, type);
        if (type === "fx" && queue[0] !== "inprogress") {
          jQuery.dequeue(this, type);
        }
      });
    },
    dequeue: function(type) {
      return this.each(function() {
        jQuery.dequeue(this, type);
      });
    },
    clearQueue: function(type) {
      return this.queue(type || "fx", []);
    },
    promise: function(type, obj) {
      var tmp,
          count = 1,
          defer = jQuery.Deferred(),
          elements = this,
          i = this.length,
          resolve = function() {
            if (!(--count)) {
              defer.resolveWith(elements, [elements]);
            }
          };
      if (typeof type !== "string") {
        obj = type;
        type = undefined;
      }
      type = type || "fx";
      while (i--) {
        tmp = data_priv.get(elements[i], type + "queueHooks");
        if (tmp && tmp.empty) {
          count++;
          tmp.empty.add(resolve);
        }
      }
      resolve();
      return defer.promise(obj);
    }
  });
  var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;
  var cssExpand = ["Top", "Right", "Bottom", "Left"];
  var isHidden = function(elem, el) {
    elem = el || elem;
    return jQuery.css(elem, "display") === "none" || !jQuery.contains(elem.ownerDocument, elem);
  };
  var rcheckableType = (/^(?:checkbox|radio)$/i);
  (function() {
    var fragment = document.createDocumentFragment(),
        div = fragment.appendChild(document.createElement("div")),
        input = document.createElement("input");
    input.setAttribute("type", "radio");
    input.setAttribute("checked", "checked");
    input.setAttribute("name", "t");
    div.appendChild(input);
    support.checkClone = div.cloneNode(true).cloneNode(true).lastChild.checked;
    div.innerHTML = "<textarea>x</textarea>";
    support.noCloneChecked = !!div.cloneNode(true).lastChild.defaultValue;
  })();
  var strundefined = typeof undefined;
  support.focusinBubbles = "onfocusin" in window;
  var rkeyEvent = /^key/,
      rmouseEvent = /^(?:mouse|pointer|contextmenu)|click/,
      rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
      rtypenamespace = /^([^.]*)(?:\.(.+)|)$/;
  function returnTrue() {
    return true;
  }
  function returnFalse() {
    return false;
  }
  function safeActiveElement() {
    try {
      return document.activeElement;
    } catch (err) {}
  }
  jQuery.event = {
    global: {},
    add: function(elem, types, handler, data, selector) {
      var handleObjIn,
          eventHandle,
          tmp,
          events,
          t,
          handleObj,
          special,
          handlers,
          type,
          namespaces,
          origType,
          elemData = data_priv.get(elem);
      if (!elemData) {
        return ;
      }
      if (handler.handler) {
        handleObjIn = handler;
        handler = handleObjIn.handler;
        selector = handleObjIn.selector;
      }
      if (!handler.guid) {
        handler.guid = jQuery.guid++;
      }
      if (!(events = elemData.events)) {
        events = elemData.events = {};
      }
      if (!(eventHandle = elemData.handle)) {
        eventHandle = elemData.handle = function(e) {
          return typeof jQuery !== strundefined && jQuery.event.triggered !== e.type ? jQuery.event.dispatch.apply(elem, arguments) : undefined;
        };
      }
      types = (types || "").match(rnotwhite) || [""];
      t = types.length;
      while (t--) {
        tmp = rtypenamespace.exec(types[t]) || [];
        type = origType = tmp[1];
        namespaces = (tmp[2] || "").split(".").sort();
        if (!type) {
          continue;
        }
        special = jQuery.event.special[type] || {};
        type = (selector ? special.delegateType : special.bindType) || type;
        special = jQuery.event.special[type] || {};
        handleObj = jQuery.extend({
          type: type,
          origType: origType,
          data: data,
          handler: handler,
          guid: handler.guid,
          selector: selector,
          needsContext: selector && jQuery.expr.match.needsContext.test(selector),
          namespace: namespaces.join(".")
        }, handleObjIn);
        if (!(handlers = events[type])) {
          handlers = events[type] = [];
          handlers.delegateCount = 0;
          if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {
            if (elem.addEventListener) {
              elem.addEventListener(type, eventHandle, false);
            }
          }
        }
        if (special.add) {
          special.add.call(elem, handleObj);
          if (!handleObj.handler.guid) {
            handleObj.handler.guid = handler.guid;
          }
        }
        if (selector) {
          handlers.splice(handlers.delegateCount++, 0, handleObj);
        } else {
          handlers.push(handleObj);
        }
        jQuery.event.global[type] = true;
      }
    },
    remove: function(elem, types, handler, selector, mappedTypes) {
      var j,
          origCount,
          tmp,
          events,
          t,
          handleObj,
          special,
          handlers,
          type,
          namespaces,
          origType,
          elemData = data_priv.hasData(elem) && data_priv.get(elem);
      if (!elemData || !(events = elemData.events)) {
        return ;
      }
      types = (types || "").match(rnotwhite) || [""];
      t = types.length;
      while (t--) {
        tmp = rtypenamespace.exec(types[t]) || [];
        type = origType = tmp[1];
        namespaces = (tmp[2] || "").split(".").sort();
        if (!type) {
          for (type in events) {
            jQuery.event.remove(elem, type + types[t], handler, selector, true);
          }
          continue;
        }
        special = jQuery.event.special[type] || {};
        type = (selector ? special.delegateType : special.bindType) || type;
        handlers = events[type] || [];
        tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)");
        origCount = j = handlers.length;
        while (j--) {
          handleObj = handlers[j];
          if ((mappedTypes || origType === handleObj.origType) && (!handler || handler.guid === handleObj.guid) && (!tmp || tmp.test(handleObj.namespace)) && (!selector || selector === handleObj.selector || selector === "**" && handleObj.selector)) {
            handlers.splice(j, 1);
            if (handleObj.selector) {
              handlers.delegateCount--;
            }
            if (special.remove) {
              special.remove.call(elem, handleObj);
            }
          }
        }
        if (origCount && !handlers.length) {
          if (!special.teardown || special.teardown.call(elem, namespaces, elemData.handle) === false) {
            jQuery.removeEvent(elem, type, elemData.handle);
          }
          delete events[type];
        }
      }
      if (jQuery.isEmptyObject(events)) {
        delete elemData.handle;
        data_priv.remove(elem, "events");
      }
    },
    trigger: function(event, data, elem, onlyHandlers) {
      var i,
          cur,
          tmp,
          bubbleType,
          ontype,
          handle,
          special,
          eventPath = [elem || document],
          type = hasOwn.call(event, "type") ? event.type : event,
          namespaces = hasOwn.call(event, "namespace") ? event.namespace.split(".") : [];
      cur = tmp = elem = elem || document;
      if (elem.nodeType === 3 || elem.nodeType === 8) {
        return ;
      }
      if (rfocusMorph.test(type + jQuery.event.triggered)) {
        return ;
      }
      if (type.indexOf(".") >= 0) {
        namespaces = type.split(".");
        type = namespaces.shift();
        namespaces.sort();
      }
      ontype = type.indexOf(":") < 0 && "on" + type;
      event = event[jQuery.expando] ? event : new jQuery.Event(type, typeof event === "object" && event);
      event.isTrigger = onlyHandlers ? 2 : 3;
      event.namespace = namespaces.join(".");
      event.namespace_re = event.namespace ? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;
      event.result = undefined;
      if (!event.target) {
        event.target = elem;
      }
      data = data == null ? [event] : jQuery.makeArray(data, [event]);
      special = jQuery.event.special[type] || {};
      if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
        return ;
      }
      if (!onlyHandlers && !special.noBubble && !jQuery.isWindow(elem)) {
        bubbleType = special.delegateType || type;
        if (!rfocusMorph.test(bubbleType + type)) {
          cur = cur.parentNode;
        }
        for (; cur; cur = cur.parentNode) {
          eventPath.push(cur);
          tmp = cur;
        }
        if (tmp === (elem.ownerDocument || document)) {
          eventPath.push(tmp.defaultView || tmp.parentWindow || window);
        }
      }
      i = 0;
      while ((cur = eventPath[i++]) && !event.isPropagationStopped()) {
        event.type = i > 1 ? bubbleType : special.bindType || type;
        handle = (data_priv.get(cur, "events") || {})[event.type] && data_priv.get(cur, "handle");
        if (handle) {
          handle.apply(cur, data);
        }
        handle = ontype && cur[ontype];
        if (handle && handle.apply && jQuery.acceptData(cur)) {
          event.result = handle.apply(cur, data);
          if (event.result === false) {
            event.preventDefault();
          }
        }
      }
      event.type = type;
      if (!onlyHandlers && !event.isDefaultPrevented()) {
        if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && jQuery.acceptData(elem)) {
          if (ontype && jQuery.isFunction(elem[type]) && !jQuery.isWindow(elem)) {
            tmp = elem[ontype];
            if (tmp) {
              elem[ontype] = null;
            }
            jQuery.event.triggered = type;
            elem[type]();
            jQuery.event.triggered = undefined;
            if (tmp) {
              elem[ontype] = tmp;
            }
          }
        }
      }
      return event.result;
    },
    dispatch: function(event) {
      event = jQuery.event.fix(event);
      var i,
          j,
          ret,
          matched,
          handleObj,
          handlerQueue = [],
          args = slice.call(arguments),
          handlers = (data_priv.get(this, "events") || {})[event.type] || [],
          special = jQuery.event.special[event.type] || {};
      args[0] = event;
      event.delegateTarget = this;
      if (special.preDispatch && special.preDispatch.call(this, event) === false) {
        return ;
      }
      handlerQueue = jQuery.event.handlers.call(this, event, handlers);
      i = 0;
      while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
        event.currentTarget = matched.elem;
        j = 0;
        while ((handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()) {
          if (!event.namespace_re || event.namespace_re.test(handleObj.namespace)) {
            event.handleObj = handleObj;
            event.data = handleObj.data;
            ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);
            if (ret !== undefined) {
              if ((event.result = ret) === false) {
                event.preventDefault();
                event.stopPropagation();
              }
            }
          }
        }
      }
      if (special.postDispatch) {
        special.postDispatch.call(this, event);
      }
      return event.result;
    },
    handlers: function(event, handlers) {
      var i,
          matches,
          sel,
          handleObj,
          handlerQueue = [],
          delegateCount = handlers.delegateCount,
          cur = event.target;
      if (delegateCount && cur.nodeType && (!event.button || event.type !== "click")) {
        for (; cur !== this; cur = cur.parentNode || this) {
          if (cur.disabled !== true || event.type !== "click") {
            matches = [];
            for (i = 0; i < delegateCount; i++) {
              handleObj = handlers[i];
              sel = handleObj.selector + " ";
              if (matches[sel] === undefined) {
                matches[sel] = handleObj.needsContext ? jQuery(sel, this).index(cur) >= 0 : jQuery.find(sel, this, null, [cur]).length;
              }
              if (matches[sel]) {
                matches.push(handleObj);
              }
            }
            if (matches.length) {
              handlerQueue.push({
                elem: cur,
                handlers: matches
              });
            }
          }
        }
      }
      if (delegateCount < handlers.length) {
        handlerQueue.push({
          elem: this,
          handlers: handlers.slice(delegateCount)
        });
      }
      return handlerQueue;
    },
    props: "altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),
    fixHooks: {},
    keyHooks: {
      props: "char charCode key keyCode".split(" "),
      filter: function(event, original) {
        if (event.which == null) {
          event.which = original.charCode != null ? original.charCode : original.keyCode;
        }
        return event;
      }
    },
    mouseHooks: {
      props: "button buttons clientX clientY offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
      filter: function(event, original) {
        var eventDoc,
            doc,
            body,
            button = original.button;
        if (event.pageX == null && original.clientX != null) {
          eventDoc = event.target.ownerDocument || document;
          doc = eventDoc.documentElement;
          body = eventDoc.body;
          event.pageX = original.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc && doc.clientLeft || body && body.clientLeft || 0);
          event.pageY = original.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc && doc.clientTop || body && body.clientTop || 0);
        }
        if (!event.which && button !== undefined) {
          event.which = (button & 1 ? 1 : (button & 2 ? 3 : (button & 4 ? 2 : 0)));
        }
        return event;
      }
    },
    fix: function(event) {
      if (event[jQuery.expando]) {
        return event;
      }
      var i,
          prop,
          copy,
          type = event.type,
          originalEvent = event,
          fixHook = this.fixHooks[type];
      if (!fixHook) {
        this.fixHooks[type] = fixHook = rmouseEvent.test(type) ? this.mouseHooks : rkeyEvent.test(type) ? this.keyHooks : {};
      }
      copy = fixHook.props ? this.props.concat(fixHook.props) : this.props;
      event = new jQuery.Event(originalEvent);
      i = copy.length;
      while (i--) {
        prop = copy[i];
        event[prop] = originalEvent[prop];
      }
      if (!event.target) {
        event.target = document;
      }
      if (event.target.nodeType === 3) {
        event.target = event.target.parentNode;
      }
      return fixHook.filter ? fixHook.filter(event, originalEvent) : event;
    },
    special: {
      load: {noBubble: true},
      focus: {
        trigger: function() {
          if (this !== safeActiveElement() && this.focus) {
            this.focus();
            return false;
          }
        },
        delegateType: "focusin"
      },
      blur: {
        trigger: function() {
          if (this === safeActiveElement() && this.blur) {
            this.blur();
            return false;
          }
        },
        delegateType: "focusout"
      },
      click: {
        trigger: function() {
          if (this.type === "checkbox" && this.click && jQuery.nodeName(this, "input")) {
            this.click();
            return false;
          }
        },
        _default: function(event) {
          return jQuery.nodeName(event.target, "a");
        }
      },
      beforeunload: {postDispatch: function(event) {
          if (event.result !== undefined && event.originalEvent) {
            event.originalEvent.returnValue = event.result;
          }
        }}
    },
    simulate: function(type, elem, event, bubble) {
      var e = jQuery.extend(new jQuery.Event(), event, {
        type: type,
        isSimulated: true,
        originalEvent: {}
      });
      if (bubble) {
        jQuery.event.trigger(e, null, elem);
      } else {
        jQuery.event.dispatch.call(elem, e);
      }
      if (e.isDefaultPrevented()) {
        event.preventDefault();
      }
    }
  };
  jQuery.removeEvent = function(elem, type, handle) {
    if (elem.removeEventListener) {
      elem.removeEventListener(type, handle, false);
    }
  };
  jQuery.Event = function(src, props) {
    if (!(this instanceof jQuery.Event)) {
      return new jQuery.Event(src, props);
    }
    if (src && src.type) {
      this.originalEvent = src;
      this.type = src.type;
      this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined && src.returnValue === false ? returnTrue : returnFalse;
    } else {
      this.type = src;
    }
    if (props) {
      jQuery.extend(this, props);
    }
    this.timeStamp = src && src.timeStamp || jQuery.now();
    this[jQuery.expando] = true;
  };
  jQuery.Event.prototype = {
    isDefaultPrevented: returnFalse,
    isPropagationStopped: returnFalse,
    isImmediatePropagationStopped: returnFalse,
    preventDefault: function() {
      var e = this.originalEvent;
      this.isDefaultPrevented = returnTrue;
      if (e && e.preventDefault) {
        e.preventDefault();
      }
    },
    stopPropagation: function() {
      var e = this.originalEvent;
      this.isPropagationStopped = returnTrue;
      if (e && e.stopPropagation) {
        e.stopPropagation();
      }
    },
    stopImmediatePropagation: function() {
      var e = this.originalEvent;
      this.isImmediatePropagationStopped = returnTrue;
      if (e && e.stopImmediatePropagation) {
        e.stopImmediatePropagation();
      }
      this.stopPropagation();
    }
  };
  jQuery.each({
    mouseenter: "mouseover",
    mouseleave: "mouseout",
    pointerenter: "pointerover",
    pointerleave: "pointerout"
  }, function(orig, fix) {
    jQuery.event.special[orig] = {
      delegateType: fix,
      bindType: fix,
      handle: function(event) {
        var ret,
            target = this,
            related = event.relatedTarget,
            handleObj = event.handleObj;
        if (!related || (related !== target && !jQuery.contains(target, related))) {
          event.type = handleObj.origType;
          ret = handleObj.handler.apply(this, arguments);
          event.type = fix;
        }
        return ret;
      }
    };
  });
  if (!support.focusinBubbles) {
    jQuery.each({
      focus: "focusin",
      blur: "focusout"
    }, function(orig, fix) {
      var handler = function(event) {
        jQuery.event.simulate(fix, event.target, jQuery.event.fix(event), true);
      };
      jQuery.event.special[fix] = {
        setup: function() {
          var doc = this.ownerDocument || this,
              attaches = data_priv.access(doc, fix);
          if (!attaches) {
            doc.addEventListener(orig, handler, true);
          }
          data_priv.access(doc, fix, (attaches || 0) + 1);
        },
        teardown: function() {
          var doc = this.ownerDocument || this,
              attaches = data_priv.access(doc, fix) - 1;
          if (!attaches) {
            doc.removeEventListener(orig, handler, true);
            data_priv.remove(doc, fix);
          } else {
            data_priv.access(doc, fix, attaches);
          }
        }
      };
    });
  }
  jQuery.fn.extend({
    on: function(types, selector, data, fn, one) {
      var origFn,
          type;
      if (typeof types === "object") {
        if (typeof selector !== "string") {
          data = data || selector;
          selector = undefined;
        }
        for (type in types) {
          this.on(type, selector, data, types[type], one);
        }
        return this;
      }
      if (data == null && fn == null) {
        fn = selector;
        data = selector = undefined;
      } else if (fn == null) {
        if (typeof selector === "string") {
          fn = data;
          data = undefined;
        } else {
          fn = data;
          data = selector;
          selector = undefined;
        }
      }
      if (fn === false) {
        fn = returnFalse;
      } else if (!fn) {
        return this;
      }
      if (one === 1) {
        origFn = fn;
        fn = function(event) {
          jQuery().off(event);
          return origFn.apply(this, arguments);
        };
        fn.guid = origFn.guid || (origFn.guid = jQuery.guid++);
      }
      return this.each(function() {
        jQuery.event.add(this, types, fn, data, selector);
      });
    },
    one: function(types, selector, data, fn) {
      return this.on(types, selector, data, fn, 1);
    },
    off: function(types, selector, fn) {
      var handleObj,
          type;
      if (types && types.preventDefault && types.handleObj) {
        handleObj = types.handleObj;
        jQuery(types.delegateTarget).off(handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType, handleObj.selector, handleObj.handler);
        return this;
      }
      if (typeof types === "object") {
        for (type in types) {
          this.off(type, selector, types[type]);
        }
        return this;
      }
      if (selector === false || typeof selector === "function") {
        fn = selector;
        selector = undefined;
      }
      if (fn === false) {
        fn = returnFalse;
      }
      return this.each(function() {
        jQuery.event.remove(this, types, fn, selector);
      });
    },
    trigger: function(type, data) {
      return this.each(function() {
        jQuery.event.trigger(type, data, this);
      });
    },
    triggerHandler: function(type, data) {
      var elem = this[0];
      if (elem) {
        return jQuery.event.trigger(type, data, elem, true);
      }
    }
  });
  var rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,
      rtagName = /<([\w:]+)/,
      rhtml = /<|&#?\w+;/,
      rnoInnerhtml = /<(?:script|style|link)/i,
      rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
      rscriptType = /^$|\/(?:java|ecma)script/i,
      rscriptTypeMasked = /^true\/(.*)/,
      rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,
      wrapMap = {
        option: [1, "<select multiple='multiple'>", "</select>"],
        thead: [1, "<table>", "</table>"],
        col: [2, "<table><colgroup>", "</colgroup></table>"],
        tr: [2, "<table><tbody>", "</tbody></table>"],
        td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
        _default: [0, "", ""]
      };
  wrapMap.optgroup = wrapMap.option;
  wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
  wrapMap.th = wrapMap.td;
  function manipulationTarget(elem, content) {
    return jQuery.nodeName(elem, "table") && jQuery.nodeName(content.nodeType !== 11 ? content : content.firstChild, "tr") ? elem.getElementsByTagName("tbody")[0] || elem.appendChild(elem.ownerDocument.createElement("tbody")) : elem;
  }
  function disableScript(elem) {
    elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
    return elem;
  }
  function restoreScript(elem) {
    var match = rscriptTypeMasked.exec(elem.type);
    if (match) {
      elem.type = match[1];
    } else {
      elem.removeAttribute("type");
    }
    return elem;
  }
  function setGlobalEval(elems, refElements) {
    var i = 0,
        l = elems.length;
    for (; i < l; i++) {
      data_priv.set(elems[i], "globalEval", !refElements || data_priv.get(refElements[i], "globalEval"));
    }
  }
  function cloneCopyEvent(src, dest) {
    var i,
        l,
        type,
        pdataOld,
        pdataCur,
        udataOld,
        udataCur,
        events;
    if (dest.nodeType !== 1) {
      return ;
    }
    if (data_priv.hasData(src)) {
      pdataOld = data_priv.access(src);
      pdataCur = data_priv.set(dest, pdataOld);
      events = pdataOld.events;
      if (events) {
        delete pdataCur.handle;
        pdataCur.events = {};
        for (type in events) {
          for (i = 0, l = events[type].length; i < l; i++) {
            jQuery.event.add(dest, type, events[type][i]);
          }
        }
      }
    }
    if (data_user.hasData(src)) {
      udataOld = data_user.access(src);
      udataCur = jQuery.extend({}, udataOld);
      data_user.set(dest, udataCur);
    }
  }
  function getAll(context, tag) {
    var ret = context.getElementsByTagName ? context.getElementsByTagName(tag || "*") : context.querySelectorAll ? context.querySelectorAll(tag || "*") : [];
    return tag === undefined || tag && jQuery.nodeName(context, tag) ? jQuery.merge([context], ret) : ret;
  }
  function fixInput(src, dest) {
    var nodeName = dest.nodeName.toLowerCase();
    if (nodeName === "input" && rcheckableType.test(src.type)) {
      dest.checked = src.checked;
    } else if (nodeName === "input" || nodeName === "textarea") {
      dest.defaultValue = src.defaultValue;
    }
  }
  jQuery.extend({
    clone: function(elem, dataAndEvents, deepDataAndEvents) {
      var i,
          l,
          srcElements,
          destElements,
          clone = elem.cloneNode(true),
          inPage = jQuery.contains(elem.ownerDocument, elem);
      if (!support.noCloneChecked && (elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem)) {
        destElements = getAll(clone);
        srcElements = getAll(elem);
        for (i = 0, l = srcElements.length; i < l; i++) {
          fixInput(srcElements[i], destElements[i]);
        }
      }
      if (dataAndEvents) {
        if (deepDataAndEvents) {
          srcElements = srcElements || getAll(elem);
          destElements = destElements || getAll(clone);
          for (i = 0, l = srcElements.length; i < l; i++) {
            cloneCopyEvent(srcElements[i], destElements[i]);
          }
        } else {
          cloneCopyEvent(elem, clone);
        }
      }
      destElements = getAll(clone, "script");
      if (destElements.length > 0) {
        setGlobalEval(destElements, !inPage && getAll(elem, "script"));
      }
      return clone;
    },
    buildFragment: function(elems, context, scripts, selection) {
      var elem,
          tmp,
          tag,
          wrap,
          contains,
          j,
          fragment = context.createDocumentFragment(),
          nodes = [],
          i = 0,
          l = elems.length;
      for (; i < l; i++) {
        elem = elems[i];
        if (elem || elem === 0) {
          if (jQuery.type(elem) === "object") {
            jQuery.merge(nodes, elem.nodeType ? [elem] : elem);
          } else if (!rhtml.test(elem)) {
            nodes.push(context.createTextNode(elem));
          } else {
            tmp = tmp || fragment.appendChild(context.createElement("div"));
            tag = (rtagName.exec(elem) || ["", ""])[1].toLowerCase();
            wrap = wrapMap[tag] || wrapMap._default;
            tmp.innerHTML = wrap[1] + elem.replace(rxhtmlTag, "<$1></$2>") + wrap[2];
            j = wrap[0];
            while (j--) {
              tmp = tmp.lastChild;
            }
            jQuery.merge(nodes, tmp.childNodes);
            tmp = fragment.firstChild;
            tmp.textContent = "";
          }
        }
      }
      fragment.textContent = "";
      i = 0;
      while ((elem = nodes[i++])) {
        if (selection && jQuery.inArray(elem, selection) !== -1) {
          continue;
        }
        contains = jQuery.contains(elem.ownerDocument, elem);
        tmp = getAll(fragment.appendChild(elem), "script");
        if (contains) {
          setGlobalEval(tmp);
        }
        if (scripts) {
          j = 0;
          while ((elem = tmp[j++])) {
            if (rscriptType.test(elem.type || "")) {
              scripts.push(elem);
            }
          }
        }
      }
      return fragment;
    },
    cleanData: function(elems) {
      var data,
          elem,
          type,
          key,
          special = jQuery.event.special,
          i = 0;
      for (; (elem = elems[i]) !== undefined; i++) {
        if (jQuery.acceptData(elem)) {
          key = elem[data_priv.expando];
          if (key && (data = data_priv.cache[key])) {
            if (data.events) {
              for (type in data.events) {
                if (special[type]) {
                  jQuery.event.remove(elem, type);
                } else {
                  jQuery.removeEvent(elem, type, data.handle);
                }
              }
            }
            if (data_priv.cache[key]) {
              delete data_priv.cache[key];
            }
          }
        }
        delete data_user.cache[elem[data_user.expando]];
      }
    }
  });
  jQuery.fn.extend({
    text: function(value) {
      return access(this, function(value) {
        return value === undefined ? jQuery.text(this) : this.empty().each(function() {
          if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
            this.textContent = value;
          }
        });
      }, null, value, arguments.length);
    },
    append: function() {
      return this.domManip(arguments, function(elem) {
        if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
          var target = manipulationTarget(this, elem);
          target.appendChild(elem);
        }
      });
    },
    prepend: function() {
      return this.domManip(arguments, function(elem) {
        if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
          var target = manipulationTarget(this, elem);
          target.insertBefore(elem, target.firstChild);
        }
      });
    },
    before: function() {
      return this.domManip(arguments, function(elem) {
        if (this.parentNode) {
          this.parentNode.insertBefore(elem, this);
        }
      });
    },
    after: function() {
      return this.domManip(arguments, function(elem) {
        if (this.parentNode) {
          this.parentNode.insertBefore(elem, this.nextSibling);
        }
      });
    },
    remove: function(selector, keepData) {
      var elem,
          elems = selector ? jQuery.filter(selector, this) : this,
          i = 0;
      for (; (elem = elems[i]) != null; i++) {
        if (!keepData && elem.nodeType === 1) {
          jQuery.cleanData(getAll(elem));
        }
        if (elem.parentNode) {
          if (keepData && jQuery.contains(elem.ownerDocument, elem)) {
            setGlobalEval(getAll(elem, "script"));
          }
          elem.parentNode.removeChild(elem);
        }
      }
      return this;
    },
    empty: function() {
      var elem,
          i = 0;
      for (; (elem = this[i]) != null; i++) {
        if (elem.nodeType === 1) {
          jQuery.cleanData(getAll(elem, false));
          elem.textContent = "";
        }
      }
      return this;
    },
    clone: function(dataAndEvents, deepDataAndEvents) {
      dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
      deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
      return this.map(function() {
        return jQuery.clone(this, dataAndEvents, deepDataAndEvents);
      });
    },
    html: function(value) {
      return access(this, function(value) {
        var elem = this[0] || {},
            i = 0,
            l = this.length;
        if (value === undefined && elem.nodeType === 1) {
          return elem.innerHTML;
        }
        if (typeof value === "string" && !rnoInnerhtml.test(value) && !wrapMap[(rtagName.exec(value) || ["", ""])[1].toLowerCase()]) {
          value = value.replace(rxhtmlTag, "<$1></$2>");
          try {
            for (; i < l; i++) {
              elem = this[i] || {};
              if (elem.nodeType === 1) {
                jQuery.cleanData(getAll(elem, false));
                elem.innerHTML = value;
              }
            }
            elem = 0;
          } catch (e) {}
        }
        if (elem) {
          this.empty().append(value);
        }
      }, null, value, arguments.length);
    },
    replaceWith: function() {
      var arg = arguments[0];
      this.domManip(arguments, function(elem) {
        arg = this.parentNode;
        jQuery.cleanData(getAll(this));
        if (arg) {
          arg.replaceChild(elem, this);
        }
      });
      return arg && (arg.length || arg.nodeType) ? this : this.remove();
    },
    detach: function(selector) {
      return this.remove(selector, true);
    },
    domManip: function(args, callback) {
      args = concat.apply([], args);
      var fragment,
          first,
          scripts,
          hasScripts,
          node,
          doc,
          i = 0,
          l = this.length,
          set = this,
          iNoClone = l - 1,
          value = args[0],
          isFunction = jQuery.isFunction(value);
      if (isFunction || (l > 1 && typeof value === "string" && !support.checkClone && rchecked.test(value))) {
        return this.each(function(index) {
          var self = set.eq(index);
          if (isFunction) {
            args[0] = value.call(this, index, self.html());
          }
          self.domManip(args, callback);
        });
      }
      if (l) {
        fragment = jQuery.buildFragment(args, this[0].ownerDocument, false, this);
        first = fragment.firstChild;
        if (fragment.childNodes.length === 1) {
          fragment = first;
        }
        if (first) {
          scripts = jQuery.map(getAll(fragment, "script"), disableScript);
          hasScripts = scripts.length;
          for (; i < l; i++) {
            node = fragment;
            if (i !== iNoClone) {
              node = jQuery.clone(node, true, true);
              if (hasScripts) {
                jQuery.merge(scripts, getAll(node, "script"));
              }
            }
            callback.call(this[i], node, i);
          }
          if (hasScripts) {
            doc = scripts[scripts.length - 1].ownerDocument;
            jQuery.map(scripts, restoreScript);
            for (i = 0; i < hasScripts; i++) {
              node = scripts[i];
              if (rscriptType.test(node.type || "") && !data_priv.access(node, "globalEval") && jQuery.contains(doc, node)) {
                if (node.src) {
                  if (jQuery._evalUrl) {
                    jQuery._evalUrl(node.src);
                  }
                } else {
                  jQuery.globalEval(node.textContent.replace(rcleanScript, ""));
                }
              }
            }
          }
        }
      }
      return this;
    }
  });
  jQuery.each({
    appendTo: "append",
    prependTo: "prepend",
    insertBefore: "before",
    insertAfter: "after",
    replaceAll: "replaceWith"
  }, function(name, original) {
    jQuery.fn[name] = function(selector) {
      var elems,
          ret = [],
          insert = jQuery(selector),
          last = insert.length - 1,
          i = 0;
      for (; i <= last; i++) {
        elems = i === last ? this : this.clone(true);
        jQuery(insert[i])[original](elems);
        push.apply(ret, elems.get());
      }
      return this.pushStack(ret);
    };
  });
  var iframe,
      elemdisplay = {};
  function actualDisplay(name, doc) {
    var style,
        elem = jQuery(doc.createElement(name)).appendTo(doc.body),
        display = window.getDefaultComputedStyle && (style = window.getDefaultComputedStyle(elem[0])) ? style.display : jQuery.css(elem[0], "display");
    elem.detach();
    return display;
  }
  function defaultDisplay(nodeName) {
    var doc = document,
        display = elemdisplay[nodeName];
    if (!display) {
      display = actualDisplay(nodeName, doc);
      if (display === "none" || !display) {
        iframe = (iframe || jQuery("<iframe frameborder='0' width='0' height='0'/>")).appendTo(doc.documentElement);
        doc = iframe[0].contentDocument;
        doc.write();
        doc.close();
        display = actualDisplay(nodeName, doc);
        iframe.detach();
      }
      elemdisplay[nodeName] = display;
    }
    return display;
  }
  var rmargin = (/^margin/);
  var rnumnonpx = new RegExp("^(" + pnum + ")(?!px)[a-z%]+$", "i");
  var getStyles = function(elem) {
    if (elem.ownerDocument.defaultView.opener) {
      return elem.ownerDocument.defaultView.getComputedStyle(elem, null);
    }
    return window.getComputedStyle(elem, null);
  };
  function curCSS(elem, name, computed) {
    var width,
        minWidth,
        maxWidth,
        ret,
        style = elem.style;
    computed = computed || getStyles(elem);
    if (computed) {
      ret = computed.getPropertyValue(name) || computed[name];
    }
    if (computed) {
      if (ret === "" && !jQuery.contains(elem.ownerDocument, elem)) {
        ret = jQuery.style(elem, name);
      }
      if (rnumnonpx.test(ret) && rmargin.test(name)) {
        width = style.width;
        minWidth = style.minWidth;
        maxWidth = style.maxWidth;
        style.minWidth = style.maxWidth = style.width = ret;
        ret = computed.width;
        style.width = width;
        style.minWidth = minWidth;
        style.maxWidth = maxWidth;
      }
    }
    return ret !== undefined ? ret + "" : ret;
  }
  function addGetHookIf(conditionFn, hookFn) {
    return {get: function() {
        if (conditionFn()) {
          delete this.get;
          return ;
        }
        return (this.get = hookFn).apply(this, arguments);
      }};
  }
  (function() {
    var pixelPositionVal,
        boxSizingReliableVal,
        docElem = document.documentElement,
        container = document.createElement("div"),
        div = document.createElement("div");
    if (!div.style) {
      return ;
    }
    div.style.backgroundClip = "content-box";
    div.cloneNode(true).style.backgroundClip = "";
    support.clearCloneStyle = div.style.backgroundClip === "content-box";
    container.style.cssText = "border:0;width:0;height:0;top:0;left:-9999px;margin-top:1px;" + "position:absolute";
    container.appendChild(div);
    function computePixelPositionAndBoxSizingReliable() {
      div.style.cssText = "-webkit-box-sizing:border-box;-moz-box-sizing:border-box;" + "box-sizing:border-box;display:block;margin-top:1%;top:1%;" + "border:1px;padding:1px;width:4px;position:absolute";
      div.innerHTML = "";
      docElem.appendChild(container);
      var divStyle = window.getComputedStyle(div, null);
      pixelPositionVal = divStyle.top !== "1%";
      boxSizingReliableVal = divStyle.width === "4px";
      docElem.removeChild(container);
    }
    if (window.getComputedStyle) {
      jQuery.extend(support, {
        pixelPosition: function() {
          computePixelPositionAndBoxSizingReliable();
          return pixelPositionVal;
        },
        boxSizingReliable: function() {
          if (boxSizingReliableVal == null) {
            computePixelPositionAndBoxSizingReliable();
          }
          return boxSizingReliableVal;
        },
        reliableMarginRight: function() {
          var ret,
              marginDiv = div.appendChild(document.createElement("div"));
          marginDiv.style.cssText = div.style.cssText = "-webkit-box-sizing:content-box;-moz-box-sizing:content-box;" + "box-sizing:content-box;display:block;margin:0;border:0;padding:0";
          marginDiv.style.marginRight = marginDiv.style.width = "0";
          div.style.width = "1px";
          docElem.appendChild(container);
          ret = !parseFloat(window.getComputedStyle(marginDiv, null).marginRight);
          docElem.removeChild(container);
          div.removeChild(marginDiv);
          return ret;
        }
      });
    }
  })();
  jQuery.swap = function(elem, options, callback, args) {
    var ret,
        name,
        old = {};
    for (name in options) {
      old[name] = elem.style[name];
      elem.style[name] = options[name];
    }
    ret = callback.apply(elem, args || []);
    for (name in options) {
      elem.style[name] = old[name];
    }
    return ret;
  };
  var rdisplayswap = /^(none|table(?!-c[ea]).+)/,
      rnumsplit = new RegExp("^(" + pnum + ")(.*)$", "i"),
      rrelNum = new RegExp("^([+-])=(" + pnum + ")", "i"),
      cssShow = {
        position: "absolute",
        visibility: "hidden",
        display: "block"
      },
      cssNormalTransform = {
        letterSpacing: "0",
        fontWeight: "400"
      },
      cssPrefixes = ["Webkit", "O", "Moz", "ms"];
  function vendorPropName(style, name) {
    if (name in style) {
      return name;
    }
    var capName = name[0].toUpperCase() + name.slice(1),
        origName = name,
        i = cssPrefixes.length;
    while (i--) {
      name = cssPrefixes[i] + capName;
      if (name in style) {
        return name;
      }
    }
    return origName;
  }
  function setPositiveNumber(elem, value, subtract) {
    var matches = rnumsplit.exec(value);
    return matches ? Math.max(0, matches[1] - (subtract || 0)) + (matches[2] || "px") : value;
  }
  function augmentWidthOrHeight(elem, name, extra, isBorderBox, styles) {
    var i = extra === (isBorderBox ? "border" : "content") ? 4 : name === "width" ? 1 : 0,
        val = 0;
    for (; i < 4; i += 2) {
      if (extra === "margin") {
        val += jQuery.css(elem, extra + cssExpand[i], true, styles);
      }
      if (isBorderBox) {
        if (extra === "content") {
          val -= jQuery.css(elem, "padding" + cssExpand[i], true, styles);
        }
        if (extra !== "margin") {
          val -= jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
        }
      } else {
        val += jQuery.css(elem, "padding" + cssExpand[i], true, styles);
        if (extra !== "padding") {
          val += jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
        }
      }
    }
    return val;
  }
  function getWidthOrHeight(elem, name, extra) {
    var valueIsBorderBox = true,
        val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
        styles = getStyles(elem),
        isBorderBox = jQuery.css(elem, "boxSizing", false, styles) === "border-box";
    if (val <= 0 || val == null) {
      val = curCSS(elem, name, styles);
      if (val < 0 || val == null) {
        val = elem.style[name];
      }
      if (rnumnonpx.test(val)) {
        return val;
      }
      valueIsBorderBox = isBorderBox && (support.boxSizingReliable() || val === elem.style[name]);
      val = parseFloat(val) || 0;
    }
    return (val + augmentWidthOrHeight(elem, name, extra || (isBorderBox ? "border" : "content"), valueIsBorderBox, styles)) + "px";
  }
  function showHide(elements, show) {
    var display,
        elem,
        hidden,
        values = [],
        index = 0,
        length = elements.length;
    for (; index < length; index++) {
      elem = elements[index];
      if (!elem.style) {
        continue;
      }
      values[index] = data_priv.get(elem, "olddisplay");
      display = elem.style.display;
      if (show) {
        if (!values[index] && display === "none") {
          elem.style.display = "";
        }
        if (elem.style.display === "" && isHidden(elem)) {
          values[index] = data_priv.access(elem, "olddisplay", defaultDisplay(elem.nodeName));
        }
      } else {
        hidden = isHidden(elem);
        if (display !== "none" || !hidden) {
          data_priv.set(elem, "olddisplay", hidden ? display : jQuery.css(elem, "display"));
        }
      }
    }
    for (index = 0; index < length; index++) {
      elem = elements[index];
      if (!elem.style) {
        continue;
      }
      if (!show || elem.style.display === "none" || elem.style.display === "") {
        elem.style.display = show ? values[index] || "" : "none";
      }
    }
    return elements;
  }
  jQuery.extend({
    cssHooks: {opacity: {get: function(elem, computed) {
          if (computed) {
            var ret = curCSS(elem, "opacity");
            return ret === "" ? "1" : ret;
          }
        }}},
    cssNumber: {
      "columnCount": true,
      "fillOpacity": true,
      "flexGrow": true,
      "flexShrink": true,
      "fontWeight": true,
      "lineHeight": true,
      "opacity": true,
      "order": true,
      "orphans": true,
      "widows": true,
      "zIndex": true,
      "zoom": true
    },
    cssProps: {"float": "cssFloat"},
    style: function(elem, name, value, extra) {
      if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style) {
        return ;
      }
      var ret,
          type,
          hooks,
          origName = jQuery.camelCase(name),
          style = elem.style;
      name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(style, origName));
      hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
      if (value !== undefined) {
        type = typeof value;
        if (type === "string" && (ret = rrelNum.exec(value))) {
          value = (ret[1] + 1) * ret[2] + parseFloat(jQuery.css(elem, name));
          type = "number";
        }
        if (value == null || value !== value) {
          return ;
        }
        if (type === "number" && !jQuery.cssNumber[origName]) {
          value += "px";
        }
        if (!support.clearCloneStyle && value === "" && name.indexOf("background") === 0) {
          style[name] = "inherit";
        }
        if (!hooks || !("set" in hooks) || (value = hooks.set(elem, value, extra)) !== undefined) {
          style[name] = value;
        }
      } else {
        if (hooks && "get" in hooks && (ret = hooks.get(elem, false, extra)) !== undefined) {
          return ret;
        }
        return style[name];
      }
    },
    css: function(elem, name, extra, styles) {
      var val,
          num,
          hooks,
          origName = jQuery.camelCase(name);
      name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(elem.style, origName));
      hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
      if (hooks && "get" in hooks) {
        val = hooks.get(elem, true, extra);
      }
      if (val === undefined) {
        val = curCSS(elem, name, styles);
      }
      if (val === "normal" && name in cssNormalTransform) {
        val = cssNormalTransform[name];
      }
      if (extra === "" || extra) {
        num = parseFloat(val);
        return extra === true || jQuery.isNumeric(num) ? num || 0 : val;
      }
      return val;
    }
  });
  jQuery.each(["height", "width"], function(i, name) {
    jQuery.cssHooks[name] = {
      get: function(elem, computed, extra) {
        if (computed) {
          return rdisplayswap.test(jQuery.css(elem, "display")) && elem.offsetWidth === 0 ? jQuery.swap(elem, cssShow, function() {
            return getWidthOrHeight(elem, name, extra);
          }) : getWidthOrHeight(elem, name, extra);
        }
      },
      set: function(elem, value, extra) {
        var styles = extra && getStyles(elem);
        return setPositiveNumber(elem, value, extra ? augmentWidthOrHeight(elem, name, extra, jQuery.css(elem, "boxSizing", false, styles) === "border-box", styles) : 0);
      }
    };
  });
  jQuery.cssHooks.marginRight = addGetHookIf(support.reliableMarginRight, function(elem, computed) {
    if (computed) {
      return jQuery.swap(elem, {"display": "inline-block"}, curCSS, [elem, "marginRight"]);
    }
  });
  jQuery.each({
    margin: "",
    padding: "",
    border: "Width"
  }, function(prefix, suffix) {
    jQuery.cssHooks[prefix + suffix] = {expand: function(value) {
        var i = 0,
            expanded = {},
            parts = typeof value === "string" ? value.split(" ") : [value];
        for (; i < 4; i++) {
          expanded[prefix + cssExpand[i] + suffix] = parts[i] || parts[i - 2] || parts[0];
        }
        return expanded;
      }};
    if (!rmargin.test(prefix)) {
      jQuery.cssHooks[prefix + suffix].set = setPositiveNumber;
    }
  });
  jQuery.fn.extend({
    css: function(name, value) {
      return access(this, function(elem, name, value) {
        var styles,
            len,
            map = {},
            i = 0;
        if (jQuery.isArray(name)) {
          styles = getStyles(elem);
          len = name.length;
          for (; i < len; i++) {
            map[name[i]] = jQuery.css(elem, name[i], false, styles);
          }
          return map;
        }
        return value !== undefined ? jQuery.style(elem, name, value) : jQuery.css(elem, name);
      }, name, value, arguments.length > 1);
    },
    show: function() {
      return showHide(this, true);
    },
    hide: function() {
      return showHide(this);
    },
    toggle: function(state) {
      if (typeof state === "boolean") {
        return state ? this.show() : this.hide();
      }
      return this.each(function() {
        if (isHidden(this)) {
          jQuery(this).show();
        } else {
          jQuery(this).hide();
        }
      });
    }
  });
  function Tween(elem, options, prop, end, easing) {
    return new Tween.prototype.init(elem, options, prop, end, easing);
  }
  jQuery.Tween = Tween;
  Tween.prototype = {
    constructor: Tween,
    init: function(elem, options, prop, end, easing, unit) {
      this.elem = elem;
      this.prop = prop;
      this.easing = easing || "swing";
      this.options = options;
      this.start = this.now = this.cur();
      this.end = end;
      this.unit = unit || (jQuery.cssNumber[prop] ? "" : "px");
    },
    cur: function() {
      var hooks = Tween.propHooks[this.prop];
      return hooks && hooks.get ? hooks.get(this) : Tween.propHooks._default.get(this);
    },
    run: function(percent) {
      var eased,
          hooks = Tween.propHooks[this.prop];
      if (this.options.duration) {
        this.pos = eased = jQuery.easing[this.easing](percent, this.options.duration * percent, 0, 1, this.options.duration);
      } else {
        this.pos = eased = percent;
      }
      this.now = (this.end - this.start) * eased + this.start;
      if (this.options.step) {
        this.options.step.call(this.elem, this.now, this);
      }
      if (hooks && hooks.set) {
        hooks.set(this);
      } else {
        Tween.propHooks._default.set(this);
      }
      return this;
    }
  };
  Tween.prototype.init.prototype = Tween.prototype;
  Tween.propHooks = {_default: {
      get: function(tween) {
        var result;
        if (tween.elem[tween.prop] != null && (!tween.elem.style || tween.elem.style[tween.prop] == null)) {
          return tween.elem[tween.prop];
        }
        result = jQuery.css(tween.elem, tween.prop, "");
        return !result || result === "auto" ? 0 : result;
      },
      set: function(tween) {
        if (jQuery.fx.step[tween.prop]) {
          jQuery.fx.step[tween.prop](tween);
        } else if (tween.elem.style && (tween.elem.style[jQuery.cssProps[tween.prop]] != null || jQuery.cssHooks[tween.prop])) {
          jQuery.style(tween.elem, tween.prop, tween.now + tween.unit);
        } else {
          tween.elem[tween.prop] = tween.now;
        }
      }
    }};
  Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {set: function(tween) {
      if (tween.elem.nodeType && tween.elem.parentNode) {
        tween.elem[tween.prop] = tween.now;
      }
    }};
  jQuery.easing = {
    linear: function(p) {
      return p;
    },
    swing: function(p) {
      return 0.5 - Math.cos(p * Math.PI) / 2;
    }
  };
  jQuery.fx = Tween.prototype.init;
  jQuery.fx.step = {};
  var fxNow,
      timerId,
      rfxtypes = /^(?:toggle|show|hide)$/,
      rfxnum = new RegExp("^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i"),
      rrun = /queueHooks$/,
      animationPrefilters = [defaultPrefilter],
      tweeners = {"*": [function(prop, value) {
          var tween = this.createTween(prop, value),
              target = tween.cur(),
              parts = rfxnum.exec(value),
              unit = parts && parts[3] || (jQuery.cssNumber[prop] ? "" : "px"),
              start = (jQuery.cssNumber[prop] || unit !== "px" && +target) && rfxnum.exec(jQuery.css(tween.elem, prop)),
              scale = 1,
              maxIterations = 20;
          if (start && start[3] !== unit) {
            unit = unit || start[3];
            parts = parts || [];
            start = +target || 1;
            do {
              scale = scale || ".5";
              start = start / scale;
              jQuery.style(tween.elem, prop, start + unit);
            } while (scale !== (scale = tween.cur() / target) && scale !== 1 && --maxIterations);
          }
          if (parts) {
            start = tween.start = +start || +target || 0;
            tween.unit = unit;
            tween.end = parts[1] ? start + (parts[1] + 1) * parts[2] : +parts[2];
          }
          return tween;
        }]};
  function createFxNow() {
    setTimeout(function() {
      fxNow = undefined;
    });
    return (fxNow = jQuery.now());
  }
  function genFx(type, includeWidth) {
    var which,
        i = 0,
        attrs = {height: type};
    includeWidth = includeWidth ? 1 : 0;
    for (; i < 4; i += 2 - includeWidth) {
      which = cssExpand[i];
      attrs["margin" + which] = attrs["padding" + which] = type;
    }
    if (includeWidth) {
      attrs.opacity = attrs.width = type;
    }
    return attrs;
  }
  function createTween(value, prop, animation) {
    var tween,
        collection = (tweeners[prop] || []).concat(tweeners["*"]),
        index = 0,
        length = collection.length;
    for (; index < length; index++) {
      if ((tween = collection[index].call(animation, prop, value))) {
        return tween;
      }
    }
  }
  function defaultPrefilter(elem, props, opts) {
    var prop,
        value,
        toggle,
        tween,
        hooks,
        oldfire,
        display,
        checkDisplay,
        anim = this,
        orig = {},
        style = elem.style,
        hidden = elem.nodeType && isHidden(elem),
        dataShow = data_priv.get(elem, "fxshow");
    if (!opts.queue) {
      hooks = jQuery._queueHooks(elem, "fx");
      if (hooks.unqueued == null) {
        hooks.unqueued = 0;
        oldfire = hooks.empty.fire;
        hooks.empty.fire = function() {
          if (!hooks.unqueued) {
            oldfire();
          }
        };
      }
      hooks.unqueued++;
      anim.always(function() {
        anim.always(function() {
          hooks.unqueued--;
          if (!jQuery.queue(elem, "fx").length) {
            hooks.empty.fire();
          }
        });
      });
    }
    if (elem.nodeType === 1 && ("height" in props || "width" in props)) {
      opts.overflow = [style.overflow, style.overflowX, style.overflowY];
      display = jQuery.css(elem, "display");
      checkDisplay = display === "none" ? data_priv.get(elem, "olddisplay") || defaultDisplay(elem.nodeName) : display;
      if (checkDisplay === "inline" && jQuery.css(elem, "float") === "none") {
        style.display = "inline-block";
      }
    }
    if (opts.overflow) {
      style.overflow = "hidden";
      anim.always(function() {
        style.overflow = opts.overflow[0];
        style.overflowX = opts.overflow[1];
        style.overflowY = opts.overflow[2];
      });
    }
    for (prop in props) {
      value = props[prop];
      if (rfxtypes.exec(value)) {
        delete props[prop];
        toggle = toggle || value === "toggle";
        if (value === (hidden ? "hide" : "show")) {
          if (value === "show" && dataShow && dataShow[prop] !== undefined) {
            hidden = true;
          } else {
            continue;
          }
        }
        orig[prop] = dataShow && dataShow[prop] || jQuery.style(elem, prop);
      } else {
        display = undefined;
      }
    }
    if (!jQuery.isEmptyObject(orig)) {
      if (dataShow) {
        if ("hidden" in dataShow) {
          hidden = dataShow.hidden;
        }
      } else {
        dataShow = data_priv.access(elem, "fxshow", {});
      }
      if (toggle) {
        dataShow.hidden = !hidden;
      }
      if (hidden) {
        jQuery(elem).show();
      } else {
        anim.done(function() {
          jQuery(elem).hide();
        });
      }
      anim.done(function() {
        var prop;
        data_priv.remove(elem, "fxshow");
        for (prop in orig) {
          jQuery.style(elem, prop, orig[prop]);
        }
      });
      for (prop in orig) {
        tween = createTween(hidden ? dataShow[prop] : 0, prop, anim);
        if (!(prop in dataShow)) {
          dataShow[prop] = tween.start;
          if (hidden) {
            tween.end = tween.start;
            tween.start = prop === "width" || prop === "height" ? 1 : 0;
          }
        }
      }
    } else if ((display === "none" ? defaultDisplay(elem.nodeName) : display) === "inline") {
      style.display = display;
    }
  }
  function propFilter(props, specialEasing) {
    var index,
        name,
        easing,
        value,
        hooks;
    for (index in props) {
      name = jQuery.camelCase(index);
      easing = specialEasing[name];
      value = props[index];
      if (jQuery.isArray(value)) {
        easing = value[1];
        value = props[index] = value[0];
      }
      if (index !== name) {
        props[name] = value;
        delete props[index];
      }
      hooks = jQuery.cssHooks[name];
      if (hooks && "expand" in hooks) {
        value = hooks.expand(value);
        delete props[name];
        for (index in value) {
          if (!(index in props)) {
            props[index] = value[index];
            specialEasing[index] = easing;
          }
        }
      } else {
        specialEasing[name] = easing;
      }
    }
  }
  function Animation(elem, properties, options) {
    var result,
        stopped,
        index = 0,
        length = animationPrefilters.length,
        deferred = jQuery.Deferred().always(function() {
          delete tick.elem;
        }),
        tick = function() {
          if (stopped) {
            return false;
          }
          var currentTime = fxNow || createFxNow(),
              remaining = Math.max(0, animation.startTime + animation.duration - currentTime),
              temp = remaining / animation.duration || 0,
              percent = 1 - temp,
              index = 0,
              length = animation.tweens.length;
          for (; index < length; index++) {
            animation.tweens[index].run(percent);
          }
          deferred.notifyWith(elem, [animation, percent, remaining]);
          if (percent < 1 && length) {
            return remaining;
          } else {
            deferred.resolveWith(elem, [animation]);
            return false;
          }
        },
        animation = deferred.promise({
          elem: elem,
          props: jQuery.extend({}, properties),
          opts: jQuery.extend(true, {specialEasing: {}}, options),
          originalProperties: properties,
          originalOptions: options,
          startTime: fxNow || createFxNow(),
          duration: options.duration,
          tweens: [],
          createTween: function(prop, end) {
            var tween = jQuery.Tween(elem, animation.opts, prop, end, animation.opts.specialEasing[prop] || animation.opts.easing);
            animation.tweens.push(tween);
            return tween;
          },
          stop: function(gotoEnd) {
            var index = 0,
                length = gotoEnd ? animation.tweens.length : 0;
            if (stopped) {
              return this;
            }
            stopped = true;
            for (; index < length; index++) {
              animation.tweens[index].run(1);
            }
            if (gotoEnd) {
              deferred.resolveWith(elem, [animation, gotoEnd]);
            } else {
              deferred.rejectWith(elem, [animation, gotoEnd]);
            }
            return this;
          }
        }),
        props = animation.props;
    propFilter(props, animation.opts.specialEasing);
    for (; index < length; index++) {
      result = animationPrefilters[index].call(animation, elem, props, animation.opts);
      if (result) {
        return result;
      }
    }
    jQuery.map(props, createTween, animation);
    if (jQuery.isFunction(animation.opts.start)) {
      animation.opts.start.call(elem, animation);
    }
    jQuery.fx.timer(jQuery.extend(tick, {
      elem: elem,
      anim: animation,
      queue: animation.opts.queue
    }));
    return animation.progress(animation.opts.progress).done(animation.opts.done, animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always);
  }
  jQuery.Animation = jQuery.extend(Animation, {
    tweener: function(props, callback) {
      if (jQuery.isFunction(props)) {
        callback = props;
        props = ["*"];
      } else {
        props = props.split(" ");
      }
      var prop,
          index = 0,
          length = props.length;
      for (; index < length; index++) {
        prop = props[index];
        tweeners[prop] = tweeners[prop] || [];
        tweeners[prop].unshift(callback);
      }
    },
    prefilter: function(callback, prepend) {
      if (prepend) {
        animationPrefilters.unshift(callback);
      } else {
        animationPrefilters.push(callback);
      }
    }
  });
  jQuery.speed = function(speed, easing, fn) {
    var opt = speed && typeof speed === "object" ? jQuery.extend({}, speed) : {
      complete: fn || !fn && easing || jQuery.isFunction(speed) && speed,
      duration: speed,
      easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
    };
    opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration : opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[opt.duration] : jQuery.fx.speeds._default;
    if (opt.queue == null || opt.queue === true) {
      opt.queue = "fx";
    }
    opt.old = opt.complete;
    opt.complete = function() {
      if (jQuery.isFunction(opt.old)) {
        opt.old.call(this);
      }
      if (opt.queue) {
        jQuery.dequeue(this, opt.queue);
      }
    };
    return opt;
  };
  jQuery.fn.extend({
    fadeTo: function(speed, to, easing, callback) {
      return this.filter(isHidden).css("opacity", 0).show().end().animate({opacity: to}, speed, easing, callback);
    },
    animate: function(prop, speed, easing, callback) {
      var empty = jQuery.isEmptyObject(prop),
          optall = jQuery.speed(speed, easing, callback),
          doAnimation = function() {
            var anim = Animation(this, jQuery.extend({}, prop), optall);
            if (empty || data_priv.get(this, "finish")) {
              anim.stop(true);
            }
          };
      doAnimation.finish = doAnimation;
      return empty || optall.queue === false ? this.each(doAnimation) : this.queue(optall.queue, doAnimation);
    },
    stop: function(type, clearQueue, gotoEnd) {
      var stopQueue = function(hooks) {
        var stop = hooks.stop;
        delete hooks.stop;
        stop(gotoEnd);
      };
      if (typeof type !== "string") {
        gotoEnd = clearQueue;
        clearQueue = type;
        type = undefined;
      }
      if (clearQueue && type !== false) {
        this.queue(type || "fx", []);
      }
      return this.each(function() {
        var dequeue = true,
            index = type != null && type + "queueHooks",
            timers = jQuery.timers,
            data = data_priv.get(this);
        if (index) {
          if (data[index] && data[index].stop) {
            stopQueue(data[index]);
          }
        } else {
          for (index in data) {
            if (data[index] && data[index].stop && rrun.test(index)) {
              stopQueue(data[index]);
            }
          }
        }
        for (index = timers.length; index--; ) {
          if (timers[index].elem === this && (type == null || timers[index].queue === type)) {
            timers[index].anim.stop(gotoEnd);
            dequeue = false;
            timers.splice(index, 1);
          }
        }
        if (dequeue || !gotoEnd) {
          jQuery.dequeue(this, type);
        }
      });
    },
    finish: function(type) {
      if (type !== false) {
        type = type || "fx";
      }
      return this.each(function() {
        var index,
            data = data_priv.get(this),
            queue = data[type + "queue"],
            hooks = data[type + "queueHooks"],
            timers = jQuery.timers,
            length = queue ? queue.length : 0;
        data.finish = true;
        jQuery.queue(this, type, []);
        if (hooks && hooks.stop) {
          hooks.stop.call(this, true);
        }
        for (index = timers.length; index--; ) {
          if (timers[index].elem === this && timers[index].queue === type) {
            timers[index].anim.stop(true);
            timers.splice(index, 1);
          }
        }
        for (index = 0; index < length; index++) {
          if (queue[index] && queue[index].finish) {
            queue[index].finish.call(this);
          }
        }
        delete data.finish;
      });
    }
  });
  jQuery.each(["toggle", "show", "hide"], function(i, name) {
    var cssFn = jQuery.fn[name];
    jQuery.fn[name] = function(speed, easing, callback) {
      return speed == null || typeof speed === "boolean" ? cssFn.apply(this, arguments) : this.animate(genFx(name, true), speed, easing, callback);
    };
  });
  jQuery.each({
    slideDown: genFx("show"),
    slideUp: genFx("hide"),
    slideToggle: genFx("toggle"),
    fadeIn: {opacity: "show"},
    fadeOut: {opacity: "hide"},
    fadeToggle: {opacity: "toggle"}
  }, function(name, props) {
    jQuery.fn[name] = function(speed, easing, callback) {
      return this.animate(props, speed, easing, callback);
    };
  });
  jQuery.timers = [];
  jQuery.fx.tick = function() {
    var timer,
        i = 0,
        timers = jQuery.timers;
    fxNow = jQuery.now();
    for (; i < timers.length; i++) {
      timer = timers[i];
      if (!timer() && timers[i] === timer) {
        timers.splice(i--, 1);
      }
    }
    if (!timers.length) {
      jQuery.fx.stop();
    }
    fxNow = undefined;
  };
  jQuery.fx.timer = function(timer) {
    jQuery.timers.push(timer);
    if (timer()) {
      jQuery.fx.start();
    } else {
      jQuery.timers.pop();
    }
  };
  jQuery.fx.interval = 13;
  jQuery.fx.start = function() {
    if (!timerId) {
      timerId = setInterval(jQuery.fx.tick, jQuery.fx.interval);
    }
  };
  jQuery.fx.stop = function() {
    clearInterval(timerId);
    timerId = null;
  };
  jQuery.fx.speeds = {
    slow: 600,
    fast: 200,
    _default: 400
  };
  jQuery.fn.delay = function(time, type) {
    time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
    type = type || "fx";
    return this.queue(type, function(next, hooks) {
      var timeout = setTimeout(next, time);
      hooks.stop = function() {
        clearTimeout(timeout);
      };
    });
  };
  (function() {
    var input = document.createElement("input"),
        select = document.createElement("select"),
        opt = select.appendChild(document.createElement("option"));
    input.type = "checkbox";
    support.checkOn = input.value !== "";
    support.optSelected = opt.selected;
    select.disabled = true;
    support.optDisabled = !opt.disabled;
    input = document.createElement("input");
    input.value = "t";
    input.type = "radio";
    support.radioValue = input.value === "t";
  })();
  var nodeHook,
      boolHook,
      attrHandle = jQuery.expr.attrHandle;
  jQuery.fn.extend({
    attr: function(name, value) {
      return access(this, jQuery.attr, name, value, arguments.length > 1);
    },
    removeAttr: function(name) {
      return this.each(function() {
        jQuery.removeAttr(this, name);
      });
    }
  });
  jQuery.extend({
    attr: function(elem, name, value) {
      var hooks,
          ret,
          nType = elem.nodeType;
      if (!elem || nType === 3 || nType === 8 || nType === 2) {
        return ;
      }
      if (typeof elem.getAttribute === strundefined) {
        return jQuery.prop(elem, name, value);
      }
      if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
        name = name.toLowerCase();
        hooks = jQuery.attrHooks[name] || (jQuery.expr.match.bool.test(name) ? boolHook : nodeHook);
      }
      if (value !== undefined) {
        if (value === null) {
          jQuery.removeAttr(elem, name);
        } else if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
          return ret;
        } else {
          elem.setAttribute(name, value + "");
          return value;
        }
      } else if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
        return ret;
      } else {
        ret = jQuery.find.attr(elem, name);
        return ret == null ? undefined : ret;
      }
    },
    removeAttr: function(elem, value) {
      var name,
          propName,
          i = 0,
          attrNames = value && value.match(rnotwhite);
      if (attrNames && elem.nodeType === 1) {
        while ((name = attrNames[i++])) {
          propName = jQuery.propFix[name] || name;
          if (jQuery.expr.match.bool.test(name)) {
            elem[propName] = false;
          }
          elem.removeAttribute(name);
        }
      }
    },
    attrHooks: {type: {set: function(elem, value) {
          if (!support.radioValue && value === "radio" && jQuery.nodeName(elem, "input")) {
            var val = elem.value;
            elem.setAttribute("type", value);
            if (val) {
              elem.value = val;
            }
            return value;
          }
        }}}
  });
  boolHook = {set: function(elem, value, name) {
      if (value === false) {
        jQuery.removeAttr(elem, name);
      } else {
        elem.setAttribute(name, name);
      }
      return name;
    }};
  jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g), function(i, name) {
    var getter = attrHandle[name] || jQuery.find.attr;
    attrHandle[name] = function(elem, name, isXML) {
      var ret,
          handle;
      if (!isXML) {
        handle = attrHandle[name];
        attrHandle[name] = ret;
        ret = getter(elem, name, isXML) != null ? name.toLowerCase() : null;
        attrHandle[name] = handle;
      }
      return ret;
    };
  });
  var rfocusable = /^(?:input|select|textarea|button)$/i;
  jQuery.fn.extend({
    prop: function(name, value) {
      return access(this, jQuery.prop, name, value, arguments.length > 1);
    },
    removeProp: function(name) {
      return this.each(function() {
        delete this[jQuery.propFix[name] || name];
      });
    }
  });
  jQuery.extend({
    propFix: {
      "for": "htmlFor",
      "class": "className"
    },
    prop: function(elem, name, value) {
      var ret,
          hooks,
          notxml,
          nType = elem.nodeType;
      if (!elem || nType === 3 || nType === 8 || nType === 2) {
        return ;
      }
      notxml = nType !== 1 || !jQuery.isXMLDoc(elem);
      if (notxml) {
        name = jQuery.propFix[name] || name;
        hooks = jQuery.propHooks[name];
      }
      if (value !== undefined) {
        return hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined ? ret : (elem[name] = value);
      } else {
        return hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null ? ret : elem[name];
      }
    },
    propHooks: {tabIndex: {get: function(elem) {
          return elem.hasAttribute("tabindex") || rfocusable.test(elem.nodeName) || elem.href ? elem.tabIndex : -1;
        }}}
  });
  if (!support.optSelected) {
    jQuery.propHooks.selected = {get: function(elem) {
        var parent = elem.parentNode;
        if (parent && parent.parentNode) {
          parent.parentNode.selectedIndex;
        }
        return null;
      }};
  }
  jQuery.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function() {
    jQuery.propFix[this.toLowerCase()] = this;
  });
  var rclass = /[\t\r\n\f]/g;
  jQuery.fn.extend({
    addClass: function(value) {
      var classes,
          elem,
          cur,
          clazz,
          j,
          finalValue,
          proceed = typeof value === "string" && value,
          i = 0,
          len = this.length;
      if (jQuery.isFunction(value)) {
        return this.each(function(j) {
          jQuery(this).addClass(value.call(this, j, this.className));
        });
      }
      if (proceed) {
        classes = (value || "").match(rnotwhite) || [];
        for (; i < len; i++) {
          elem = this[i];
          cur = elem.nodeType === 1 && (elem.className ? (" " + elem.className + " ").replace(rclass, " ") : " ");
          if (cur) {
            j = 0;
            while ((clazz = classes[j++])) {
              if (cur.indexOf(" " + clazz + " ") < 0) {
                cur += clazz + " ";
              }
            }
            finalValue = jQuery.trim(cur);
            if (elem.className !== finalValue) {
              elem.className = finalValue;
            }
          }
        }
      }
      return this;
    },
    removeClass: function(value) {
      var classes,
          elem,
          cur,
          clazz,
          j,
          finalValue,
          proceed = arguments.length === 0 || typeof value === "string" && value,
          i = 0,
          len = this.length;
      if (jQuery.isFunction(value)) {
        return this.each(function(j) {
          jQuery(this).removeClass(value.call(this, j, this.className));
        });
      }
      if (proceed) {
        classes = (value || "").match(rnotwhite) || [];
        for (; i < len; i++) {
          elem = this[i];
          cur = elem.nodeType === 1 && (elem.className ? (" " + elem.className + " ").replace(rclass, " ") : "");
          if (cur) {
            j = 0;
            while ((clazz = classes[j++])) {
              while (cur.indexOf(" " + clazz + " ") >= 0) {
                cur = cur.replace(" " + clazz + " ", " ");
              }
            }
            finalValue = value ? jQuery.trim(cur) : "";
            if (elem.className !== finalValue) {
              elem.className = finalValue;
            }
          }
        }
      }
      return this;
    },
    toggleClass: function(value, stateVal) {
      var type = typeof value;
      if (typeof stateVal === "boolean" && type === "string") {
        return stateVal ? this.addClass(value) : this.removeClass(value);
      }
      if (jQuery.isFunction(value)) {
        return this.each(function(i) {
          jQuery(this).toggleClass(value.call(this, i, this.className, stateVal), stateVal);
        });
      }
      return this.each(function() {
        if (type === "string") {
          var className,
              i = 0,
              self = jQuery(this),
              classNames = value.match(rnotwhite) || [];
          while ((className = classNames[i++])) {
            if (self.hasClass(className)) {
              self.removeClass(className);
            } else {
              self.addClass(className);
            }
          }
        } else if (type === strundefined || type === "boolean") {
          if (this.className) {
            data_priv.set(this, "__className__", this.className);
          }
          this.className = this.className || value === false ? "" : data_priv.get(this, "__className__") || "";
        }
      });
    },
    hasClass: function(selector) {
      var className = " " + selector + " ",
          i = 0,
          l = this.length;
      for (; i < l; i++) {
        if (this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf(className) >= 0) {
          return true;
        }
      }
      return false;
    }
  });
  var rreturn = /\r/g;
  jQuery.fn.extend({val: function(value) {
      var hooks,
          ret,
          isFunction,
          elem = this[0];
      if (!arguments.length) {
        if (elem) {
          hooks = jQuery.valHooks[elem.type] || jQuery.valHooks[elem.nodeName.toLowerCase()];
          if (hooks && "get" in hooks && (ret = hooks.get(elem, "value")) !== undefined) {
            return ret;
          }
          ret = elem.value;
          return typeof ret === "string" ? ret.replace(rreturn, "") : ret == null ? "" : ret;
        }
        return ;
      }
      isFunction = jQuery.isFunction(value);
      return this.each(function(i) {
        var val;
        if (this.nodeType !== 1) {
          return ;
        }
        if (isFunction) {
          val = value.call(this, i, jQuery(this).val());
        } else {
          val = value;
        }
        if (val == null) {
          val = "";
        } else if (typeof val === "number") {
          val += "";
        } else if (jQuery.isArray(val)) {
          val = jQuery.map(val, function(value) {
            return value == null ? "" : value + "";
          });
        }
        hooks = jQuery.valHooks[this.type] || jQuery.valHooks[this.nodeName.toLowerCase()];
        if (!hooks || !("set" in hooks) || hooks.set(this, val, "value") === undefined) {
          this.value = val;
        }
      });
    }});
  jQuery.extend({valHooks: {
      option: {get: function(elem) {
          var val = jQuery.find.attr(elem, "value");
          return val != null ? val : jQuery.trim(jQuery.text(elem));
        }},
      select: {
        get: function(elem) {
          var value,
              option,
              options = elem.options,
              index = elem.selectedIndex,
              one = elem.type === "select-one" || index < 0,
              values = one ? null : [],
              max = one ? index + 1 : options.length,
              i = index < 0 ? max : one ? index : 0;
          for (; i < max; i++) {
            option = options[i];
            if ((option.selected || i === index) && (support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) && (!option.parentNode.disabled || !jQuery.nodeName(option.parentNode, "optgroup"))) {
              value = jQuery(option).val();
              if (one) {
                return value;
              }
              values.push(value);
            }
          }
          return values;
        },
        set: function(elem, value) {
          var optionSet,
              option,
              options = elem.options,
              values = jQuery.makeArray(value),
              i = options.length;
          while (i--) {
            option = options[i];
            if ((option.selected = jQuery.inArray(option.value, values) >= 0)) {
              optionSet = true;
            }
          }
          if (!optionSet) {
            elem.selectedIndex = -1;
          }
          return values;
        }
      }
    }});
  jQuery.each(["radio", "checkbox"], function() {
    jQuery.valHooks[this] = {set: function(elem, value) {
        if (jQuery.isArray(value)) {
          return (elem.checked = jQuery.inArray(jQuery(elem).val(), value) >= 0);
        }
      }};
    if (!support.checkOn) {
      jQuery.valHooks[this].get = function(elem) {
        return elem.getAttribute("value") === null ? "on" : elem.value;
      };
    }
  });
  jQuery.each(("blur focus focusin focusout load resize scroll unload click dblclick " + "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " + "change select submit keydown keypress keyup error contextmenu").split(" "), function(i, name) {
    jQuery.fn[name] = function(data, fn) {
      return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
    };
  });
  jQuery.fn.extend({
    hover: function(fnOver, fnOut) {
      return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
    },
    bind: function(types, data, fn) {
      return this.on(types, null, data, fn);
    },
    unbind: function(types, fn) {
      return this.off(types, null, fn);
    },
    delegate: function(selector, types, data, fn) {
      return this.on(types, selector, data, fn);
    },
    undelegate: function(selector, types, fn) {
      return arguments.length === 1 ? this.off(selector, "**") : this.off(types, selector || "**", fn);
    }
  });
  var nonce = jQuery.now();
  var rquery = (/\?/);
  jQuery.parseJSON = function(data) {
    return JSON.parse(data + "");
  };
  jQuery.parseXML = function(data) {
    var xml,
        tmp;
    if (!data || typeof data !== "string") {
      return null;
    }
    try {
      tmp = new DOMParser();
      xml = tmp.parseFromString(data, "text/xml");
    } catch (e) {
      xml = undefined;
    }
    if (!xml || xml.getElementsByTagName("parsererror").length) {
      jQuery.error("Invalid XML: " + data);
    }
    return xml;
  };
  var rhash = /#.*$/,
      rts = /([?&])_=[^&]*/,
      rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,
      rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
      rnoContent = /^(?:GET|HEAD)$/,
      rprotocol = /^\/\//,
      rurl = /^([\w.+-]+:)(?:\/\/(?:[^\/?#]*@|)([^\/?#:]*)(?::(\d+)|)|)/,
      prefilters = {},
      transports = {},
      allTypes = "*/".concat("*"),
      ajaxLocation = window.location.href,
      ajaxLocParts = rurl.exec(ajaxLocation.toLowerCase()) || [];
  function addToPrefiltersOrTransports(structure) {
    return function(dataTypeExpression, func) {
      if (typeof dataTypeExpression !== "string") {
        func = dataTypeExpression;
        dataTypeExpression = "*";
      }
      var dataType,
          i = 0,
          dataTypes = dataTypeExpression.toLowerCase().match(rnotwhite) || [];
      if (jQuery.isFunction(func)) {
        while ((dataType = dataTypes[i++])) {
          if (dataType[0] === "+") {
            dataType = dataType.slice(1) || "*";
            (structure[dataType] = structure[dataType] || []).unshift(func);
          } else {
            (structure[dataType] = structure[dataType] || []).push(func);
          }
        }
      }
    };
  }
  function inspectPrefiltersOrTransports(structure, options, originalOptions, jqXHR) {
    var inspected = {},
        seekingTransport = (structure === transports);
    function inspect(dataType) {
      var selected;
      inspected[dataType] = true;
      jQuery.each(structure[dataType] || [], function(_, prefilterOrFactory) {
        var dataTypeOrTransport = prefilterOrFactory(options, originalOptions, jqXHR);
        if (typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[dataTypeOrTransport]) {
          options.dataTypes.unshift(dataTypeOrTransport);
          inspect(dataTypeOrTransport);
          return false;
        } else if (seekingTransport) {
          return !(selected = dataTypeOrTransport);
        }
      });
      return selected;
    }
    return inspect(options.dataTypes[0]) || !inspected["*"] && inspect("*");
  }
  function ajaxExtend(target, src) {
    var key,
        deep,
        flatOptions = jQuery.ajaxSettings.flatOptions || {};
    for (key in src) {
      if (src[key] !== undefined) {
        (flatOptions[key] ? target : (deep || (deep = {})))[key] = src[key];
      }
    }
    if (deep) {
      jQuery.extend(true, target, deep);
    }
    return target;
  }
  function ajaxHandleResponses(s, jqXHR, responses) {
    var ct,
        type,
        finalDataType,
        firstDataType,
        contents = s.contents,
        dataTypes = s.dataTypes;
    while (dataTypes[0] === "*") {
      dataTypes.shift();
      if (ct === undefined) {
        ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
      }
    }
    if (ct) {
      for (type in contents) {
        if (contents[type] && contents[type].test(ct)) {
          dataTypes.unshift(type);
          break;
        }
      }
    }
    if (dataTypes[0] in responses) {
      finalDataType = dataTypes[0];
    } else {
      for (type in responses) {
        if (!dataTypes[0] || s.converters[type + " " + dataTypes[0]]) {
          finalDataType = type;
          break;
        }
        if (!firstDataType) {
          firstDataType = type;
        }
      }
      finalDataType = finalDataType || firstDataType;
    }
    if (finalDataType) {
      if (finalDataType !== dataTypes[0]) {
        dataTypes.unshift(finalDataType);
      }
      return responses[finalDataType];
    }
  }
  function ajaxConvert(s, response, jqXHR, isSuccess) {
    var conv2,
        current,
        conv,
        tmp,
        prev,
        converters = {},
        dataTypes = s.dataTypes.slice();
    if (dataTypes[1]) {
      for (conv in s.converters) {
        converters[conv.toLowerCase()] = s.converters[conv];
      }
    }
    current = dataTypes.shift();
    while (current) {
      if (s.responseFields[current]) {
        jqXHR[s.responseFields[current]] = response;
      }
      if (!prev && isSuccess && s.dataFilter) {
        response = s.dataFilter(response, s.dataType);
      }
      prev = current;
      current = dataTypes.shift();
      if (current) {
        if (current === "*") {
          current = prev;
        } else if (prev !== "*" && prev !== current) {
          conv = converters[prev + " " + current] || converters["* " + current];
          if (!conv) {
            for (conv2 in converters) {
              tmp = conv2.split(" ");
              if (tmp[1] === current) {
                conv = converters[prev + " " + tmp[0]] || converters["* " + tmp[0]];
                if (conv) {
                  if (conv === true) {
                    conv = converters[conv2];
                  } else if (converters[conv2] !== true) {
                    current = tmp[0];
                    dataTypes.unshift(tmp[1]);
                  }
                  break;
                }
              }
            }
          }
          if (conv !== true) {
            if (conv && s["throws"]) {
              response = conv(response);
            } else {
              try {
                response = conv(response);
              } catch (e) {
                return {
                  state: "parsererror",
                  error: conv ? e : "No conversion from " + prev + " to " + current
                };
              }
            }
          }
        }
      }
    }
    return {
      state: "success",
      data: response
    };
  }
  jQuery.extend({
    active: 0,
    lastModified: {},
    etag: {},
    ajaxSettings: {
      url: ajaxLocation,
      type: "GET",
      isLocal: rlocalProtocol.test(ajaxLocParts[1]),
      global: true,
      processData: true,
      async: true,
      contentType: "application/x-www-form-urlencoded; charset=UTF-8",
      accepts: {
        "*": allTypes,
        text: "text/plain",
        html: "text/html",
        xml: "application/xml, text/xml",
        json: "application/json, text/javascript"
      },
      contents: {
        xml: /xml/,
        html: /html/,
        json: /json/
      },
      responseFields: {
        xml: "responseXML",
        text: "responseText",
        json: "responseJSON"
      },
      converters: {
        "* text": String,
        "text html": true,
        "text json": jQuery.parseJSON,
        "text xml": jQuery.parseXML
      },
      flatOptions: {
        url: true,
        context: true
      }
    },
    ajaxSetup: function(target, settings) {
      return settings ? ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) : ajaxExtend(jQuery.ajaxSettings, target);
    },
    ajaxPrefilter: addToPrefiltersOrTransports(prefilters),
    ajaxTransport: addToPrefiltersOrTransports(transports),
    ajax: function(url, options) {
      if (typeof url === "object") {
        options = url;
        url = undefined;
      }
      options = options || {};
      var transport,
          cacheURL,
          responseHeadersString,
          responseHeaders,
          timeoutTimer,
          parts,
          fireGlobals,
          i,
          s = jQuery.ajaxSetup({}, options),
          callbackContext = s.context || s,
          globalEventContext = s.context && (callbackContext.nodeType || callbackContext.jquery) ? jQuery(callbackContext) : jQuery.event,
          deferred = jQuery.Deferred(),
          completeDeferred = jQuery.Callbacks("once memory"),
          statusCode = s.statusCode || {},
          requestHeaders = {},
          requestHeadersNames = {},
          state = 0,
          strAbort = "canceled",
          jqXHR = {
            readyState: 0,
            getResponseHeader: function(key) {
              var match;
              if (state === 2) {
                if (!responseHeaders) {
                  responseHeaders = {};
                  while ((match = rheaders.exec(responseHeadersString))) {
                    responseHeaders[match[1].toLowerCase()] = match[2];
                  }
                }
                match = responseHeaders[key.toLowerCase()];
              }
              return match == null ? null : match;
            },
            getAllResponseHeaders: function() {
              return state === 2 ? responseHeadersString : null;
            },
            setRequestHeader: function(name, value) {
              var lname = name.toLowerCase();
              if (!state) {
                name = requestHeadersNames[lname] = requestHeadersNames[lname] || name;
                requestHeaders[name] = value;
              }
              return this;
            },
            overrideMimeType: function(type) {
              if (!state) {
                s.mimeType = type;
              }
              return this;
            },
            statusCode: function(map) {
              var code;
              if (map) {
                if (state < 2) {
                  for (code in map) {
                    statusCode[code] = [statusCode[code], map[code]];
                  }
                } else {
                  jqXHR.always(map[jqXHR.status]);
                }
              }
              return this;
            },
            abort: function(statusText) {
              var finalText = statusText || strAbort;
              if (transport) {
                transport.abort(finalText);
              }
              done(0, finalText);
              return this;
            }
          };
      deferred.promise(jqXHR).complete = completeDeferred.add;
      jqXHR.success = jqXHR.done;
      jqXHR.error = jqXHR.fail;
      s.url = ((url || s.url || ajaxLocation) + "").replace(rhash, "").replace(rprotocol, ajaxLocParts[1] + "//");
      s.type = options.method || options.type || s.method || s.type;
      s.dataTypes = jQuery.trim(s.dataType || "*").toLowerCase().match(rnotwhite) || [""];
      if (s.crossDomain == null) {
        parts = rurl.exec(s.url.toLowerCase());
        s.crossDomain = !!(parts && (parts[1] !== ajaxLocParts[1] || parts[2] !== ajaxLocParts[2] || (parts[3] || (parts[1] === "http:" ? "80" : "443")) !== (ajaxLocParts[3] || (ajaxLocParts[1] === "http:" ? "80" : "443"))));
      }
      if (s.data && s.processData && typeof s.data !== "string") {
        s.data = jQuery.param(s.data, s.traditional);
      }
      inspectPrefiltersOrTransports(prefilters, s, options, jqXHR);
      if (state === 2) {
        return jqXHR;
      }
      fireGlobals = jQuery.event && s.global;
      if (fireGlobals && jQuery.active++ === 0) {
        jQuery.event.trigger("ajaxStart");
      }
      s.type = s.type.toUpperCase();
      s.hasContent = !rnoContent.test(s.type);
      cacheURL = s.url;
      if (!s.hasContent) {
        if (s.data) {
          cacheURL = (s.url += (rquery.test(cacheURL) ? "&" : "?") + s.data);
          delete s.data;
        }
        if (s.cache === false) {
          s.url = rts.test(cacheURL) ? cacheURL.replace(rts, "$1_=" + nonce++) : cacheURL + (rquery.test(cacheURL) ? "&" : "?") + "_=" + nonce++;
        }
      }
      if (s.ifModified) {
        if (jQuery.lastModified[cacheURL]) {
          jqXHR.setRequestHeader("If-Modified-Since", jQuery.lastModified[cacheURL]);
        }
        if (jQuery.etag[cacheURL]) {
          jqXHR.setRequestHeader("If-None-Match", jQuery.etag[cacheURL]);
        }
      }
      if (s.data && s.hasContent && s.contentType !== false || options.contentType) {
        jqXHR.setRequestHeader("Content-Type", s.contentType);
      }
      jqXHR.setRequestHeader("Accept", s.dataTypes[0] && s.accepts[s.dataTypes[0]] ? s.accepts[s.dataTypes[0]] + (s.dataTypes[0] !== "*" ? ", " + allTypes + "; q=0.01" : "") : s.accepts["*"]);
      for (i in s.headers) {
        jqXHR.setRequestHeader(i, s.headers[i]);
      }
      if (s.beforeSend && (s.beforeSend.call(callbackContext, jqXHR, s) === false || state === 2)) {
        return jqXHR.abort();
      }
      strAbort = "abort";
      for (i in {
        success: 1,
        error: 1,
        complete: 1
      }) {
        jqXHR[i](s[i]);
      }
      transport = inspectPrefiltersOrTransports(transports, s, options, jqXHR);
      if (!transport) {
        done(-1, "No Transport");
      } else {
        jqXHR.readyState = 1;
        if (fireGlobals) {
          globalEventContext.trigger("ajaxSend", [jqXHR, s]);
        }
        if (s.async && s.timeout > 0) {
          timeoutTimer = setTimeout(function() {
            jqXHR.abort("timeout");
          }, s.timeout);
        }
        try {
          state = 1;
          transport.send(requestHeaders, done);
        } catch (e) {
          if (state < 2) {
            done(-1, e);
          } else {
            throw e;
          }
        }
      }
      function done(status, nativeStatusText, responses, headers) {
        var isSuccess,
            success,
            error,
            response,
            modified,
            statusText = nativeStatusText;
        if (state === 2) {
          return ;
        }
        state = 2;
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
        }
        transport = undefined;
        responseHeadersString = headers || "";
        jqXHR.readyState = status > 0 ? 4 : 0;
        isSuccess = status >= 200 && status < 300 || status === 304;
        if (responses) {
          response = ajaxHandleResponses(s, jqXHR, responses);
        }
        response = ajaxConvert(s, response, jqXHR, isSuccess);
        if (isSuccess) {
          if (s.ifModified) {
            modified = jqXHR.getResponseHeader("Last-Modified");
            if (modified) {
              jQuery.lastModified[cacheURL] = modified;
            }
            modified = jqXHR.getResponseHeader("etag");
            if (modified) {
              jQuery.etag[cacheURL] = modified;
            }
          }
          if (status === 204 || s.type === "HEAD") {
            statusText = "nocontent";
          } else if (status === 304) {
            statusText = "notmodified";
          } else {
            statusText = response.state;
            success = response.data;
            error = response.error;
            isSuccess = !error;
          }
        } else {
          error = statusText;
          if (status || !statusText) {
            statusText = "error";
            if (status < 0) {
              status = 0;
            }
          }
        }
        jqXHR.status = status;
        jqXHR.statusText = (nativeStatusText || statusText) + "";
        if (isSuccess) {
          deferred.resolveWith(callbackContext, [success, statusText, jqXHR]);
        } else {
          deferred.rejectWith(callbackContext, [jqXHR, statusText, error]);
        }
        jqXHR.statusCode(statusCode);
        statusCode = undefined;
        if (fireGlobals) {
          globalEventContext.trigger(isSuccess ? "ajaxSuccess" : "ajaxError", [jqXHR, s, isSuccess ? success : error]);
        }
        completeDeferred.fireWith(callbackContext, [jqXHR, statusText]);
        if (fireGlobals) {
          globalEventContext.trigger("ajaxComplete", [jqXHR, s]);
          if (!(--jQuery.active)) {
            jQuery.event.trigger("ajaxStop");
          }
        }
      }
      return jqXHR;
    },
    getJSON: function(url, data, callback) {
      return jQuery.get(url, data, callback, "json");
    },
    getScript: function(url, callback) {
      return jQuery.get(url, undefined, callback, "script");
    }
  });
  jQuery.each(["get", "post"], function(i, method) {
    jQuery[method] = function(url, data, callback, type) {
      if (jQuery.isFunction(data)) {
        type = type || callback;
        callback = data;
        data = undefined;
      }
      return jQuery.ajax({
        url: url,
        type: method,
        dataType: type,
        data: data,
        success: callback
      });
    };
  });
  jQuery._evalUrl = function(url) {
    return jQuery.ajax({
      url: url,
      type: "GET",
      dataType: "script",
      async: false,
      global: false,
      "throws": true
    });
  };
  jQuery.fn.extend({
    wrapAll: function(html) {
      var wrap;
      if (jQuery.isFunction(html)) {
        return this.each(function(i) {
          jQuery(this).wrapAll(html.call(this, i));
        });
      }
      if (this[0]) {
        wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(true);
        if (this[0].parentNode) {
          wrap.insertBefore(this[0]);
        }
        wrap.map(function() {
          var elem = this;
          while (elem.firstElementChild) {
            elem = elem.firstElementChild;
          }
          return elem;
        }).append(this);
      }
      return this;
    },
    wrapInner: function(html) {
      if (jQuery.isFunction(html)) {
        return this.each(function(i) {
          jQuery(this).wrapInner(html.call(this, i));
        });
      }
      return this.each(function() {
        var self = jQuery(this),
            contents = self.contents();
        if (contents.length) {
          contents.wrapAll(html);
        } else {
          self.append(html);
        }
      });
    },
    wrap: function(html) {
      var isFunction = jQuery.isFunction(html);
      return this.each(function(i) {
        jQuery(this).wrapAll(isFunction ? html.call(this, i) : html);
      });
    },
    unwrap: function() {
      return this.parent().each(function() {
        if (!jQuery.nodeName(this, "body")) {
          jQuery(this).replaceWith(this.childNodes);
        }
      }).end();
    }
  });
  jQuery.expr.filters.hidden = function(elem) {
    return elem.offsetWidth <= 0 && elem.offsetHeight <= 0;
  };
  jQuery.expr.filters.visible = function(elem) {
    return !jQuery.expr.filters.hidden(elem);
  };
  var r20 = /%20/g,
      rbracket = /\[\]$/,
      rCRLF = /\r?\n/g,
      rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
      rsubmittable = /^(?:input|select|textarea|keygen)/i;
  function buildParams(prefix, obj, traditional, add) {
    var name;
    if (jQuery.isArray(obj)) {
      jQuery.each(obj, function(i, v) {
        if (traditional || rbracket.test(prefix)) {
          add(prefix, v);
        } else {
          buildParams(prefix + "[" + (typeof v === "object" ? i : "") + "]", v, traditional, add);
        }
      });
    } else if (!traditional && jQuery.type(obj) === "object") {
      for (name in obj) {
        buildParams(prefix + "[" + name + "]", obj[name], traditional, add);
      }
    } else {
      add(prefix, obj);
    }
  }
  jQuery.param = function(a, traditional) {
    var prefix,
        s = [],
        add = function(key, value) {
          value = jQuery.isFunction(value) ? value() : (value == null ? "" : value);
          s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value);
        };
    if (traditional === undefined) {
      traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
    }
    if (jQuery.isArray(a) || (a.jquery && !jQuery.isPlainObject(a))) {
      jQuery.each(a, function() {
        add(this.name, this.value);
      });
    } else {
      for (prefix in a) {
        buildParams(prefix, a[prefix], traditional, add);
      }
    }
    return s.join("&").replace(r20, "+");
  };
  jQuery.fn.extend({
    serialize: function() {
      return jQuery.param(this.serializeArray());
    },
    serializeArray: function() {
      return this.map(function() {
        var elements = jQuery.prop(this, "elements");
        return elements ? jQuery.makeArray(elements) : this;
      }).filter(function() {
        var type = this.type;
        return this.name && !jQuery(this).is(":disabled") && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type));
      }).map(function(i, elem) {
        var val = jQuery(this).val();
        return val == null ? null : jQuery.isArray(val) ? jQuery.map(val, function(val) {
          return {
            name: elem.name,
            value: val.replace(rCRLF, "\r\n")
          };
        }) : {
          name: elem.name,
          value: val.replace(rCRLF, "\r\n")
        };
      }).get();
    }
  });
  jQuery.ajaxSettings.xhr = function() {
    try {
      return new XMLHttpRequest();
    } catch (e) {}
  };
  var xhrId = 0,
      xhrCallbacks = {},
      xhrSuccessStatus = {
        0: 200,
        1223: 204
      },
      xhrSupported = jQuery.ajaxSettings.xhr();
  if (window.attachEvent) {
    window.attachEvent("onunload", function() {
      for (var key in xhrCallbacks) {
        xhrCallbacks[key]();
      }
    });
  }
  support.cors = !!xhrSupported && ("withCredentials" in xhrSupported);
  support.ajax = xhrSupported = !!xhrSupported;
  jQuery.ajaxTransport(function(options) {
    var callback;
    if (support.cors || xhrSupported && !options.crossDomain) {
      return {
        send: function(headers, complete) {
          var i,
              xhr = options.xhr(),
              id = ++xhrId;
          xhr.open(options.type, options.url, options.async, options.username, options.password);
          if (options.xhrFields) {
            for (i in options.xhrFields) {
              xhr[i] = options.xhrFields[i];
            }
          }
          if (options.mimeType && xhr.overrideMimeType) {
            xhr.overrideMimeType(options.mimeType);
          }
          if (!options.crossDomain && !headers["X-Requested-With"]) {
            headers["X-Requested-With"] = "XMLHttpRequest";
          }
          for (i in headers) {
            xhr.setRequestHeader(i, headers[i]);
          }
          callback = function(type) {
            return function() {
              if (callback) {
                delete xhrCallbacks[id];
                callback = xhr.onload = xhr.onerror = null;
                if (type === "abort") {
                  xhr.abort();
                } else if (type === "error") {
                  complete(xhr.status, xhr.statusText);
                } else {
                  complete(xhrSuccessStatus[xhr.status] || xhr.status, xhr.statusText, typeof xhr.responseText === "string" ? {text: xhr.responseText} : undefined, xhr.getAllResponseHeaders());
                }
              }
            };
          };
          xhr.onload = callback();
          xhr.onerror = callback("error");
          callback = xhrCallbacks[id] = callback("abort");
          try {
            xhr.send(options.hasContent && options.data || null);
          } catch (e) {
            if (callback) {
              throw e;
            }
          }
        },
        abort: function() {
          if (callback) {
            callback();
          }
        }
      };
    }
  });
  jQuery.ajaxSetup({
    accepts: {script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},
    contents: {script: /(?:java|ecma)script/},
    converters: {"text script": function(text) {
        jQuery.globalEval(text);
        return text;
      }}
  });
  jQuery.ajaxPrefilter("script", function(s) {
    if (s.cache === undefined) {
      s.cache = false;
    }
    if (s.crossDomain) {
      s.type = "GET";
    }
  });
  jQuery.ajaxTransport("script", function(s) {
    if (s.crossDomain) {
      var script,
          callback;
      return {
        send: function(_, complete) {
          script = jQuery("<script>").prop({
            async: true,
            charset: s.scriptCharset,
            src: s.url
          }).on("load error", callback = function(evt) {
            script.remove();
            callback = null;
            if (evt) {
              complete(evt.type === "error" ? 404 : 200, evt.type);
            }
          });
          document.head.appendChild(script[0]);
        },
        abort: function() {
          if (callback) {
            callback();
          }
        }
      };
    }
  });
  var oldCallbacks = [],
      rjsonp = /(=)\?(?=&|$)|\?\?/;
  jQuery.ajaxSetup({
    jsonp: "callback",
    jsonpCallback: function() {
      var callback = oldCallbacks.pop() || (jQuery.expando + "_" + (nonce++));
      this[callback] = true;
      return callback;
    }
  });
  jQuery.ajaxPrefilter("json jsonp", function(s, originalSettings, jqXHR) {
    var callbackName,
        overwritten,
        responseContainer,
        jsonProp = s.jsonp !== false && (rjsonp.test(s.url) ? "url" : typeof s.data === "string" && !(s.contentType || "").indexOf("application/x-www-form-urlencoded") && rjsonp.test(s.data) && "data");
    if (jsonProp || s.dataTypes[0] === "jsonp") {
      callbackName = s.jsonpCallback = jQuery.isFunction(s.jsonpCallback) ? s.jsonpCallback() : s.jsonpCallback;
      if (jsonProp) {
        s[jsonProp] = s[jsonProp].replace(rjsonp, "$1" + callbackName);
      } else if (s.jsonp !== false) {
        s.url += (rquery.test(s.url) ? "&" : "?") + s.jsonp + "=" + callbackName;
      }
      s.converters["script json"] = function() {
        if (!responseContainer) {
          jQuery.error(callbackName + " was not called");
        }
        return responseContainer[0];
      };
      s.dataTypes[0] = "json";
      overwritten = window[callbackName];
      window[callbackName] = function() {
        responseContainer = arguments;
      };
      jqXHR.always(function() {
        window[callbackName] = overwritten;
        if (s[callbackName]) {
          s.jsonpCallback = originalSettings.jsonpCallback;
          oldCallbacks.push(callbackName);
        }
        if (responseContainer && jQuery.isFunction(overwritten)) {
          overwritten(responseContainer[0]);
        }
        responseContainer = overwritten = undefined;
      });
      return "script";
    }
  });
  jQuery.parseHTML = function(data, context, keepScripts) {
    if (!data || typeof data !== "string") {
      return null;
    }
    if (typeof context === "boolean") {
      keepScripts = context;
      context = false;
    }
    context = context || document;
    var parsed = rsingleTag.exec(data),
        scripts = !keepScripts && [];
    if (parsed) {
      return [context.createElement(parsed[1])];
    }
    parsed = jQuery.buildFragment([data], context, scripts);
    if (scripts && scripts.length) {
      jQuery(scripts).remove();
    }
    return jQuery.merge([], parsed.childNodes);
  };
  var _load = jQuery.fn.load;
  jQuery.fn.load = function(url, params, callback) {
    if (typeof url !== "string" && _load) {
      return _load.apply(this, arguments);
    }
    var selector,
        type,
        response,
        self = this,
        off = url.indexOf(" ");
    if (off >= 0) {
      selector = jQuery.trim(url.slice(off));
      url = url.slice(0, off);
    }
    if (jQuery.isFunction(params)) {
      callback = params;
      params = undefined;
    } else if (params && typeof params === "object") {
      type = "POST";
    }
    if (self.length > 0) {
      jQuery.ajax({
        url: url,
        type: type,
        dataType: "html",
        data: params
      }).done(function(responseText) {
        response = arguments;
        self.html(selector ? jQuery("<div>").append(jQuery.parseHTML(responseText)).find(selector) : responseText);
      }).complete(callback && function(jqXHR, status) {
        self.each(callback, response || [jqXHR.responseText, status, jqXHR]);
      });
    }
    return this;
  };
  jQuery.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function(i, type) {
    jQuery.fn[type] = function(fn) {
      return this.on(type, fn);
    };
  });
  jQuery.expr.filters.animated = function(elem) {
    return jQuery.grep(jQuery.timers, function(fn) {
      return elem === fn.elem;
    }).length;
  };
  var docElem = window.document.documentElement;
  function getWindow(elem) {
    return jQuery.isWindow(elem) ? elem : elem.nodeType === 9 && elem.defaultView;
  }
  jQuery.offset = {setOffset: function(elem, options, i) {
      var curPosition,
          curLeft,
          curCSSTop,
          curTop,
          curOffset,
          curCSSLeft,
          calculatePosition,
          position = jQuery.css(elem, "position"),
          curElem = jQuery(elem),
          props = {};
      if (position === "static") {
        elem.style.position = "relative";
      }
      curOffset = curElem.offset();
      curCSSTop = jQuery.css(elem, "top");
      curCSSLeft = jQuery.css(elem, "left");
      calculatePosition = (position === "absolute" || position === "fixed") && (curCSSTop + curCSSLeft).indexOf("auto") > -1;
      if (calculatePosition) {
        curPosition = curElem.position();
        curTop = curPosition.top;
        curLeft = curPosition.left;
      } else {
        curTop = parseFloat(curCSSTop) || 0;
        curLeft = parseFloat(curCSSLeft) || 0;
      }
      if (jQuery.isFunction(options)) {
        options = options.call(elem, i, curOffset);
      }
      if (options.top != null) {
        props.top = (options.top - curOffset.top) + curTop;
      }
      if (options.left != null) {
        props.left = (options.left - curOffset.left) + curLeft;
      }
      if ("using" in options) {
        options.using.call(elem, props);
      } else {
        curElem.css(props);
      }
    }};
  jQuery.fn.extend({
    offset: function(options) {
      if (arguments.length) {
        return options === undefined ? this : this.each(function(i) {
          jQuery.offset.setOffset(this, options, i);
        });
      }
      var docElem,
          win,
          elem = this[0],
          box = {
            top: 0,
            left: 0
          },
          doc = elem && elem.ownerDocument;
      if (!doc) {
        return ;
      }
      docElem = doc.documentElement;
      if (!jQuery.contains(docElem, elem)) {
        return box;
      }
      if (typeof elem.getBoundingClientRect !== strundefined) {
        box = elem.getBoundingClientRect();
      }
      win = getWindow(doc);
      return {
        top: box.top + win.pageYOffset - docElem.clientTop,
        left: box.left + win.pageXOffset - docElem.clientLeft
      };
    },
    position: function() {
      if (!this[0]) {
        return ;
      }
      var offsetParent,
          offset,
          elem = this[0],
          parentOffset = {
            top: 0,
            left: 0
          };
      if (jQuery.css(elem, "position") === "fixed") {
        offset = elem.getBoundingClientRect();
      } else {
        offsetParent = this.offsetParent();
        offset = this.offset();
        if (!jQuery.nodeName(offsetParent[0], "html")) {
          parentOffset = offsetParent.offset();
        }
        parentOffset.top += jQuery.css(offsetParent[0], "borderTopWidth", true);
        parentOffset.left += jQuery.css(offsetParent[0], "borderLeftWidth", true);
      }
      return {
        top: offset.top - parentOffset.top - jQuery.css(elem, "marginTop", true),
        left: offset.left - parentOffset.left - jQuery.css(elem, "marginLeft", true)
      };
    },
    offsetParent: function() {
      return this.map(function() {
        var offsetParent = this.offsetParent || docElem;
        while (offsetParent && (!jQuery.nodeName(offsetParent, "html") && jQuery.css(offsetParent, "position") === "static")) {
          offsetParent = offsetParent.offsetParent;
        }
        return offsetParent || docElem;
      });
    }
  });
  jQuery.each({
    scrollLeft: "pageXOffset",
    scrollTop: "pageYOffset"
  }, function(method, prop) {
    var top = "pageYOffset" === prop;
    jQuery.fn[method] = function(val) {
      return access(this, function(elem, method, val) {
        var win = getWindow(elem);
        if (val === undefined) {
          return win ? win[prop] : elem[method];
        }
        if (win) {
          win.scrollTo(!top ? val : window.pageXOffset, top ? val : window.pageYOffset);
        } else {
          elem[method] = val;
        }
      }, method, val, arguments.length, null);
    };
  });
  jQuery.each(["top", "left"], function(i, prop) {
    jQuery.cssHooks[prop] = addGetHookIf(support.pixelPosition, function(elem, computed) {
      if (computed) {
        computed = curCSS(elem, prop);
        return rnumnonpx.test(computed) ? jQuery(elem).position()[prop] + "px" : computed;
      }
    });
  });
  jQuery.each({
    Height: "height",
    Width: "width"
  }, function(name, type) {
    jQuery.each({
      padding: "inner" + name,
      content: type,
      "": "outer" + name
    }, function(defaultExtra, funcName) {
      jQuery.fn[funcName] = function(margin, value) {
        var chainable = arguments.length && (defaultExtra || typeof margin !== "boolean"),
            extra = defaultExtra || (margin === true || value === true ? "margin" : "border");
        return access(this, function(elem, type, value) {
          var doc;
          if (jQuery.isWindow(elem)) {
            return elem.document.documentElement["client" + name];
          }
          if (elem.nodeType === 9) {
            doc = elem.documentElement;
            return Math.max(elem.body["scroll" + name], doc["scroll" + name], elem.body["offset" + name], doc["offset" + name], doc["client" + name]);
          }
          return value === undefined ? jQuery.css(elem, type, extra) : jQuery.style(elem, type, value, extra);
        }, type, chainable ? margin : undefined, chainable, null);
      };
    });
  });
  jQuery.fn.size = function() {
    return this.length;
  };
  jQuery.fn.andSelf = jQuery.fn.addBack;
  if (typeof define === "function" && define.amd) {
    System.register("github:components/jquery@2.1.4/jquery", [], false, function(__require, __exports, __module) {
      return (function() {
        return jQuery;
      }).call(this);
    });
  }
  var _jQuery = window.jQuery,
      _$ = window.$;
  jQuery.noConflict = function(deep) {
    if (window.$ === jQuery) {
      window.$ = _$;
    }
    if (deep && window.jQuery === jQuery) {
      window.jQuery = _jQuery;
    }
    return jQuery;
  };
  if (typeof noGlobal === strundefined) {
    window.jQuery = window.$ = jQuery;
  }
  return jQuery;
}));
})();
System.register("github:components/handlebars.js@3.0.3/handlebars", [], false, function(__require, __exports, __module) {
  System.get("@@global-helpers").prepareGlobal(__module.id, []);
  (function() {
    "format global";
    "exports Handlebars";
    (function webpackUniversalModuleDefinition(root, factory) {
      if (typeof exports === 'object' && typeof module === 'object')
        module.exports = factory();
      else if (typeof define === 'function' && define.amd)
        define(factory);
      else if (typeof exports === 'object')
        exports["Handlebars"] = factory();
      else
        root["Handlebars"] = factory();
    })(this, function() {
      return (function(modules) {
        var installedModules = {};
        function __webpack_require__(moduleId) {
          if (installedModules[moduleId])
            return installedModules[moduleId].exports;
          var module = installedModules[moduleId] = {
            exports: {},
            id: moduleId,
            loaded: false
          };
          modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
          module.loaded = true;
          return module.exports;
        }
        __webpack_require__.m = modules;
        __webpack_require__.c = installedModules;
        __webpack_require__.p = "";
        return __webpack_require__(0);
      })([function(module, exports, __webpack_require__) {
        'use strict';
        var _interopRequireWildcard = __webpack_require__(8)['default'];
        exports.__esModule = true;
        var _runtime = __webpack_require__(1);
        var _runtime2 = _interopRequireWildcard(_runtime);
        var _AST = __webpack_require__(2);
        var _AST2 = _interopRequireWildcard(_AST);
        var _Parser$parse = __webpack_require__(3);
        var _Compiler$compile$precompile = __webpack_require__(4);
        var _JavaScriptCompiler = __webpack_require__(5);
        var _JavaScriptCompiler2 = _interopRequireWildcard(_JavaScriptCompiler);
        var _Visitor = __webpack_require__(6);
        var _Visitor2 = _interopRequireWildcard(_Visitor);
        var _noConflict = __webpack_require__(7);
        var _noConflict2 = _interopRequireWildcard(_noConflict);
        var _create = _runtime2['default'].create;
        function create() {
          var hb = _create();
          hb.compile = function(input, options) {
            return _Compiler$compile$precompile.compile(input, options, hb);
          };
          hb.precompile = function(input, options) {
            return _Compiler$compile$precompile.precompile(input, options, hb);
          };
          hb.AST = _AST2['default'];
          hb.Compiler = _Compiler$compile$precompile.Compiler;
          hb.JavaScriptCompiler = _JavaScriptCompiler2['default'];
          hb.Parser = _Parser$parse.parser;
          hb.parse = _Parser$parse.parse;
          return hb;
        }
        var inst = create();
        inst.create = create;
        _noConflict2['default'](inst);
        inst.Visitor = _Visitor2['default'];
        inst['default'] = inst;
        exports['default'] = inst;
        module.exports = exports['default'];
      }, function(module, exports, __webpack_require__) {
        'use strict';
        var _interopRequireWildcard = __webpack_require__(8)['default'];
        exports.__esModule = true;
        var _import = __webpack_require__(9);
        var base = _interopRequireWildcard(_import);
        var _SafeString = __webpack_require__(10);
        var _SafeString2 = _interopRequireWildcard(_SafeString);
        var _Exception = __webpack_require__(11);
        var _Exception2 = _interopRequireWildcard(_Exception);
        var _import2 = __webpack_require__(12);
        var Utils = _interopRequireWildcard(_import2);
        var _import3 = __webpack_require__(13);
        var runtime = _interopRequireWildcard(_import3);
        var _noConflict = __webpack_require__(7);
        var _noConflict2 = _interopRequireWildcard(_noConflict);
        function create() {
          var hb = new base.HandlebarsEnvironment();
          Utils.extend(hb, base);
          hb.SafeString = _SafeString2['default'];
          hb.Exception = _Exception2['default'];
          hb.Utils = Utils;
          hb.escapeExpression = Utils.escapeExpression;
          hb.VM = runtime;
          hb.template = function(spec) {
            return runtime.template(spec, hb);
          };
          return hb;
        }
        var inst = create();
        inst.create = create;
        _noConflict2['default'](inst);
        inst['default'] = inst;
        exports['default'] = inst;
        module.exports = exports['default'];
      }, function(module, exports, __webpack_require__) {
        'use strict';
        exports.__esModule = true;
        var AST = {
          Program: function Program(statements, blockParams, strip, locInfo) {
            this.loc = locInfo;
            this.type = 'Program';
            this.body = statements;
            this.blockParams = blockParams;
            this.strip = strip;
          },
          MustacheStatement: function MustacheStatement(path, params, hash, escaped, strip, locInfo) {
            this.loc = locInfo;
            this.type = 'MustacheStatement';
            this.path = path;
            this.params = params || [];
            this.hash = hash;
            this.escaped = escaped;
            this.strip = strip;
          },
          BlockStatement: function BlockStatement(path, params, hash, program, inverse, openStrip, inverseStrip, closeStrip, locInfo) {
            this.loc = locInfo;
            this.type = 'BlockStatement';
            this.path = path;
            this.params = params || [];
            this.hash = hash;
            this.program = program;
            this.inverse = inverse;
            this.openStrip = openStrip;
            this.inverseStrip = inverseStrip;
            this.closeStrip = closeStrip;
          },
          PartialStatement: function PartialStatement(name, params, hash, strip, locInfo) {
            this.loc = locInfo;
            this.type = 'PartialStatement';
            this.name = name;
            this.params = params || [];
            this.hash = hash;
            this.indent = '';
            this.strip = strip;
          },
          ContentStatement: function ContentStatement(string, locInfo) {
            this.loc = locInfo;
            this.type = 'ContentStatement';
            this.original = this.value = string;
          },
          CommentStatement: function CommentStatement(comment, strip, locInfo) {
            this.loc = locInfo;
            this.type = 'CommentStatement';
            this.value = comment;
            this.strip = strip;
          },
          SubExpression: function SubExpression(path, params, hash, locInfo) {
            this.loc = locInfo;
            this.type = 'SubExpression';
            this.path = path;
            this.params = params || [];
            this.hash = hash;
          },
          PathExpression: function PathExpression(data, depth, parts, original, locInfo) {
            this.loc = locInfo;
            this.type = 'PathExpression';
            this.data = data;
            this.original = original;
            this.parts = parts;
            this.depth = depth;
          },
          StringLiteral: function StringLiteral(string, locInfo) {
            this.loc = locInfo;
            this.type = 'StringLiteral';
            this.original = this.value = string;
          },
          NumberLiteral: function NumberLiteral(number, locInfo) {
            this.loc = locInfo;
            this.type = 'NumberLiteral';
            this.original = this.value = Number(number);
          },
          BooleanLiteral: function BooleanLiteral(bool, locInfo) {
            this.loc = locInfo;
            this.type = 'BooleanLiteral';
            this.original = this.value = bool === 'true';
          },
          UndefinedLiteral: function UndefinedLiteral(locInfo) {
            this.loc = locInfo;
            this.type = 'UndefinedLiteral';
            this.original = this.value = undefined;
          },
          NullLiteral: function NullLiteral(locInfo) {
            this.loc = locInfo;
            this.type = 'NullLiteral';
            this.original = this.value = null;
          },
          Hash: function Hash(pairs, locInfo) {
            this.loc = locInfo;
            this.type = 'Hash';
            this.pairs = pairs;
          },
          HashPair: function HashPair(key, value, locInfo) {
            this.loc = locInfo;
            this.type = 'HashPair';
            this.key = key;
            this.value = value;
          },
          helpers: {
            helperExpression: function helperExpression(node) {
              return !!(node.type === 'SubExpression' || node.params.length || node.hash);
            },
            scopedId: function scopedId(path) {
              return /^\.|this\b/.test(path.original);
            },
            simpleId: function simpleId(path) {
              return path.parts.length === 1 && !AST.helpers.scopedId(path) && !path.depth;
            }
          }
        };
        exports['default'] = AST;
        module.exports = exports['default'];
      }, function(module, exports, __webpack_require__) {
        'use strict';
        var _interopRequireWildcard = __webpack_require__(8)['default'];
        exports.__esModule = true;
        exports.parse = parse;
        var _parser = __webpack_require__(14);
        var _parser2 = _interopRequireWildcard(_parser);
        var _AST = __webpack_require__(2);
        var _AST2 = _interopRequireWildcard(_AST);
        var _WhitespaceControl = __webpack_require__(15);
        var _WhitespaceControl2 = _interopRequireWildcard(_WhitespaceControl);
        var _import = __webpack_require__(16);
        var Helpers = _interopRequireWildcard(_import);
        var _extend = __webpack_require__(12);
        exports.parser = _parser2['default'];
        var yy = {};
        _extend.extend(yy, Helpers, _AST2['default']);
        function parse(input, options) {
          if (input.type === 'Program') {
            return input;
          }
          _parser2['default'].yy = yy;
          yy.locInfo = function(locInfo) {
            return new yy.SourceLocation(options && options.srcName, locInfo);
          };
          var strip = new _WhitespaceControl2['default']();
          return strip.accept(_parser2['default'].parse(input));
        }
      }, function(module, exports, __webpack_require__) {
        'use strict';
        var _interopRequireWildcard = __webpack_require__(8)['default'];
        exports.__esModule = true;
        exports.Compiler = Compiler;
        exports.precompile = precompile;
        exports.compile = compile;
        var _Exception = __webpack_require__(11);
        var _Exception2 = _interopRequireWildcard(_Exception);
        var _isArray$indexOf = __webpack_require__(12);
        var _AST = __webpack_require__(2);
        var _AST2 = _interopRequireWildcard(_AST);
        var slice = [].slice;
        function Compiler() {}
        Compiler.prototype = {
          compiler: Compiler,
          equals: function equals(other) {
            var len = this.opcodes.length;
            if (other.opcodes.length !== len) {
              return false;
            }
            for (var i = 0; i < len; i++) {
              var opcode = this.opcodes[i],
                  otherOpcode = other.opcodes[i];
              if (opcode.opcode !== otherOpcode.opcode || !argEquals(opcode.args, otherOpcode.args)) {
                return false;
              }
            }
            len = this.children.length;
            for (var i = 0; i < len; i++) {
              if (!this.children[i].equals(other.children[i])) {
                return false;
              }
            }
            return true;
          },
          guid: 0,
          compile: function compile(program, options) {
            this.sourceNode = [];
            this.opcodes = [];
            this.children = [];
            this.options = options;
            this.stringParams = options.stringParams;
            this.trackIds = options.trackIds;
            options.blockParams = options.blockParams || [];
            var knownHelpers = options.knownHelpers;
            options.knownHelpers = {
              helperMissing: true,
              blockHelperMissing: true,
              each: true,
              'if': true,
              unless: true,
              'with': true,
              log: true,
              lookup: true
            };
            if (knownHelpers) {
              for (var _name in knownHelpers) {
                if (_name in knownHelpers) {
                  options.knownHelpers[_name] = knownHelpers[_name];
                }
              }
            }
            return this.accept(program);
          },
          compileProgram: function compileProgram(program) {
            var childCompiler = new this.compiler(),
                result = childCompiler.compile(program, this.options),
                guid = this.guid++;
            this.usePartial = this.usePartial || result.usePartial;
            this.children[guid] = result;
            this.useDepths = this.useDepths || result.useDepths;
            return guid;
          },
          accept: function accept(node) {
            this.sourceNode.unshift(node);
            var ret = this[node.type](node);
            this.sourceNode.shift();
            return ret;
          },
          Program: function Program(program) {
            this.options.blockParams.unshift(program.blockParams);
            var body = program.body,
                bodyLength = body.length;
            for (var i = 0; i < bodyLength; i++) {
              this.accept(body[i]);
            }
            this.options.blockParams.shift();
            this.isSimple = bodyLength === 1;
            this.blockParams = program.blockParams ? program.blockParams.length : 0;
            return this;
          },
          BlockStatement: function BlockStatement(block) {
            transformLiteralToPath(block);
            var program = block.program,
                inverse = block.inverse;
            program = program && this.compileProgram(program);
            inverse = inverse && this.compileProgram(inverse);
            var type = this.classifySexpr(block);
            if (type === 'helper') {
              this.helperSexpr(block, program, inverse);
            } else if (type === 'simple') {
              this.simpleSexpr(block);
              this.opcode('pushProgram', program);
              this.opcode('pushProgram', inverse);
              this.opcode('emptyHash');
              this.opcode('blockValue', block.path.original);
            } else {
              this.ambiguousSexpr(block, program, inverse);
              this.opcode('pushProgram', program);
              this.opcode('pushProgram', inverse);
              this.opcode('emptyHash');
              this.opcode('ambiguousBlockValue');
            }
            this.opcode('append');
          },
          PartialStatement: function PartialStatement(partial) {
            this.usePartial = true;
            var params = partial.params;
            if (params.length > 1) {
              throw new _Exception2['default']('Unsupported number of partial arguments: ' + params.length, partial);
            } else if (!params.length) {
              params.push({
                type: 'PathExpression',
                parts: [],
                depth: 0
              });
            }
            var partialName = partial.name.original,
                isDynamic = partial.name.type === 'SubExpression';
            if (isDynamic) {
              this.accept(partial.name);
            }
            this.setupFullMustacheParams(partial, undefined, undefined, true);
            var indent = partial.indent || '';
            if (this.options.preventIndent && indent) {
              this.opcode('appendContent', indent);
              indent = '';
            }
            this.opcode('invokePartial', isDynamic, partialName, indent);
            this.opcode('append');
          },
          MustacheStatement: function MustacheStatement(mustache) {
            this.SubExpression(mustache);
            if (mustache.escaped && !this.options.noEscape) {
              this.opcode('appendEscaped');
            } else {
              this.opcode('append');
            }
          },
          ContentStatement: function ContentStatement(content) {
            if (content.value) {
              this.opcode('appendContent', content.value);
            }
          },
          CommentStatement: function CommentStatement() {},
          SubExpression: function SubExpression(sexpr) {
            transformLiteralToPath(sexpr);
            var type = this.classifySexpr(sexpr);
            if (type === 'simple') {
              this.simpleSexpr(sexpr);
            } else if (type === 'helper') {
              this.helperSexpr(sexpr);
            } else {
              this.ambiguousSexpr(sexpr);
            }
          },
          ambiguousSexpr: function ambiguousSexpr(sexpr, program, inverse) {
            var path = sexpr.path,
                name = path.parts[0],
                isBlock = program != null || inverse != null;
            this.opcode('getContext', path.depth);
            this.opcode('pushProgram', program);
            this.opcode('pushProgram', inverse);
            this.accept(path);
            this.opcode('invokeAmbiguous', name, isBlock);
          },
          simpleSexpr: function simpleSexpr(sexpr) {
            this.accept(sexpr.path);
            this.opcode('resolvePossibleLambda');
          },
          helperSexpr: function helperSexpr(sexpr, program, inverse) {
            var params = this.setupFullMustacheParams(sexpr, program, inverse),
                path = sexpr.path,
                name = path.parts[0];
            if (this.options.knownHelpers[name]) {
              this.opcode('invokeKnownHelper', params.length, name);
            } else if (this.options.knownHelpersOnly) {
              throw new _Exception2['default']('You specified knownHelpersOnly, but used the unknown helper ' + name, sexpr);
            } else {
              path.falsy = true;
              this.accept(path);
              this.opcode('invokeHelper', params.length, path.original, _AST2['default'].helpers.simpleId(path));
            }
          },
          PathExpression: function PathExpression(path) {
            this.addDepth(path.depth);
            this.opcode('getContext', path.depth);
            var name = path.parts[0],
                scoped = _AST2['default'].helpers.scopedId(path),
                blockParamId = !path.depth && !scoped && this.blockParamIndex(name);
            if (blockParamId) {
              this.opcode('lookupBlockParam', blockParamId, path.parts);
            } else if (!name) {
              this.opcode('pushContext');
            } else if (path.data) {
              this.options.data = true;
              this.opcode('lookupData', path.depth, path.parts);
            } else {
              this.opcode('lookupOnContext', path.parts, path.falsy, scoped);
            }
          },
          StringLiteral: function StringLiteral(string) {
            this.opcode('pushString', string.value);
          },
          NumberLiteral: function NumberLiteral(number) {
            this.opcode('pushLiteral', number.value);
          },
          BooleanLiteral: function BooleanLiteral(bool) {
            this.opcode('pushLiteral', bool.value);
          },
          UndefinedLiteral: function UndefinedLiteral() {
            this.opcode('pushLiteral', 'undefined');
          },
          NullLiteral: function NullLiteral() {
            this.opcode('pushLiteral', 'null');
          },
          Hash: function Hash(hash) {
            var pairs = hash.pairs,
                i = 0,
                l = pairs.length;
            this.opcode('pushHash');
            for (; i < l; i++) {
              this.pushParam(pairs[i].value);
            }
            while (i--) {
              this.opcode('assignToHash', pairs[i].key);
            }
            this.opcode('popHash');
          },
          opcode: function opcode(name) {
            this.opcodes.push({
              opcode: name,
              args: slice.call(arguments, 1),
              loc: this.sourceNode[0].loc
            });
          },
          addDepth: function addDepth(depth) {
            if (!depth) {
              return ;
            }
            this.useDepths = true;
          },
          classifySexpr: function classifySexpr(sexpr) {
            var isSimple = _AST2['default'].helpers.simpleId(sexpr.path);
            var isBlockParam = isSimple && !!this.blockParamIndex(sexpr.path.parts[0]);
            var isHelper = !isBlockParam && _AST2['default'].helpers.helperExpression(sexpr);
            var isEligible = !isBlockParam && (isHelper || isSimple);
            if (isEligible && !isHelper) {
              var _name2 = sexpr.path.parts[0],
                  options = this.options;
              if (options.knownHelpers[_name2]) {
                isHelper = true;
              } else if (options.knownHelpersOnly) {
                isEligible = false;
              }
            }
            if (isHelper) {
              return 'helper';
            } else if (isEligible) {
              return 'ambiguous';
            } else {
              return 'simple';
            }
          },
          pushParams: function pushParams(params) {
            for (var i = 0,
                l = params.length; i < l; i++) {
              this.pushParam(params[i]);
            }
          },
          pushParam: function pushParam(val) {
            var value = val.value != null ? val.value : val.original || '';
            if (this.stringParams) {
              if (value.replace) {
                value = value.replace(/^(\.?\.\/)*/g, '').replace(/\//g, '.');
              }
              if (val.depth) {
                this.addDepth(val.depth);
              }
              this.opcode('getContext', val.depth || 0);
              this.opcode('pushStringParam', value, val.type);
              if (val.type === 'SubExpression') {
                this.accept(val);
              }
            } else {
              if (this.trackIds) {
                var blockParamIndex = undefined;
                if (val.parts && !_AST2['default'].helpers.scopedId(val) && !val.depth) {
                  blockParamIndex = this.blockParamIndex(val.parts[0]);
                }
                if (blockParamIndex) {
                  var blockParamChild = val.parts.slice(1).join('.');
                  this.opcode('pushId', 'BlockParam', blockParamIndex, blockParamChild);
                } else {
                  value = val.original || value;
                  if (value.replace) {
                    value = value.replace(/^\.\//g, '').replace(/^\.$/g, '');
                  }
                  this.opcode('pushId', val.type, value);
                }
              }
              this.accept(val);
            }
          },
          setupFullMustacheParams: function setupFullMustacheParams(sexpr, program, inverse, omitEmpty) {
            var params = sexpr.params;
            this.pushParams(params);
            this.opcode('pushProgram', program);
            this.opcode('pushProgram', inverse);
            if (sexpr.hash) {
              this.accept(sexpr.hash);
            } else {
              this.opcode('emptyHash', omitEmpty);
            }
            return params;
          },
          blockParamIndex: function blockParamIndex(name) {
            for (var depth = 0,
                len = this.options.blockParams.length; depth < len; depth++) {
              var blockParams = this.options.blockParams[depth],
                  param = blockParams && _isArray$indexOf.indexOf(blockParams, name);
              if (blockParams && param >= 0) {
                return [depth, param];
              }
            }
          }
        };
        function precompile(input, options, env) {
          if (input == null || typeof input !== 'string' && input.type !== 'Program') {
            throw new _Exception2['default']('You must pass a string or Handlebars AST to Handlebars.precompile. You passed ' + input);
          }
          options = options || {};
          if (!('data' in options)) {
            options.data = true;
          }
          if (options.compat) {
            options.useDepths = true;
          }
          var ast = env.parse(input, options),
              environment = new env.Compiler().compile(ast, options);
          return new env.JavaScriptCompiler().compile(environment, options);
        }
        function compile(input, _x, env) {
          var options = arguments[1] === undefined ? {} : arguments[1];
          if (input == null || typeof input !== 'string' && input.type !== 'Program') {
            throw new _Exception2['default']('You must pass a string or Handlebars AST to Handlebars.compile. You passed ' + input);
          }
          if (!('data' in options)) {
            options.data = true;
          }
          if (options.compat) {
            options.useDepths = true;
          }
          var compiled = undefined;
          function compileInput() {
            var ast = env.parse(input, options),
                environment = new env.Compiler().compile(ast, options),
                templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
            return env.template(templateSpec);
          }
          function ret(context, execOptions) {
            if (!compiled) {
              compiled = compileInput();
            }
            return compiled.call(this, context, execOptions);
          }
          ret._setup = function(setupOptions) {
            if (!compiled) {
              compiled = compileInput();
            }
            return compiled._setup(setupOptions);
          };
          ret._child = function(i, data, blockParams, depths) {
            if (!compiled) {
              compiled = compileInput();
            }
            return compiled._child(i, data, blockParams, depths);
          };
          return ret;
        }
        function argEquals(a, b) {
          if (a === b) {
            return true;
          }
          if (_isArray$indexOf.isArray(a) && _isArray$indexOf.isArray(b) && a.length === b.length) {
            for (var i = 0; i < a.length; i++) {
              if (!argEquals(a[i], b[i])) {
                return false;
              }
            }
            return true;
          }
        }
        function transformLiteralToPath(sexpr) {
          if (!sexpr.path.parts) {
            var literal = sexpr.path;
            sexpr.path = new _AST2['default'].PathExpression(false, 0, [literal.original + ''], literal.original + '', literal.loc);
          }
        }
      }, function(module, exports, __webpack_require__) {
        'use strict';
        var _interopRequireWildcard = __webpack_require__(8)['default'];
        exports.__esModule = true;
        var _COMPILER_REVISION$REVISION_CHANGES = __webpack_require__(9);
        var _Exception = __webpack_require__(11);
        var _Exception2 = _interopRequireWildcard(_Exception);
        var _isArray = __webpack_require__(12);
        var _CodeGen = __webpack_require__(17);
        var _CodeGen2 = _interopRequireWildcard(_CodeGen);
        function Literal(value) {
          this.value = value;
        }
        function JavaScriptCompiler() {}
        JavaScriptCompiler.prototype = {
          nameLookup: function nameLookup(parent, name) {
            if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
              return [parent, '.', name];
            } else {
              return [parent, '[\'', name, '\']'];
            }
          },
          depthedLookup: function depthedLookup(name) {
            return [this.aliasable('this.lookup'), '(depths, "', name, '")'];
          },
          compilerInfo: function compilerInfo() {
            var revision = _COMPILER_REVISION$REVISION_CHANGES.COMPILER_REVISION,
                versions = _COMPILER_REVISION$REVISION_CHANGES.REVISION_CHANGES[revision];
            return [revision, versions];
          },
          appendToBuffer: function appendToBuffer(source, location, explicit) {
            if (!_isArray.isArray(source)) {
              source = [source];
            }
            source = this.source.wrap(source, location);
            if (this.environment.isSimple) {
              return ['return ', source, ';'];
            } else if (explicit) {
              return ['buffer += ', source, ';'];
            } else {
              source.appendToBuffer = true;
              return source;
            }
          },
          initializeBuffer: function initializeBuffer() {
            return this.quotedString('');
          },
          compile: function compile(environment, options, context, asObject) {
            this.environment = environment;
            this.options = options;
            this.stringParams = this.options.stringParams;
            this.trackIds = this.options.trackIds;
            this.precompile = !asObject;
            this.name = this.environment.name;
            this.isChild = !!context;
            this.context = context || {
              programs: [],
              environments: []
            };
            this.preamble();
            this.stackSlot = 0;
            this.stackVars = [];
            this.aliases = {};
            this.registers = {list: []};
            this.hashes = [];
            this.compileStack = [];
            this.inlineStack = [];
            this.blockParams = [];
            this.compileChildren(environment, options);
            this.useDepths = this.useDepths || environment.useDepths || this.options.compat;
            this.useBlockParams = this.useBlockParams || environment.useBlockParams;
            var opcodes = environment.opcodes,
                opcode = undefined,
                firstLoc = undefined,
                i = undefined,
                l = undefined;
            for (i = 0, l = opcodes.length; i < l; i++) {
              opcode = opcodes[i];
              this.source.currentLocation = opcode.loc;
              firstLoc = firstLoc || opcode.loc;
              this[opcode.opcode].apply(this, opcode.args);
            }
            this.source.currentLocation = firstLoc;
            this.pushSource('');
            if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
              throw new _Exception2['default']('Compile completed with content left on stack');
            }
            var fn = this.createFunctionContext(asObject);
            if (!this.isChild) {
              var ret = {
                compiler: this.compilerInfo(),
                main: fn
              };
              var programs = this.context.programs;
              for (i = 0, l = programs.length; i < l; i++) {
                if (programs[i]) {
                  ret[i] = programs[i];
                }
              }
              if (this.environment.usePartial) {
                ret.usePartial = true;
              }
              if (this.options.data) {
                ret.useData = true;
              }
              if (this.useDepths) {
                ret.useDepths = true;
              }
              if (this.useBlockParams) {
                ret.useBlockParams = true;
              }
              if (this.options.compat) {
                ret.compat = true;
              }
              if (!asObject) {
                ret.compiler = JSON.stringify(ret.compiler);
                this.source.currentLocation = {start: {
                    line: 1,
                    column: 0
                  }};
                ret = this.objectLiteral(ret);
                if (options.srcName) {
                  ret = ret.toStringWithSourceMap({file: options.destName});
                  ret.map = ret.map && ret.map.toString();
                } else {
                  ret = ret.toString();
                }
              } else {
                ret.compilerOptions = this.options;
              }
              return ret;
            } else {
              return fn;
            }
          },
          preamble: function preamble() {
            this.lastContext = 0;
            this.source = new _CodeGen2['default'](this.options.srcName);
          },
          createFunctionContext: function createFunctionContext(asObject) {
            var varDeclarations = '';
            var locals = this.stackVars.concat(this.registers.list);
            if (locals.length > 0) {
              varDeclarations += ', ' + locals.join(', ');
            }
            var aliasCount = 0;
            for (var alias in this.aliases) {
              var node = this.aliases[alias];
              if (this.aliases.hasOwnProperty(alias) && node.children && node.referenceCount > 1) {
                varDeclarations += ', alias' + ++aliasCount + '=' + alias;
                node.children[0] = 'alias' + aliasCount;
              }
            }
            var params = ['depth0', 'helpers', 'partials', 'data'];
            if (this.useBlockParams || this.useDepths) {
              params.push('blockParams');
            }
            if (this.useDepths) {
              params.push('depths');
            }
            var source = this.mergeSource(varDeclarations);
            if (asObject) {
              params.push(source);
              return Function.apply(this, params);
            } else {
              return this.source.wrap(['function(', params.join(','), ') {\n  ', source, '}']);
            }
          },
          mergeSource: function mergeSource(varDeclarations) {
            var isSimple = this.environment.isSimple,
                appendOnly = !this.forceBuffer,
                appendFirst = undefined,
                sourceSeen = undefined,
                bufferStart = undefined,
                bufferEnd = undefined;
            this.source.each(function(line) {
              if (line.appendToBuffer) {
                if (bufferStart) {
                  line.prepend('  + ');
                } else {
                  bufferStart = line;
                }
                bufferEnd = line;
              } else {
                if (bufferStart) {
                  if (!sourceSeen) {
                    appendFirst = true;
                  } else {
                    bufferStart.prepend('buffer += ');
                  }
                  bufferEnd.add(';');
                  bufferStart = bufferEnd = undefined;
                }
                sourceSeen = true;
                if (!isSimple) {
                  appendOnly = false;
                }
              }
            });
            if (appendOnly) {
              if (bufferStart) {
                bufferStart.prepend('return ');
                bufferEnd.add(';');
              } else if (!sourceSeen) {
                this.source.push('return "";');
              }
            } else {
              varDeclarations += ', buffer = ' + (appendFirst ? '' : this.initializeBuffer());
              if (bufferStart) {
                bufferStart.prepend('return buffer + ');
                bufferEnd.add(';');
              } else {
                this.source.push('return buffer;');
              }
            }
            if (varDeclarations) {
              this.source.prepend('var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n'));
            }
            return this.source.merge();
          },
          blockValue: function blockValue(name) {
            var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
                params = [this.contextName(0)];
            this.setupHelperArgs(name, 0, params);
            var blockName = this.popStack();
            params.splice(1, 0, blockName);
            this.push(this.source.functionCall(blockHelperMissing, 'call', params));
          },
          ambiguousBlockValue: function ambiguousBlockValue() {
            var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
                params = [this.contextName(0)];
            this.setupHelperArgs('', 0, params, true);
            this.flushInline();
            var current = this.topStack();
            params.splice(1, 0, current);
            this.pushSource(['if (!', this.lastHelper, ') { ', current, ' = ', this.source.functionCall(blockHelperMissing, 'call', params), '}']);
          },
          appendContent: function appendContent(content) {
            if (this.pendingContent) {
              content = this.pendingContent + content;
            } else {
              this.pendingLocation = this.source.currentLocation;
            }
            this.pendingContent = content;
          },
          append: function append() {
            if (this.isInline()) {
              this.replaceStack(function(current) {
                return [' != null ? ', current, ' : ""'];
              });
              this.pushSource(this.appendToBuffer(this.popStack()));
            } else {
              var local = this.popStack();
              this.pushSource(['if (', local, ' != null) { ', this.appendToBuffer(local, undefined, true), ' }']);
              if (this.environment.isSimple) {
                this.pushSource(['else { ', this.appendToBuffer('\'\'', undefined, true), ' }']);
              }
            }
          },
          appendEscaped: function appendEscaped() {
            this.pushSource(this.appendToBuffer([this.aliasable('this.escapeExpression'), '(', this.popStack(), ')']));
          },
          getContext: function getContext(depth) {
            this.lastContext = depth;
          },
          pushContext: function pushContext() {
            this.pushStackLiteral(this.contextName(this.lastContext));
          },
          lookupOnContext: function lookupOnContext(parts, falsy, scoped) {
            var i = 0;
            if (!scoped && this.options.compat && !this.lastContext) {
              this.push(this.depthedLookup(parts[i++]));
            } else {
              this.pushContext();
            }
            this.resolvePath('context', parts, i, falsy);
          },
          lookupBlockParam: function lookupBlockParam(blockParamId, parts) {
            this.useBlockParams = true;
            this.push(['blockParams[', blockParamId[0], '][', blockParamId[1], ']']);
            this.resolvePath('context', parts, 1);
          },
          lookupData: function lookupData(depth, parts) {
            if (!depth) {
              this.pushStackLiteral('data');
            } else {
              this.pushStackLiteral('this.data(data, ' + depth + ')');
            }
            this.resolvePath('data', parts, 0, true);
          },
          resolvePath: function resolvePath(type, parts, i, falsy) {
            var _this = this;
            if (this.options.strict || this.options.assumeObjects) {
              this.push(strictLookup(this.options.strict, this, parts, type));
              return ;
            }
            var len = parts.length;
            for (; i < len; i++) {
              this.replaceStack(function(current) {
                var lookup = _this.nameLookup(current, parts[i], type);
                if (!falsy) {
                  return [' != null ? ', lookup, ' : ', current];
                } else {
                  return [' && ', lookup];
                }
              });
            }
          },
          resolvePossibleLambda: function resolvePossibleLambda() {
            this.push([this.aliasable('this.lambda'), '(', this.popStack(), ', ', this.contextName(0), ')']);
          },
          pushStringParam: function pushStringParam(string, type) {
            this.pushContext();
            this.pushString(type);
            if (type !== 'SubExpression') {
              if (typeof string === 'string') {
                this.pushString(string);
              } else {
                this.pushStackLiteral(string);
              }
            }
          },
          emptyHash: function emptyHash(omitEmpty) {
            if (this.trackIds) {
              this.push('{}');
            }
            if (this.stringParams) {
              this.push('{}');
              this.push('{}');
            }
            this.pushStackLiteral(omitEmpty ? 'undefined' : '{}');
          },
          pushHash: function pushHash() {
            if (this.hash) {
              this.hashes.push(this.hash);
            }
            this.hash = {
              values: [],
              types: [],
              contexts: [],
              ids: []
            };
          },
          popHash: function popHash() {
            var hash = this.hash;
            this.hash = this.hashes.pop();
            if (this.trackIds) {
              this.push(this.objectLiteral(hash.ids));
            }
            if (this.stringParams) {
              this.push(this.objectLiteral(hash.contexts));
              this.push(this.objectLiteral(hash.types));
            }
            this.push(this.objectLiteral(hash.values));
          },
          pushString: function pushString(string) {
            this.pushStackLiteral(this.quotedString(string));
          },
          pushLiteral: function pushLiteral(value) {
            this.pushStackLiteral(value);
          },
          pushProgram: function pushProgram(guid) {
            if (guid != null) {
              this.pushStackLiteral(this.programExpression(guid));
            } else {
              this.pushStackLiteral(null);
            }
          },
          invokeHelper: function invokeHelper(paramSize, name, isSimple) {
            var nonHelper = this.popStack(),
                helper = this.setupHelper(paramSize, name),
                simple = isSimple ? [helper.name, ' || '] : '';
            var lookup = ['('].concat(simple, nonHelper);
            if (!this.options.strict) {
              lookup.push(' || ', this.aliasable('helpers.helperMissing'));
            }
            lookup.push(')');
            this.push(this.source.functionCall(lookup, 'call', helper.callParams));
          },
          invokeKnownHelper: function invokeKnownHelper(paramSize, name) {
            var helper = this.setupHelper(paramSize, name);
            this.push(this.source.functionCall(helper.name, 'call', helper.callParams));
          },
          invokeAmbiguous: function invokeAmbiguous(name, helperCall) {
            this.useRegister('helper');
            var nonHelper = this.popStack();
            this.emptyHash();
            var helper = this.setupHelper(0, name, helperCall);
            var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');
            var lookup = ['(', '(helper = ', helperName, ' || ', nonHelper, ')'];
            if (!this.options.strict) {
              lookup[0] = '(helper = ';
              lookup.push(' != null ? helper : ', this.aliasable('helpers.helperMissing'));
            }
            this.push(['(', lookup, helper.paramsInit ? ['),(', helper.paramsInit] : [], '),', '(typeof helper === ', this.aliasable('"function"'), ' ? ', this.source.functionCall('helper', 'call', helper.callParams), ' : helper))']);
          },
          invokePartial: function invokePartial(isDynamic, name, indent) {
            var params = [],
                options = this.setupParams(name, 1, params, false);
            if (isDynamic) {
              name = this.popStack();
              delete options.name;
            }
            if (indent) {
              options.indent = JSON.stringify(indent);
            }
            options.helpers = 'helpers';
            options.partials = 'partials';
            if (!isDynamic) {
              params.unshift(this.nameLookup('partials', name, 'partial'));
            } else {
              params.unshift(name);
            }
            if (this.options.compat) {
              options.depths = 'depths';
            }
            options = this.objectLiteral(options);
            params.push(options);
            this.push(this.source.functionCall('this.invokePartial', '', params));
          },
          assignToHash: function assignToHash(key) {
            var value = this.popStack(),
                context = undefined,
                type = undefined,
                id = undefined;
            if (this.trackIds) {
              id = this.popStack();
            }
            if (this.stringParams) {
              type = this.popStack();
              context = this.popStack();
            }
            var hash = this.hash;
            if (context) {
              hash.contexts[key] = context;
            }
            if (type) {
              hash.types[key] = type;
            }
            if (id) {
              hash.ids[key] = id;
            }
            hash.values[key] = value;
          },
          pushId: function pushId(type, name, child) {
            if (type === 'BlockParam') {
              this.pushStackLiteral('blockParams[' + name[0] + '].path[' + name[1] + ']' + (child ? ' + ' + JSON.stringify('.' + child) : ''));
            } else if (type === 'PathExpression') {
              this.pushString(name);
            } else if (type === 'SubExpression') {
              this.pushStackLiteral('true');
            } else {
              this.pushStackLiteral('null');
            }
          },
          compiler: JavaScriptCompiler,
          compileChildren: function compileChildren(environment, options) {
            var children = environment.children,
                child = undefined,
                compiler = undefined;
            for (var i = 0,
                l = children.length; i < l; i++) {
              child = children[i];
              compiler = new this.compiler();
              var index = this.matchExistingProgram(child);
              if (index == null) {
                this.context.programs.push('');
                index = this.context.programs.length;
                child.index = index;
                child.name = 'program' + index;
                this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
                this.context.environments[index] = child;
                this.useDepths = this.useDepths || compiler.useDepths;
                this.useBlockParams = this.useBlockParams || compiler.useBlockParams;
              } else {
                child.index = index;
                child.name = 'program' + index;
                this.useDepths = this.useDepths || child.useDepths;
                this.useBlockParams = this.useBlockParams || child.useBlockParams;
              }
            }
          },
          matchExistingProgram: function matchExistingProgram(child) {
            for (var i = 0,
                len = this.context.environments.length; i < len; i++) {
              var environment = this.context.environments[i];
              if (environment && environment.equals(child)) {
                return i;
              }
            }
          },
          programExpression: function programExpression(guid) {
            var child = this.environment.children[guid],
                programParams = [child.index, 'data', child.blockParams];
            if (this.useBlockParams || this.useDepths) {
              programParams.push('blockParams');
            }
            if (this.useDepths) {
              programParams.push('depths');
            }
            return 'this.program(' + programParams.join(', ') + ')';
          },
          useRegister: function useRegister(name) {
            if (!this.registers[name]) {
              this.registers[name] = true;
              this.registers.list.push(name);
            }
          },
          push: function push(expr) {
            if (!(expr instanceof Literal)) {
              expr = this.source.wrap(expr);
            }
            this.inlineStack.push(expr);
            return expr;
          },
          pushStackLiteral: function pushStackLiteral(item) {
            this.push(new Literal(item));
          },
          pushSource: function pushSource(source) {
            if (this.pendingContent) {
              this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent), this.pendingLocation));
              this.pendingContent = undefined;
            }
            if (source) {
              this.source.push(source);
            }
          },
          replaceStack: function replaceStack(callback) {
            var prefix = ['('],
                stack = undefined,
                createdStack = undefined,
                usedLiteral = undefined;
            if (!this.isInline()) {
              throw new _Exception2['default']('replaceStack on non-inline');
            }
            var top = this.popStack(true);
            if (top instanceof Literal) {
              stack = [top.value];
              prefix = ['(', stack];
              usedLiteral = true;
            } else {
              createdStack = true;
              var _name = this.incrStack();
              prefix = ['((', this.push(_name), ' = ', top, ')'];
              stack = this.topStack();
            }
            var item = callback.call(this, stack);
            if (!usedLiteral) {
              this.popStack();
            }
            if (createdStack) {
              this.stackSlot--;
            }
            this.push(prefix.concat(item, ')'));
          },
          incrStack: function incrStack() {
            this.stackSlot++;
            if (this.stackSlot > this.stackVars.length) {
              this.stackVars.push('stack' + this.stackSlot);
            }
            return this.topStackName();
          },
          topStackName: function topStackName() {
            return 'stack' + this.stackSlot;
          },
          flushInline: function flushInline() {
            var inlineStack = this.inlineStack;
            this.inlineStack = [];
            for (var i = 0,
                len = inlineStack.length; i < len; i++) {
              var entry = inlineStack[i];
              if (entry instanceof Literal) {
                this.compileStack.push(entry);
              } else {
                var stack = this.incrStack();
                this.pushSource([stack, ' = ', entry, ';']);
                this.compileStack.push(stack);
              }
            }
          },
          isInline: function isInline() {
            return this.inlineStack.length;
          },
          popStack: function popStack(wrapped) {
            var inline = this.isInline(),
                item = (inline ? this.inlineStack : this.compileStack).pop();
            if (!wrapped && item instanceof Literal) {
              return item.value;
            } else {
              if (!inline) {
                if (!this.stackSlot) {
                  throw new _Exception2['default']('Invalid stack pop');
                }
                this.stackSlot--;
              }
              return item;
            }
          },
          topStack: function topStack() {
            var stack = this.isInline() ? this.inlineStack : this.compileStack,
                item = stack[stack.length - 1];
            if (item instanceof Literal) {
              return item.value;
            } else {
              return item;
            }
          },
          contextName: function contextName(context) {
            if (this.useDepths && context) {
              return 'depths[' + context + ']';
            } else {
              return 'depth' + context;
            }
          },
          quotedString: function quotedString(str) {
            return this.source.quotedString(str);
          },
          objectLiteral: function objectLiteral(obj) {
            return this.source.objectLiteral(obj);
          },
          aliasable: function aliasable(name) {
            var ret = this.aliases[name];
            if (ret) {
              ret.referenceCount++;
              return ret;
            }
            ret = this.aliases[name] = this.source.wrap(name);
            ret.aliasable = true;
            ret.referenceCount = 1;
            return ret;
          },
          setupHelper: function setupHelper(paramSize, name, blockHelper) {
            var params = [],
                paramsInit = this.setupHelperArgs(name, paramSize, params, blockHelper);
            var foundHelper = this.nameLookup('helpers', name, 'helper');
            return {
              params: params,
              paramsInit: paramsInit,
              name: foundHelper,
              callParams: [this.contextName(0)].concat(params)
            };
          },
          setupParams: function setupParams(helper, paramSize, params) {
            var options = {},
                contexts = [],
                types = [],
                ids = [],
                param = undefined;
            options.name = this.quotedString(helper);
            options.hash = this.popStack();
            if (this.trackIds) {
              options.hashIds = this.popStack();
            }
            if (this.stringParams) {
              options.hashTypes = this.popStack();
              options.hashContexts = this.popStack();
            }
            var inverse = this.popStack(),
                program = this.popStack();
            if (program || inverse) {
              options.fn = program || 'this.noop';
              options.inverse = inverse || 'this.noop';
            }
            var i = paramSize;
            while (i--) {
              param = this.popStack();
              params[i] = param;
              if (this.trackIds) {
                ids[i] = this.popStack();
              }
              if (this.stringParams) {
                types[i] = this.popStack();
                contexts[i] = this.popStack();
              }
            }
            if (this.trackIds) {
              options.ids = this.source.generateArray(ids);
            }
            if (this.stringParams) {
              options.types = this.source.generateArray(types);
              options.contexts = this.source.generateArray(contexts);
            }
            if (this.options.data) {
              options.data = 'data';
            }
            if (this.useBlockParams) {
              options.blockParams = 'blockParams';
            }
            return options;
          },
          setupHelperArgs: function setupHelperArgs(helper, paramSize, params, useRegister) {
            var options = this.setupParams(helper, paramSize, params, true);
            options = this.objectLiteral(options);
            if (useRegister) {
              this.useRegister('options');
              params.push('options');
              return ['options=', options];
            } else {
              params.push(options);
              return '';
            }
          }
        };
        (function() {
          var reservedWords = ('break else new var' + ' case finally return void' + ' catch for switch while' + ' continue function this with' + ' default if throw' + ' delete in try' + ' do instanceof typeof' + ' abstract enum int short' + ' boolean export interface static' + ' byte extends long super' + ' char final native synchronized' + ' class float package throws' + ' const goto private transient' + ' debugger implements protected volatile' + ' double import public let yield await' + ' null true false').split(' ');
          var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};
          for (var i = 0,
              l = reservedWords.length; i < l; i++) {
            compilerWords[reservedWords[i]] = true;
          }
        })();
        JavaScriptCompiler.isValidJavaScriptVariableName = function(name) {
          return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
        };
        function strictLookup(requireTerminal, compiler, parts, type) {
          var stack = compiler.popStack(),
              i = 0,
              len = parts.length;
          if (requireTerminal) {
            len--;
          }
          for (; i < len; i++) {
            stack = compiler.nameLookup(stack, parts[i], type);
          }
          if (requireTerminal) {
            return [compiler.aliasable('this.strict'), '(', stack, ', ', compiler.quotedString(parts[i]), ')'];
          } else {
            return stack;
          }
        }
        exports['default'] = JavaScriptCompiler;
        module.exports = exports['default'];
      }, function(module, exports, __webpack_require__) {
        'use strict';
        var _interopRequireWildcard = __webpack_require__(8)['default'];
        exports.__esModule = true;
        var _Exception = __webpack_require__(11);
        var _Exception2 = _interopRequireWildcard(_Exception);
        var _AST = __webpack_require__(2);
        var _AST2 = _interopRequireWildcard(_AST);
        function Visitor() {
          this.parents = [];
        }
        Visitor.prototype = {
          constructor: Visitor,
          mutating: false,
          acceptKey: function acceptKey(node, name) {
            var value = this.accept(node[name]);
            if (this.mutating) {
              if (value && (!value.type || !_AST2['default'][value.type])) {
                throw new _Exception2['default']('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
              }
              node[name] = value;
            }
          },
          acceptRequired: function acceptRequired(node, name) {
            this.acceptKey(node, name);
            if (!node[name]) {
              throw new _Exception2['default'](node.type + ' requires ' + name);
            }
          },
          acceptArray: function acceptArray(array) {
            for (var i = 0,
                l = array.length; i < l; i++) {
              this.acceptKey(array, i);
              if (!array[i]) {
                array.splice(i, 1);
                i--;
                l--;
              }
            }
          },
          accept: function accept(object) {
            if (!object) {
              return ;
            }
            if (this.current) {
              this.parents.unshift(this.current);
            }
            this.current = object;
            var ret = this[object.type](object);
            this.current = this.parents.shift();
            if (!this.mutating || ret) {
              return ret;
            } else if (ret !== false) {
              return object;
            }
          },
          Program: function Program(program) {
            this.acceptArray(program.body);
          },
          MustacheStatement: function MustacheStatement(mustache) {
            this.acceptRequired(mustache, 'path');
            this.acceptArray(mustache.params);
            this.acceptKey(mustache, 'hash');
          },
          BlockStatement: function BlockStatement(block) {
            this.acceptRequired(block, 'path');
            this.acceptArray(block.params);
            this.acceptKey(block, 'hash');
            this.acceptKey(block, 'program');
            this.acceptKey(block, 'inverse');
          },
          PartialStatement: function PartialStatement(partial) {
            this.acceptRequired(partial, 'name');
            this.acceptArray(partial.params);
            this.acceptKey(partial, 'hash');
          },
          ContentStatement: function ContentStatement() {},
          CommentStatement: function CommentStatement() {},
          SubExpression: function SubExpression(sexpr) {
            this.acceptRequired(sexpr, 'path');
            this.acceptArray(sexpr.params);
            this.acceptKey(sexpr, 'hash');
          },
          PathExpression: function PathExpression() {},
          StringLiteral: function StringLiteral() {},
          NumberLiteral: function NumberLiteral() {},
          BooleanLiteral: function BooleanLiteral() {},
          UndefinedLiteral: function UndefinedLiteral() {},
          NullLiteral: function NullLiteral() {},
          Hash: function Hash(hash) {
            this.acceptArray(hash.pairs);
          },
          HashPair: function HashPair(pair) {
            this.acceptRequired(pair, 'value');
          }
        };
        exports['default'] = Visitor;
        module.exports = exports['default'];
      }, function(module, exports, __webpack_require__) {
        (function(global) {
          'use strict';
          exports.__esModule = true;
          exports['default'] = function(Handlebars) {
            var root = typeof global !== 'undefined' ? global : window,
                $Handlebars = root.Handlebars;
            Handlebars.noConflict = function() {
              if (root.Handlebars === Handlebars) {
                root.Handlebars = $Handlebars;
              }
            };
          };
          module.exports = exports['default'];
        }.call(exports, (function() {
          return this;
        }())));
      }, function(module, exports, __webpack_require__) {
        "use strict";
        exports["default"] = function(obj) {
          return obj && obj.__esModule ? obj : {"default": obj};
        };
        exports.__esModule = true;
      }, function(module, exports, __webpack_require__) {
        'use strict';
        var _interopRequireWildcard = __webpack_require__(8)['default'];
        exports.__esModule = true;
        exports.HandlebarsEnvironment = HandlebarsEnvironment;
        exports.createFrame = createFrame;
        var _import = __webpack_require__(12);
        var Utils = _interopRequireWildcard(_import);
        var _Exception = __webpack_require__(11);
        var _Exception2 = _interopRequireWildcard(_Exception);
        var VERSION = '3.0.1';
        exports.VERSION = VERSION;
        var COMPILER_REVISION = 6;
        exports.COMPILER_REVISION = COMPILER_REVISION;
        var REVISION_CHANGES = {
          1: '<= 1.0.rc.2',
          2: '== 1.0.0-rc.3',
          3: '== 1.0.0-rc.4',
          4: '== 1.x.x',
          5: '== 2.0.0-alpha.x',
          6: '>= 2.0.0-beta.1'
        };
        exports.REVISION_CHANGES = REVISION_CHANGES;
        var isArray = Utils.isArray,
            isFunction = Utils.isFunction,
            toString = Utils.toString,
            objectType = '[object Object]';
        function HandlebarsEnvironment(helpers, partials) {
          this.helpers = helpers || {};
          this.partials = partials || {};
          registerDefaultHelpers(this);
        }
        HandlebarsEnvironment.prototype = {
          constructor: HandlebarsEnvironment,
          logger: logger,
          log: log,
          registerHelper: function registerHelper(name, fn) {
            if (toString.call(name) === objectType) {
              if (fn) {
                throw new _Exception2['default']('Arg not supported with multiple helpers');
              }
              Utils.extend(this.helpers, name);
            } else {
              this.helpers[name] = fn;
            }
          },
          unregisterHelper: function unregisterHelper(name) {
            delete this.helpers[name];
          },
          registerPartial: function registerPartial(name, partial) {
            if (toString.call(name) === objectType) {
              Utils.extend(this.partials, name);
            } else {
              if (typeof partial === 'undefined') {
                throw new _Exception2['default']('Attempting to register a partial as undefined');
              }
              this.partials[name] = partial;
            }
          },
          unregisterPartial: function unregisterPartial(name) {
            delete this.partials[name];
          }
        };
        function registerDefaultHelpers(instance) {
          instance.registerHelper('helperMissing', function() {
            if (arguments.length === 1) {
              return undefined;
            } else {
              throw new _Exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
            }
          });
          instance.registerHelper('blockHelperMissing', function(context, options) {
            var inverse = options.inverse,
                fn = options.fn;
            if (context === true) {
              return fn(this);
            } else if (context === false || context == null) {
              return inverse(this);
            } else if (isArray(context)) {
              if (context.length > 0) {
                if (options.ids) {
                  options.ids = [options.name];
                }
                return instance.helpers.each(context, options);
              } else {
                return inverse(this);
              }
            } else {
              if (options.data && options.ids) {
                var data = createFrame(options.data);
                data.contextPath = Utils.appendContextPath(options.data.contextPath, options.name);
                options = {data: data};
              }
              return fn(context, options);
            }
          });
          instance.registerHelper('each', function(context, options) {
            if (!options) {
              throw new _Exception2['default']('Must pass iterator to #each');
            }
            var fn = options.fn,
                inverse = options.inverse,
                i = 0,
                ret = '',
                data = undefined,
                contextPath = undefined;
            if (options.data && options.ids) {
              contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
            }
            if (isFunction(context)) {
              context = context.call(this);
            }
            if (options.data) {
              data = createFrame(options.data);
            }
            function execIteration(field, index, last) {
              if (data) {
                data.key = field;
                data.index = index;
                data.first = index === 0;
                data.last = !!last;
                if (contextPath) {
                  data.contextPath = contextPath + field;
                }
              }
              ret = ret + fn(context[field], {
                data: data,
                blockParams: Utils.blockParams([context[field], field], [contextPath + field, null])
              });
            }
            if (context && typeof context === 'object') {
              if (isArray(context)) {
                for (var j = context.length; i < j; i++) {
                  execIteration(i, i, i === context.length - 1);
                }
              } else {
                var priorKey = undefined;
                for (var key in context) {
                  if (context.hasOwnProperty(key)) {
                    if (priorKey) {
                      execIteration(priorKey, i - 1);
                    }
                    priorKey = key;
                    i++;
                  }
                }
                if (priorKey) {
                  execIteration(priorKey, i - 1, true);
                }
              }
            }
            if (i === 0) {
              ret = inverse(this);
            }
            return ret;
          });
          instance.registerHelper('if', function(conditional, options) {
            if (isFunction(conditional)) {
              conditional = conditional.call(this);
            }
            if (!options.hash.includeZero && !conditional || Utils.isEmpty(conditional)) {
              return options.inverse(this);
            } else {
              return options.fn(this);
            }
          });
          instance.registerHelper('unless', function(conditional, options) {
            return instance.helpers['if'].call(this, conditional, {
              fn: options.inverse,
              inverse: options.fn,
              hash: options.hash
            });
          });
          instance.registerHelper('with', function(context, options) {
            if (isFunction(context)) {
              context = context.call(this);
            }
            var fn = options.fn;
            if (!Utils.isEmpty(context)) {
              if (options.data && options.ids) {
                var data = createFrame(options.data);
                data.contextPath = Utils.appendContextPath(options.data.contextPath, options.ids[0]);
                options = {data: data};
              }
              return fn(context, options);
            } else {
              return options.inverse(this);
            }
          });
          instance.registerHelper('log', function(message, options) {
            var level = options.data && options.data.level != null ? parseInt(options.data.level, 10) : 1;
            instance.log(level, message);
          });
          instance.registerHelper('lookup', function(obj, field) {
            return obj && obj[field];
          });
        }
        var logger = {
          methodMap: {
            0: 'debug',
            1: 'info',
            2: 'warn',
            3: 'error'
          },
          DEBUG: 0,
          INFO: 1,
          WARN: 2,
          ERROR: 3,
          level: 1,
          log: function log(level, message) {
            if (typeof console !== 'undefined' && logger.level <= level) {
              var method = logger.methodMap[level];
              (console[method] || console.log).call(console, message);
            }
          }
        };
        exports.logger = logger;
        var log = logger.log;
        exports.log = log;
        function createFrame(object) {
          var frame = Utils.extend({}, object);
          frame._parent = object;
          return frame;
        }
      }, function(module, exports, __webpack_require__) {
        'use strict';
        exports.__esModule = true;
        function SafeString(string) {
          this.string = string;
        }
        SafeString.prototype.toString = SafeString.prototype.toHTML = function() {
          return '' + this.string;
        };
        exports['default'] = SafeString;
        module.exports = exports['default'];
      }, function(module, exports, __webpack_require__) {
        'use strict';
        exports.__esModule = true;
        var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];
        function Exception(message, node) {
          var loc = node && node.loc,
              line = undefined,
              column = undefined;
          if (loc) {
            line = loc.start.line;
            column = loc.start.column;
            message += ' - ' + line + ':' + column;
          }
          var tmp = Error.prototype.constructor.call(this, message);
          for (var idx = 0; idx < errorProps.length; idx++) {
            this[errorProps[idx]] = tmp[errorProps[idx]];
          }
          if (Error.captureStackTrace) {
            Error.captureStackTrace(this, Exception);
          }
          if (loc) {
            this.lineNumber = line;
            this.column = column;
          }
        }
        Exception.prototype = new Error();
        exports['default'] = Exception;
        module.exports = exports['default'];
      }, function(module, exports, __webpack_require__) {
        'use strict';
        exports.__esModule = true;
        exports.extend = extend;
        exports.indexOf = indexOf;
        exports.escapeExpression = escapeExpression;
        exports.isEmpty = isEmpty;
        exports.blockParams = blockParams;
        exports.appendContextPath = appendContextPath;
        var escape = {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          '\'': '&#x27;',
          '`': '&#x60;'
        };
        var badChars = /[&<>"'`]/g,
            possible = /[&<>"'`]/;
        function escapeChar(chr) {
          return escape[chr];
        }
        function extend(obj) {
          for (var i = 1; i < arguments.length; i++) {
            for (var key in arguments[i]) {
              if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
                obj[key] = arguments[i][key];
              }
            }
          }
          return obj;
        }
        var toString = Object.prototype.toString;
        exports.toString = toString;
        var isFunction = function isFunction(value) {
          return typeof value === 'function';
        };
        if (isFunction(/x/)) {
          exports.isFunction = isFunction = function(value) {
            return typeof value === 'function' && toString.call(value) === '[object Function]';
          };
        }
        var isFunction;
        exports.isFunction = isFunction;
        var isArray = Array.isArray || function(value) {
          return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
        };
        exports.isArray = isArray;
        function indexOf(array, value) {
          for (var i = 0,
              len = array.length; i < len; i++) {
            if (array[i] === value) {
              return i;
            }
          }
          return -1;
        }
        function escapeExpression(string) {
          if (typeof string !== 'string') {
            if (string && string.toHTML) {
              return string.toHTML();
            } else if (string == null) {
              return '';
            } else if (!string) {
              return string + '';
            }
            string = '' + string;
          }
          if (!possible.test(string)) {
            return string;
          }
          return string.replace(badChars, escapeChar);
        }
        function isEmpty(value) {
          if (!value && value !== 0) {
            return true;
          } else if (isArray(value) && value.length === 0) {
            return true;
          } else {
            return false;
          }
        }
        function blockParams(params, ids) {
          params.path = ids;
          return params;
        }
        function appendContextPath(contextPath, id) {
          return (contextPath ? contextPath + '.' : '') + id;
        }
      }, function(module, exports, __webpack_require__) {
        'use strict';
        var _interopRequireWildcard = __webpack_require__(8)['default'];
        exports.__esModule = true;
        exports.checkRevision = checkRevision;
        exports.template = template;
        exports.wrapProgram = wrapProgram;
        exports.resolvePartial = resolvePartial;
        exports.invokePartial = invokePartial;
        exports.noop = noop;
        var _import = __webpack_require__(12);
        var Utils = _interopRequireWildcard(_import);
        var _Exception = __webpack_require__(11);
        var _Exception2 = _interopRequireWildcard(_Exception);
        var _COMPILER_REVISION$REVISION_CHANGES$createFrame = __webpack_require__(9);
        function checkRevision(compilerInfo) {
          var compilerRevision = compilerInfo && compilerInfo[0] || 1,
              currentRevision = _COMPILER_REVISION$REVISION_CHANGES$createFrame.COMPILER_REVISION;
          if (compilerRevision !== currentRevision) {
            if (compilerRevision < currentRevision) {
              var runtimeVersions = _COMPILER_REVISION$REVISION_CHANGES$createFrame.REVISION_CHANGES[currentRevision],
                  compilerVersions = _COMPILER_REVISION$REVISION_CHANGES$createFrame.REVISION_CHANGES[compilerRevision];
              throw new _Exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
            } else {
              throw new _Exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
            }
          }
        }
        function template(templateSpec, env) {
          if (!env) {
            throw new _Exception2['default']('No environment passed to template');
          }
          if (!templateSpec || !templateSpec.main) {
            throw new _Exception2['default']('Unknown template object: ' + typeof templateSpec);
          }
          env.VM.checkRevision(templateSpec.compiler);
          function invokePartialWrapper(partial, context, options) {
            if (options.hash) {
              context = Utils.extend({}, context, options.hash);
            }
            partial = env.VM.resolvePartial.call(this, partial, context, options);
            var result = env.VM.invokePartial.call(this, partial, context, options);
            if (result == null && env.compile) {
              options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
              result = options.partials[options.name](context, options);
            }
            if (result != null) {
              if (options.indent) {
                var lines = result.split('\n');
                for (var i = 0,
                    l = lines.length; i < l; i++) {
                  if (!lines[i] && i + 1 === l) {
                    break;
                  }
                  lines[i] = options.indent + lines[i];
                }
                result = lines.join('\n');
              }
              return result;
            } else {
              throw new _Exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
            }
          }
          var container = {
            strict: function strict(obj, name) {
              if (!(name in obj)) {
                throw new _Exception2['default']('"' + name + '" not defined in ' + obj);
              }
              return obj[name];
            },
            lookup: function lookup(depths, name) {
              var len = depths.length;
              for (var i = 0; i < len; i++) {
                if (depths[i] && depths[i][name] != null) {
                  return depths[i][name];
                }
              }
            },
            lambda: function lambda(current, context) {
              return typeof current === 'function' ? current.call(context) : current;
            },
            escapeExpression: Utils.escapeExpression,
            invokePartial: invokePartialWrapper,
            fn: function fn(i) {
              return templateSpec[i];
            },
            programs: [],
            program: function program(i, data, declaredBlockParams, blockParams, depths) {
              var programWrapper = this.programs[i],
                  fn = this.fn(i);
              if (data || depths || blockParams || declaredBlockParams) {
                programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
              } else if (!programWrapper) {
                programWrapper = this.programs[i] = wrapProgram(this, i, fn);
              }
              return programWrapper;
            },
            data: function data(value, depth) {
              while (value && depth--) {
                value = value._parent;
              }
              return value;
            },
            merge: function merge(param, common) {
              var obj = param || common;
              if (param && common && param !== common) {
                obj = Utils.extend({}, common, param);
              }
              return obj;
            },
            noop: env.VM.noop,
            compilerInfo: templateSpec.compiler
          };
          function ret(context) {
            var options = arguments[1] === undefined ? {} : arguments[1];
            var data = options.data;
            ret._setup(options);
            if (!options.partial && templateSpec.useData) {
              data = initData(context, data);
            }
            var depths = undefined,
                blockParams = templateSpec.useBlockParams ? [] : undefined;
            if (templateSpec.useDepths) {
              depths = options.depths ? [context].concat(options.depths) : [context];
            }
            return templateSpec.main.call(container, context, container.helpers, container.partials, data, blockParams, depths);
          }
          ret.isTop = true;
          ret._setup = function(options) {
            if (!options.partial) {
              container.helpers = container.merge(options.helpers, env.helpers);
              if (templateSpec.usePartial) {
                container.partials = container.merge(options.partials, env.partials);
              }
            } else {
              container.helpers = options.helpers;
              container.partials = options.partials;
            }
          };
          ret._child = function(i, data, blockParams, depths) {
            if (templateSpec.useBlockParams && !blockParams) {
              throw new _Exception2['default']('must pass block params');
            }
            if (templateSpec.useDepths && !depths) {
              throw new _Exception2['default']('must pass parent depths');
            }
            return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
          };
          return ret;
        }
        function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
          function prog(context) {
            var options = arguments[1] === undefined ? {} : arguments[1];
            return fn.call(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), depths && [context].concat(depths));
          }
          prog.program = i;
          prog.depth = depths ? depths.length : 0;
          prog.blockParams = declaredBlockParams || 0;
          return prog;
        }
        function resolvePartial(partial, context, options) {
          if (!partial) {
            partial = options.partials[options.name];
          } else if (!partial.call && !options.name) {
            options.name = partial;
            partial = options.partials[partial];
          }
          return partial;
        }
        function invokePartial(partial, context, options) {
          options.partial = true;
          if (partial === undefined) {
            throw new _Exception2['default']('The partial ' + options.name + ' could not be found');
          } else if (partial instanceof Function) {
            return partial(context, options);
          }
        }
        function noop() {
          return '';
        }
        function initData(context, data) {
          if (!data || !('root' in data)) {
            data = data ? _COMPILER_REVISION$REVISION_CHANGES$createFrame.createFrame(data) : {};
            data.root = context;
          }
          return data;
        }
      }, function(module, exports, __webpack_require__) {
        "use strict";
        exports.__esModule = true;
        var handlebars = (function() {
          var parser = {
            trace: function trace() {},
            yy: {},
            symbols_: {
              error: 2,
              root: 3,
              program: 4,
              EOF: 5,
              program_repetition0: 6,
              statement: 7,
              mustache: 8,
              block: 9,
              rawBlock: 10,
              partial: 11,
              content: 12,
              COMMENT: 13,
              CONTENT: 14,
              openRawBlock: 15,
              END_RAW_BLOCK: 16,
              OPEN_RAW_BLOCK: 17,
              helperName: 18,
              openRawBlock_repetition0: 19,
              openRawBlock_option0: 20,
              CLOSE_RAW_BLOCK: 21,
              openBlock: 22,
              block_option0: 23,
              closeBlock: 24,
              openInverse: 25,
              block_option1: 26,
              OPEN_BLOCK: 27,
              openBlock_repetition0: 28,
              openBlock_option0: 29,
              openBlock_option1: 30,
              CLOSE: 31,
              OPEN_INVERSE: 32,
              openInverse_repetition0: 33,
              openInverse_option0: 34,
              openInverse_option1: 35,
              openInverseChain: 36,
              OPEN_INVERSE_CHAIN: 37,
              openInverseChain_repetition0: 38,
              openInverseChain_option0: 39,
              openInverseChain_option1: 40,
              inverseAndProgram: 41,
              INVERSE: 42,
              inverseChain: 43,
              inverseChain_option0: 44,
              OPEN_ENDBLOCK: 45,
              OPEN: 46,
              mustache_repetition0: 47,
              mustache_option0: 48,
              OPEN_UNESCAPED: 49,
              mustache_repetition1: 50,
              mustache_option1: 51,
              CLOSE_UNESCAPED: 52,
              OPEN_PARTIAL: 53,
              partialName: 54,
              partial_repetition0: 55,
              partial_option0: 56,
              param: 57,
              sexpr: 58,
              OPEN_SEXPR: 59,
              sexpr_repetition0: 60,
              sexpr_option0: 61,
              CLOSE_SEXPR: 62,
              hash: 63,
              hash_repetition_plus0: 64,
              hashSegment: 65,
              ID: 66,
              EQUALS: 67,
              blockParams: 68,
              OPEN_BLOCK_PARAMS: 69,
              blockParams_repetition_plus0: 70,
              CLOSE_BLOCK_PARAMS: 71,
              path: 72,
              dataName: 73,
              STRING: 74,
              NUMBER: 75,
              BOOLEAN: 76,
              UNDEFINED: 77,
              NULL: 78,
              DATA: 79,
              pathSegments: 80,
              SEP: 81,
              $accept: 0,
              $end: 1
            },
            terminals_: {
              2: "error",
              5: "EOF",
              13: "COMMENT",
              14: "CONTENT",
              16: "END_RAW_BLOCK",
              17: "OPEN_RAW_BLOCK",
              21: "CLOSE_RAW_BLOCK",
              27: "OPEN_BLOCK",
              31: "CLOSE",
              32: "OPEN_INVERSE",
              37: "OPEN_INVERSE_CHAIN",
              42: "INVERSE",
              45: "OPEN_ENDBLOCK",
              46: "OPEN",
              49: "OPEN_UNESCAPED",
              52: "CLOSE_UNESCAPED",
              53: "OPEN_PARTIAL",
              59: "OPEN_SEXPR",
              62: "CLOSE_SEXPR",
              66: "ID",
              67: "EQUALS",
              69: "OPEN_BLOCK_PARAMS",
              71: "CLOSE_BLOCK_PARAMS",
              74: "STRING",
              75: "NUMBER",
              76: "BOOLEAN",
              77: "UNDEFINED",
              78: "NULL",
              79: "DATA",
              81: "SEP"
            },
            productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [12, 1], [10, 3], [15, 5], [9, 4], [9, 4], [22, 6], [25, 6], [36, 6], [41, 2], [43, 3], [43, 1], [24, 3], [8, 5], [8, 5], [11, 5], [57, 1], [57, 1], [58, 5], [63, 1], [65, 3], [68, 3], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [18, 1], [54, 1], [54, 1], [73, 2], [72, 1], [80, 3], [80, 1], [6, 0], [6, 2], [19, 0], [19, 2], [20, 0], [20, 1], [23, 0], [23, 1], [26, 0], [26, 1], [28, 0], [28, 2], [29, 0], [29, 1], [30, 0], [30, 1], [33, 0], [33, 2], [34, 0], [34, 1], [35, 0], [35, 1], [38, 0], [38, 2], [39, 0], [39, 1], [40, 0], [40, 1], [44, 0], [44, 1], [47, 0], [47, 2], [48, 0], [48, 1], [50, 0], [50, 2], [51, 0], [51, 1], [55, 0], [55, 2], [56, 0], [56, 1], [60, 0], [60, 2], [61, 0], [61, 1], [64, 1], [64, 2], [70, 1], [70, 2]],
            performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$) {
              var $0 = $$.length - 1;
              switch (yystate) {
                case 1:
                  return $$[$0 - 1];
                  break;
                case 2:
                  this.$ = new yy.Program($$[$0], null, {}, yy.locInfo(this._$));
                  break;
                case 3:
                  this.$ = $$[$0];
                  break;
                case 4:
                  this.$ = $$[$0];
                  break;
                case 5:
                  this.$ = $$[$0];
                  break;
                case 6:
                  this.$ = $$[$0];
                  break;
                case 7:
                  this.$ = $$[$0];
                  break;
                case 8:
                  this.$ = new yy.CommentStatement(yy.stripComment($$[$0]), yy.stripFlags($$[$0], $$[$0]), yy.locInfo(this._$));
                  break;
                case 9:
                  this.$ = new yy.ContentStatement($$[$0], yy.locInfo(this._$));
                  break;
                case 10:
                  this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
                  break;
                case 11:
                  this.$ = {
                    path: $$[$0 - 3],
                    params: $$[$0 - 2],
                    hash: $$[$0 - 1]
                  };
                  break;
                case 12:
                  this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
                  break;
                case 13:
                  this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
                  break;
                case 14:
                  this.$ = {
                    path: $$[$0 - 4],
                    params: $$[$0 - 3],
                    hash: $$[$0 - 2],
                    blockParams: $$[$0 - 1],
                    strip: yy.stripFlags($$[$0 - 5], $$[$0])
                  };
                  break;
                case 15:
                  this.$ = {
                    path: $$[$0 - 4],
                    params: $$[$0 - 3],
                    hash: $$[$0 - 2],
                    blockParams: $$[$0 - 1],
                    strip: yy.stripFlags($$[$0 - 5], $$[$0])
                  };
                  break;
                case 16:
                  this.$ = {
                    path: $$[$0 - 4],
                    params: $$[$0 - 3],
                    hash: $$[$0 - 2],
                    blockParams: $$[$0 - 1],
                    strip: yy.stripFlags($$[$0 - 5], $$[$0])
                  };
                  break;
                case 17:
                  this.$ = {
                    strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]),
                    program: $$[$0]
                  };
                  break;
                case 18:
                  var inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$),
                      program = new yy.Program([inverse], null, {}, yy.locInfo(this._$));
                  program.chained = true;
                  this.$ = {
                    strip: $$[$0 - 2].strip,
                    program: program,
                    chain: true
                  };
                  break;
                case 19:
                  this.$ = $$[$0];
                  break;
                case 20:
                  this.$ = {
                    path: $$[$0 - 1],
                    strip: yy.stripFlags($$[$0 - 2], $$[$0])
                  };
                  break;
                case 21:
                  this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                  break;
                case 22:
                  this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
                  break;
                case 23:
                  this.$ = new yy.PartialStatement($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], yy.stripFlags($$[$0 - 4], $$[$0]), yy.locInfo(this._$));
                  break;
                case 24:
                  this.$ = $$[$0];
                  break;
                case 25:
                  this.$ = $$[$0];
                  break;
                case 26:
                  this.$ = new yy.SubExpression($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], yy.locInfo(this._$));
                  break;
                case 27:
                  this.$ = new yy.Hash($$[$0], yy.locInfo(this._$));
                  break;
                case 28:
                  this.$ = new yy.HashPair(yy.id($$[$0 - 2]), $$[$0], yy.locInfo(this._$));
                  break;
                case 29:
                  this.$ = yy.id($$[$0 - 1]);
                  break;
                case 30:
                  this.$ = $$[$0];
                  break;
                case 31:
                  this.$ = $$[$0];
                  break;
                case 32:
                  this.$ = new yy.StringLiteral($$[$0], yy.locInfo(this._$));
                  break;
                case 33:
                  this.$ = new yy.NumberLiteral($$[$0], yy.locInfo(this._$));
                  break;
                case 34:
                  this.$ = new yy.BooleanLiteral($$[$0], yy.locInfo(this._$));
                  break;
                case 35:
                  this.$ = new yy.UndefinedLiteral(yy.locInfo(this._$));
                  break;
                case 36:
                  this.$ = new yy.NullLiteral(yy.locInfo(this._$));
                  break;
                case 37:
                  this.$ = $$[$0];
                  break;
                case 38:
                  this.$ = $$[$0];
                  break;
                case 39:
                  this.$ = yy.preparePath(true, $$[$0], this._$);
                  break;
                case 40:
                  this.$ = yy.preparePath(false, $$[$0], this._$);
                  break;
                case 41:
                  $$[$0 - 2].push({
                    part: yy.id($$[$0]),
                    original: $$[$0],
                    separator: $$[$0 - 1]
                  });
                  this.$ = $$[$0 - 2];
                  break;
                case 42:
                  this.$ = [{
                    part: yy.id($$[$0]),
                    original: $$[$0]
                  }];
                  break;
                case 43:
                  this.$ = [];
                  break;
                case 44:
                  $$[$0 - 1].push($$[$0]);
                  break;
                case 45:
                  this.$ = [];
                  break;
                case 46:
                  $$[$0 - 1].push($$[$0]);
                  break;
                case 53:
                  this.$ = [];
                  break;
                case 54:
                  $$[$0 - 1].push($$[$0]);
                  break;
                case 59:
                  this.$ = [];
                  break;
                case 60:
                  $$[$0 - 1].push($$[$0]);
                  break;
                case 65:
                  this.$ = [];
                  break;
                case 66:
                  $$[$0 - 1].push($$[$0]);
                  break;
                case 73:
                  this.$ = [];
                  break;
                case 74:
                  $$[$0 - 1].push($$[$0]);
                  break;
                case 77:
                  this.$ = [];
                  break;
                case 78:
                  $$[$0 - 1].push($$[$0]);
                  break;
                case 81:
                  this.$ = [];
                  break;
                case 82:
                  $$[$0 - 1].push($$[$0]);
                  break;
                case 85:
                  this.$ = [];
                  break;
                case 86:
                  $$[$0 - 1].push($$[$0]);
                  break;
                case 89:
                  this.$ = [$$[$0]];
                  break;
                case 90:
                  $$[$0 - 1].push($$[$0]);
                  break;
                case 91:
                  this.$ = [$$[$0]];
                  break;
                case 92:
                  $$[$0 - 1].push($$[$0]);
                  break;
              }
            },
            table: [{
              3: 1,
              4: 2,
              5: [2, 43],
              6: 3,
              13: [2, 43],
              14: [2, 43],
              17: [2, 43],
              27: [2, 43],
              32: [2, 43],
              46: [2, 43],
              49: [2, 43],
              53: [2, 43]
            }, {1: [3]}, {5: [1, 4]}, {
              5: [2, 2],
              7: 5,
              8: 6,
              9: 7,
              10: 8,
              11: 9,
              12: 10,
              13: [1, 11],
              14: [1, 18],
              15: 16,
              17: [1, 21],
              22: 14,
              25: 15,
              27: [1, 19],
              32: [1, 20],
              37: [2, 2],
              42: [2, 2],
              45: [2, 2],
              46: [1, 12],
              49: [1, 13],
              53: [1, 17]
            }, {1: [2, 1]}, {
              5: [2, 44],
              13: [2, 44],
              14: [2, 44],
              17: [2, 44],
              27: [2, 44],
              32: [2, 44],
              37: [2, 44],
              42: [2, 44],
              45: [2, 44],
              46: [2, 44],
              49: [2, 44],
              53: [2, 44]
            }, {
              5: [2, 3],
              13: [2, 3],
              14: [2, 3],
              17: [2, 3],
              27: [2, 3],
              32: [2, 3],
              37: [2, 3],
              42: [2, 3],
              45: [2, 3],
              46: [2, 3],
              49: [2, 3],
              53: [2, 3]
            }, {
              5: [2, 4],
              13: [2, 4],
              14: [2, 4],
              17: [2, 4],
              27: [2, 4],
              32: [2, 4],
              37: [2, 4],
              42: [2, 4],
              45: [2, 4],
              46: [2, 4],
              49: [2, 4],
              53: [2, 4]
            }, {
              5: [2, 5],
              13: [2, 5],
              14: [2, 5],
              17: [2, 5],
              27: [2, 5],
              32: [2, 5],
              37: [2, 5],
              42: [2, 5],
              45: [2, 5],
              46: [2, 5],
              49: [2, 5],
              53: [2, 5]
            }, {
              5: [2, 6],
              13: [2, 6],
              14: [2, 6],
              17: [2, 6],
              27: [2, 6],
              32: [2, 6],
              37: [2, 6],
              42: [2, 6],
              45: [2, 6],
              46: [2, 6],
              49: [2, 6],
              53: [2, 6]
            }, {
              5: [2, 7],
              13: [2, 7],
              14: [2, 7],
              17: [2, 7],
              27: [2, 7],
              32: [2, 7],
              37: [2, 7],
              42: [2, 7],
              45: [2, 7],
              46: [2, 7],
              49: [2, 7],
              53: [2, 7]
            }, {
              5: [2, 8],
              13: [2, 8],
              14: [2, 8],
              17: [2, 8],
              27: [2, 8],
              32: [2, 8],
              37: [2, 8],
              42: [2, 8],
              45: [2, 8],
              46: [2, 8],
              49: [2, 8],
              53: [2, 8]
            }, {
              18: 22,
              66: [1, 32],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              18: 33,
              66: [1, 32],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              4: 34,
              6: 3,
              13: [2, 43],
              14: [2, 43],
              17: [2, 43],
              27: [2, 43],
              32: [2, 43],
              37: [2, 43],
              42: [2, 43],
              45: [2, 43],
              46: [2, 43],
              49: [2, 43],
              53: [2, 43]
            }, {
              4: 35,
              6: 3,
              13: [2, 43],
              14: [2, 43],
              17: [2, 43],
              27: [2, 43],
              32: [2, 43],
              42: [2, 43],
              45: [2, 43],
              46: [2, 43],
              49: [2, 43],
              53: [2, 43]
            }, {
              12: 36,
              14: [1, 18]
            }, {
              18: 38,
              54: 37,
              58: 39,
              59: [1, 40],
              66: [1, 32],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              5: [2, 9],
              13: [2, 9],
              14: [2, 9],
              16: [2, 9],
              17: [2, 9],
              27: [2, 9],
              32: [2, 9],
              37: [2, 9],
              42: [2, 9],
              45: [2, 9],
              46: [2, 9],
              49: [2, 9],
              53: [2, 9]
            }, {
              18: 41,
              66: [1, 32],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              18: 42,
              66: [1, 32],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              18: 43,
              66: [1, 32],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              31: [2, 73],
              47: 44,
              59: [2, 73],
              66: [2, 73],
              74: [2, 73],
              75: [2, 73],
              76: [2, 73],
              77: [2, 73],
              78: [2, 73],
              79: [2, 73]
            }, {
              21: [2, 30],
              31: [2, 30],
              52: [2, 30],
              59: [2, 30],
              62: [2, 30],
              66: [2, 30],
              69: [2, 30],
              74: [2, 30],
              75: [2, 30],
              76: [2, 30],
              77: [2, 30],
              78: [2, 30],
              79: [2, 30]
            }, {
              21: [2, 31],
              31: [2, 31],
              52: [2, 31],
              59: [2, 31],
              62: [2, 31],
              66: [2, 31],
              69: [2, 31],
              74: [2, 31],
              75: [2, 31],
              76: [2, 31],
              77: [2, 31],
              78: [2, 31],
              79: [2, 31]
            }, {
              21: [2, 32],
              31: [2, 32],
              52: [2, 32],
              59: [2, 32],
              62: [2, 32],
              66: [2, 32],
              69: [2, 32],
              74: [2, 32],
              75: [2, 32],
              76: [2, 32],
              77: [2, 32],
              78: [2, 32],
              79: [2, 32]
            }, {
              21: [2, 33],
              31: [2, 33],
              52: [2, 33],
              59: [2, 33],
              62: [2, 33],
              66: [2, 33],
              69: [2, 33],
              74: [2, 33],
              75: [2, 33],
              76: [2, 33],
              77: [2, 33],
              78: [2, 33],
              79: [2, 33]
            }, {
              21: [2, 34],
              31: [2, 34],
              52: [2, 34],
              59: [2, 34],
              62: [2, 34],
              66: [2, 34],
              69: [2, 34],
              74: [2, 34],
              75: [2, 34],
              76: [2, 34],
              77: [2, 34],
              78: [2, 34],
              79: [2, 34]
            }, {
              21: [2, 35],
              31: [2, 35],
              52: [2, 35],
              59: [2, 35],
              62: [2, 35],
              66: [2, 35],
              69: [2, 35],
              74: [2, 35],
              75: [2, 35],
              76: [2, 35],
              77: [2, 35],
              78: [2, 35],
              79: [2, 35]
            }, {
              21: [2, 36],
              31: [2, 36],
              52: [2, 36],
              59: [2, 36],
              62: [2, 36],
              66: [2, 36],
              69: [2, 36],
              74: [2, 36],
              75: [2, 36],
              76: [2, 36],
              77: [2, 36],
              78: [2, 36],
              79: [2, 36]
            }, {
              21: [2, 40],
              31: [2, 40],
              52: [2, 40],
              59: [2, 40],
              62: [2, 40],
              66: [2, 40],
              69: [2, 40],
              74: [2, 40],
              75: [2, 40],
              76: [2, 40],
              77: [2, 40],
              78: [2, 40],
              79: [2, 40],
              81: [1, 45]
            }, {
              66: [1, 32],
              80: 46
            }, {
              21: [2, 42],
              31: [2, 42],
              52: [2, 42],
              59: [2, 42],
              62: [2, 42],
              66: [2, 42],
              69: [2, 42],
              74: [2, 42],
              75: [2, 42],
              76: [2, 42],
              77: [2, 42],
              78: [2, 42],
              79: [2, 42],
              81: [2, 42]
            }, {
              50: 47,
              52: [2, 77],
              59: [2, 77],
              66: [2, 77],
              74: [2, 77],
              75: [2, 77],
              76: [2, 77],
              77: [2, 77],
              78: [2, 77],
              79: [2, 77]
            }, {
              23: 48,
              36: 50,
              37: [1, 52],
              41: 51,
              42: [1, 53],
              43: 49,
              45: [2, 49]
            }, {
              26: 54,
              41: 55,
              42: [1, 53],
              45: [2, 51]
            }, {16: [1, 56]}, {
              31: [2, 81],
              55: 57,
              59: [2, 81],
              66: [2, 81],
              74: [2, 81],
              75: [2, 81],
              76: [2, 81],
              77: [2, 81],
              78: [2, 81],
              79: [2, 81]
            }, {
              31: [2, 37],
              59: [2, 37],
              66: [2, 37],
              74: [2, 37],
              75: [2, 37],
              76: [2, 37],
              77: [2, 37],
              78: [2, 37],
              79: [2, 37]
            }, {
              31: [2, 38],
              59: [2, 38],
              66: [2, 38],
              74: [2, 38],
              75: [2, 38],
              76: [2, 38],
              77: [2, 38],
              78: [2, 38],
              79: [2, 38]
            }, {
              18: 58,
              66: [1, 32],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              28: 59,
              31: [2, 53],
              59: [2, 53],
              66: [2, 53],
              69: [2, 53],
              74: [2, 53],
              75: [2, 53],
              76: [2, 53],
              77: [2, 53],
              78: [2, 53],
              79: [2, 53]
            }, {
              31: [2, 59],
              33: 60,
              59: [2, 59],
              66: [2, 59],
              69: [2, 59],
              74: [2, 59],
              75: [2, 59],
              76: [2, 59],
              77: [2, 59],
              78: [2, 59],
              79: [2, 59]
            }, {
              19: 61,
              21: [2, 45],
              59: [2, 45],
              66: [2, 45],
              74: [2, 45],
              75: [2, 45],
              76: [2, 45],
              77: [2, 45],
              78: [2, 45],
              79: [2, 45]
            }, {
              18: 65,
              31: [2, 75],
              48: 62,
              57: 63,
              58: 66,
              59: [1, 40],
              63: 64,
              64: 67,
              65: 68,
              66: [1, 69],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {66: [1, 70]}, {
              21: [2, 39],
              31: [2, 39],
              52: [2, 39],
              59: [2, 39],
              62: [2, 39],
              66: [2, 39],
              69: [2, 39],
              74: [2, 39],
              75: [2, 39],
              76: [2, 39],
              77: [2, 39],
              78: [2, 39],
              79: [2, 39],
              81: [1, 45]
            }, {
              18: 65,
              51: 71,
              52: [2, 79],
              57: 72,
              58: 66,
              59: [1, 40],
              63: 73,
              64: 67,
              65: 68,
              66: [1, 69],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              24: 74,
              45: [1, 75]
            }, {45: [2, 50]}, {
              4: 76,
              6: 3,
              13: [2, 43],
              14: [2, 43],
              17: [2, 43],
              27: [2, 43],
              32: [2, 43],
              37: [2, 43],
              42: [2, 43],
              45: [2, 43],
              46: [2, 43],
              49: [2, 43],
              53: [2, 43]
            }, {45: [2, 19]}, {
              18: 77,
              66: [1, 32],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              4: 78,
              6: 3,
              13: [2, 43],
              14: [2, 43],
              17: [2, 43],
              27: [2, 43],
              32: [2, 43],
              45: [2, 43],
              46: [2, 43],
              49: [2, 43],
              53: [2, 43]
            }, {
              24: 79,
              45: [1, 75]
            }, {45: [2, 52]}, {
              5: [2, 10],
              13: [2, 10],
              14: [2, 10],
              17: [2, 10],
              27: [2, 10],
              32: [2, 10],
              37: [2, 10],
              42: [2, 10],
              45: [2, 10],
              46: [2, 10],
              49: [2, 10],
              53: [2, 10]
            }, {
              18: 65,
              31: [2, 83],
              56: 80,
              57: 81,
              58: 66,
              59: [1, 40],
              63: 82,
              64: 67,
              65: 68,
              66: [1, 69],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              59: [2, 85],
              60: 83,
              62: [2, 85],
              66: [2, 85],
              74: [2, 85],
              75: [2, 85],
              76: [2, 85],
              77: [2, 85],
              78: [2, 85],
              79: [2, 85]
            }, {
              18: 65,
              29: 84,
              31: [2, 55],
              57: 85,
              58: 66,
              59: [1, 40],
              63: 86,
              64: 67,
              65: 68,
              66: [1, 69],
              69: [2, 55],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              18: 65,
              31: [2, 61],
              34: 87,
              57: 88,
              58: 66,
              59: [1, 40],
              63: 89,
              64: 67,
              65: 68,
              66: [1, 69],
              69: [2, 61],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              18: 65,
              20: 90,
              21: [2, 47],
              57: 91,
              58: 66,
              59: [1, 40],
              63: 92,
              64: 67,
              65: 68,
              66: [1, 69],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {31: [1, 93]}, {
              31: [2, 74],
              59: [2, 74],
              66: [2, 74],
              74: [2, 74],
              75: [2, 74],
              76: [2, 74],
              77: [2, 74],
              78: [2, 74],
              79: [2, 74]
            }, {31: [2, 76]}, {
              21: [2, 24],
              31: [2, 24],
              52: [2, 24],
              59: [2, 24],
              62: [2, 24],
              66: [2, 24],
              69: [2, 24],
              74: [2, 24],
              75: [2, 24],
              76: [2, 24],
              77: [2, 24],
              78: [2, 24],
              79: [2, 24]
            }, {
              21: [2, 25],
              31: [2, 25],
              52: [2, 25],
              59: [2, 25],
              62: [2, 25],
              66: [2, 25],
              69: [2, 25],
              74: [2, 25],
              75: [2, 25],
              76: [2, 25],
              77: [2, 25],
              78: [2, 25],
              79: [2, 25]
            }, {
              21: [2, 27],
              31: [2, 27],
              52: [2, 27],
              62: [2, 27],
              65: 94,
              66: [1, 95],
              69: [2, 27]
            }, {
              21: [2, 89],
              31: [2, 89],
              52: [2, 89],
              62: [2, 89],
              66: [2, 89],
              69: [2, 89]
            }, {
              21: [2, 42],
              31: [2, 42],
              52: [2, 42],
              59: [2, 42],
              62: [2, 42],
              66: [2, 42],
              67: [1, 96],
              69: [2, 42],
              74: [2, 42],
              75: [2, 42],
              76: [2, 42],
              77: [2, 42],
              78: [2, 42],
              79: [2, 42],
              81: [2, 42]
            }, {
              21: [2, 41],
              31: [2, 41],
              52: [2, 41],
              59: [2, 41],
              62: [2, 41],
              66: [2, 41],
              69: [2, 41],
              74: [2, 41],
              75: [2, 41],
              76: [2, 41],
              77: [2, 41],
              78: [2, 41],
              79: [2, 41],
              81: [2, 41]
            }, {52: [1, 97]}, {
              52: [2, 78],
              59: [2, 78],
              66: [2, 78],
              74: [2, 78],
              75: [2, 78],
              76: [2, 78],
              77: [2, 78],
              78: [2, 78],
              79: [2, 78]
            }, {52: [2, 80]}, {
              5: [2, 12],
              13: [2, 12],
              14: [2, 12],
              17: [2, 12],
              27: [2, 12],
              32: [2, 12],
              37: [2, 12],
              42: [2, 12],
              45: [2, 12],
              46: [2, 12],
              49: [2, 12],
              53: [2, 12]
            }, {
              18: 98,
              66: [1, 32],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              36: 50,
              37: [1, 52],
              41: 51,
              42: [1, 53],
              43: 100,
              44: 99,
              45: [2, 71]
            }, {
              31: [2, 65],
              38: 101,
              59: [2, 65],
              66: [2, 65],
              69: [2, 65],
              74: [2, 65],
              75: [2, 65],
              76: [2, 65],
              77: [2, 65],
              78: [2, 65],
              79: [2, 65]
            }, {45: [2, 17]}, {
              5: [2, 13],
              13: [2, 13],
              14: [2, 13],
              17: [2, 13],
              27: [2, 13],
              32: [2, 13],
              37: [2, 13],
              42: [2, 13],
              45: [2, 13],
              46: [2, 13],
              49: [2, 13],
              53: [2, 13]
            }, {31: [1, 102]}, {
              31: [2, 82],
              59: [2, 82],
              66: [2, 82],
              74: [2, 82],
              75: [2, 82],
              76: [2, 82],
              77: [2, 82],
              78: [2, 82],
              79: [2, 82]
            }, {31: [2, 84]}, {
              18: 65,
              57: 104,
              58: 66,
              59: [1, 40],
              61: 103,
              62: [2, 87],
              63: 105,
              64: 67,
              65: 68,
              66: [1, 69],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              30: 106,
              31: [2, 57],
              68: 107,
              69: [1, 108]
            }, {
              31: [2, 54],
              59: [2, 54],
              66: [2, 54],
              69: [2, 54],
              74: [2, 54],
              75: [2, 54],
              76: [2, 54],
              77: [2, 54],
              78: [2, 54],
              79: [2, 54]
            }, {
              31: [2, 56],
              69: [2, 56]
            }, {
              31: [2, 63],
              35: 109,
              68: 110,
              69: [1, 108]
            }, {
              31: [2, 60],
              59: [2, 60],
              66: [2, 60],
              69: [2, 60],
              74: [2, 60],
              75: [2, 60],
              76: [2, 60],
              77: [2, 60],
              78: [2, 60],
              79: [2, 60]
            }, {
              31: [2, 62],
              69: [2, 62]
            }, {21: [1, 111]}, {
              21: [2, 46],
              59: [2, 46],
              66: [2, 46],
              74: [2, 46],
              75: [2, 46],
              76: [2, 46],
              77: [2, 46],
              78: [2, 46],
              79: [2, 46]
            }, {21: [2, 48]}, {
              5: [2, 21],
              13: [2, 21],
              14: [2, 21],
              17: [2, 21],
              27: [2, 21],
              32: [2, 21],
              37: [2, 21],
              42: [2, 21],
              45: [2, 21],
              46: [2, 21],
              49: [2, 21],
              53: [2, 21]
            }, {
              21: [2, 90],
              31: [2, 90],
              52: [2, 90],
              62: [2, 90],
              66: [2, 90],
              69: [2, 90]
            }, {67: [1, 96]}, {
              18: 65,
              57: 112,
              58: 66,
              59: [1, 40],
              66: [1, 32],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              5: [2, 22],
              13: [2, 22],
              14: [2, 22],
              17: [2, 22],
              27: [2, 22],
              32: [2, 22],
              37: [2, 22],
              42: [2, 22],
              45: [2, 22],
              46: [2, 22],
              49: [2, 22],
              53: [2, 22]
            }, {31: [1, 113]}, {45: [2, 18]}, {45: [2, 72]}, {
              18: 65,
              31: [2, 67],
              39: 114,
              57: 115,
              58: 66,
              59: [1, 40],
              63: 116,
              64: 67,
              65: 68,
              66: [1, 69],
              69: [2, 67],
              72: 23,
              73: 24,
              74: [1, 25],
              75: [1, 26],
              76: [1, 27],
              77: [1, 28],
              78: [1, 29],
              79: [1, 31],
              80: 30
            }, {
              5: [2, 23],
              13: [2, 23],
              14: [2, 23],
              17: [2, 23],
              27: [2, 23],
              32: [2, 23],
              37: [2, 23],
              42: [2, 23],
              45: [2, 23],
              46: [2, 23],
              49: [2, 23],
              53: [2, 23]
            }, {62: [1, 117]}, {
              59: [2, 86],
              62: [2, 86],
              66: [2, 86],
              74: [2, 86],
              75: [2, 86],
              76: [2, 86],
              77: [2, 86],
              78: [2, 86],
              79: [2, 86]
            }, {62: [2, 88]}, {31: [1, 118]}, {31: [2, 58]}, {
              66: [1, 120],
              70: 119
            }, {31: [1, 121]}, {31: [2, 64]}, {14: [2, 11]}, {
              21: [2, 28],
              31: [2, 28],
              52: [2, 28],
              62: [2, 28],
              66: [2, 28],
              69: [2, 28]
            }, {
              5: [2, 20],
              13: [2, 20],
              14: [2, 20],
              17: [2, 20],
              27: [2, 20],
              32: [2, 20],
              37: [2, 20],
              42: [2, 20],
              45: [2, 20],
              46: [2, 20],
              49: [2, 20],
              53: [2, 20]
            }, {
              31: [2, 69],
              40: 122,
              68: 123,
              69: [1, 108]
            }, {
              31: [2, 66],
              59: [2, 66],
              66: [2, 66],
              69: [2, 66],
              74: [2, 66],
              75: [2, 66],
              76: [2, 66],
              77: [2, 66],
              78: [2, 66],
              79: [2, 66]
            }, {
              31: [2, 68],
              69: [2, 68]
            }, {
              21: [2, 26],
              31: [2, 26],
              52: [2, 26],
              59: [2, 26],
              62: [2, 26],
              66: [2, 26],
              69: [2, 26],
              74: [2, 26],
              75: [2, 26],
              76: [2, 26],
              77: [2, 26],
              78: [2, 26],
              79: [2, 26]
            }, {
              13: [2, 14],
              14: [2, 14],
              17: [2, 14],
              27: [2, 14],
              32: [2, 14],
              37: [2, 14],
              42: [2, 14],
              45: [2, 14],
              46: [2, 14],
              49: [2, 14],
              53: [2, 14]
            }, {
              66: [1, 125],
              71: [1, 124]
            }, {
              66: [2, 91],
              71: [2, 91]
            }, {
              13: [2, 15],
              14: [2, 15],
              17: [2, 15],
              27: [2, 15],
              32: [2, 15],
              42: [2, 15],
              45: [2, 15],
              46: [2, 15],
              49: [2, 15],
              53: [2, 15]
            }, {31: [1, 126]}, {31: [2, 70]}, {31: [2, 29]}, {
              66: [2, 92],
              71: [2, 92]
            }, {
              13: [2, 16],
              14: [2, 16],
              17: [2, 16],
              27: [2, 16],
              32: [2, 16],
              37: [2, 16],
              42: [2, 16],
              45: [2, 16],
              46: [2, 16],
              49: [2, 16],
              53: [2, 16]
            }],
            defaultActions: {
              4: [2, 1],
              49: [2, 50],
              51: [2, 19],
              55: [2, 52],
              64: [2, 76],
              73: [2, 80],
              78: [2, 17],
              82: [2, 84],
              92: [2, 48],
              99: [2, 18],
              100: [2, 72],
              105: [2, 88],
              107: [2, 58],
              110: [2, 64],
              111: [2, 11],
              123: [2, 70],
              124: [2, 29]
            },
            parseError: function parseError(str, hash) {
              throw new Error(str);
            },
            parse: function parse(input) {
              var self = this,
                  stack = [0],
                  vstack = [null],
                  lstack = [],
                  table = this.table,
                  yytext = "",
                  yylineno = 0,
                  yyleng = 0,
                  recovering = 0,
                  TERROR = 2,
                  EOF = 1;
              this.lexer.setInput(input);
              this.lexer.yy = this.yy;
              this.yy.lexer = this.lexer;
              this.yy.parser = this;
              if (typeof this.lexer.yylloc == "undefined")
                this.lexer.yylloc = {};
              var yyloc = this.lexer.yylloc;
              lstack.push(yyloc);
              var ranges = this.lexer.options && this.lexer.options.ranges;
              if (typeof this.yy.parseError === "function")
                this.parseError = this.yy.parseError;
              function popStack(n) {
                stack.length = stack.length - 2 * n;
                vstack.length = vstack.length - n;
                lstack.length = lstack.length - n;
              }
              function lex() {
                var token;
                token = self.lexer.lex() || 1;
                if (typeof token !== "number") {
                  token = self.symbols_[token] || token;
                }
                return token;
              }
              var symbol,
                  preErrorSymbol,
                  state,
                  action,
                  a,
                  r,
                  yyval = {},
                  p,
                  len,
                  newState,
                  expected;
              while (true) {
                state = stack[stack.length - 1];
                if (this.defaultActions[state]) {
                  action = this.defaultActions[state];
                } else {
                  if (symbol === null || typeof symbol == "undefined") {
                    symbol = lex();
                  }
                  action = table[state] && table[state][symbol];
                }
                if (typeof action === "undefined" || !action.length || !action[0]) {
                  var errStr = "";
                  if (!recovering) {
                    expected = [];
                    for (p in table[state])
                      if (this.terminals_[p] && p > 2) {
                        expected.push("'" + this.terminals_[p] + "'");
                      }
                    if (this.lexer.showPosition) {
                      errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
                    } else {
                      errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
                    }
                    this.parseError(errStr, {
                      text: this.lexer.match,
                      token: this.terminals_[symbol] || symbol,
                      line: this.lexer.yylineno,
                      loc: yyloc,
                      expected: expected
                    });
                  }
                }
                if (action[0] instanceof Array && action.length > 1) {
                  throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
                }
                switch (action[0]) {
                  case 1:
                    stack.push(symbol);
                    vstack.push(this.lexer.yytext);
                    lstack.push(this.lexer.yylloc);
                    stack.push(action[1]);
                    symbol = null;
                    if (!preErrorSymbol) {
                      yyleng = this.lexer.yyleng;
                      yytext = this.lexer.yytext;
                      yylineno = this.lexer.yylineno;
                      yyloc = this.lexer.yylloc;
                      if (recovering > 0)
                        recovering--;
                    } else {
                      symbol = preErrorSymbol;
                      preErrorSymbol = null;
                    }
                    break;
                  case 2:
                    len = this.productions_[action[1]][1];
                    yyval.$ = vstack[vstack.length - len];
                    yyval._$ = {
                      first_line: lstack[lstack.length - (len || 1)].first_line,
                      last_line: lstack[lstack.length - 1].last_line,
                      first_column: lstack[lstack.length - (len || 1)].first_column,
                      last_column: lstack[lstack.length - 1].last_column
                    };
                    if (ranges) {
                      yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
                    }
                    r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
                    if (typeof r !== "undefined") {
                      return r;
                    }
                    if (len) {
                      stack = stack.slice(0, -1 * len * 2);
                      vstack = vstack.slice(0, -1 * len);
                      lstack = lstack.slice(0, -1 * len);
                    }
                    stack.push(this.productions_[action[1]][0]);
                    vstack.push(yyval.$);
                    lstack.push(yyval._$);
                    newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
                    stack.push(newState);
                    break;
                  case 3:
                    return true;
                }
              }
              return true;
            }
          };
          var lexer = (function() {
            var lexer = {
              EOF: 1,
              parseError: function parseError(str, hash) {
                if (this.yy.parser) {
                  this.yy.parser.parseError(str, hash);
                } else {
                  throw new Error(str);
                }
              },
              setInput: function setInput(input) {
                this._input = input;
                this._more = this._less = this.done = false;
                this.yylineno = this.yyleng = 0;
                this.yytext = this.matched = this.match = "";
                this.conditionStack = ["INITIAL"];
                this.yylloc = {
                  first_line: 1,
                  first_column: 0,
                  last_line: 1,
                  last_column: 0
                };
                if (this.options.ranges)
                  this.yylloc.range = [0, 0];
                this.offset = 0;
                return this;
              },
              input: function input() {
                var ch = this._input[0];
                this.yytext += ch;
                this.yyleng++;
                this.offset++;
                this.match += ch;
                this.matched += ch;
                var lines = ch.match(/(?:\r\n?|\n).*/g);
                if (lines) {
                  this.yylineno++;
                  this.yylloc.last_line++;
                } else {
                  this.yylloc.last_column++;
                }
                if (this.options.ranges)
                  this.yylloc.range[1]++;
                this._input = this._input.slice(1);
                return ch;
              },
              unput: function unput(ch) {
                var len = ch.length;
                var lines = ch.split(/(?:\r\n?|\n)/g);
                this._input = ch + this._input;
                this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
                this.offset -= len;
                var oldLines = this.match.split(/(?:\r\n?|\n)/g);
                this.match = this.match.substr(0, this.match.length - 1);
                this.matched = this.matched.substr(0, this.matched.length - 1);
                if (lines.length - 1)
                  this.yylineno -= lines.length - 1;
                var r = this.yylloc.range;
                this.yylloc = {
                  first_line: this.yylloc.first_line,
                  last_line: this.yylineno + 1,
                  first_column: this.yylloc.first_column,
                  last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
                };
                if (this.options.ranges) {
                  this.yylloc.range = [r[0], r[0] + this.yyleng - len];
                }
                return this;
              },
              more: function more() {
                this._more = true;
                return this;
              },
              less: function less(n) {
                this.unput(this.match.slice(n));
              },
              pastInput: function pastInput() {
                var past = this.matched.substr(0, this.matched.length - this.match.length);
                return (past.length > 20 ? "..." : "") + past.substr(-20).replace(/\n/g, "");
              },
              upcomingInput: function upcomingInput() {
                var next = this.match;
                if (next.length < 20) {
                  next += this._input.substr(0, 20 - next.length);
                }
                return (next.substr(0, 20) + (next.length > 20 ? "..." : "")).replace(/\n/g, "");
              },
              showPosition: function showPosition() {
                var pre = this.pastInput();
                var c = new Array(pre.length + 1).join("-");
                return pre + this.upcomingInput() + "\n" + c + "^";
              },
              next: function next() {
                if (this.done) {
                  return this.EOF;
                }
                if (!this._input)
                  this.done = true;
                var token,
                    match,
                    tempMatch,
                    index,
                    col,
                    lines;
                if (!this._more) {
                  this.yytext = "";
                  this.match = "";
                }
                var rules = this._currentRules();
                for (var i = 0; i < rules.length; i++) {
                  tempMatch = this._input.match(this.rules[rules[i]]);
                  if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
                    match = tempMatch;
                    index = i;
                    if (!this.options.flex)
                      break;
                  }
                }
                if (match) {
                  lines = match[0].match(/(?:\r\n?|\n).*/g);
                  if (lines)
                    this.yylineno += lines.length;
                  this.yylloc = {
                    first_line: this.yylloc.last_line,
                    last_line: this.yylineno + 1,
                    first_column: this.yylloc.last_column,
                    last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length
                  };
                  this.yytext += match[0];
                  this.match += match[0];
                  this.matches = match;
                  this.yyleng = this.yytext.length;
                  if (this.options.ranges) {
                    this.yylloc.range = [this.offset, this.offset += this.yyleng];
                  }
                  this._more = false;
                  this._input = this._input.slice(match[0].length);
                  this.matched += match[0];
                  token = this.performAction.call(this, this.yy, this, rules[index], this.conditionStack[this.conditionStack.length - 1]);
                  if (this.done && this._input)
                    this.done = false;
                  if (token) {
                    return token;
                  } else {
                    return ;
                  }
                }
                if (this._input === "") {
                  return this.EOF;
                } else {
                  return this.parseError("Lexical error on line " + (this.yylineno + 1) + ". Unrecognized text.\n" + this.showPosition(), {
                    text: "",
                    token: null,
                    line: this.yylineno
                  });
                }
              },
              lex: function lex() {
                var r = this.next();
                if (typeof r !== "undefined") {
                  return r;
                } else {
                  return this.lex();
                }
              },
              begin: function begin(condition) {
                this.conditionStack.push(condition);
              },
              popState: function popState() {
                return this.conditionStack.pop();
              },
              _currentRules: function _currentRules() {
                return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
              },
              topState: function topState() {
                return this.conditionStack[this.conditionStack.length - 2];
              },
              pushState: function begin(condition) {
                this.begin(condition);
              }
            };
            lexer.options = {};
            lexer.performAction = function anonymous(yy, yy_, $avoiding_name_collisions, YY_START) {
              function strip(start, end) {
                return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng - end);
              }
              var YYSTATE = YY_START;
              switch ($avoiding_name_collisions) {
                case 0:
                  if (yy_.yytext.slice(-2) === "\\\\") {
                    strip(0, 1);
                    this.begin("mu");
                  } else if (yy_.yytext.slice(-1) === "\\") {
                    strip(0, 1);
                    this.begin("emu");
                  } else {
                    this.begin("mu");
                  }
                  if (yy_.yytext) {
                    return 14;
                  }
                  break;
                case 1:
                  return 14;
                  break;
                case 2:
                  this.popState();
                  return 14;
                  break;
                case 3:
                  yy_.yytext = yy_.yytext.substr(5, yy_.yyleng - 9);
                  this.popState();
                  return 16;
                  break;
                case 4:
                  return 14;
                  break;
                case 5:
                  this.popState();
                  return 13;
                  break;
                case 6:
                  return 59;
                  break;
                case 7:
                  return 62;
                  break;
                case 8:
                  return 17;
                  break;
                case 9:
                  this.popState();
                  this.begin("raw");
                  return 21;
                  break;
                case 10:
                  return 53;
                  break;
                case 11:
                  return 27;
                  break;
                case 12:
                  return 45;
                  break;
                case 13:
                  this.popState();
                  return 42;
                  break;
                case 14:
                  this.popState();
                  return 42;
                  break;
                case 15:
                  return 32;
                  break;
                case 16:
                  return 37;
                  break;
                case 17:
                  return 49;
                  break;
                case 18:
                  return 46;
                  break;
                case 19:
                  this.unput(yy_.yytext);
                  this.popState();
                  this.begin("com");
                  break;
                case 20:
                  this.popState();
                  return 13;
                  break;
                case 21:
                  return 46;
                  break;
                case 22:
                  return 67;
                  break;
                case 23:
                  return 66;
                  break;
                case 24:
                  return 66;
                  break;
                case 25:
                  return 81;
                  break;
                case 26:
                  break;
                case 27:
                  this.popState();
                  return 52;
                  break;
                case 28:
                  this.popState();
                  return 31;
                  break;
                case 29:
                  yy_.yytext = strip(1, 2).replace(/\\"/g, "\"");
                  return 74;
                  break;
                case 30:
                  yy_.yytext = strip(1, 2).replace(/\\'/g, "'");
                  return 74;
                  break;
                case 31:
                  return 79;
                  break;
                case 32:
                  return 76;
                  break;
                case 33:
                  return 76;
                  break;
                case 34:
                  return 77;
                  break;
                case 35:
                  return 78;
                  break;
                case 36:
                  return 75;
                  break;
                case 37:
                  return 69;
                  break;
                case 38:
                  return 71;
                  break;
                case 39:
                  return 66;
                  break;
                case 40:
                  return 66;
                  break;
                case 41:
                  return "INVALID";
                  break;
                case 42:
                  return 5;
                  break;
              }
            };
            lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]*?(?=(\{\{\{\{\/)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)|])))/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)])))/, /^(?:false(?=([~}\s)])))/, /^(?:undefined(?=([~}\s)])))/, /^(?:null(?=([~}\s)])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/, /^(?:\[[^\]]*\])/, /^(?:.)/, /^(?:$)/];
            lexer.conditions = {
              mu: {
                rules: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42],
                inclusive: false
              },
              emu: {
                rules: [2],
                inclusive: false
              },
              com: {
                rules: [5],
                inclusive: false
              },
              raw: {
                rules: [3, 4],
                inclusive: false
              },
              INITIAL: {
                rules: [0, 1, 42],
                inclusive: true
              }
            };
            return lexer;
          })();
          parser.lexer = lexer;
          function Parser() {
            this.yy = {};
          }
          Parser.prototype = parser;
          parser.Parser = Parser;
          return new Parser();
        })();
        exports["default"] = handlebars;
        module.exports = exports["default"];
      }, function(module, exports, __webpack_require__) {
        'use strict';
        var _interopRequireWildcard = __webpack_require__(8)['default'];
        exports.__esModule = true;
        var _Visitor = __webpack_require__(6);
        var _Visitor2 = _interopRequireWildcard(_Visitor);
        function WhitespaceControl() {}
        WhitespaceControl.prototype = new _Visitor2['default']();
        WhitespaceControl.prototype.Program = function(program) {
          var isRoot = !this.isRootSeen;
          this.isRootSeen = true;
          var body = program.body;
          for (var i = 0,
              l = body.length; i < l; i++) {
            var current = body[i],
                strip = this.accept(current);
            if (!strip) {
              continue;
            }
            var _isPrevWhitespace = isPrevWhitespace(body, i, isRoot),
                _isNextWhitespace = isNextWhitespace(body, i, isRoot),
                openStandalone = strip.openStandalone && _isPrevWhitespace,
                closeStandalone = strip.closeStandalone && _isNextWhitespace,
                inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;
            if (strip.close) {
              omitRight(body, i, true);
            }
            if (strip.open) {
              omitLeft(body, i, true);
            }
            if (inlineStandalone) {
              omitRight(body, i);
              if (omitLeft(body, i)) {
                if (current.type === 'PartialStatement') {
                  current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
                }
              }
            }
            if (openStandalone) {
              omitRight((current.program || current.inverse).body);
              omitLeft(body, i);
            }
            if (closeStandalone) {
              omitRight(body, i);
              omitLeft((current.inverse || current.program).body);
            }
          }
          return program;
        };
        WhitespaceControl.prototype.BlockStatement = function(block) {
          this.accept(block.program);
          this.accept(block.inverse);
          var program = block.program || block.inverse,
              inverse = block.program && block.inverse,
              firstInverse = inverse,
              lastInverse = inverse;
          if (inverse && inverse.chained) {
            firstInverse = inverse.body[0].program;
            while (lastInverse.chained) {
              lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
            }
          }
          var strip = {
            open: block.openStrip.open,
            close: block.closeStrip.close,
            openStandalone: isNextWhitespace(program.body),
            closeStandalone: isPrevWhitespace((firstInverse || program).body)
          };
          if (block.openStrip.close) {
            omitRight(program.body, null, true);
          }
          if (inverse) {
            var inverseStrip = block.inverseStrip;
            if (inverseStrip.open) {
              omitLeft(program.body, null, true);
            }
            if (inverseStrip.close) {
              omitRight(firstInverse.body, null, true);
            }
            if (block.closeStrip.open) {
              omitLeft(lastInverse.body, null, true);
            }
            if (isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
              omitLeft(program.body);
              omitRight(firstInverse.body);
            }
          } else if (block.closeStrip.open) {
            omitLeft(program.body, null, true);
          }
          return strip;
        };
        WhitespaceControl.prototype.MustacheStatement = function(mustache) {
          return mustache.strip;
        };
        WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function(node) {
          var strip = node.strip || {};
          return {
            inlineStandalone: true,
            open: strip.open,
            close: strip.close
          };
        };
        function isPrevWhitespace(body, i, isRoot) {
          if (i === undefined) {
            i = body.length;
          }
          var prev = body[i - 1],
              sibling = body[i - 2];
          if (!prev) {
            return isRoot;
          }
          if (prev.type === 'ContentStatement') {
            return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
          }
        }
        function isNextWhitespace(body, i, isRoot) {
          if (i === undefined) {
            i = -1;
          }
          var next = body[i + 1],
              sibling = body[i + 2];
          if (!next) {
            return isRoot;
          }
          if (next.type === 'ContentStatement') {
            return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
          }
        }
        function omitRight(body, i, multiple) {
          var current = body[i == null ? 0 : i + 1];
          if (!current || current.type !== 'ContentStatement' || !multiple && current.rightStripped) {
            return ;
          }
          var original = current.value;
          current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, '');
          current.rightStripped = current.value !== original;
        }
        function omitLeft(body, i, multiple) {
          var current = body[i == null ? body.length - 1 : i - 1];
          if (!current || current.type !== 'ContentStatement' || !multiple && current.leftStripped) {
            return ;
          }
          var original = current.value;
          current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
          current.leftStripped = current.value !== original;
          return current.leftStripped;
        }
        exports['default'] = WhitespaceControl;
        module.exports = exports['default'];
      }, function(module, exports, __webpack_require__) {
        'use strict';
        var _interopRequireWildcard = __webpack_require__(8)['default'];
        exports.__esModule = true;
        exports.SourceLocation = SourceLocation;
        exports.id = id;
        exports.stripFlags = stripFlags;
        exports.stripComment = stripComment;
        exports.preparePath = preparePath;
        exports.prepareMustache = prepareMustache;
        exports.prepareRawBlock = prepareRawBlock;
        exports.prepareBlock = prepareBlock;
        var _Exception = __webpack_require__(11);
        var _Exception2 = _interopRequireWildcard(_Exception);
        function SourceLocation(source, locInfo) {
          this.source = source;
          this.start = {
            line: locInfo.first_line,
            column: locInfo.first_column
          };
          this.end = {
            line: locInfo.last_line,
            column: locInfo.last_column
          };
        }
        function id(token) {
          if (/^\[.*\]$/.test(token)) {
            return token.substr(1, token.length - 2);
          } else {
            return token;
          }
        }
        function stripFlags(open, close) {
          return {
            open: open.charAt(2) === '~',
            close: close.charAt(close.length - 3) === '~'
          };
        }
        function stripComment(comment) {
          return comment.replace(/^\{\{~?\!-?-?/, '').replace(/-?-?~?\}\}$/, '');
        }
        function preparePath(data, parts, locInfo) {
          locInfo = this.locInfo(locInfo);
          var original = data ? '@' : '',
              dig = [],
              depth = 0,
              depthString = '';
          for (var i = 0,
              l = parts.length; i < l; i++) {
            var part = parts[i].part,
                isLiteral = parts[i].original !== part;
            original += (parts[i].separator || '') + part;
            if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
              if (dig.length > 0) {
                throw new _Exception2['default']('Invalid path: ' + original, {loc: locInfo});
              } else if (part === '..') {
                depth++;
                depthString += '../';
              }
            } else {
              dig.push(part);
            }
          }
          return new this.PathExpression(data, depth, dig, original, locInfo);
        }
        function prepareMustache(path, params, hash, open, strip, locInfo) {
          var escapeFlag = open.charAt(3) || open.charAt(2),
              escaped = escapeFlag !== '{' && escapeFlag !== '&';
          return new this.MustacheStatement(path, params, hash, escaped, strip, this.locInfo(locInfo));
        }
        function prepareRawBlock(openRawBlock, content, close, locInfo) {
          if (openRawBlock.path.original !== close) {
            var errorNode = {loc: openRawBlock.path.loc};
            throw new _Exception2['default'](openRawBlock.path.original + ' doesn\'t match ' + close, errorNode);
          }
          locInfo = this.locInfo(locInfo);
          var program = new this.Program([content], null, {}, locInfo);
          return new this.BlockStatement(openRawBlock.path, openRawBlock.params, openRawBlock.hash, program, undefined, {}, {}, {}, locInfo);
        }
        function prepareBlock(openBlock, program, inverseAndProgram, close, inverted, locInfo) {
          if (close && close.path && openBlock.path.original !== close.path.original) {
            var errorNode = {loc: openBlock.path.loc};
            throw new _Exception2['default'](openBlock.path.original + ' doesn\'t match ' + close.path.original, errorNode);
          }
          program.blockParams = openBlock.blockParams;
          var inverse = undefined,
              inverseStrip = undefined;
          if (inverseAndProgram) {
            if (inverseAndProgram.chain) {
              inverseAndProgram.program.body[0].closeStrip = close.strip;
            }
            inverseStrip = inverseAndProgram.strip;
            inverse = inverseAndProgram.program;
          }
          if (inverted) {
            inverted = inverse;
            inverse = program;
            program = inverted;
          }
          return new this.BlockStatement(openBlock.path, openBlock.params, openBlock.hash, program, inverse, openBlock.strip, inverseStrip, close && close.strip, this.locInfo(locInfo));
        }
      }, function(module, exports, __webpack_require__) {
        'use strict';
        exports.__esModule = true;
        var _isArray = __webpack_require__(12);
        var SourceNode = undefined;
        try {
          if (false) {
            var SourceMap = require('source-map');
            SourceNode = SourceMap.SourceNode;
          }
        } catch (err) {}
        if (!SourceNode) {
          SourceNode = function(line, column, srcFile, chunks) {
            this.src = '';
            if (chunks) {
              this.add(chunks);
            }
          };
          SourceNode.prototype = {
            add: function add(chunks) {
              if (_isArray.isArray(chunks)) {
                chunks = chunks.join('');
              }
              this.src += chunks;
            },
            prepend: function prepend(chunks) {
              if (_isArray.isArray(chunks)) {
                chunks = chunks.join('');
              }
              this.src = chunks + this.src;
            },
            toStringWithSourceMap: function toStringWithSourceMap() {
              return {code: this.toString()};
            },
            toString: function toString() {
              return this.src;
            }
          };
        }
        function castChunk(chunk, codeGen, loc) {
          if (_isArray.isArray(chunk)) {
            var ret = [];
            for (var i = 0,
                len = chunk.length; i < len; i++) {
              ret.push(codeGen.wrap(chunk[i], loc));
            }
            return ret;
          } else if (typeof chunk === 'boolean' || typeof chunk === 'number') {
            return chunk + '';
          }
          return chunk;
        }
        function CodeGen(srcFile) {
          this.srcFile = srcFile;
          this.source = [];
        }
        CodeGen.prototype = {
          prepend: function prepend(source, loc) {
            this.source.unshift(this.wrap(source, loc));
          },
          push: function push(source, loc) {
            this.source.push(this.wrap(source, loc));
          },
          merge: function merge() {
            var source = this.empty();
            this.each(function(line) {
              source.add(['  ', line, '\n']);
            });
            return source;
          },
          each: function each(iter) {
            for (var i = 0,
                len = this.source.length; i < len; i++) {
              iter(this.source[i]);
            }
          },
          empty: function empty() {
            var loc = arguments[0] === undefined ? this.currentLocation || {start: {}} : arguments[0];
            return new SourceNode(loc.start.line, loc.start.column, this.srcFile);
          },
          wrap: function wrap(chunk) {
            var loc = arguments[1] === undefined ? this.currentLocation || {start: {}} : arguments[1];
            if (chunk instanceof SourceNode) {
              return chunk;
            }
            chunk = castChunk(chunk, this, loc);
            return new SourceNode(loc.start.line, loc.start.column, this.srcFile, chunk);
          },
          functionCall: function functionCall(fn, type, params) {
            params = this.generateList(params);
            return this.wrap([fn, type ? '.' + type + '(' : '(', params, ')']);
          },
          quotedString: function quotedString(str) {
            return '"' + (str + '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + '"';
          },
          objectLiteral: function objectLiteral(obj) {
            var pairs = [];
            for (var key in obj) {
              if (obj.hasOwnProperty(key)) {
                var value = castChunk(obj[key], this);
                if (value !== 'undefined') {
                  pairs.push([this.quotedString(key), ':', value]);
                }
              }
            }
            var ret = this.generateList(pairs);
            ret.prepend('{');
            ret.add('}');
            return ret;
          },
          generateList: function generateList(entries, loc) {
            var ret = this.empty(loc);
            for (var i = 0,
                len = entries.length; i < len; i++) {
              if (i) {
                ret.add(',');
              }
              ret.add(castChunk(entries[i], this, loc));
            }
            return ret;
          },
          generateArray: function generateArray(entries, loc) {
            var ret = this.generateList(entries, loc);
            ret.prepend('[');
            ret.add(']');
            return ret;
          }
        };
        exports['default'] = CodeGen;
        module.exports = exports['default'];
      }]);
    });
    ;
  }).call(System.global);
  return System.get("@@global-helpers").retrieveGlobal(__module.id, "Handlebars");
});

System.register("npm:director@1.2.8/build/director", [], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  (function(exports) {
    var dloc = document.location;
    function dlocHashEmpty() {
      return dloc.hash === '' || dloc.hash === '#';
    }
    var listener = {
      mode: 'modern',
      hash: dloc.hash,
      history: false,
      check: function() {
        var h = dloc.hash;
        if (h != this.hash) {
          this.hash = h;
          this.onHashChanged();
        }
      },
      fire: function() {
        if (this.mode === 'modern') {
          this.history === true ? window.onpopstate() : window.onhashchange();
        } else {
          this.onHashChanged();
        }
      },
      init: function(fn, history) {
        var self = this;
        this.history = history;
        if (!Router.listeners) {
          Router.listeners = [];
        }
        function onchange(onChangeEvent) {
          for (var i = 0,
              l = Router.listeners.length; i < l; i++) {
            Router.listeners[i](onChangeEvent);
          }
        }
        if ('onhashchange' in window && (document.documentMode === undefined || document.documentMode > 7)) {
          if (this.history === true) {
            setTimeout(function() {
              window.onpopstate = onchange;
            }, 500);
          } else {
            window.onhashchange = onchange;
          }
          this.mode = 'modern';
        } else {
          var frame = document.createElement('iframe');
          frame.id = 'state-frame';
          frame.style.display = 'none';
          document.body.appendChild(frame);
          this.writeFrame('');
          if ('onpropertychange' in document && 'attachEvent' in document) {
            document.attachEvent('onpropertychange', function() {
              if (event.propertyName === 'location') {
                self.check();
              }
            });
          }
          window.setInterval(function() {
            self.check();
          }, 50);
          this.onHashChanged = onchange;
          this.mode = 'legacy';
        }
        Router.listeners.push(fn);
        return this.mode;
      },
      destroy: function(fn) {
        if (!Router || !Router.listeners) {
          return ;
        }
        var listeners = Router.listeners;
        for (var i = listeners.length - 1; i >= 0; i--) {
          if (listeners[i] === fn) {
            listeners.splice(i, 1);
          }
        }
      },
      setHash: function(s) {
        if (this.mode === 'legacy') {
          this.writeFrame(s);
        }
        if (this.history === true) {
          window.history.pushState({}, document.title, s);
          this.fire();
        } else {
          dloc.hash = (s[0] === '/') ? s : '/' + s;
        }
        return this;
      },
      writeFrame: function(s) {
        var f = document.getElementById('state-frame');
        var d = f.contentDocument || f.contentWindow.document;
        d.open();
        d.write("<script>_hash = '" + s + "'; onload = parent.listener.syncHash;<script>");
        d.close();
      },
      syncHash: function() {
        var s = this._hash;
        if (s != dloc.hash) {
          dloc.hash = s;
        }
        return this;
      },
      onHashChanged: function() {}
    };
    var Router = exports.Router = function(routes) {
      if (!(this instanceof Router))
        return new Router(routes);
      this.params = {};
      this.routes = {};
      this.methods = ['on', 'once', 'after', 'before'];
      this.scope = [];
      this._methods = {};
      this._insert = this.insert;
      this.insert = this.insertEx;
      this.historySupport = (window.history != null ? window.history.pushState : null) != null;
      this.configure();
      this.mount(routes || {});
    };
    Router.prototype.init = function(r) {
      var self = this,
          routeTo;
      this.handler = function(onChangeEvent) {
        var newURL = onChangeEvent && onChangeEvent.newURL || window.location.hash;
        var url = self.history === true ? self.getPath() : newURL.replace(/.*#/, '');
        self.dispatch('on', url.charAt(0) === '/' ? url : '/' + url);
      };
      listener.init(this.handler, this.history);
      if (this.history === false) {
        if (dlocHashEmpty() && r) {
          dloc.hash = r;
        } else if (!dlocHashEmpty()) {
          self.dispatch('on', '/' + dloc.hash.replace(/^(#\/|#|\/)/, ''));
        }
      } else {
        if (this.convert_hash_in_init) {
          routeTo = dlocHashEmpty() && r ? r : !dlocHashEmpty() ? dloc.hash.replace(/^#/, '') : null;
          if (routeTo) {
            window.history.replaceState({}, document.title, routeTo);
          }
        } else {
          routeTo = this.getPath();
        }
        if (routeTo || this.run_in_init === true) {
          this.handler();
        }
      }
      return this;
    };
    Router.prototype.explode = function() {
      var v = this.history === true ? this.getPath() : dloc.hash;
      if (v.charAt(1) === '/') {
        v = v.slice(1);
      }
      return v.slice(1, v.length).split("/");
    };
    Router.prototype.setRoute = function(i, v, val) {
      var url = this.explode();
      if (typeof i === 'number' && typeof v === 'string') {
        url[i] = v;
      } else if (typeof val === 'string') {
        url.splice(i, v, s);
      } else {
        url = [i];
      }
      listener.setHash(url.join('/'));
      return url;
    };
    Router.prototype.insertEx = function(method, path, route, parent) {
      if (method === "once") {
        method = "on";
        route = function(route) {
          var once = false;
          return function() {
            if (once)
              return ;
            once = true;
            return route.apply(this, arguments);
          };
        }(route);
      }
      return this._insert(method, path, route, parent);
    };
    Router.prototype.getRoute = function(v) {
      var ret = v;
      if (typeof v === "number") {
        ret = this.explode()[v];
      } else if (typeof v === "string") {
        var h = this.explode();
        ret = h.indexOf(v);
      } else {
        ret = this.explode();
      }
      return ret;
    };
    Router.prototype.destroy = function() {
      listener.destroy(this.handler);
      return this;
    };
    Router.prototype.getPath = function() {
      var path = window.location.pathname;
      if (path.substr(0, 1) !== '/') {
        path = '/' + path;
      }
      return path;
    };
    function _every(arr, iterator) {
      for (var i = 0; i < arr.length; i += 1) {
        if (iterator(arr[i], i, arr) === false) {
          return ;
        }
      }
    }
    function _flatten(arr) {
      var flat = [];
      for (var i = 0,
          n = arr.length; i < n; i++) {
        flat = flat.concat(arr[i]);
      }
      return flat;
    }
    function _asyncEverySeries(arr, iterator, callback) {
      if (!arr.length) {
        return callback();
      }
      var completed = 0;
      (function iterate() {
        iterator(arr[completed], function(err) {
          if (err || err === false) {
            callback(err);
            callback = function() {};
          } else {
            completed += 1;
            if (completed === arr.length) {
              callback();
            } else {
              iterate();
            }
          }
        });
      })();
    }
    function paramifyString(str, params, mod) {
      mod = str;
      for (var param in params) {
        if (params.hasOwnProperty(param)) {
          mod = params[param](str);
          if (mod !== str) {
            break;
          }
        }
      }
      return mod === str ? "([._a-zA-Z0-9-%()]+)" : mod;
    }
    function regifyString(str, params) {
      var matches,
          last = 0,
          out = "";
      while (matches = str.substr(last).match(/[^\w\d\- %@&]*\*[^\w\d\- %@&]*/)) {
        last = matches.index + matches[0].length;
        matches[0] = matches[0].replace(/^\*/, "([_.()!\\ %@&a-zA-Z0-9-]+)");
        out += str.substr(0, matches.index) + matches[0];
      }
      str = out += str.substr(last);
      var captures = str.match(/:([^\/]+)/ig),
          capture,
          length;
      if (captures) {
        length = captures.length;
        for (var i = 0; i < length; i++) {
          capture = captures[i];
          if (capture.slice(0, 2) === "::") {
            str = capture.slice(1);
          } else {
            str = str.replace(capture, paramifyString(capture, params));
          }
        }
      }
      return str;
    }
    function terminator(routes, delimiter, start, stop) {
      var last = 0,
          left = 0,
          right = 0,
          start = (start || "(").toString(),
          stop = (stop || ")").toString(),
          i;
      for (i = 0; i < routes.length; i++) {
        var chunk = routes[i];
        if (chunk.indexOf(start, last) > chunk.indexOf(stop, last) || ~chunk.indexOf(start, last) && !~chunk.indexOf(stop, last) || !~chunk.indexOf(start, last) && ~chunk.indexOf(stop, last)) {
          left = chunk.indexOf(start, last);
          right = chunk.indexOf(stop, last);
          if (~left && !~right || !~left && ~right) {
            var tmp = routes.slice(0, (i || 1) + 1).join(delimiter);
            routes = [tmp].concat(routes.slice((i || 1) + 1));
          }
          last = (right > left ? right : left) + 1;
          i = 0;
        } else {
          last = 0;
        }
      }
      return routes;
    }
    var QUERY_SEPARATOR = /\?.*/;
    Router.prototype.configure = function(options) {
      options = options || {};
      for (var i = 0; i < this.methods.length; i++) {
        this._methods[this.methods[i]] = true;
      }
      this.recurse = options.recurse || this.recurse || false;
      this.async = options.async || false;
      this.delimiter = options.delimiter || "/";
      this.strict = typeof options.strict === "undefined" ? true : options.strict;
      this.notfound = options.notfound;
      this.resource = options.resource;
      this.history = options.html5history && this.historySupport || false;
      this.run_in_init = this.history === true && options.run_handler_in_init !== false;
      this.convert_hash_in_init = this.history === true && options.convert_hash_in_init !== false;
      this.every = {
        after: options.after || null,
        before: options.before || null,
        on: options.on || null
      };
      return this;
    };
    Router.prototype.param = function(token, matcher) {
      if (token[0] !== ":") {
        token = ":" + token;
      }
      var compiled = new RegExp(token, "g");
      this.params[token] = function(str) {
        return str.replace(compiled, matcher.source || matcher);
      };
      return this;
    };
    Router.prototype.on = Router.prototype.route = function(method, path, route) {
      var self = this;
      if (!route && typeof path == "function") {
        route = path;
        path = method;
        method = "on";
      }
      if (Array.isArray(path)) {
        return path.forEach(function(p) {
          self.on(method, p, route);
        });
      }
      if (path.source) {
        path = path.source.replace(/\\\//ig, "/");
      }
      if (Array.isArray(method)) {
        return method.forEach(function(m) {
          self.on(m.toLowerCase(), path, route);
        });
      }
      path = path.split(new RegExp(this.delimiter));
      path = terminator(path, this.delimiter);
      this.insert(method, this.scope.concat(path), route);
    };
    Router.prototype.path = function(path, routesFn) {
      var self = this,
          length = this.scope.length;
      if (path.source) {
        path = path.source.replace(/\\\//ig, "/");
      }
      path = path.split(new RegExp(this.delimiter));
      path = terminator(path, this.delimiter);
      this.scope = this.scope.concat(path);
      routesFn.call(this, this);
      this.scope.splice(length, path.length);
    };
    Router.prototype.dispatch = function(method, path, callback) {
      var self = this,
          fns = this.traverse(method, path.replace(QUERY_SEPARATOR, ""), this.routes, ""),
          invoked = this._invoked,
          after;
      this._invoked = true;
      if (!fns || fns.length === 0) {
        this.last = [];
        if (typeof this.notfound === "function") {
          this.invoke([this.notfound], {
            method: method,
            path: path
          }, callback);
        }
        return false;
      }
      if (this.recurse === "forward") {
        fns = fns.reverse();
      }
      function updateAndInvoke() {
        self.last = fns.after;
        self.invoke(self.runlist(fns), self, callback);
      }
      after = this.every && this.every.after ? [this.every.after].concat(this.last) : [this.last];
      if (after && after.length > 0 && invoked) {
        if (this.async) {
          this.invoke(after, this, updateAndInvoke);
        } else {
          this.invoke(after, this);
          updateAndInvoke();
        }
        return true;
      }
      updateAndInvoke();
      return true;
    };
    Router.prototype.invoke = function(fns, thisArg, callback) {
      var self = this;
      var apply;
      if (this.async) {
        apply = function(fn, next) {
          if (Array.isArray(fn)) {
            return _asyncEverySeries(fn, apply, next);
          } else if (typeof fn == "function") {
            fn.apply(thisArg, (fns.captures || []).concat(next));
          }
        };
        _asyncEverySeries(fns, apply, function() {
          if (callback) {
            callback.apply(thisArg, arguments);
          }
        });
      } else {
        apply = function(fn) {
          if (Array.isArray(fn)) {
            return _every(fn, apply);
          } else if (typeof fn === "function") {
            return fn.apply(thisArg, fns.captures || []);
          } else if (typeof fn === "string" && self.resource) {
            self.resource[fn].apply(thisArg, fns.captures || []);
          }
        };
        _every(fns, apply);
      }
    };
    Router.prototype.traverse = function(method, path, routes, regexp, filter) {
      var fns = [],
          current,
          exact,
          match,
          next,
          that;
      function filterRoutes(routes) {
        if (!filter) {
          return routes;
        }
        function deepCopy(source) {
          var result = [];
          for (var i = 0; i < source.length; i++) {
            result[i] = Array.isArray(source[i]) ? deepCopy(source[i]) : source[i];
          }
          return result;
        }
        function applyFilter(fns) {
          for (var i = fns.length - 1; i >= 0; i--) {
            if (Array.isArray(fns[i])) {
              applyFilter(fns[i]);
              if (fns[i].length === 0) {
                fns.splice(i, 1);
              }
            } else {
              if (!filter(fns[i])) {
                fns.splice(i, 1);
              }
            }
          }
        }
        var newRoutes = deepCopy(routes);
        newRoutes.matched = routes.matched;
        newRoutes.captures = routes.captures;
        newRoutes.after = routes.after.filter(filter);
        applyFilter(newRoutes);
        return newRoutes;
      }
      if (path === this.delimiter && routes[method]) {
        next = [[routes.before, routes[method]].filter(Boolean)];
        next.after = [routes.after].filter(Boolean);
        next.matched = true;
        next.captures = [];
        return filterRoutes(next);
      }
      for (var r in routes) {
        if (routes.hasOwnProperty(r) && (!this._methods[r] || this._methods[r] && typeof routes[r] === "object" && !Array.isArray(routes[r]))) {
          current = exact = regexp + this.delimiter + r;
          if (!this.strict) {
            exact += "[" + this.delimiter + "]?";
          }
          match = path.match(new RegExp("^" + exact));
          if (!match) {
            continue;
          }
          if (match[0] && match[0] == path && routes[r][method]) {
            next = [[routes[r].before, routes[r][method]].filter(Boolean)];
            next.after = [routes[r].after].filter(Boolean);
            next.matched = true;
            next.captures = match.slice(1);
            if (this.recurse && routes === this.routes) {
              next.push([routes.before, routes.on].filter(Boolean));
              next.after = next.after.concat([routes.after].filter(Boolean));
            }
            return filterRoutes(next);
          }
          next = this.traverse(method, path, routes[r], current);
          if (next.matched) {
            if (next.length > 0) {
              fns = fns.concat(next);
            }
            if (this.recurse) {
              fns.push([routes[r].before, routes[r].on].filter(Boolean));
              next.after = next.after.concat([routes[r].after].filter(Boolean));
              if (routes === this.routes) {
                fns.push([routes["before"], routes["on"]].filter(Boolean));
                next.after = next.after.concat([routes["after"]].filter(Boolean));
              }
            }
            fns.matched = true;
            fns.captures = next.captures;
            fns.after = next.after;
            return filterRoutes(fns);
          }
        }
      }
      return false;
    };
    Router.prototype.insert = function(method, path, route, parent) {
      var methodType,
          parentType,
          isArray,
          nested,
          part;
      path = path.filter(function(p) {
        return p && p.length > 0;
      });
      parent = parent || this.routes;
      part = path.shift();
      if (/\:|\*/.test(part) && !/\\d|\\w/.test(part)) {
        part = regifyString(part, this.params);
      }
      if (path.length > 0) {
        parent[part] = parent[part] || {};
        return this.insert(method, path, route, parent[part]);
      }
      if (!part && !path.length && parent === this.routes) {
        methodType = typeof parent[method];
        switch (methodType) {
          case "function":
            parent[method] = [parent[method], route];
            return ;
          case "object":
            parent[method].push(route);
            return ;
          case "undefined":
            parent[method] = route;
            return ;
        }
        return ;
      }
      parentType = typeof parent[part];
      isArray = Array.isArray(parent[part]);
      if (parent[part] && !isArray && parentType == "object") {
        methodType = typeof parent[part][method];
        switch (methodType) {
          case "function":
            parent[part][method] = [parent[part][method], route];
            return ;
          case "object":
            parent[part][method].push(route);
            return ;
          case "undefined":
            parent[part][method] = route;
            return ;
        }
      } else if (parentType == "undefined") {
        nested = {};
        nested[method] = route;
        parent[part] = nested;
        return ;
      }
      throw new Error("Invalid route context: " + parentType);
    };
    Router.prototype.extend = function(methods) {
      var self = this,
          len = methods.length,
          i;
      function extend(method) {
        self._methods[method] = true;
        self[method] = function() {
          var extra = arguments.length === 1 ? [method, ""] : [method];
          self.on.apply(self, extra.concat(Array.prototype.slice.call(arguments)));
        };
      }
      for (i = 0; i < len; i++) {
        extend(methods[i]);
      }
    };
    Router.prototype.runlist = function(fns) {
      var runlist = this.every && this.every.before ? [this.every.before].concat(_flatten(fns)) : _flatten(fns);
      if (this.every && this.every.on) {
        runlist.push(this.every.on);
      }
      runlist.captures = fns.captures;
      runlist.source = fns.source;
      return runlist;
    };
    Router.prototype.mount = function(routes, path) {
      if (!routes || typeof routes !== "object" || Array.isArray(routes)) {
        return ;
      }
      var self = this;
      path = path || [];
      if (!Array.isArray(path)) {
        path = path.split(self.delimiter);
      }
      function insertOrMount(route, local) {
        var rename = route,
            parts = route.split(self.delimiter),
            routeType = typeof routes[route],
            isRoute = parts[0] === "" || !self._methods[parts[0]],
            event = isRoute ? "on" : rename;
        if (isRoute) {
          rename = rename.slice((rename.match(new RegExp("^" + self.delimiter)) || [""])[0].length);
          parts.shift();
        }
        if (isRoute && routeType === "object" && !Array.isArray(routes[route])) {
          local = local.concat(parts);
          self.mount(routes[route], local);
          return ;
        }
        if (isRoute) {
          local = local.concat(rename.split(self.delimiter));
          local = terminator(local, self.delimiter);
        }
        self.insert(event, local, routes[route]);
      }
      for (var route in routes) {
        if (routes.hasOwnProperty(route)) {
          insertOrMount(route, path.slice(0));
        }
      }
    };
  }(typeof exports === "object" ? exports : window));
  global.define = __define;
  return module.exports;
});

(function() {
function define(){};  define.amd = {};
System.register("github:components/jquery@2.1.4", ["github:components/jquery@2.1.4/jquery"], false, function(__require, __exports, __module) {
  return (function(main) {
    return main;
  }).call(this, __require('github:components/jquery@2.1.4/jquery'));
});
})();
System.register("github:components/handlebars.js@3.0.3", ["github:components/handlebars.js@3.0.3/handlebars"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("github:components/handlebars.js@3.0.3/handlebars");
  global.define = __define;
  return module.exports;
});

System.register("npm:director@1.2.8", ["npm:director@1.2.8/build/director"], true, function(require, exports, module) {
  var global = System.global,
      __define = global.define;
  global.define = undefined;
  module.exports = require("npm:director@1.2.8/build/director");
  global.define = __define;
  return module.exports;
});

System.register("js/util", [], function($__export) {
  "use strict";
  var __moduleName = "js/util";
  function uuid() {
    var i,
        random;
    var uuid = '';
    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) {
        uuid += '-';
      }
      uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
    }
    return uuid;
  }
  function pluralize(count, word) {
    return count === 1 ? word : (word + "s");
  }
  function store(namespace, data) {
    if (arguments.length > 1) {
      return localStorage.setItem(namespace, JSON.stringify(data));
    } else {
      var store = localStorage.getItem(namespace);
      return (store && JSON.parse(store)) || [];
    }
  }
  $__export("uuid", uuid);
  $__export("pluralize", pluralize);
  $__export("store", store);
  return {
    setters: [],
    execute: function() {
      ;
      ;
      ;
    }
  };
});

System.register("js/todo-app", ["github:components/jquery@2.1.4", "github:components/handlebars.js@3.0.3", "npm:director@1.2.8", "js/util"], function($__export) {
  "use strict";
  var __moduleName = "js/todo-app";
  var $,
      Handlebars,
      director,
      util,
      ENTER_KEY,
      ESCAPE_KEY;
  return {
    setters: [function($__m) {
      $ = $__m.default;
    }, function($__m) {
      Handlebars = $__m.default;
    }, function($__m) {
      director = $__m.default;
    }, function($__m) {
      util = $__m;
    }],
    execute: function() {
      ENTER_KEY = 13;
      ESCAPE_KEY = 27;
      $__export('default', (function() {
        function App() {
          var $__0 = this;
          this.todos = util.store('todos-jquery');
          this.cacheElements();
          this.bindEvents();
          director.Router({'/:filter': (function(filter) {
              $__0.filter = filter;
              $__0.render();
            })}).init('/all');
        }
        return ($traceurRuntime.createClass)(App, {
          cacheElements: function() {
            this.todoTemplate = Handlebars.compile($('#todo-template').html());
            this.footerTemplate = Handlebars.compile($('#footer-template').html());
            this.$todoApp = $('.todoapp');
            this.$header = this.$todoApp.find('.header');
            this.$main = this.$todoApp.find('.main');
            this.$footer = this.$todoApp.find('.footer');
            this.$newTodo = this.$header.find('.new-todo');
            this.$toggleAll = this.$main.find('.toggle-all');
            this.$todoList = this.$main.find('.todo-list');
            this.$count = this.$footer.find('.todo-count');
            this.$clearBtn = this.$footer.find('.clear-completed');
          },
          bindEvents: function() {
            var $__0 = this;
            var list = this.$todoList;
            this.$newTodo.on('keyup', (function(e) {
              return $__0.create(e);
            }));
            this.$toggleAll.on('change', (function(e) {
              return $__0.toggleAll(e);
            }));
            this.$footer.on('click', '.clear-completed', (function(e) {
              return $__0.destroyCompleted(e);
            }));
            list.on('change', '.toggle', (function(e) {
              return $__0.toggle(e);
            }));
            list.on('dblclick', 'label', (function(e) {
              return $__0.edit(e);
            }));
            list.on('keyup', '.edit', (function(e) {
              return $__0.editKeyup(e);
            }));
            list.on('focusout', '.edit', (function(e) {
              return $__0.update(e);
            }));
            list.on('click', '.destroy', (function(e) {
              return $__0.destroy(e);
            }));
          },
          render: function() {
            var todos = this.getFilteredTodos();
            this.$todoList.html(this.todoTemplate(todos));
            this.$main.toggle(todos.length > 0);
            this.$toggleAll.prop('checked', this.getActiveTodos().length === 0);
            this.renderFooter();
            this.$newTodo.focus();
            util.store('todos-jquery', this.todos);
          },
          renderFooter: function() {
            var todoCount = this.todos.length;
            var activeTodoCount = this.getActiveTodos().length;
            var template = this.footerTemplate({
              activeTodoCount: activeTodoCount,
              activeTodoWord: util.pluralize(activeTodoCount, 'item'),
              completedTodos: todoCount - activeTodoCount,
              filter: this.filter
            });
            this.$footer.toggle(todoCount > 0).html(template);
          },
          toggleAll: function(e) {
            var isChecked = $(e.target).prop('checked');
            this.todos.forEach((function(todo) {
              return todo.completed = isChecked;
            }));
            this.render();
          },
          getActiveTodos: function() {
            return this.todos.filter((function(todo) {
              return !todo.completed;
            }));
          },
          getCompletedTodos: function() {
            return this.todos.filter((function(todo) {
              return todo.completed;
            }));
          },
          getFilteredTodos: function() {
            if (this.filter === 'active') {
              return this.getActiveTodos();
            }
            if (this.filter === 'completed') {
              return this.getCompletedTodos();
            }
            return this.todos;
          },
          destroyCompleted: function() {
            this.todos = this.getActiveTodos();
            this.filter = 'all';
            this.render();
          },
          indexFromEl: function(el) {
            var id = $(el).closest('li').data('id');
            var todos = this.todos;
            var i = todos.length;
            while (i--) {
              if (todos[i].id === id) {
                return i;
              }
            }
          },
          create: function(e) {
            var $input = $(e.target);
            var val = $input.val().trim();
            if (e.which !== ENTER_KEY || !val) {
              return ;
            }
            this.todos.push({
              id: util.uuid(),
              title: val,
              completed: false
            });
            $input.val('');
            this.render();
          },
          toggle: function(e) {
            var i = this.indexFromEl(e.target);
            this.todos[i].completed = !this.todos[i].completed;
            this.render();
          },
          edit: function(e) {
            var $input = $(e.target).closest('li').addClass('editing').find('.edit');
            $input.val($input.val()).focus();
          },
          editKeyup: function(e) {
            if (e.which === ENTER_KEY) {
              e.target.blur();
            }
            if (e.which === ESCAPE_KEY) {
              $(e.target).data('abort', true).blur();
            }
          },
          update: function(e) {
            var el = e.target;
            var $el = $(el);
            var val = $el.val().trim();
            if ($el.data('abort')) {
              $el.data('abort', false);
              this.render();
              return ;
            }
            var i = this.indexFromEl(el);
            if (val) {
              this.todos[i].title = val;
            } else {
              this.todos.splice(i, 1);
            }
            this.render();
          },
          destroy: function(e) {
            this.todos.splice(this.indexFromEl(e.target), 1);
            this.render();
          }
        }, {});
      }()));
      ;
    }
  };
});

System.register("js/app", ["github:components/jquery@2.1.4", "github:components/handlebars.js@3.0.3", "js/todo-app"], function($__export) {
  "use strict";
  var __moduleName = "js/app";
  var $,
      Handlebars,
      App;
  return {
    setters: [function($__m) {
      $ = $__m.default;
    }, function($__m) {
      Handlebars = $__m.default;
    }, function($__m) {
      App = $__m.default;
    }],
    execute: function() {
      $((function() {
        Handlebars.registerHelper('eq', function(a, b, options) {
          return a === b ? options.fn(this) : options.inverse(this);
        });
        new App();
      }));
    }
  };
});

(function() {
  var loader = System;
  if (typeof indexOf == 'undefined')
    indexOf = Array.prototype.indexOf;

  function readGlobalProperty(p, value) {
    var pParts = p.split('.');
    while (pParts.length)
      value = value[pParts.shift()];
    return value;
  }

  var ignoredGlobalProps = ['sessionStorage', 'localStorage', 'clipboardData', 'frames', 'external'];

  var hasOwnProperty = loader.global.hasOwnProperty;

  function iterateGlobals(callback) {
    if (Object.keys)
      Object.keys(loader.global).forEach(callback);
    else
      for (var g in loader.global) {
        if (!hasOwnProperty.call(loader.global, g))
          continue;
        callback(g);
      }
  }

  function forEachGlobal(callback) {
    iterateGlobals(function(globalName) {
      if (indexOf.call(ignoredGlobalProps, globalName) != -1)
        return;
      try {
        var value = loader.global[globalName];
      }
      catch(e) {
        ignoredGlobalProps.push(globalName);
      }
      callback(globalName, value);
    });
  }

  var moduleGlobals = {};

  var globalSnapshot;

  loader.set('@@global-helpers', loader.newModule({
    prepareGlobal: function(moduleName, deps) {
      // first, we add all the dependency modules to the global
      for (var i = 0; i < deps.length; i++) {
        var moduleGlobal = moduleGlobals[deps[i]];
        if (moduleGlobal)
          for (var m in moduleGlobal)
            loader.global[m] = moduleGlobal[m];
      }

      // now store a complete copy of the global object
      // in order to detect changes
      globalSnapshot = {};
      
      forEachGlobal(function(name, value) {
        globalSnapshot[name] = value;
      });
    },
    retrieveGlobal: function(moduleName, exportName, init) {
      var singleGlobal;
      var multipleExports;
      var exports = {};

      // run init
      if (init)
        singleGlobal = init.call(loader.global);

      // check for global changes, creating the globalObject for the module
      // if many globals, then a module object for those is created
      // if one global, then that is the module directly
      else if (exportName) {
        var firstPart = exportName.split('.')[0];
        singleGlobal = readGlobalProperty(exportName, loader.global);
        exports[firstPart] = loader.global[firstPart];
      }

      else {
        forEachGlobal(function(name, value) {
          if (globalSnapshot[name] === value)
            return;
          if (typeof value === 'undefined')
            return;
          exports[name] = value;
          if (typeof singleGlobal !== 'undefined') {
            if (!multipleExports && singleGlobal !== value)
              multipleExports = true;
          }
          else {
            singleGlobal = value;
          }
        });
      }

      moduleGlobals[moduleName] = exports;

      return multipleExports ? exports : singleGlobal;
    }
  }));
})();
});
//# sourceMappingURL=build.js.map