
(function (global, doc, jQuery, _, Ai, undefined) {
	'use strict';

	var DEBUG = true;

	var version = '0.2.12';

	var EMPTY_FUNCTION = function () {};

	var a_delimeter = Ai.Mixin('Attributes').getDelimiter();

	// Native
	var _slice = Array.prototype.slice,
		_splice = Array.prototype.splice,
		_hasOwnProperty = Object.prototype.hasOwnProperty;

	// jQuery
	var $trim = jQuery.trim;

	// Lodash
	var _isArray    = _.isArray,
		_isFunction = _.isFunction,

		_indexOf    = _.indexOf,
		_difference = _.difference;
	/*
		_isString = _.isString,

		_extend   = _.extend,
		_clone    = _.clone,

		_find     = _.find,
		_filter   = _.filter;
	*/

	// Tools
	var t_sbind   = Ai.Tools.sbind,
		t_extend  = Ai.Tools.extend,
		t_replace = Ai.Tools.replace,
		t_inherit = Ai.Tools.inherit;

	// TPL
	var tpl_escapeString,
		tpl_unEscapeString,
		tpl_isJSON,
		tpl_isArray,
		tpl_parsePath,
		tpl_firstName,
		tpl_lastName,
		tpl_createPlaceholder,
		tpl_strRepeat,
		tpl_replaceNode;

	(function () {
		tpl_escapeString = function (str, symb) {
			symb = symb || '"';

			return str.replace(new RegExp(symb, 'g'), '\\' + symb);
		};

		tpl_unEscapeString = function (str, symb) {
			symb = symb || '"';

			return str.replace(new RegExp('\\' + symb, 'g'), symb);
		};

		var regs = {};

		regs.isInject = /^\{.+\}$/;
		regs.isString = /^(".*"|'.*')$/;

		var isValidValue = function (string) {
			string = $trim(string);

			var res = regs.isInject.test(string);

			!res && (res = !isNaN(string));
			!res && (res = regs.isString.test(string));

			return res;
		};

		tpl_isJSON = function (string) {
			var i, len, res, pair,
				reg = /^[\d\w-]+$/i,
				items = string.split(',');

			for (i = 0, len = items.length; i < len; i++) {
				pair = items[i].split(':');

				res = true;

				res && (res = pair.length === 2);
				res && (res = reg.test($trim(pair[0])));
				res && (res = isValidValue($trim(pair[1])));

				if (!res) {
					return false;
				}
			}

			return true;
		};

		tpl_isArray = function (string) {
			var i, len, items = string.split(',');

			for (i = 0, len = items.length; i < len; i++) {
				if (!isValidValue(items[i])) {
					return false;
				}
			}

			return true;
		};

		tpl_parsePath = function (path) {
			var index = path.indexOf('#');

			if (index === -1) {
				return {path: path, attr: ''};
			}

			return {path: path.slice(0, index), attr: path.slice(index + 1)};
		};

		regs.firstName = /^[^.#]+/;

		tpl_firstName = function (path) {
			if (!path) {
				return '';
			}

			var matches = regs.firstName.exec(path);

			return matches ? matches[0] : '';
		};

		tpl_lastName = function (path) {
			var index = path.lastIndexOf(a_delimeter);

			if (index === -1) {
				return path;
			}

			return path.slice(index + 1);
		};

		tpl_createPlaceholder = function (text) {
			return DEBUG ? doc.createComment(' ' + text + ' placeholder ') : doc.createTextNode('');
		};

		tpl_strRepeat = function (str, count) {
			return (new Array((count || 0) + 1)).join(str);
		};

		tpl_replaceNode = function (placeholder, element) {
			placeholder.parentNode.insertBefore(element, placeholder);
		};
	})();

	var DEFAULT_BLOCK_HELPER_NAME = '__root__',
		DEFAULT_ATTRIBUTE_HELPER_NAME = '__default__';

	var Helpers = (function () {
		var Store = function Store (type) {
			this.type = type;
			this.items = {};
		};

		Store.fn = Store.prototype = {};

		Store.fn.constructor = Store;

		Store.fn.register = function (name, worker) {
			if (this.check(name)) {
				throw new Error('TPL: Helper with type "' + this.type + '" and name "' + name + '" already exists.');
			}

			return (this.items[name] = worker);
		};

		Store.fn.check = function (name) {
			return this.items[name] !== undefined;
		};

		Store.fn.get = function (name) {
			if (!this.check(name)) {
				throw new Error('TPL: Helper with type "' + this.type + '" and name "' + name + '" doesn\'t exist.');
			}

			return this.items[name];
		};

		Store.fn.extend = function (name, modifier) {
			var worker = this.getHelper(name);

			modifier(worker);
		};

		return {
			blocks: new Store('blocks'),
			attributes: new Store('attributes')
		};
	})();

	var Fragment = (function () {
		var self = {};

		self.Default = (function () {
			var DefaultFragment = function DefaultFragment (params) {
				t_extend(this, params);
			};

			DefaultFragment.fn = DefaultFragment.prototype = {};

			DefaultFragment.fn.compile = function () {
				throw new Error('TPL: Method Fragment.compile must be owerrided');
			};

			return DefaultFragment;
		})();

		self.Block = (function () {
			var BlockFragment = function BlockFragment (params) {
				this.parent = null;
				self.Default.call(this, params);
			};

			t_inherit(BlockFragment, self.Default);

			BlockFragment.fn = BlockFragment.prototype;

			BlockFragment.fn.compile = function () {
				if (!this.isIgnored) {
					this.rules = [];

					Helpers.blocks.get(this.name).compile(this);
				}

				var modifier = this.parent ? this.parent.modifier : null;

				if (this.modifier) {
					this.modifier[Compile.GO_UP_CODE] = modifier;
				}
				else {
					this.modifier = modifier;
				}
			};

			var refresh = function (master, slave) {
				slave = slave || master;

				t_extend(slave, {body: [], childs: {}, parent: master.parent});

				master !== slave && t_extend(slave, {isBlock: true, isShort: false, isIgnored: true});
			};

			BlockFragment.fn.split = function (names) {
				names = _slice.call(arguments);

				var id, row, last, item;
				var isSubName, isName;

				var body = this.body,
					childs = this.childs;
				
				var subs = [];

				refresh(this);
				subs.push(last = this);

				var i, len, _i, _len, ids;

				for (i = 0, len = body.length; i < len; i++) {
					row = body[i];

					if (!Parser.isPlaceholder(row)) {
						ids = Parser.getAttributesPlaceholderIds(row);

						for (_i = 0, _len = ids.length; _i < _len; _i++) {
							last.childs[ids[_i]] = childs[ids[_i]];
						}

						last.body.push(row);
						continue;
					}

					id = Parser.getPlaceholderId(row);

					item = childs[id];

					isSubName = !!item.split_name && _indexOf(names, item.split_name) !== -1;
					isName = !isSubName && _indexOf(names, item.name) !== -1;

					if (!isSubName && !isName) {
						last.body.push(row);
						last.childs[id] = item;

						item.parent = last;

						continue;
					}

					subs.push(last = item);
					refresh(this, last);

					isSubName && (last.name = last.split_name);
					!isName   && (last.rule = null);
				}

				return _slice.call(this.subFragments = subs);
			};

			return BlockFragment;
		})();

		self.Element = (function () {
			var ElementFragment = function ElementFragment (params) {
				self.Default.call(this, params);

				this.childs = [];
			};

			t_inherit(ElementFragment, self.Default);

			ElementFragment.fn = ElementFragment.prototype;

			ElementFragment.fn.compile = function () {
				this.modifier = this.parent.modifier;

				for (var i = 0, len = this.childs.length; i < len; i++) {
					this.childs[i].compile();
				}
			};

			return ElementFragment;
		})();

		self.Attribute = (function () {
			var AttributeFragment = function AttributeFragment (params) {
				self.Default.call(this, params);
			};

			t_inherit(AttributeFragment, self.Default);

			AttributeFragment.fn = AttributeFragment.prototype;

			AttributeFragment.fn.compile = function () {
				this.rules = [];
				this.modifier = this.parent.modifier;

				var name = Helpers.attributes.check(this.name) ? this.name : DEFAULT_ATTRIBUTE_HELPER_NAME;

				Helpers.attributes.get(name).compile(this, this.parent);
			};

			return AttributeFragment;
		})();
	
		return self;
	})();


	var Parser = (function () {
		var RegExps = {};
		var self = {};

		self.fn = {};

		var unwrap = function (value) {
			return value[0] === '"' && value.slice(-1) === '"' ? value.slice(1, -1) : value;
		};

		self.fn.reserve = function () {
			var self = this;

			var result = {
				index: this.length++,
				fragment: null
			};

			result.registr = function (fragment) {
				result.fragment = fragment;

				self.registr(fragment, result.index);

				delete result.registr;

				return result;
			};

			return result;
		};

		self.fn.registr = function (fragment, index) {
			if (fragment.statement) {
				self.matchBlockStatement(fragment);
			}

			index === undefined && (index = this.length++);

			this[index] = fragment;

			return index;
		};

		/* For Blocks */

		(function () {

			/* Helpers */

			self.PLACEHOLDER_TAG = 'script';
			self.PLACEHOLDER_ID_ATTR = 'id';

			self.PLACEHOLDER_TAG_START = '<' + self.PLACEHOLDER_TAG + ' type="text/placeholder" ' + self.PLACEHOLDER_ID_ATTR + '="';
			self.PLACEHOLDER_TAG_END   = '"></' + self.PLACEHOLDER_TAG + '>';

			RegExps.clearComments = /\{\{!--[\s\S]*?--\}\}/gm;

			var clearComments = function (html) {
				return html.replace(RegExps.clearComments, '');
			};

			var createPlaceholder = function (id) {
				return self.PLACEHOLDER_TAG_START + id + self.PLACEHOLDER_TAG_END;
			};

			RegExps.placeholder = new RegExp('^' + self.PLACEHOLDER_TAG_START + '\\d+' + self.PLACEHOLDER_TAG_END + '$');

			self.isPlaceholder = function (html) {
				return RegExps.placeholder.test(html);
			};

			self.getPlaceholderId = function (html) {
				if (self.isPlaceholder(html)) {
					return +html.slice(self.PLACEHOLDER_TAG_START.length, -1 * self.PLACEHOLDER_TAG_END.length);
				}

				return null;
			};

			/* Parser */

			RegExps.split = /(\{\{.+?\}\})/gm;

			var TYPE_TEXT = 1,
				TYPE_INLINE = 2,
				TYPE_BLOCK = 3,
				TYPE_BLOCK_CLOSE = 4;

			self.matchType = function (block) {
				if (!RegExps.split.test(block)) {
					return TYPE_TEXT;
				}

				if (block[2] === '#') {
					return TYPE_BLOCK;
				}

				if (block[2] === '/') {
					return TYPE_BLOCK_CLOSE;
				}

				return TYPE_INLINE;
			};

			self.fn.parseBlocks = function () {
				var html = clearComments(this.html);

				this.stream = html.split(RegExps.split);

				var reserved = this.reserve();

				var root = new Fragment.Block({name: DEFAULT_BLOCK_HELPER_NAME});

				root.body = this.matchBlock(root);

				reserved.registr(root);

				delete this.stream;
			};

			var getStatementName = function (statement) {
				return statement ? statement.slice(3, statement.indexOf(' ')) : null;
			};

			var checkBlockClosing = function (block, name) {
				var _name = block.slice(3, -2);

				if (name !== _name) {
					throw new Error('Closing block "' + _name + '" instead of "' + name + '"');
				}

				return true;
			};

			self.fn.compileInlineFragment = function (block, parent) {
				var fragment = new Fragment.Block({statement: block, parent: parent});

				return this.reserve().registr(fragment);
			};

			self.fn.compileBlockFragment = function (block, parent) {
				var reserved = this.reserve();

				var fragment = new Fragment.Block({statement: block, parent: parent});

				fragment.body = this.matchBlock(fragment, block);

				return reserved.registr(fragment);
			};

			self.fn.matchBlock = function (parent, statement) {
				var block, type, child, closed = !statement, result = [];

				parent.childs = {};

				while (block = this.stream.shift()) {
					type = self.matchType(block);

					if (type === TYPE_BLOCK_CLOSE) {
						if (closed = checkBlockClosing(block, getStatementName(statement))) {
							break;
						}
					}

					if (type === TYPE_TEXT) {
						result.push(block);
						continue;
					}

					if (type === TYPE_BLOCK) {
						child = this.compileBlockFragment(block, parent);
					}
					if (type === TYPE_INLINE) {
						child = this.compileInlineFragment(block, parent);
					}

					parent.childs[child.index] = child.fragment;

					result.push(createPlaceholder(child.index));
				}

				if (!closed) {
					throw new Error('Unclosed block "' + getStatementName(statement) + '"');
				}

				return result;
			};

			self.matchBlockStatement = (function () {
				var RegExpsName = /^([a-z0-9\-_]+)(\s|$)/i;
				var RegExpsParam = /(?:([\w\-]+)=)?(".*?[^\\]"|[\w\-\.#]+)/gi;

				var isBlock = function (stmt) {
					return (this.isBlock = stmt[0] === '#') ? stmt.slice(1) : stmt;
				};

				var getName = function (stmt) {
					var matches = RegExpsName.exec(stmt);

					if (matches && matches[2].length) {
						this.name = matches[1];
						return stmt.slice(this.name.length + 1);
					}

					this.name = 'print';
					matches && (this.split_name = matches[1]);
					this.isShort = true;

					return stmt;
				};


				var getParams = function (stmt) {
					var param, name, value;

					var attributes = [];

					if (this.isShort) {
						this.rule = '{' + tpl_unEscapeString(stmt) + '}';
						return;
					}

					while (param = RegExpsParam.exec(stmt)) {
						name = param[1];
						value = param[2];

						value = unwrap(value);
						value = tpl_unEscapeString(value);

						attributes.push([name, value]);
					}

					if (attributes[0] && attributes[0][0] === undefined) {
						this.rule = attributes.shift()[1];
					}

					var i, len = attributes.length;

					if (!len) {
						return;
					}

					this.attributes = attributes[0][0] === undefined ? [] : {};

					for (i = 0; i < len; i++) {
						if (i && typeof attributes[i - 1][0] !== typeof attributes[i][0]) {
							throw 'Using named and unnamed attributes in statement ' + this.origin;
						}

						if (attributes[i][0] !== undefined) {
							this.attributes[attributes[i][0]] = attributes[i][1];
						}
						else {
							this.attributes.push(attributes[i][1]);
						}
					}
				};

				return function (fragment) {
					var stmt = fragment.statement;

					fragment.isShort = false;
					fragment.isIgnored = false;

					fragment.origin = stmt;

					stmt = stmt.slice(2, -2);

					stmt = isBlock.call(fragment, stmt);
					stmt = getName.call(fragment, stmt);

					getParams.call(fragment, stmt);

					delete fragment.stmt;

					return fragment;
				};
			})();
		})();

		/* For Attributes */

		(function () {

			var Element = function Element (name, attributes) {
				this.name = name;
				this.attributes = attributes;
			};

			Element.fn = Element.prototype = {};

			Element.fn.getAttribute = function (name) {
				for (var i = 0, len = this.attributes.length; i < len; i++) {
					if (this.attributes[i].name === name) {
						return this.attributes[i].value;
					}
				}
			};

			/* Helpers */

			self.PLACEHOLDER_ATTR = 'ai-fragment';
			self.PROCESS_ATTR_MARK = 'ai:';

			var createPlaceholder = function (id) {
				return self.PLACEHOLDER_ATTR + '=' + '"' + id + '"';
			};

			RegExps.tagUnwrapp = /^<|\s*\/?>$/g;
			RegExps.tagName = /^([\w\-:]+)(\s|$)/i; // TODO: test with \b 

			var getName = function (tag) {
				tag = tag.replace(RegExps.tagUnwrapp, '');

				var matches = RegExps.tagName.exec(tag);

				return matches[1];
			};

			RegExps.tagAttributes = /([\w\-:]+)(?:=(".*?[^\\]"|[\w\-\.#]+))?/gi;

			var getAttributes = function (tag) {
				tag = tag.replace(RegExps.tagUnwrapp, '');
				tag = tag.replace(RegExps.tagName, '');

				var match, name, value, result = [];

				while (match = RegExps.tagAttributes.exec(tag)) {
					name = match[1];
					value = match[2] || '';

					value = unwrap(value);
					value = tpl_unEscapeString(value);

					result.push({name: name, value: value});
				}

				return result;
			};

			/* Parser */

			RegExps.tag = /(<[^\/!][^>]+>)/g;

			self.fn.parseTags = function () {
				var i, len, _i, _len,
					self = this;

				for (i = 0, len = self.length; i < len; i++) {
					if (!self[i].body) {
						continue;
					}

					for (_i = 0, _len = self[i].body.length; _i < _len; _i++) {
						self[i].body[_i] = self[i].body[_i].replace(RegExps.tag, function (m) {
							return self.matchTag(self[i], m);
						});
					}
				}
			};

			self.fn.matchTag = function (parent, tag) {
				if (tag.indexOf(self.PLACEHOLDER_TAG) === 1) {
					return tag;
				}

				var i, len, child,
					name = getName(tag),
					allAttrs = getAttributes(tag),
					blocks = [], filteredAttrs = [];

				var fragment = new Fragment.Element({parent: parent});

				blocks.push(name);

				for (i = 0, len = allAttrs.length; i < len; i++) {
					if (allAttrs[i].name.indexOf(self.PROCESS_ATTR_MARK) !== 0) {
						blocks.push(allAttrs[i].name + '=' + '"' + (allAttrs[i].value) + '"');
						filteredAttrs.push(allAttrs[i]);
						continue;
					}

					fragment.childs.push(
						new Fragment.Attribute({
							parent: fragment,
							name: allAttrs[i].name.slice(self.PROCESS_ATTR_MARK.length),
							rule: allAttrs[i].value
						})
					);

					delete allAttrs[i];
				}

				if (!fragment.childs.length) {
					return tag;
				}

				fragment.element = new Element(name, filteredAttrs);

				child = this.reserve().registr(fragment);

				parent.childs[child.index] = fragment;

				blocks.push(createPlaceholder(child.index));

				return '<' + blocks.join(' ') + '>'; // TODO: самозакрывающиеся блоки
			};

			RegExps.tagAttributesPlaceholder = new RegExp('\\b' + self.PLACEHOLDER_ATTR + '="(\\d+)"', 'g');

			self.getAttributesPlaceholderIds = function (row) {
				var match, result = [];

				while (match = RegExps.tagAttributesPlaceholder.exec(row)) {
					result.push(+match[1]);
				}

				return result;
			};
		})();

		self.fn.parse = function (html) {
			this.html = html;
			this.length = 0;

			this.parseBlocks();
			this.parseTags();

			!DEBUG && delete this.html;
		};

		self.fn.compile = function () {
			for (var i = 0, len = this.length; i < len; i++) {
				this[i].compile();
			}
		};

		return self;
	})();

	var TPL = (function () {
		var TPL = function TPL (html) {
			var self = this;

			this.parse(html);

			this.compile();

			var wrapper = function (data) {
				return self.workUp(data);
			};

			wrapper.__TPL__ = self;

			return wrapper;
		};

		TPL.fn = TPL.prototype = t_extend({}, Parser.fn);

		TPL.fn.constructor = TPL;

		TPL.fn.workUp = function (data) {
			return new LiveDOM(data, this);
		};

		return TPL;
	})();

	var LiveDOM = (function () {
		var LiveDOM = function LiveDOM (data, tpl) {
			this.data = data;
			this.subdom = new SubDOM(tpl[0], data);
		};

		LiveDOM.fn = LiveDOM.prototype = {};

		LiveDOM.fn.constructor = LiveDOM;

		LiveDOM.fn.isFrozen = true;

		LiveDOM.fn.toggleFreeze = function (state) {
			if (this.isFrozen === state) {
				return;
			}

			this.subdom[state ? 'freeze' : 'unfreeze']();

			this.isFrozen = state;
		};

		LiveDOM.fn.freeze   = function () { this.toggleFreeze(true);  };
		LiveDOM.fn.unfreeze = function () { this.toggleFreeze(false); };

		LiveDOM.fn.rematch = function () {}; // TODO

		LiveDOM.fn.before = function (element) {
			this.show(element, 'before');
		};

		LiveDOM.fn.after = function (element) {
			this.show(element, 'after');
		};

		LiveDOM.fn.prependTo = function (element) {
			this.show(element, 'prepend');
		};

		LiveDOM.fn.appendTo = function (element) {
			this.show(element, 'append');
		};

		LiveDOM.fn.show = function (element, method) {
			this.subdom.show(element, method);

			this.unfreeze();
		};

		LiveDOM.fn.hide = function () {
			this.subdom.hide();

			this.freeze();
		};

		return LiveDOM;
	})();

	var LiveList = (function () {
		var LiveList = function LiveList (fragment, placeholder, data) {
			this.data = data;
			this.placeholder = placeholder;
			this.fragment = fragment;

			this.isFrozen = true;

			this.subDoms = [];
		};

		LiveList.fn = LiveList.prototype = {};

		LiveList.fn.constructor = LiveList;

		LiveList.fn.create = function (params) {
			return new SubDOM(this.fragment, this.data, params);
		};

		LiveList.fn.splice = function (/*index, remove, subDOMs...*/) {
			var args = _slice.call(arguments);

			LiveList.fn.remove.apply(this, args);

			args.splice(1, 1);

			LiveList.fn.insert.apply(this, args);
		};

		LiveList.fn.insert = function (index/*, subDOMs*/) {
			var args = _slice.call(arguments),
				added = _slice.call(arguments, 1);

			args.splice(1, 0, 0);

			_splice.apply(this.subDoms, args);

			if (this.isFrozen) {
				return;
			}

			var target, prev = this.subDoms[index - 1];

			for (var i = 0, len = added.length; i < len; i++) {
				target = index + i ? prev.childs[prev.childs.length - 1] : this.placeholder;

				added[i].show(target, 'after');

				prev = added[i];
			}
		};

		LiveList.fn.push = function (params) {
			var subDOM;

			if (params instanceof SubDOM) {
				subDOM = params;
			}
			else {
				subDOM = this.create(params);
			}

			this.insert(this.subDoms.length, subDOM);
		};

		LiveList.fn.remove = function (index, count) {
			var removed = this.subDoms.splice(index, count);

			for (var i = 0; i < count; i++) {
				removed[i] && removed[i].hide();
			}
		};

		LiveList.fn.clean = function () {
			this.remove(0, this.subDoms.length);
		};

		LiveList.fn.sort = function (map) {
			var index, list = [];

			map = map.slice();

			while ((index = map.shift()) !== undefined) {
				list.push(this.subDoms[index]);
			}

			this.subDoms = list;
		};

		LiveList.fn.show = function () {
			var i = this.subDoms.length;

			while (i--) {
				this.subDoms[i].show(this.placeholder, 'after');
			}

			this.isFrozen = false;
		};

		LiveList.fn.hide = function () {
			var i = this.subDoms.length;

			while (i--) {
				this.subDoms[i].hide();
			}

			this.isFrozen = true;
		};

		return LiveList;
	})();

	var SubDOM = (function () {
		var SubDOM = function SubDOM (fragment, data, params) {
			this.fragment = fragment;
			this.data = data;
			this.params = params;

			this.dom = document.createElement('div');
			this.dom.innerHTML = fragment.body.join('');

			this.compileStatements();
			this.compileAttributes();

			this.childs = _slice.call(this.dom.childNodes);

			delete this.dom;
		};

		SubDOM.fn = SubDOM.prototype = {};

		SubDOM.fn.compileStatements = function () {
			this.statements = [];

			var i, len, id, child, statement, placeholders;

			placeholders = this.dom.getElementsByTagName(Parser.PLACEHOLDER_TAG);
			placeholders = _slice.call(placeholders);

			for (i = 0, len = placeholders.length; i < len; i++) {
				id = +placeholders[i].getAttribute('id');

				child = this.fragment.childs[id];

				if (child.isIgnored) {
					continue;
				}

				statement = new Statement(child, placeholders[i], this.data, this.params);

				this.statements.push(statement);
			}
		};

		SubDOM.fn.compileAttributes = function () {
			this.attributes = [];

			var i, len, id, child, attributes, tags;

			tags = this.dom.querySelectorAll('[' + Parser.PLACEHOLDER_ATTR + ']');
			tags = _slice.call(tags);

			for (i = 0, len = tags.length; i < len; i++) {
				id = +tags[i].getAttribute(Parser.PLACEHOLDER_ATTR);

				child = this.fragment.childs[id];

				attributes = new AttributesList(child, tags[i], this.data, this.params);

				this.attributes.push(attributes);
			}
		};

		SubDOM.fn.getModifiersStack = function () {
			var fragment = this.fragment, result = [];

			while (fragment.parent) {
				if (fragment.modifier) {
					result.push(fragment.modifier);
				}

				fragment = fragment.parent;
			}

			return result;
		};

		SubDOM.fn.toggleFreeze = function (state) {
			if (this.isFrozen === state) {
				return;
			}

			var i, len, method = state ? 'freeze' : 'unfreeze';

			for (i = 0, len = this.statements.length; i < len; i++) {
				this.statements[i][method]();
			}
			
			for (i = 0, len = this.attributes.length; i < len; i++) {
				this.attributes[i][method]();
			}

			this.isFrozen = state;
		};

		SubDOM.fn.freeze   = function () { this.toggleFreeze(true);  };
		SubDOM.fn.unfreeze = function () { this.toggleFreeze(false); };

		SubDOM.fn.rematch = function () {}; // TODO

		SubDOM.fn.show = function (element, method) {
			jQuery(element)[method](this.childs);

			this.unfreeze();
		};

		SubDOM.fn.hide = function () {
			jQuery(this.childs).remove();

			this.freeze();
		};

		return SubDOM;
	})();

	var Transform = (function () {
		var self = {};

		var splitReg = /(\{[\w\.\-\/#~]+\})/;

		self.string = function (string) {
			var i, len, result = [],
				paths = string.split(splitReg);

			for (i = 0, len = paths.length; i < len; i++) {
				if (!paths[i].length) {
					continue;
				}

				if (!splitReg.test(paths[i])) {
					paths[i] = '"' + tpl_escapeString(paths[i]) + '"';
				}

				result.push(paths[i]);
			}

			return result.join(' + ');
		};

		self.array = function (string) {
			return '[ ' + string + ' ]';
		};

		self.json = function (string) {
			string = string.replace(/([\d\w-]+)\s*:/i, function (m, $1) {
				return '"' + tpl_escapeString($1) + '":';
			});

			return '{ ' + string + ' }';
		};

		return self;
	})();

	var Compile = (function () {
		var self = function (fragment, rule, group, connector, transformate) {
			transformate && (rule = Transform[transformate](rule));

			var listeners = [];

			var modifier = fragment.parent && fragment.parent[self.MODIFIER_PROPERTY];

			rule = rule.replace(self.regexp, function (m, $1) {
				var collected = self.collect($1, modifier);

				var compiled = self.compilers[collected.compiler][collected.method](collected.rule, collected.offset, connector);

				compiled.listener && listeners.push(compiled.listener);

				return compiled.snippet;
			});

			fragment.rules.push({
				worker: new Function(ARG_PARAMS, 'return ' + rule + ';'),
				listeners: listeners,
				group: group
			});
		};

		self.createEmpty = function (fragment, group) {
			fragment.rules.push({
				worker: null,
				listeners: [],
				group: group
			});
		};

		self.regexp = /\{([\w\.\-\/#~]+)\}/g;

		self.UNBIND_MARK = '~';

		self.MODIFIER_PROPERTY = 'modifier';

		self.GO_UP_CODE = '..';
		self.GO_UP_PATH = self.GO_UP_CODE + '/';
		self.GO_UP_EVAL = '[\'' + self.GO_UP_CODE + '\']';

		var ARG_PARAMS = 'params';

		self.keyInjectScript = function (path, offset, params) {
			var i1, i2;

			while (offset--) {
				params = params[self.GO_UP_CODE];
			}

			while ((i1 = path.lastIndexOf('<%')) !== -1 && (i2 = path.lastIndexOf('%>')) !== -1) {
				path = path.slice(0, i1) + params[path.slice(i1 + 2, i2)] + path.slice(i2 + 2);
				params = params[self.GO_UP_CODE];
			}

			return path;
		};

		self.keyInjectString = function (path, offset) {
			var i1, i2, params = ARG_PARAMS + tpl_strRepeat(self.GO_UP_EVAL, offset);

			while ((i1 = path.lastIndexOf('<%')) !== -1 && (i2 = path.lastIndexOf('%>')) !== -1) {
				path = path.slice(0, i1) + '\' + ' + params + '[\'' + path.slice(i1 + 2, i2) + '\'] + \'' + path.slice(i2 + 2);
				params += self.GO_UP_EVAL;
			}

			return path;
		};


		self.hasUnbind = function (rule) {
			return rule.indexOf(self.UNBIND_MARK) === 0;
		};

		self.removeUnbind = function (rule) {
			if (self.hasUnbind(rule)) {
				rule = rule.slice(self.UNBIND_MARK.length);
			}

			return rule;
		};

		self.unWrapp = function (rule) {
			if (rule[0] === '{' && rule.slice(-1) === '}') {
				rule = rule.slice(1, -1); 
			}

			return rule;
		};

		self.collect = function (rule, modifier) {
			var result = {};

			var isUnbinded = self.hasUnbind(rule);

			if (isUnbinded) {
				rule = self.removeUnbind(rule);
			}

			var bubble = bubbling(rule, modifier);

			result.rule = modifyHelper(bubble.rule, bubble.modifier);
			result.method = !result.rule || isUnbinded ? 'static' : 'dynamic';
			result.offset = bubble.offset;

			if (!result.rule) {
				result.compiler = 'undefined';
			}
			else if (bubble.modifier && bubble.rule === bubble.modifier['@name']) {
				result.compiler = 'index';
			}
			else {
				result.compiler = 'path';
			}

			return result;
		};

		var bubbling = function (rule, modifier) {
			var offset = 0;

			while (rule.indexOf(self.GO_UP_PATH) === 0) {
				if (!modifier) {
					throw new Error('TPL: Trying to get up over the root modifier.');
				}

				offset++;

				rule = rule.slice(self.GO_UP_PATH.length);

				modifier = modifier[self.GO_UP_CODE];
			}

			return {rule: rule, modifier: modifier, offset: offset};
		};

		var modifyHelper = function (path, modifier) {
			if (!modifier) {
				return path;
			}

			if (path === modifier['@name']) {
				return modifyHelper(modifier['@path'], modifier[self.GO_UP_CODE]);
			}

			var start = tpl_firstName(path);

			if (start === modifier['@value']) {
				path = modifier['@path'] + path.slice(start.length);
			}

			// TODO: Пренудительное указание подъёма вверх

			return modifyHelper(path, modifier[self.GO_UP_CODE]);
		};

		self.getSource = function (modifier, params) {
			var rule = modifier['@source'];

			var bubble = bubbling(rule, modifier['..']);

			rule = modifyHelper(bubble.rule, bubble.modifier);
			rule = self.keyInjectScript(rule, bubble.offset, params);

			var paths = rule.split('#');

			return {
				path: paths[0],
				attr: paths[1]
			};
		};


		var compilers = self.compilers = {
			path: {},
			index: {},
			custom: {}
		};

		compilers.path.dynamic = function (path, offset, connector) {
			var source = tpl_parsePath(path),
				pattern = 'this.%s';

			source.attr && (pattern += '.get(\'%s\')');

			var attr = self.keyInjectString(source.attr, offset);

			var result = {};

			result.snippet = t_replace(pattern, source.path, attr);

			if (source.attr && connector) {
				source.connector = connector;
				source.offset = offset;
				result.listener = source;
			}

			return result;
		};

		compilers.path.static = function (path, offset) {
			return self.compilers.path.dynamic(path, offset);
		};

		var indexConnector = {displace: 'change'};

		compilers.index.dynamic = function (path, offset) {
			var source = tpl_parsePath(path),
				pattern = 'this.%s._attrs.indexes[\'%s\'][%s]';

			var index = source.attr.lastIndexOf('.');

			path = source.attr.slice(0, index);
			index = source.attr.slice(index + 3, -2);

			index = index.slice('listen_'.length);

			var indexerPath = ARG_PARAMS + tpl_strRepeat(self.GO_UP_EVAL, offset) + '[\'' + index + '\']';

			var result = {};

			result.snippet = t_replace(pattern, source.path, path, indexerPath);
			result.snippet = self.keyInjectString(result.snippet, offset + 1);
			result.snippet = ARG_PARAMS + tpl_strRepeat(self.GO_UP_EVAL, offset) + '.isArray ? ' +
							 result.snippet + ' : ' +
							 ARG_PARAMS + tpl_strRepeat(self.GO_UP_EVAL, offset) + '[\'' + index + '\']';

			source.connector = indexConnector;
			source.offset = offset;
			result.listener = source;

			return result;
		};

		compilers.index.static = function (path, offest) {
			var data = compilers.index.dynamic(path, offest);

			delete data.listener;

			return data;
		};

		return self;
	})();

	var Worker = (function () {
		var self = {};

		self.fn = {};

		self.fn.unfreezeProcess = true;

		self.fn.improve = function (/* name */) {
			throw new Error('This method must be overrided');
		};

		self.fn.useWorker = function (worker) {
			return worker.call(this.data, this.params);
		};

		self.fn.useRule = function (rule) {
			return this.useWorker(rule.worker);
		};

		self.fn.findRule = function (group) {
			var i, len, rules = this.fragment.rules;

			for (i = 0, len = rules.length; i < len; i++) {
				if (rules[i].group === group) {
					return rules[i];
				}
			}

			return null;
		};

		self.fn.filterRules = function (group) {
			var i, len, result = [],
				rules = this.fragment.rules;

			for (i = 0, len = rules.length; i < len; i++) {
				rules[i].group === group && result.push(rules[i]);
			}

			return result;
		};

		self.fn.rematch = function () {}; // TODO

		self.fn.toggleFreeze = function (state) {
			var i, len, _i, _len,
				listener, path, event;

			var method = state ? 'off' : 'on',
				rules = this.fragment.rules;

			for (i = 0, len = rules.length; i < len; i++) {
				for (_i = 0, _len = rules[i].listeners.length; _i < _len; _i++) {
					listener = rules[i].listeners[_i];

					path = Compile.keyInjectScript(listener.attr, listener.offset, this.params);

					for (event in listener.connector) {
						if (_hasOwnProperty.call(listener.connector, event)) {
							this.data[listener.path][method](event, path, this.listeners[listener.connector[event]]);
						}
					}
				}
			}

			!state && this.unfreezeProcess && this.process();
		};

		self.fn.freeze   = function () { this.toggleFreeze(true);  };
		self.fn.unfreeze = function () { this.toggleFreeze(false); };

		return self;
	})();

	var Statement = (function () {
		var Statement = function Statement (fragment, placeholder, data, params) {
			this.data = data;
			this.fragment = fragment;
			this.params = params;
			this.listeners = [];

			this.improve();

			this.init(placeholder);

			placeholder.parentNode.removeChild(placeholder);

			!this.unfreezeProcess && this.process();
		};

		Statement.fn = Statement.prototype = t_extend({}, Worker.fn);

		Statement.fn.constructor = Statement;

		Statement.fn.improve = function () {
			t_extend(this, Helpers.blocks.get(this.fragment.name).fn);
		};

		return Statement;
	})();

	var AttributesList = (function () {
		var AttributesList = function AttributesList (fragment, element, data, params) {
			this.fragment = fragment;
			this.element = element;
			this.data = data;
			this.params = params;

			this.createAttributes();

			this.element.removeAttribute(Parser.PLACEHOLDER_ATTR);
		};

		AttributesList.fn = AttributesList.prototype = {};

		AttributesList.fn.constructor = AttributesList;

		AttributesList.fn.createAttributes = function () {
			var i, len, child, attribute;

			this.attributes = [];

			for (i = 0, len = this.fragment.childs.length; i < len; i++) {
				child = this.fragment.childs[i];

				attribute = new Attribute(child, this.element, this.data, this.params);

				this.attributes.push(attribute);
			}
		};

		AttributesList.fn.toggleFreeze = function (state) {
			var i, len;

			for (i = 0, len = this.attributes.length; i < len; i++) {
				this.attributes[i].toggleFreeze(state);
			}
		};

		AttributesList.fn.freeze   = function () { this.toggleFreeze(true);  };
		AttributesList.fn.unfreeze = function () { this.toggleFreeze(false); };

		return AttributesList;
	})();

	var Attribute = (function () {
		var Attribute = function Attribute (fragment, element, data, params) {
			this.fragment = fragment;
			this.element = element;
			this.data = data;
			this.params = params;
			this.listeners = [];

			this.improve();

			this.init(this.element);

			!this.unfreezeProcess && this.process();
		};

		Attribute.fn = Attribute.prototype = t_extend({}, Worker.fn);

		Attribute.fn.constructor = Attribute;

		Attribute.fn.improve = function () {
			var name = Helpers.attributes.check(this.fragment.name) ? this.fragment.name : DEFAULT_ATTRIBUTE_HELPER_NAME;

			t_extend(this, Helpers.attributes.get(name).fn);
		};

		return Attribute;
	})();



	(function (blocks) {
		blocks.register(DEFAULT_BLOCK_HELPER_NAME, {
			compile: EMPTY_FUNCTION
		});
	})(Helpers.blocks);

	(function (blocks) {
		var worker = {};
		var connector = {change: 'change'};

		var listenerChange = function () {
			this.process();
		};

		worker.compile = function (fragment) {
			Compile(fragment, fragment.rule, 'main', connector, 'string');
		};

		worker.fn = {};

		worker.fn.init = function (placeholder) {
			this.target = doc.createTextNode('');

			tpl_replaceNode(placeholder, this.target);

			this.listeners.change = t_sbind(listenerChange, this);
		};

		worker.fn.process = function () {
			var text = this.useRule(this.findRule('main'));

			this.target.textContent = text !== undefined ? text : '';
		};

		blocks.register('print', worker);
	})(Helpers.blocks);

	(function (blocks, SubDOM, Statement) {
		var worker = {};

		var connector = {change: 'change'};

		var listenerChange = function () {
			this.process();
		};

		worker.compile = function (fragment) {
			var i, len, subs = fragment.split('elseif', 'else');

			for (i = 0, len = subs.length; i < len; i++) {
				if (subs[i].rule) {
					Compile(fragment, subs[i].rule, 'main', connector);
				}
				else {
					Compile.createEmpty(fragment, 'main');
				}
			}
		};

		worker.fn = {};

		worker.fn.init = function (placeholder) {
			this.active = null;
			this.subDom = null;

			this.placeholder = tpl_createPlaceholder('if');

			tpl_replaceNode(placeholder, this.placeholder);

			this.listeners.change = t_sbind(listenerChange, this);
		};

		worker.fn.process = function () {
			var rules = this.filterRules('main');

			for (var i = 0, len = rules.length; i < len; i++) {
				if (!rules[i].worker || this.useRule(rules[i])) {
					if (this.active === i) {
						return this.subDom.isFrozen && this.subDom.show(this.placeholder, 'after');
					}

					this.active !== null && this.subDom.hide();

					this.subDom = new SubDOM(this.fragment.subFragments[i], this.data, this.params);

					this.subDom.show(this.placeholder, 'after');

					this.active = i;

					return;
				}
			}

			if (this.active === null) {
				return;
			}

			this.subDom.hide();
		};

		worker.fn.freeze = function () {
			this.active !== null && this.subDom.hide();

			Statement.fn.freeze.call(this);
		};

		blocks.register('if', worker);
	})(Helpers.blocks, SubDOM, Statement);

	(function (blocks) {
		var worker = {};

		var connector = {change: 'change', splice: 'splice', sort: 'sort'};

		var reg = /(\{[\w\.\-#~]+\}) as (?:([\w\-]+),\s?)?([\w\-]+)/;

		var listenerChange = function (davent) {
			if (davent.eventPath !== davent.path) {
				return;
			}

			this.list.clean();
			this.process();
		};

		var listenerSplice = function (davent) {
			if (davent.eventPath !== davent.path) {
				return;
			}

			var name, source, params, path_name,
				cur = davent.cur;

			var modifier = this.fragment.modifier;

			this.list.remove(davent.from, davent.removed);

			source = Compile.getSource(modifier, this.params);

			for (name in cur) {
				if (!_hasOwnProperty.call(cur, name)) {
					continue;
				}

				name = +name;

				path_name = this.data[source.path]._getStaticKey(source.attr, name);

				params = {};

				params['..'] = this.params;
				params.isArray = true;
				params[modifier['@name']] = path_name;
				params['listen_' + modifier['@name']] = '{' + path_name + '}';

				this.list.insert(name, this.list.create(params));
			}
		};

		var listenerSort = function (davent) {
			if (davent.eventPath !== davent.path) {
				return;
			}

			this.list.sort(davent.map);
			this.list.show();
		};

		worker.compile = function (fragment) {
			var match = reg.exec(fragment.rule);

			if (!match) {
				throw new Error("TPL: Invalid rule passed into each statement.\nExpect: {target} as key, value");
			}

			Compile(fragment, match[1], 'main', connector);

			var modifier = {};

			var source = match[1];

			source = Compile.unWrapp(source);
			source = Compile.removeUnbind(source);

			modifier['@name'] = match[2] || 'index';
			modifier['@value'] = match[3];
			modifier['@source'] = source;
			modifier['@path'] = source + a_delimeter + '<%' + 'listen_' + modifier['@name'] + '%>';
			
			fragment.modifier = modifier;
		};

		worker.fn = {};

		worker.fn.unfreezeProcess = false;

		worker.fn.init = function (placeholder) {
			this.placeholder = tpl_createPlaceholder('each');

			tpl_replaceNode(placeholder, this.placeholder);

			this.list = new LiveList(this.fragment, this.placeholder, this.data);

			t_extend(this.listeners, {
				change : t_sbind(listenerChange, this),
				splice : t_sbind(listenerSplice, this),
				sort   : t_sbind(listenerSort, this)
			});
		};

		var fileProperties = 'name lastModified lastModifiedDate size type'; // hack for ie and ff

		worker.fn.process = function () {
			var name, params, path_name, insert,
				list = this.useRule(this.findRule('main'));

			var isArray = _isArray(list);

			var modifier = this.fragment.modifier;

			var source = Compile.getSource(modifier, this.params);

			for (name in list) {
				if (_hasOwnProperty.call(list, name) || list instanceof global.File && fileProperties.indexOf(name) !== -1) {
					if (isArray) {
						path_name = this.data[source.path]._getStaticKey(source.attr, name);
						insert = '{' + path_name + '}';
					}
					else {
						path_name = insert = name;
					}

					params = {};

					params['..'] = this.params;
					params.isArray = isArray;
					params[modifier['@name']] = path_name;
					params['listen_' + modifier['@name']] = insert;

					this.list.push(params);
				}
			}
		};

		worker.fn.freeze = function () {
			Statement.fn.freeze.call(this);
			this.list.hide();
		};

		worker.fn.unfreeze = function () {
			Statement.fn.unfreeze.call(this);
			this.list.show();
		};

		blocks.register('each', worker);
	})(Helpers.blocks);



	(function (attributes) {
		var worker = {};

		var connector = {change: 'change'};

		var listenerChange = function () {
			this.process();
		};

		worker.compile = function (fragment) {
			Compile(fragment, fragment.rule, 'main', connector);
		};

		worker.fn = {};

		worker.fn.init = function () {
			this.listeners.change = t_sbind(listenerChange, this);
		};

		worker.fn.process = function () {
			this.element.setAttribute(this.fragment.name, this.useRule(this.findRule('main')));
		};

		attributes.register(DEFAULT_ATTRIBUTE_HELPER_NAME, worker);
	})(Helpers.attributes);

	(function (attributes) {
		var worker = {};

		var connector = {change: 'change'};

		var listenerChange = function () {
			this.process();
		};

		worker.compile = function (fragment) {
			Compile(fragment, fragment.rule, 'main', connector);

			fragment.defaultClasses = [];

			var i, len, classes = (fragment.parent.element.getAttribute('class') || '').split(' ');

			for (i = 0, len = classes.length; i < len; i++) {
				classes[i].length && fragment.defaultClasses.push(classes[i]);
			}
		};

		worker.fn = {};

		worker.fn.init = function () {
			this.activeClasses = [];

			this.$element = jQuery(this.element);

			this.listeners.change = t_sbind(listenerChange, this);
		};

		worker.fn.process = function () {
			var i, len,
				rule = this.findRule('main'),
				remove = [], add = [],
				classes = (this.useRule(rule) || '').split(' ');

			for (i = 0, len = classes.length; i < len; i++) {
				if (_.indexOf(this.activeClasses, classes[i]) === -1 && _.indexOf(this.fragment.defaultClasses, classes[i]) === -1) {
					add.push(classes[i]);
				}
			}

			for (i = 0, len = this.activeClasses.length; i < len; i++) {
				if (_.indexOf(classes, this.activeClasses[i]) === -1 && _.indexOf(this.fragment.defaultClasses, this.activeClasses[i]) === -1) {
					remove.push(this.activeClasses[i]);
				}
			}

			this.activeClasses = classes;

			this.$element.removeClass(remove.join(' ')).addClass(add.join(' '));
		};

		attributes.register('class', worker);
	})(Helpers.attributes);

	(function (attributes) {
		var CROSS_PREFIX = 'pointer-';

		var CROSS_EVENTS = {};

		CROSS_EVENTS[CROSS_PREFIX + 'down'] = ['mousedown', 'touchstart'];
		CROSS_EVENTS[CROSS_PREFIX + 'move'] = ['mousemove', 'touchmove'];
		CROSS_EVENTS[CROSS_PREFIX + 'up']   = ['mouseup', 'touchend'];

		var getCrossEvents = function (name) {
			return CROSS_EVENTS[name];
		};

		var isCross = function (name) {
			return name.indexOf(CROSS_PREFIX) === 0;
		};

		var names = [
			'click', 'mousedown', 'mouseup', 'mouseover', 'mousemove', 'mouseout', 'mouseenter', 'mouseleave',
			'touchstart', 'touchend', 'touchcancel', 'touchleave', 'touchmove',
			CROSS_PREFIX + 'down', CROSS_PREFIX + 'up', CROSS_PREFIX + 'move',
			'keydown', 'keyup', 'keypress',
			'load', 'unload', 'abort', 'error', 'select', 'input', 'change', 'submit', 'reset', 'focus', 'blur', 'resize', 'scroll'
		];

		var worker = {};

		var connector = {change: 'change'};

		var listenerChange = function (davent) {
			var ifo = _isFunction(davent.old),
				ifc = _isFunction(davent.cur);

			for (var i = 0, len = this.fragment.events.length; i < len; i++) {
				ifo && this.$element.off(this.fragment.events[i], davent.old);
				ifc && this.$element.on(this.fragment.events[i], davent.cur);
			}
		};

		worker.compile = function (fragment) {
			fragment.events = isCross(fragment.name) ? getCrossEvents(fragment.name) : [fragment.name];

			Compile(fragment, fragment.rule, 'main', connector, 'array');
		};

		worker.fn = {};

		worker.fn.init = function () {
			this.$element = jQuery(this.element);

			this.listeners.change = t_sbind(listenerChange, this);
		};

		worker.fn.process = EMPTY_FUNCTION;

		worker.fn.switcher = function (mode) {
			var i, len, _i, _len;

			var actions = this.useRule(this.findRule('main'));

			mode = mode ? 'off': 'on';

			for (i = 0, len = this.fragment.events.length; i < len; i++) {
				for (_i = 0, _len = actions.length; _i < _len; _i++) {
					this.$element[mode](this.fragment.events[i], actions[_i]);
				}
			}
		};

		worker.fn.toggleFreeze = function (state) {
			this.switcher(state);

			Worker.fn.toggleFreeze.apply(this, arguments);
		};

		for (var i = 0, len = names.length; i < len; i++) {
			attributes.register(names[i], worker);
		}
	})(Helpers.attributes);

	(function (attributes) {
		var getSource = function (rule) {
			rule = Compile.unWrapp(rule);

			return tpl_parsePath(rule);
		};

		var extensions = {};

		extensions.text = {
			events: ['change', 'keyup', 'keypress', 'input'],
			process: function () {
				var value = this.useRule(this.findRule('main'));
				this.element.value = value !== undefined ? value : '';
			},
			handler: function () {
				var source = getSource(this.fragment.rule);

				this.data[source.path].set(source.attr, this.element.value);
			},
			listener: function (davent) {
				if (this.element.value === davent.cur) {
					return;
				}

				this.element.value = davent.cur !== undefined ? davent.cur : '';
				this.$element.trigger('change');
			}
		};

		extensions.checkbox = {
			events: ['change'],
			process: function () {
				this.$element.prop('checked', this.useRule(this.findRule('main')));
			},
			handler: function () {
				var value = this.$element.prop('checked');
				var source = getSource(this.fragment.rule);

				this.data[source.path].set(source.attr, value);
			},
			listener: function (davent) {
				if (this.$element.prop('checked') === davent.cur) {
					return;
				}

				this.$element.prop('checked', davent.cur);

				this.$element.trigger('change');
			}
		};

		extensions.radio = {
			events: ['change'],
			process: function () {
				var value = this.useRule(this.findRule('main'));

				if (this.element.value === value.toString()) {
					this.$element.prop('checked', true);
				}
			},
			handler: function () {
				var isChecked = this.$element.prop('checked');

				if (!isChecked) {
					return;
				}

				var value = this.element.value;
				var source = getSource(this.fragment.rule);

				this.data[source.path].set(source.attr, value);
			},
			listener: function (davent) {
				var value = this.element.value;

				if (value !== davent.cur.toString() || this.$element.prop('checked')) {
					return;
				}

				this.$element.prop('checked', true);

				this.$element.trigger('change');
			}
		};

		extensions.range = {
			events: ['change', 'input'],
			process: function () {
				this.element.value = this.useRule(this.findRule('main'));
			},
			handler: function () {
				var value = this.element.value;
				var source = getSource(this.fragment.rule);

				this.data[source.path].set(source.attr, value);
			},
			listener: function (davent) {
				if (this.element.value === davent.cur) {
					return;
				}

				this.element.value = davent.cur;

				this.$element.trigger('change');
			}
		};

		extensions.select = {
			events: ['change'],
			process: function () {
				this.$element.val(this.useRule(this.findRule('main')));
			},
			handler: function () {
				var value = this.$element.val();
				var source = getSource(this.fragment.rule);

				this.data[source.path].set(source.attr, value);
			},
			listener: function (davent) {
				var value = this.$element.val();

				if (_isArray(value) && !_difference(value, davent.cur).length || this.element.value === davent.cur) {
					return;
				}

				this.$element.val(davent.cur).trigger('change');
			}
		};

		extensions.file = {
			events: ['change'],
			process: EMPTY_FUNCTION,
			handler: function () {
				var value = this.element.files.length ? this.element.files[0] : null;
				var source = getSource(this.fragment.rule);

				this.data[source.path].set(source.attr, value);
			},
			listener: EMPTY_FUNCTION
		};

		extensions['multi-file'] = {
			events: ['change'],
			process: EMPTY_FUNCTION,
			handler: function () {
				var value = _slice.call(this.element.files);
				var source = getSource(this.fragment.rule);

				this.data[source.path].set(source.attr, value);
			},
			listener: EMPTY_FUNCTION
		};

		extensions.ignore = {
			events: [],
			process: EMPTY_FUNCTION,
			handler: EMPTY_FUNCTION,
			listener: EMPTY_FUNCTION
		};

		// tags: select multi-select textarea
		// text: date datetime datetime-local email color month number password search tel text time url week

		var typeDifferent = ['checkbox', 'file', 'multi-file', 'radio', 'range'];
		var typeIgnore = ['button',  'hidden', 'image', 'reset', 'submit'];

		var defineType = function (element) {
			var type;

			switch (element.name) {
				case 'textarea':
					return 'text';
				case 'select':
					return 'select';
				case 'input':
					type = element.getAttribute('type') || 'text';

					if (type === 'file' && element.getAttribute('multiple') !== undefined) {
						return 'multi-file';
					}
					if (_indexOf(typeIgnore, type) !== -1) {
						return 'ignore';
					}
					if (_indexOf(typeDifferent, type) === -1) {
						return 'text';
					}
					return type;
			}
		};

		var worker = {};

		var connector = {change: 'change'};

		worker.compile = function (fragment) {
			fragment.type = defineType(fragment.parent.element);

			Compile(fragment, fragment.rule, 'main', connector);
		};

		worker.fn = {};

		worker.fn.init = function () {
			this.$element = jQuery(this.element);

			t_extend(this, extensions[this.fragment.type]);

			this.handler = t_sbind(this.handler, this);
			this.listeners.change = t_sbind(this.listener, this);
		};

		worker.fn.process = EMPTY_FUNCTION;

		worker.fn.switcher = function (mode) {
			mode = mode ? 'off' : 'on';

			for (var i = 0, len = this.events.length; i < len; i++) {
				this.$element[mode](this.events[i], this.handler);
			}
		};

		worker.fn.toggleFreeze = function (state) {
			this.switcher(state);

			Worker.fn.toggleFreeze.apply(this, arguments);
		};

		attributes.register('bind-value', worker);
	})(Helpers.attributes);



	TPL.Fragment = Fragment;

	TPL.version = version;

	global.TPL = Ai.TPL = TPL;

})(window, document, jQuery, _, Anthill);
