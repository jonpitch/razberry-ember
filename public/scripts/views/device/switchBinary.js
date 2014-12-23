App.SwitchBinaryView = Ember.View.extend({
	
	templateName: 'switchBinary',

	didInsertElement: function () {
		this.$().attr('id', this.get('content').get('deviceId'));
	},

	actions: {

		// set level for device
		setLevel: function () {
			var device = this.get('content'),
				host = App.get('host'),
				endpoint = '/ZAutomation/api/v1/devices/' + device.get('deviceId') + '/command/',
				command = null;

			// toggle device - depending on type
			if (device.get('deviceType') === 'switchBinary') {
				command = device.get('level') === 'off' ? 'on' : 'off';
				Ember.$.getJSON(host + endpoint + command).then(function (response) {
					device.set('level', command);
				});
			}
		}

	}

});