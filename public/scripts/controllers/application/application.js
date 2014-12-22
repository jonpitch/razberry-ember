App.ApplicationController = Ember.Controller.extend({
	
	
});

App.DeviceItemController = Ember.ObjectController.extend({
	
	// the current level of the device - updates view automatically
	binaryLevel: function () {
		var device = this.get('model');
		return device.get('level') === 'off' ? false : true;
	}.property('clock.second'),

	// item actions
	actions: {

		// set level for device
		setLevel: function () {
			var device = this.get('model'),
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