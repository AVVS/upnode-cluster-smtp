'use strict';

/**
 * As the system is distributed, we must treat it as such. Because we need to scale
 * linearly, we need to use all the nodes that are in the cluster. Therefore the following
 * approach is proposed: when leader receives request to get a specific resource,
 * it determines whether we already have it in the cache, and if we do, redirects the call
 * to a given node and performs operation there. Otherwise it opens connection on the node,
 * which received the request initially, pushes node id into the state, so that subsequent
 * calls are going through it, and instantiates a timer, which will destroy connection on
 * it's expiration. Furthermore, we must instantiate event listener on the other nodes, that
 * will cleanup cached resources in the event that a worker dies
 */

var emailCredentialsResource = require('./email-credentials.js');
var smtpConnectionResource = require('./smtp-connection.js');
var _ = require('lodash');

module.exports = exports = {
    emailCredentialsResource: emailCredentialsResource,
    smtpConnectionResource: smtpConnectionResource
};

exports.init = function (nodeResources, oauthApplications, prepareEmail) {
    _.each(oauthApplications, function (applicationSettings, resourceType) {
        nodeResources[resourceType] = emailCredentialsResource(applicationSettings);
    });

    nodeResources.SMTP = smtpConnectionResource({ prepareEmail: prepareEmail });

    return nodeResources;
};
