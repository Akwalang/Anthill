
Ai('Box.Model', (function () {
	var ext = {};

	ext.extend = 'Model';

	ext.statics = {
		TYPE_INFO: 'info',
		TYPE_SUCCESS: 'success',
		TYPE_WARNING: 'warning',
		TYPE_DANGER: 'danger'
	};

	ext.defaults = {
		type: ext.statics.TYPE_DANGER
	};

	ext.confirm = 'yes';

	var types = [
		ext.statics.TYPE_INFO, 
		ext.statics.TYPE_SUCCESS, 
		ext.statics.TYPE_WARNING, 
		ext.statics.TYPE_DANGER
	];

	ext.changeType = function () {
		var index = _.indexOf(types, this.get('type'));

		index = (index + 1) % types.length;

		this.set('type', types[index]);
	};

	ext.initialize = function () {
		_.bindAll(this, 'changeType');
	};

	return ext;
})());
