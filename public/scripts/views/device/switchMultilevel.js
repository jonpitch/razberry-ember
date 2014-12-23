App.SwitchMultilevelView = Ember.View.extend({
	
	templateName: 'switchMultilevel',

	// try and prevent slider from firing too many events
	// TODO use a smaller step or different event binding
	isMakingRequest: false,

	didInsertElement: function () {
		var self = this,
			$input = self.$().find('.multilevel');

		// init slider
		$($input).slider({
			value: this.get('content').get('level'),
			min: 0,
			max: 100
		}).on('slide', function (e) {
			self.send('setLevel', e.value);
		});
	},

	actions: {

		// set switch level
		setLevel: function (level) {
			var self = this,
				device = this.get('content'),
				host = App.get('host'),
				endpoint = '/ZAutomation/api/v1/devices/' + device.get('deviceId') + '/command/exact?level=' + level,
				command = null;

			// toggle device - depending on type
			if (device.get('deviceType') === 'switchMultilevel' && !self.get('isMakingRequest')) {
				self.set('isMakingRequest', true);
				Ember.$.getJSON(host + endpoint).then(function (response) {
					device.set('level', command);
					self.set('isMakingRequest', false);
				});
			}
		}
	}
});