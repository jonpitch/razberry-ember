App.DeviceItemController = Ember.ObjectController.extend({
	
	// the current level of the device - updates view automatically
	binaryLevel: function () {
		var device = this.get('model');
		return device.get('level') === 'off' ? false : true;
	}.property('clock.second')
	
});