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