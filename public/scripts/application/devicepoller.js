/*
 * A running task that will determine the state of the network
 */
App.DevicePoller = Ember.Object.extend({

	// the task being run
	timer: null,
	
	// the data store
	store: null,

	// last updated
	since: null,
	
	// Time between polls (milliseconds)
	interval: function () {
		return 1000;
	}.property().readOnly(),
	
	// Schedule function to be executed at interval
	schedule: function (f) {
		return Ember.run.later(this, function () {
			f.apply(this);
			this.set('timer', this.schedule(f));
		}, this.get('interval'));
	},
	
	// Stop polling
	stop: function () {
		Ember.run.cancel(this.get('timer'));
	},
	
	// Start polling
	start: function () {
		this.set('timer', this.schedule(this.get('onPoll')));
	},
	
	// helper to determine if the poller is active
	isRunning: function () {
		return !Ember.isEmpty(this.get('timer'));
	},
	
	// Issue request on polling interval
	onPoll: function () {
		var self = this,
			store = self.get('store'),
			since = moment().unix(),
			host = App.get('host'),
			endpoint = '/ZAutomation/api/v1/devices?limit=0',
			url = null,
			devices = store.all('device'),
			device = null;

		// build url
		url = host + endpoint;
		if (!Ember.isEmpty(self.get('since'))) {
			url += '&since=' + self.get('since');
		}

		// poll network for device(s)
		Ember.$.getJSON(url).then(function (response) {
			self.set('since', since);
			if (response.code === 200) {
				// update network
				response.data.devices.forEach(function (d) {
					device = devices.filterBy('deviceId', d.id);
					if (Ember.isEmpty(device)) {
						// create new device
						store.createRecord('device', {
							deviceType: d.deviceType,
							deviceId: d.id,
							location: d.location,
							level: d.metrics.level,
							title: d.metrics.title
						});
					} else {
						// update device
						device.set('level', d.metrics.level);
					}
				});
			} else {
				// TODO notify user of error
			}
		});
	}
	
});