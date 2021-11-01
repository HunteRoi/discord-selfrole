export enum SelfRoleManagerEvents {
	channelRegister = 'channelRegister',
	channelUnregister = 'channelUnregister',

	messageRetrieve = 'messageRetrieve',
	messageCreate = 'messageCreate',
	messageDelete = 'messageDelete',

	roleAdd = 'roleAdd',
	roleRemove = 'roleRemove',

	reactionAdd = 'reactionAdd',
	reactionRemove = 'reactionRemove',
	interaction = 'interaction',

	maxRolesReach = 'maxRolesReach',

	error = 'error',
}
