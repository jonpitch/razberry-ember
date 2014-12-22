App.Router.map(function () {
	
	// resources

});

App.ApplicationRoute = Ember.Route.extend({

	model: function (params) {
		// find any devices - likely none on app launch
		var devices = this.get('store').all('device');
		App.set('devices', devices);
		return devices;
	}

});
