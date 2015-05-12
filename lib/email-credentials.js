'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var xoauth2 = require('xoauth2');
var moment = require('moment');
var Errors = require('node-common-errors');

var default_opts = {

    oauth: {
        clientId: '',
        clientSecret: '',
        refreshToken: '',
        accessToken: '',
        user: '',
        accessUrl: 'https://accounts.google.com/o/oauth2/token'
    },

    cache: {
        maxAge: 60 * 60 * 1000 // 1 hour
    }
};

var prototype = {

    create: function (resourceId, options) {
        var promise = Promise.bind(this);
        var resource = this._cache.get(resourceId);

        // get credentials data
        var opts = this._opts;
        var credentialsData = _.extend({}, opts.oauth, options.credentials);

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
            promise = this.cache(resourceId, this._createOAuth(credentialsData));
        } else {
            promise = this.update(resource, credentialsData);
        }

        return promise.then(this.get);
    },

    get: function (resourceOrId) {
        if (typeof resourceOrId === 'string') {
            resourceOrId = this._cache.get(resourceOrId);
        }

        if (!resourceOrId) {
            return Promise.reject(Errors.NotFound('Resource ' + this.name + ' not found on node ' + this.node.server.id));
        }

        if (resourceOrId.token && (!resourceOrId.timeout || resourceOrId.timeout > moment().add(5, 'minute')).valueOf()) {
            return Promise.resolve(resourceOrId.token);
        }

        return Promise.fromNode(function (next) {
            resourceOrId.generateToken(next);
        });
    },

    _createOAuth: function (credentialsData) {
        var opts = _.pick(credentialsData, [ 'user', 'accessUrl', 'clientId', 'clientSecret', 'refreshToken', 'accessToken' ]);
        return xoauth2.createXOAuth2Generator(opts);
    },

    update: function (resource, credentialsData) {
        resource.timeout = Date.now();
        resource.token = false;
        resource.accessToken = false;
        resource.options.refreshToken = credentialsData.refreshToken;

        return Promise.return(resource);
    }

};

module.exports = function (config) {
    return {
        opts: {
            oauth: _.extend({}, default_opts.oauth, config.oauth || {}),
            cache: _.extend({}, default_opts.cache, config.cache || {}),
        },
        prototype: prototype
    };
};
