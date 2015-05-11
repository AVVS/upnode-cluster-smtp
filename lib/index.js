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

var EmailCredentialsResource = require('./email-credentials.js');
var SMTPConnectionResource = require('./smtp-connection.js');

module.exports = {
    EmailCredentials: EmailCredentialsResource,
    SMTPConnection: SMTPConnectionResource
};
