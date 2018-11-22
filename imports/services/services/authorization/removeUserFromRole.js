import { Meteor } from 'meteor/meteor';
import { RocketChat } from 'meteor/rocketchat:lib';
import _ from 'underscore';

export default {
	removeUserFromRole: {
		params: {
			uid: 'string',
			username: 'string',
			scope: 'string',
			roleName: 'string',
		},
		async handler(ctx) {
			const { uid, username, scope, roleName } = ctx.params;
			if (!uid || !(await ctx.call('hasPermission', { uid, permission: 'access-permissions' }))) {
				throw new Meteor.Error('error-action-not-allowed', 'Access permissions is not allowed', {
					method: 'authorization:removeUserFromRole',
					action: 'Accessing_permissions',
				});
			}

			if (!roleName || !_.isString(roleName) || !username || !_.isString(username)) {
				throw new Meteor.Error('error-invalid-arguments', 'Invalid arguments', {
					method: 'authorization:removeUserFromRole',
				});
			}

			const user = Meteor.users.findOne({
				username,
			}, {
				fields: {
					_id: 1,
					roles: 1,
				},
			});

			if (!user || !user._id) {
				throw new Meteor.Error('error-invalid-user', 'Invalid user', {
					method: 'authorization:removeUserFromRole',
				});
			}

			// prevent removing last user from admin role
			if (roleName === 'admin') {
				const adminCount = Meteor.users.find({
					roles: {
						$in: ['admin'],
					},
				}).count();

				const userIsAdmin = user.roles.indexOf('admin') > -1;
				if (adminCount === 1 && userIsAdmin) {
					throw new Meteor.Error('error-action-not-allowed', 'Leaving the app without admins is not allowed', {
						method: 'removeUserFromRole',
						action: 'Remove_last_admin',
					});
				}
			}

			const remove = RocketChat.models.Roles.removeUserRoles(user._id, roleName, scope);
			if (RocketChat.settings.get('UI_DisplayRoles')) {
				RocketChat.Notifications.notifyLogged('roles-change', { // TODO remove after hub
					type: 'removed',
					_id: roleName,
					u: {
						_id: user._id,
						username,
					},
					scope,
				});
			}

			return remove;
		},
	},
};
