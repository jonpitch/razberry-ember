// initialize ember application
window.App = Ember.Application.create({
	
	// TODO move in to configuration
	host: 'http://192.168.1.21:8083',

	// all devices on the network
	devices: null
});

// A mechanism to provide live updating views
App.Clock = Ember.Object.extend({
	second: null,
	minute: null,
	hour: null,
	
	init: function () {
		this.tick();
	},
	
	tick: function () {
		var now = new Date(),
			self = this;
		
		this.setProperties({
			second: now.getSeconds(),
			minute: now.getMinutes(),
			hour: now.getHours()
		});
		
		setTimeout(function () {
			self.tick();
		}, 1000);
	}
});

// inject clock mechanism so controllers can bind to it
Ember.Application.initializer({
	name: 'clock',
	initialize: function (container, application) {
		container.optionsForType('clock', { singleton: true });
		container.register('clock:main', App.Clock);
		container.typeInjection('controller', 'clock', 'clock:main');
	}
});

// 
Ember.ControllerMixin.reopen({ clock: null });

// setup device poller
Ember.Application.initializer({
	name: 'devicepoller',
	initialize: function (container, application) {
		var store = container.lookup('store:main'),
			poller = App.DevicePoller.create({
				store: store
			});
		
		poller.start();
	}
});

