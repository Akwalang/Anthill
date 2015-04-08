/* globals jQuery, _ */

/**
 *    TODO:
 *    0. Глобальный реестр элементов
 *    1. AMD
 *    2. Биндинг данных между моделями
 */


(function (global, jQuery, _, undefined) {
	"use strict";

	var version = '0.1.4';

	var _slice = Array.prototype.slice,
		_splice = Array.prototype.splice,
		_toString = Object.prototype.toString,
		_hasOwnProperty = Object.prototype.hasOwnProperty;

	// Lodash methods

	var _isString = _.isString,
		_isArray = _.isArray,
		_isFunction = _.isFunction,
		// _isArguments = _.isArguments,

		_indexOf = Array.prototype.indexOf && function (array, value, offset) {
			return Array.prototype.indexOf.call(array, value, offset);
		} || _.indexOf,
		// _findKey = _.findKey,

		_keys = _.keys,
		// _pluck = _.pluck,
		// _map = _.map,
		// _invert = _.invert,

		_extend = _.extend,
		// _merge = _.merge,

		_isEqual = _.isEqual,
		_cloneDeep = _.cloneDeep;

	var Tools = (function () {
		var self = {};

		self.bind = function (func, context) {
			var params = _slice.call(arguments, 2);

			return function () { func.apply(context, params.concat(_slice.call(arguments))); };
		};

		self.sbind = function (func, context) {
			return function () { func.apply(context, arguments); };
		};

		self.extend = function (dest) {
			var i, len, name;

			for (i = 1, len = arguments.length; i < len; i++) {
				for (name in arguments[i]) {
					if (!_hasOwnProperty.call(arguments[i], name)) {
						continue;
					}

					dest[name] = arguments[i][name];
				}
			}

			return dest;
		};

		self.getType = function (val) {
			return _toString.call(val).slice(8, -1);
		};

		self.isPlainObject = function (val) {
			return self.getType(val) === 'Object' && val && val.constructor === Object;
		};

		self.replace = function (str, params) {
			var i, len;

			str && str.toString && (str = str.toString());

			if (arguments.length >= 2 && !_isArray(params) && !self.isPlainObject(params)) {
				params = _slice.call(arguments, 1);
			}

			if (self.isPlainObject(params)) {
				return str.replace(/<%([^\}]+)%>/g, function (m, $1) {
					return params[$1];
				});
			}

			if (_isArray(params)) {
				for (i = 0, len = params.length; i < len; i++) {
					str = str.replace('%s', params[i]);
				}				
			}

			return str;
		};

		self.Str = (function () {
			var mixin = {};

			mixin.str = function () {
				return this.toString();
			};

			mixin.log = function () {
				console.log(this.str());
			};

			mixin.warn = function () {
				console.warn(this.str());
			};

			mixin.error = function () {
				console.error(this.str());
			};

			mixin.Error = function () {
				return new Error(this.str());
			};

			var Str = function () {
				var string;

				string = self.replace.apply(this, arguments);
				string = new String(string);

				self.extend(string, mixin);

				return string;
			};

			return Str;
		})();

		self.inherit = function (Child, Parent, ext) {
			var AiExt = function AiExt () {};

			AiExt.prototype = Parent.prototype;

			Child.prototype = new AiExt();

			self.extend(Child.prototype, ext || {});

			Child.prototype.constructor = Child;

			Child.__parent__ = Parent;
			Child.prototype.__parent__ = Parent.prototype;

			return Child;
		};

		return self;
	})();

	var Mixin = (function (Tools) {
		var store = {};
		
		var set = function (name, Mixin) {
			if (store[name]) {
				throw Tools.Str('Ai: Mixin with name \'%s\' already exist.', name).Error();
			}

			return store[name] = Mixin;
		};
		
		var get = function (name) {
			return store[name];
		};

		var check = function () {
			return !!get(name);
		};

		var list = function () {
			return _keys(store);
		};

		var Mixin = function (name, Mixin) {
			switch (arguments.length) {
				case 0: return list();
				case 1: return get(name);
				case 2: return set(name, Mixin);
			}
		};

		Mixin.set = set;
		Mixin.get = get;
		Mixin.check = check;
		Mixin.list = list;

		return Mixin;
	})(Tools);

	/**
	 *	root.array.[1] - dynamic index (when event subscribe this convert to static index)
	 *	root.array.{1} - static index
	 *	root.array.length - default property
	 */

	var Attributes = (function (Mixin, Tools) {
		var self = {};
		var fn = self.fn = {};

		var delimiter = '.';

		self.extend = function (Ant) {
			Tools.extend(Ant.prototype, self.fn);

			if (_isArray(Ant.constructors)) {
				Ant.constructors.push(self.construct);
			}
		};

		self.construct = function () {
			this._attrs = {data: {}, indexes: {}};
		};

		self.split = function (path) {
			return _isString(path) ? path.split(delimiter) : path;
		};

		self.join = function (path) {
			return _isArray(path) ? path.join(delimiter) : path || '';
		};

		self.unwrapIndexes = function (path) {
			return path.replace(/\[|\]/g, '');
		};

		self.getLastName = function (path) {
			var name = self.split(path).pop();

			return self.unwrapIndexes(name);
		};

		self.getDelimiter = function () {
			return delimiter;
		};

		fn.getNames = function (path) {
			return _keys(this.get(path));
		};

		fn.check = function (path) {
			path = this._getDynamicPath(path);
			path = self.unwrapIndexes(path);

			var name, names = self.split(path),
				data = this.get();

			while ((name = names.shift()) && names.length) {
				try {
					data = data[name];
				}
				catch (e) {
					return false;
				}
			}

			return name in data;
		};

		fn.get = function (path, _noLast) {
			var data = this._attrs.data;

			if (!path || !path.length) {
				return data;
			}

			path = this._getDynamicPath(path);
			path = self.unwrapIndexes(path);

			var name, names = self.split(path || '');

			while ((name = names.shift()) && names.length) {
				if (data[name] === undefined) {
					data[name] = {};
				}

				data = data[name];
			}

			if (_noLast || data === undefined || data === null) {
				return data;
			}

			return data[name];
		};

		fn.set = function (path, value) {
			var _path, result;

			if (Tools.isPlainObject(path)) {
				result = {};

				for (_path in path) {
					if (_hasOwnProperty.call(path, _path)) {
						result[_path] = this.set(_path, path[_path]);
					}
				}

				return result;
			}

			path = this._getDynamicPath(path);

			var space = this.get(path, true),
				key = self.getLastName(path);

			var old = space[key];

			space[key] = value;

			return old;
		};

		fn.unset = function (path) {
			var i, len, result,
				args = arguments;

			if (args.length > 1) {
				result = {};

				for (i = 0, len = args.length; i < len; i++) {
					result[args[i]] = this.unset(args[i]);
				}

				return result;
			}

			var space = this.get(path, true),
				name = self.getLastName(path);

			var old = space[name];

			delete space[name];

			return old;
		};

		var isIntKeys = function (obj) {
			var i, len, keys = _keys(obj);

			for (i = 0, len = keys.length; i < len; i++) {
				if (isNaN(keys[i])) {
					return false;
				}
			}

			return true;
		};

		var mergeHelper = function (dest, src) {
			var name, buffer, old = {};

			for (name in src) {
				if (!_hasOwnProperty.call(src, name)) {
					continue;
				}

				if (Tools.isPlainObject(src[name])) {
					if (_isArray(dest[name]) && isIntKeys(src[name])) {
						buffer = dest[name].length;
						old[name] = mergeHelper(dest[name], src[name]);

						if (buffer !== dest[name].length) {
							src[name].length = dest[name].length;
							old[name].length = buffer;
						}
					}
					else {
						dest[name] = Tools.isPlainObject(dest[name]) ? dest[name] : {};
						old[name] = mergeHelper(dest[name], src[name]);
					}
				}
				else {
					old[name] = dest[name];
					dest[name] = src[name];
				}
			}

			return old;
		};

		fn.merge = function (path, ext) {
			var space;

			if (Tools.isPlainObject(path)) {
				ext = path;
				path = '';
			}

			ext = _cloneDeep(ext);

			space = this.get(path);

			return mergeHelper(space, ext);
		};

		fn.toJSON = fn.clone = function (path) {
			return _cloneDeep(this.get(path));
		};

		// Array methods

		var search = function (array, value) {
			var i, len, result = [],
				_isNaN = value !== value;

			if (typeof value === 'object') {
				i = _indexOf(array, value);
				return i !== -1 ? [i] : [];
			}

			for (i = 0, len = array.length; i < len; i++) {
				(_isNaN && array[i] !== array[i] || array[i] === value) && result.push(i);
			}

			return result;
		};

		fn.sort = function (path, sorter) {
			var _path = this._getStaticPath(path),
				indexer = this._getIndexer(_path);

			var target, sorted, unsorted;

			target = this.get(path);
			unsorted = target.slice();

			target.sort(sorter);

			sorted = target.slice();

			var i, _i, index, searched, skip, _isNaN,
				len = indexer.length,
				_len = sorted.length;

			for (i = 0; i < len; i++) {
				index = indexer[i];

				if (index === undefined) {
					continue;
				}

				_isNaN = unsorted[index] !== unsorted[index];

				searched = search(unsorted, unsorted[index]);
				skip = _indexOf(searched, indexer[i]);

				for (_i = 0; _i < _len; _i++) {
					if (_isNaN && sorted[_i] !== sorted[_i] || sorted[_i] === unsorted[index]) {
						if (skip) {
							skip--;
							continue;
						}

						indexer[i] = _i;
						break;
					}
				}
			}

			return unsorted;
		};

		fn.splice = function (path, index, remove /*, adds... */) {
			var i, len, old = {},
				array = this.get(path),
				args = _slice.call(arguments, 1);

			if (!_isArray(array)) {
				throw Tools.Str('Ai: Using splice not for an array').Error();
			}

			if (index < 0) {
				index += array.length;
			}

			len = index + remove;

			if (len > array.length) {
				len = array.length;
			}

			for (i = index; i < len; i++) {
				old[i] = array[i];
			}

			_splice.apply(array, args);

			path = this._getStaticPath(path);

			this._removeKeys(path, old);
			this._displaceKeys(path, index, remove, arguments.length - 3);

			return old;
		};

		fn.remove = function (path, index, count) {
			return this.splice(path, index, count);
		};

		fn.insert = function (path, index /*, adds... */) {
			var args = _slice.call(arguments);

			args.splice(2, 0, 0);

			return this.splice.apply(this, args);
		};

		fn.unshift = function (path, value) {
			return this.insert(path, 0, value);
		};

		fn.push = function (path, value) {
			var length = this.get(path).length;

			return this.insert(path, length, value);
		};

		fn.shift = function (path) {
			var old = this.remove(path, 0, 1);

			return old[0];
		};

		fn.pop = function (path) {
			var index = this.get(path).length - 1;

			var old = this.remove(path, index, 1);

			return old[index];
		};

		// Indexer

		fn._getIndexer = function (path) {
			return this._attrs.indexes[path] || (this._attrs.indexes[path] = []);
		};

		fn._removeIndexer = function (path, index) {
			return delete this._attrs.indexes[path + '.' + '{' + index + '}'];
		};

		var helperStaticKey = function (path, index) {
			var indexer = this._getIndexer(path);

			var key = _indexOf(indexer, +index);

			if (key !== -1) {
				return key;
			}

			key = indexer.length;

			indexer.push(+index);

			return key;
		};

		var helperDynamicKey = function (path, key) {
			return this._getIndexer(path)[+key];
		};

		fn._getStaticPath = function (path) {
			if (path.indexOf('[') === -1 && path.indexOf(']') === -1) {
				return path;
			}

			var name, result = '',
				names = self.split(path);

			while (name = names.shift()) {
				if (/^\[\d+\]$/.test(name)) {
					name = name.slice(1, -1);
					name = helperStaticKey.call(this, result, name);
					name = '{' + name + '}';
				}

				result && (result += delimiter);

				result += name;
			}

			return result;
		};

		fn._getDynamicPath = function (path) {
			if (path.indexOf('{') === -1 && path.indexOf('}') === -1) {
				return path;
			}

			path = this._getStaticPath(path);

			var name, result = '',
				names = self.split(path);

			for (var i = 0, len = names.length; i < len; i++) {
				name = names[i];

				if (/^\{\d+\}$/.test(name)) {
					name = name.slice(1, -1);
					name = helperDynamicKey.call(this, names.slice(0, i).join(delimiter), name);
					name = '[' + name + ']';
				}

				result && (result += delimiter);

				result += name;
			}

			return result;
		};

		fn._getStaticKey = function (path, index) {
			path = this._getStaticPath(path);

			return helperStaticKey.call(this, path, index);
		};

		fn._getDynamicKey = function (path, key) {
			path = this._getStaticPath(path);

			return helperDynamicKey.call(this, path, key);
		};

		fn._displaceKeys = function (path, index, removed, added) {
			var i,
				displace = added - removed,
				indexer = this._getIndexer(path);

			for (i in indexer) {
				if (_hasOwnProperty.call(indexer, i) && indexer[i] >= index) {
					indexer[i] += displace;
				}
			}
		};

		fn._removeKeys = function (path, keys) {
			var i, len, name, index, indexer = this._getIndexer(path);

			if (_isArray(keys)) {
				for (i = 0, len = keys.length; i < len; i++) {
					index = _indexOf(indexer, +keys[i]);

					if (index !== -1) {
						delete indexer[i];
						this._removeIndexer(path, index);
					}
				}
			}
			else if (Tools.isPlainObject(keys)) {
				for (name in keys) {
					if (!_hasOwnProperty.call(keys, name)) {
						continue;
					}

					index = _indexOf(indexer, +name);

					if (index !== -1) {
						delete indexer[index];
						this._removeIndexer(path, index);
					}
				}
			}
		};

		Mixin('Attributes', self);

		return self;
	})(Mixin, Tools);

	var Observer = (function (Mixin, Attributes, Tools) {
		var self = {};
		var fn = self.fn = {};
		var attrs = self.attrs = {};

		fn._events = {};

		var noName = '';

		var delimiter = Attributes.getDelimiter();

		self.extend = function (Ant) {
			var fn = Ant.prototype;

			Tools.extend(fn, self.fn);

			if (fn.set && fn.merge && fn.splice && fn.unset) {
				Tools.extend(fn, self.attrs);
			}

			if (_isArray(Ant.constructors)) {
				Ant.constructors.push(self.construct);
			}
		};

		self.construct = function () {
			this._events = {};
		};

		self.sorter = function (a, b) {
			if (a.path < b.path) return -1;
			if (a.path > b.path) return 1;
			
			return 0;
		};

		self._getValue = function (obj, path) {
			path = Attributes.unwrapIndexes(path);

			var name, context = obj,
				names = Attributes.split(path);

			while (context && (name = names.shift())) {
				context = context[name];
			}

			return context;
		};

		self._wrap = function (obj, path) {
			var name, buffer,
				names = Attributes.split(path);

			while (name = names.pop()) {
				buffer = {};
				buffer[name] = obj;

				obj = buffer;
			}

			return obj;
		};

		attrs.set = function (path, value) {
			var name, events,
				args = arguments,
				old = Attributes.fn.set.apply(this, args);

			if (!Tools.isPlainObject(path)) {
				events = this._match('change', path, value, old);

				this.notify(events);

				return old;
			}

			for (name in path) {
				if(!_hasOwnProperty.call(path, name)) {
					continue;
				}

				events = this._match('change', name, path[name], old[name]);

				this.notify(events);
			}

			return old;
		};

		attrs.merge = function (path, obj) {
			if (Tools.isPlainObject(path)) {
				obj = path;
				path = '';
			}

			var old = Attributes.fn.merge.call(this, path, obj);

			var events = this._match('change', path, obj, old);

			this.notify(events);

			return old;
		};

		var indexOfNaN = function (array, offset) {
			offset = offset || 0;

			for (var len = array.length; offset < len; offset++) {
				if (array[offset] !== array[offset]) {
					return offset;
				}
			}

			return -1;
		};

		attrs.sort = function (path, sorter) {
			var _path = this._getStaticPath(path),
				old_indexer = this._getIndexer(_path).slice();

			// TODO: Get indexer and after sorting match deispacement events
			var index, events,
				unsorted = Attributes.fn.sort.apply(this, arguments),
				sorted   = this.get(path).slice(),
				_sorted  = sorted.slice();

			var i, len, map = [];

			for (i = 0, len = unsorted.length; i < len; i++) {
				index = unsorted[i] !== unsorted[i] ? indexOfNaN(sorted) : _indexOf(sorted, unsorted[i]);
				map[index] = i;
				delete sorted[index];
			}

			var new_indexer = this._getIndexer(_path);

			events = [];

			for (i = 0, len = new_indexer.length; i < len; i++) {
				if (old_indexer[i] !== new_indexer[i]) {
					events.push({
						old: old_indexer[i],
						cur: new_indexer[i],
						path: path + '.{' + i + '}',
						eventPath: path,
						type: 'displace'
					});
				}
			}

			this.notify(events);

			events = this._match('sort', path, _sorted, unsorted, {map: map});

			this.notify(events);

			return unsorted;
		};

		attrs.splice = function (path, index, remove) {
			var target = this.get(path);

			var old_length = target.length,
				old = Attributes.fn.splice.apply(this, arguments);

			var i, len, cur = {},
				cur_length = target.length,
				added = _slice.call(arguments, 3);

			for (i = 0, len = added.length; i < len; i++) {
				cur[index + i] = added[i];
			}

			var events,
				cDate = {
					from: index,
					removed: remove,
					added: arguments.length - 3
				};

			events = this._match('splice', path, cur, old, cDate);
			this.notify(events);

			if (cur_length !== old_length) {
				events = this._match('change', path + '.length', cur_length, old_length);
				this.notify(events);
			}

			return old;
		};

		attrs.unset = function (path) {
			var i, len, events,
				args = arguments,
				old = Attributes.fn.unset.apply(this, args);

			if (!_isArray(old)) {
				old = [old];
			}

			for (i = 0, len = old.length; i < len; i++) {
				events = this._match('change', args[i], undefined, old[i]);

				this.notify(events);
			}

			return old.length === 1 ? old[0] : old;
		};

		attrs._displaceKeys = function (path, index, removed, added) {
			var i, len,
				displace = added - removed,
				indexer = this._getIndexer(path);

			var events = [];

			if (this._events.displace) {
				for (i = 0, len = indexer.length; i < len; i++) {
					if (indexer[i] >= index + removed) {
						events.push({
							old: indexer[i],
							cur: indexer[i] + displace,
							path: path + '.{' + i + '}',
							eventPath: path,
							type: 'displace'
						});
					}
				}
			}

			Attributes.fn._displaceKeys.apply(this, arguments);

			this.notify(events);
		};

		// TODO: match array length
		self._capture = function (type, path, cur, old) {
			var path_1, path_2, _subname, _cur, _old,
				d_path_1, d_path_2,
				events = [], list = this._events[type];

			path_1 = path && path + delimiter;
			d_path_1 = path && this._getDynamicPath(path) + delimiter;

			for (path_2 in list) {

				if (!_hasOwnProperty.call(list, path_2) || (path && path_2.indexOf(path_1) !== 0)) {
					continue;
				}

				d_path_2 = this._getDynamicPath(path_2);

				_subname = d_path_2.slice(d_path_1.length);

				_cur = self._getValue(cur, _subname);
				_old = self._getValue(old, _subname);

				if (_isEqual(_cur, _old)) {
					continue;
				}

				events.push({
					old: _old,
					cur: _cur,
					path: path_2,
					eventPath: path,
					type: type
				});
			}

			return events;
		};

		self._propagation = function (type, path, cur, old) {
			var _path, _cur, _old, _subname,
				d_path_1, d_path_2,
				events = [], list = this._events[type];

			d_path_1 = this._getDynamicPath(path);

			for (_path in list) {
				if (!_hasOwnProperty.call(list, _path) || path.indexOf(_path) !== 0) {
					continue;
				}

				d_path_2 = this._getDynamicPath(_path);

				_subname = d_path_1.slice(d_path_2.length + 1);

				_cur = self._wrap(cur, _subname);
				_old = self._wrap(old, _subname);

				events.push({
					old: _old,
					cur: _cur,
					path: _path,
					eventPath: path,
					type: type
				});
			}

			return events;
		};

		attrs._match = function (type, path, cur, old, customData) {
			path = this._getStaticPath(path);

			var capture = self._capture.call(this, type, path, cur, old),
				propagation = self._propagation.call(this, type, path, cur, old);

			var i, len, name, events = [].concat(capture, propagation);

			if (Tools.isPlainObject(customData)) {
				for (i = 0, len = events.length; i < len; i++) {
					for (name in customData) {
						if (!_hasOwnProperty.call(customData, name)) {
							continue;
						}

						events[i][name] = customData[name];
					}
				}
			}

			return events.sort(self.sorter);
		};

		fn.notify = function (events) {
			for (var i = 0, len = events.length; i < len; i++) {
				this.trigger(events[i].type, events[i].path, events[i]);
			}
		};

		fn.on = function (type, name, callback) {
			if (_isString(name)) {
				name = this._getStaticPath(name);
			}

			if (_isFunction(name)) {
				callback = name;
				name = noName;
			}

			if (!_isFunction(callback)) {
				Tools.Str("Observer: Use method 'on' without a function.\nName: %s. Type: %s.", name, type).warn();
				return false;
			}

			this._events[type] = this._events[type] || {};
			this._events[type][name] = this._events[type][name] || [];

			this._events[type][name].push(callback);

			return true;
		};

		// TODO: Remove events when it's flushed and empty
		fn.off = function (type, name, callback) {
			if (_isString(name)) {
				name = this._getStaticPath(name);
			}

			if (_isFunction(name)) {
				callback = name;
				name = noName;
			}

			if (this._events[type] === undefined) {
				this._events = [];
				return true;
			}

			if (arguments.length === 1) {
				delete this._events[type];
				return true;
			}

			if (this._events[type][name] === undefined) {
				Tools.Str('Observer with name \'%s\' doesn\'t exist.', name).warn();
				return false;
			}

			if (callback === undefined) {
				delete this._events[type][name];
				return true;
			}

			var index = _indexOf(this._events[type][name], callback);

			if (index !== -1) {
				this._events[type][name].splice(index, 1);

				if (!this._events[type][name].length) {
					delete this._events[type][name];
				}

				return true;
			}

			Tools.Str('Observer with type \'%s\' and name \'%s\' doesn\'t have passed function.', type, name).warn();
			return false;
		};

		// TODO: missing name argument
		fn.trigger = function (type, name, davent) {
			if (_isString(name)) {
				name = this._getStaticPath(name);
			}

			if (name === undefined || Tools.isPlainObject(name)) {
				davent = name;
				name = noName;
			}

			var _name, listener = this._events[type];

			if (listener === undefined || listener[name] === undefined) {
				return;
			}

			var args = _slice.call(arguments, 2);

			for (_name in listener[name]) {
				if (_hasOwnProperty.call(listener[name], _name) && _isFunction(listener[name][_name])) {
					listener[name][_name].apply(this, args);
				}
			}
		};

		Mixin('Observer', self);

		return self;
	})(Mixin, Attributes, Tools);

	var Anthill = (function (Tools, global) {

		var FUNCTION_EXTEND = 'Extend';

		var PROPERTY_EXTEND = 'extend',
			PROPERTY_STATIC = 'statics',
			PROPERTY_MIXINS = 'mixins',
			PROPERTY_CONSTRUCTORS = 'constructors';

		var Queen = (function (Tools) {

			var extend = function (dest, src) {
				for (var name in src) {
					if (!_hasOwnProperty.call(src, name) || name === FUNCTION_EXTEND || name === 'fn') {
						continue;
					}

					if (_isArray(src[name]) && _isArray(dest[name])) {
						dest[name] = [].concat(dest[name], src[name]);
					}
					else {
						dest[name] = _cloneDeep(src[name]);
					}
				}

				return dest;
			};

			var addMixins = function (Ant, mixins) {
				if (!_isArray(mixins)) {
					return;
				}

				var mixin;

				for (var i = 0, len = mixins.length; i < len; i++) {
					mixin = Mixin(mixins[i]);

					if (!mixin) {
						throw 'Ai: Can\'t find mixin with name \'' + mixins[i] + '\'';
					}
					
					mixin.extend(Ant);
				}
			};

			var createConstructor = function () {
				var Ant = function Ant (data) {
					if (!(this instanceof Ant)) {
						throw ('Ai: Using constructor without operator \'new\'.');
					}

					for (var func in Ant[PROPERTY_CONSTRUCTORS]) {
						if (!_hasOwnProperty.call(Ant[PROPERTY_CONSTRUCTORS], func)) {
							continue;
						}

						Ant[PROPERTY_CONSTRUCTORS][func].call(this);
					}

					_isFunction(this.construct) && this.construct.apply(this, arguments);
				};

				Ant.fn = Ant.prototype = {};

				Ant[FUNCTION_EXTEND] = function (ext) {
					var _Ant = createConstructor();

					var st = ext[PROPERTY_STATIC];

					delete ext[PROPERTY_STATIC];

					Tools.inherit(_Ant, Ant, ext);

					extend(_Ant, Ant);
					
					if (Tools.isPlainObject(st)) {
						extend(_Ant, st);
						addMixins(_Ant, st[PROPERTY_MIXINS]);
					}

					return _Ant;
				};

				return Ant;
			};

			var Queen = createConstructor();

			Queen[PROPERTY_MIXINS] = [];
			Queen[PROPERTY_CONSTRUCTORS] = [];

			Queen.fn.constructor = Queen;

			Queen.fn.hasMixin = function (name) {
				return _indexOf(this[PROPERTY_MIXINS], name) !== -1;
			};

			return Queen;
		})(Tools);

		var Store = Queen.Extend({
			statics: {
				mixins: ['Attributes']
			}
		});

		var Anthill = (function (Queen, Tools, global) {
			var _Ai = global.Ai;

			var store = new Store();

			var isAnt = function (obj) {
				return obj instanceof Queen;
			};

			var set = function (path, Ant) {
				if (!_isFunction(Ant)) {
					throw Tools.Str('Ai: Not function setted into \'%s\'.', path).Error();
				}

				if (store.check(path)) {
					throw Tools.Str('Ai: Ant in path \'%s\' already exists.', path).Error();
				}

				store.set(path, Ant);

				return Ant;
			};

			var get = function (path) {
				return store.get(path);
			};

			var check = function (path) {
				return store.check(path);
			};

			var list = function (path) {
				return store.getNames(path);
			};

			var Anthill = function Anthill (path, data) {
				var Parent, ext, st;
				var Factory = path ? get(path) : Queen;

				if (this instanceof Anthill) {
					return new Factory(data);
				}

				if (!data) {
					return Factory;
				}

				if (_isFunction(data)) {
					Factory = data;
				}
				else {
					Parent = data[PROPERTY_EXTEND] ? get(data[PROPERTY_EXTEND]) : Queen;

					if (!Parent) {
						throw Tools.Str('Ai: Can\'t find Ant in path \'%s\'.', data.extend).Error();
					}

					ext = data;

					delete data[PROPERTY_EXTEND];

					Factory = Parent[FUNCTION_EXTEND](ext);
				}

				set(path, Factory);

				return Factory;
			};

			Anthill.get = get;
			Anthill.set = set;
			Anthill.check = check;
			Anthill.list = list;

			Anthill.isAnt = isAnt;

			Anthill.noConflict = function () {
				global.Ai = _Ai;
				return Anthill;
			};

			Anthill('Queen', Queen);
			Anthill('Store', Store);

			return Anthill;
		})(Queen, Tools, global);

		return  Anthill;
	})(Tools, global);

	var Application = (function (Anthill, Tools) {

		var store = new Anthill('Store');

		var set = function (path, ant) {
			store.set(path, ant);
			return ant;
		};

		var get = function (path) {
			return store.get(path);
		};

		var check = function (path) {
			return store.check(path);
		};

		var list = function (path) {
			return _keys(store.get(path));
		};

		var Application = function (path, ant) {
			switch (arguments.length) {
				case 1: return get(path);
				case 2: return set(path, ant);
			}
		};

		Application.set = set;
		Application.get = get;
		Application.check = check;
		Application.list = list;

		return Application;
	})(Anthill, Tools);

	(function (Anthill) {
/*
		Anthill('path.AntName', {
			extend: 'Queen',
			require: ['Queen'],
			mixins: ['Attributes', 'Observer'],
			statics: {name: 'value'}
		});
*/
		Anthill('GuidFactory', {
			construct: function () {
				var id = 0;

				this.create = function () {
					return id++;
				};
			}
		});

		Anthill('Model', {
			statics: {
				mixins: ['Attributes', 'Observer']
			},

			construct: function (data) {
				this.merge('', this.defaults || {});
				this.merge('', data);

				_isFunction(this.initialize) && this.initialize();
			}
		});

		Anthill('View', {
			statics: {
				mixins: ['Observer']
			},

			tpl: null,
			liveDOM: null,

			extData: null,

			before: function (target) {
				this.liveDOM.before(target);
			},
			after: function (target) {
				this.liveDOM.after(target);
			},
			prependTo: function (target) {
				this.liveDOM.prependTo(target);
			},
			appendTo: function (target) {
				this.liveDOM.appendTo(target);
			},

			remove: function () {
				this.liveDOM.hide();
			},

			render: function () {
				var data = {model: this.model, view: this},
					ext = _isFunction(this.dataMixin) ? this.dataMixin() : this.dataMixin;

				Tools.extend(data, ext);

				this.liveDOM = this.tpl(data);

				this.trigger('render');

				_isFunction(this.onRender) && this.onRender();
			},

			construct: function (data) {
				this.options = data || {};

				this.model = data.model;

				_isFunction(this.initialize) && this.initialize();

				this.render();
			}
		});

	})(Anthill);


	Anthill.version = version;

	Anthill.Tools = Tools;
	Anthill.Mixin = Mixin;
	Anthill.Application = Anthill.App = Application;

	global.Anthill = global.Ai = Anthill;

})(window, jQuery, _);
