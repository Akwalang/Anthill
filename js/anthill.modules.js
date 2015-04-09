(function (Ai, _) {

	var _isFunction = _.isFunction;

	var Tools = Ai.Tools;

/*
	Ai('path.AntName', {
		extend: 'Queen',
		require: ['Queen'],
		mixins: ['Attributes', 'Observer'],
		statics: {name: 'value'}
	});
*/
	Ai('GuidFactory', {
		construct: function () {
			var id = 0;

			this.create = function () {
				return id++;
			};
		}
	});

	Ai('Model', {
		mixins: ['Attributes', 'Observer'],

		construct: function (data) {
			this.merge('', this.defaults || {});
			this.merge('', data);

			_isFunction(this.initialize) && this.initialize();
		}
	});

	Ai('View', {
		mixins: ['Observer'],

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

})(Anthill, _);