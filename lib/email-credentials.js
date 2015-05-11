'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var xoauth2 = require('xoauth2');
var moment = require('moment');

function EmailCredentialsResource() {
    // just a placeholder
}

EmailCredentialsResource.opts = {

    type: 'oauth', // must be either 'oauth' or 'credentials'

    oauth: {
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        accessToken: '',
        user: '',
        accessUrl: 'https://accounts.google.com/o/oauth2/token'
    },

    credentials: {
        user: '',
        pass: ''
    },

    cache: {
        maxAge: 60 * 60 * 1000 // 1 hour
    }
};

EmailCredentialsResource.prototype.create = function (resourceId, options) {
    var promise = Promise.bind(this);
    var resource = this._cache.get(resourceId);

    // get credentials data
    var opts = this._opts;
    var type = options.type || opts.type;
    var expectedInformation = opts[type];
    var credentialsData = _.extend({}, expectedInformation, options.credentials);

    _.each(credentialsData, function (value, key) {
        if (!value) {
            promise = promise.then(function () {
                throw new Error(key + ' is set to falsy value: `' + value + '`');
            });
        }
    });

    if (promise.isRejected()) {
        return promise;
    }

    if (!resource) {
        switch (type) {
            case 'oauth':
                resource = this._createOAuth(credentialsData);
                break;

            case 'credentials':
                resource = this._createCredentials(credentialsData);
                break;

            default:
                return promise.reject(new Error('authentication type ' + String(type) + 'not supported'));
        }

        promise = promise.then(function () {
            return this.cache(resourceId, resource);
        });
    } else {
        promise = promise.then(function () {
            return this.update(resource, type, credentialsData);
        });
    }

    return promise.then(function (resource) {
        return this.get(resource, type);
    });
};

EmailCredentialsResource.prototype.get = function (resourceOrId, type) {
    if (typeof resourceOrId === 'string') {
        resourceOrId = this._cache.get(resourceOrId);
    }

    switch (type) {
        case 'credentials':
            return Promise.resolve(resourceOrId);

        case 'oauth':
            if (resourceOrId.token && (!resourceOrId.timeout || resourceOrId.timeout > moment().add(5, 'minute')).valueOf()) {
                return Promise.resolve(resourceOrId.token);
            }

            return Promise.fromNode(function (next) {
                resourceOrId.generateToken(next);
            });

        default:
            return Promise.reject(new Error('authentication type ' + String(type) + 'not supported'));
    }
};

EmailCredentialsResource.prototype._createOAuth = function (credentialsData) {
    var opts = _.pick(credentialsData, [ 'user', 'accessUrl', 'clientId', 'clientSecret', 'refreshToken', 'accessToken' ]);
    return {
        instance: xoauth2.createXOAuth2Generator(opts),
        type: 'oauth'
    };
};

EmailCredentialsResource.prototype._createCredentials = function (credentialsData) {
    return {
        instance: _.pick(credentialsData, ['user', 'pass']),
        type: 'credentials'
    };
};

EmailCredentialsResource.prototype.update = function (resource, type, credentialsData) {
    switch (type) {
        case 'oauth':
            resource = resource.instance;
            resource.timeout = Date.now();
            resource.token = false;
            resource.accessToken = false;
            resource.options.refreshToken = credentialsData.refreshToken;
            break;

        case 'credentials':
            _.extend(resource.instance, _.pick(credentialsData, ['user', 'pass']));
            break;

        default:
            return Promise.reject(new Error('authentication type ' + String(type) + 'not supported'));
    }

    return Promise.return(resource);
};

EmailCredentialsResource.prototype.close = function () {
    this._cache.reset();
    return Promise.resolve();
};

EmailCredentialsResource.prototype.deserialize = function (resourceId, resourceData) {
    return this.create(resourceId, resourceData);
};

EmailCredentialsResource.prototype.serialize = function (resource) {
    var type = resource.type;
    var instance = resource.instance;

    if (type === 'oauth') {
        return {
            type: type,
            credentials: {
                refreshToken: instance.options.refreshToken,
                accessUrl: instance.options.accessUrl,
                accessToken: instance.accessToken,
                user: instance.options.user
            }
        };
    } else {
        return {
            type: type,
            credentials: instance
        };
    }
};

module.exports = function (opts) {
    return {
        opts: _.extend({}, EmailCredentialsResource.opts, opts),
        prototype: EmailCredentialsResource.prototype
    };
};
