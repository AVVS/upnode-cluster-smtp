'use strict';

var Promise = require('bluebird');
var _ = require('lodash');
var Errors = require('node-common-errors');
var nodemailer = require('nodemailer');
var smtpPool = require('nodemailer-smtp-pool');
var wellknown = require('nodemailer-wellknown');
var assert = require('assert');
var validator = require('validator');

var default_opts = {

    prepareEmail: function () {
        // default noop, it must operate
        // on passed-in object
    },

    cache: {
        dispose: function (account, connection) {
            connection.close();
        },
        maxAge: 10 * 60 * 1000 // 10 minutes
    }

};

var prototype = {

    create: function create(resourceId, options) {

        return Promise
            .bind(this)
            .then(function assertPassedOptions() {

                // extract provider
                var provider = options.provider;
                assert.ok(provider, 'You must specify options.provider');

                var connectionOptions = wellknown(provider);
                assert.ok(connectionOptions, 'Provider ' + provider + ' is not known. Please update nodemailer-wellknown module');

                var user = options.user;
                assert.ok(validator.isEmail(user), user + ' must be a valid email');

                return _.extend(connectionOptions, {
                    maxConnections: 2,
                    maxMessages: 100,
                    auth: {
                        user: user
                    }
                });

            })
            .then(function extractCredentials(connectionOptions) {

                var user = options.user;
                var type = options.type;
                var credentials = options.credentials;

                if (['oauth', 'credentials'].indexOf(type) === -1) {
                    throw new Errors.BadRequest('type must be one of the oauth or credentials');
                }

                assert.ok(credentials, 'credentials must be specified');

                if (type === 'credentials') {
                    connectionOptions.auth.pass = credentials.pass;
                    assert.ok(connectionOptions.auth.pass, 'password must be specified');
                    return connectionOptions;
                }

                return this.acquireResource(user, 'email-credentials-' + options.provider, credentials)
                            .then(function (accessToken) {
                                connectionOptions.auth.xoauth2 = accessToken;
                                return connectionOptions;
                            });
            })
            .then(this._getConnection)
            .then(this.cache)
            .return(this.get);
    },

    _getConnection: function (nodemailerOpts) {
        var connection = this._cache.get(nodemailerOpts.auth.user);
        if (!connection) {
            connection = nodemailer.createTransport(smtpPool(nodemailerOpts));
        } else {
            connection.auth = nodemailerOpts.auth.user;
        }

        return connection;
    },

    get: function get(resourceOrId) {
        if (typeof resourceOrId === 'string') {
            resourceOrId = this._cache.get(resourceOrId);
        }

        if (!resourceOrId) {
            return Promise.reject(new Errors.NotFound('Resource ' + this.name + ' not found on node ' + this.node.server.id));
        }

        return Promise.resolve(this.node.server.id);
    },

    invoke: function invoke(resourceId, email) {
        var connection = this._cache.get(resourceId);
        if (!connection) {
            return Promise.reject(new Errors.NotFound('Connection for user ' + resourceId + ' does not exist on node ' + this.node.server.id));
        }

        return Promise
            .resolve(email)
            .bind(this)
            .tap(this._opts.prepareEmail)
            .then(function (preparedEmail) {
                return Promise.fromNode(function (next) {
                    connection.sendMail(preparedEmail, next);
                });
            });
    }

};

module.exports = function (opts) {

    return {
        opts: _.extend({}, default_opts, opts),
        prototype: prototype
    };

};
