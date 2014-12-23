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

App.Device = DS.Model.extend({
	
	// type of ZWave device (e.g. binarySwitch, switchMultilevel, etc.)
	deviceType: DS.attr('string'),

	// string ID from network
	deviceId: DS.attr('string'),

	// where the device is located
	location: DS.attr('string'),

	// the status of the device, binary switches "on" or "off", multilevel #, etc.
	level: DS.attr('string'),

	// A user friendly name
	title: DS.attr('string'),

	// is the device a binary switch?
	isBinarySwitch: function () {
		return this.get('deviceType') === 'switchBinary';
	}.property('deviceType'),

	// is the device a multi-level switch?
	isMultilevelSwitch: function () {
		return this.get('deviceType') === 'switchMultilevel';
	}.property('deviceType')
});
App.ApplicationController = Ember.Controller.extend({
	
	
});
App.DeviceItemController = Ember.ObjectController.extend({
	
	// the current level of the device - updates view automatically
	binaryLevel: function () {
		var device = this.get('model');
		return device.get('level') === 'off' ? false : true;
	}.property('clock.second')
	
});
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
Ember.TEMPLATES["application"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1;


  data.buffer.push("<div class=\"container-full\">\n	<div class=\"container-outlet\">\n		");
  stack1 = helpers._triageMustache.call(depth0, "outlet", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n	</div>\n</div>");
  return buffer;
  
});

Ember.TEMPLATES["switchBinary"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1, escapeExpression=this.escapeExpression;


  data.buffer.push("<div class=\"panel panel-default\">\n  	<div class=\"panel-heading\">\n    	<h3 class=\"panel-title\">");
  stack1 = helpers._triageMustache.call(depth0, "device.title", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</h3>\n  	</div>\n  	<div class=\"panel-body\">\n    	<button type=\"button\" ");
  data.buffer.push(escapeExpression(helpers['bind-attr'].call(depth0, {hash:{
    'class': (":btn :btn-default device.binaryLevel:btn-primary")
  },hashTypes:{'class': "STRING"},hashContexts:{'class': depth0},contexts:[],types:[],data:data})));
  data.buffer.push(" ");
  data.buffer.push(escapeExpression(helpers.action.call(depth0, "setLevel", "device", {hash:{
    'target': ("view")
  },hashTypes:{'target': "STRING"},hashContexts:{'target': depth0},contexts:[depth0,depth0],types:["STRING","ID"],data:data})));
  data.buffer.push(">");
  stack1 = helpers._triageMustache.call(depth0, "device.level", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</button>\n  	</div>\n</div>");
  return buffer;
  
});

Ember.TEMPLATES["switchMultilevel"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var buffer = '', stack1;


  data.buffer.push("<div class=\"panel panel-default\">\n  	<div class=\"panel-heading\">\n    	<h3 class=\"panel-title\">Multi - ");
  stack1 = helpers._triageMustache.call(depth0, "device.title", {hash:{},hashTypes:{},hashContexts:{},contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("</h3>\n  	</div>\n  	<div class=\"panel-body\">\n    	<input type=\"text\" class=\"multilevel\" />\n  	</div>\n</div>");
  return buffer;
  
});

Ember.TEMPLATES["index"] = Ember.Handlebars.template(function anonymous(Handlebars,depth0,helpers,partials,data) {
this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Ember.Handlebars.helpers); data = data || {};
  var stack1, escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = '', stack1;
  data.buffer.push("\n\n	");
  stack1 = helpers['if'].call(depth0, "device.isBinarySwitch", {hash:{},hashTypes:{},hashContexts:{},inverse:self.noop,fn:self.program(2, program2, data),contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n\n	");
  stack1 = helpers['if'].call(depth0, "device.isMultilevelSwitch", {hash:{},hashTypes:{},hashContexts:{},inverse:self.noop,fn:self.program(4, program4, data),contexts:[depth0],types:["ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  data.buffer.push("\n\n");
  return buffer;
  }
function program2(depth0,data) {
  
  var buffer = '';
  data.buffer.push("\n		");
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "switchBinary", {hash:{
    'contentBinding': ("device")
  },hashTypes:{'contentBinding': "STRING"},hashContexts:{'contentBinding': depth0},contexts:[depth0],types:["STRING"],data:data})));
  data.buffer.push("\n	");
  return buffer;
  }

function program4(depth0,data) {
  
  var buffer = '';
  data.buffer.push("\n		");
  data.buffer.push(escapeExpression(helpers.view.call(depth0, "switchMultilevel", {hash:{
    'contentBinding': ("device")
  },hashTypes:{'contentBinding': "STRING"},hashContexts:{'contentBinding': depth0},contexts:[depth0],types:["STRING"],data:data})));
  data.buffer.push("\n	");
  return buffer;
  }

  stack1 = helpers.each.call(depth0, "device", "in", "App.devices", {hash:{
    'itemController': ("deviceItem")
  },hashTypes:{'itemController': "STRING"},hashContexts:{'itemController': depth0},inverse:self.noop,fn:self.program(1, program1, data),contexts:[depth0,depth0,depth0],types:["ID","ID","ID"],data:data});
  if(stack1 || stack1 === 0) { data.buffer.push(stack1); }
  else { data.buffer.push(''); }
  
});