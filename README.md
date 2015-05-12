# Upnode cluster smtp extension

Plugin for upnode-cluster, adds methods for handling distributed email messaging

## Install

`npm install upnode-cluster upnode-cluster-smtp -S`

## Usage

```js
var Node = require('upnode-cluster');
var SMTPResources = require('upnode-cluster-smtp');
var resources = {};

SMTPResources.init(resources, {
    gmail_oauth_appid: {
        clientId: '',
        clientSercret: ''
    }
}, function prepareEmail(rawNodemailerOpts) {
    // will be preprocessed on the node locally
});

var node = new Node({
    // ...
    resources: resources
});

// then you can use it

var opts = {
    provider: 'gmail',
    user: 'support@ark.com',
    type: 'oauth',
    credentialsResourceName: 'gmail_oauth_appid',
    credentials: {
        refreshToken: '<refresh token>',
        accessToken: '<access token>'
    }
};

var self = this;
var nodeId = this.node.server.id;
node.acquireResource('email@example.com', 'SMTP', opts).then(function (resourceHolderId) {
    var nodemailerOpts = {}; // whatever nodemailer accepts
    return self.callResource(resourceHolderId, 'email@example.com', 'SMTP', nodemailerOpts);
}).nodeify(function (err, response) {
    // either that or promises
});

```
