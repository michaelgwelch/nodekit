# nodekit

[![CircleCI](https://circleci.com/gh/metasys-server/nodekit.svg?style=svg)](https://circleci.com/gh/metasys-server/nodekit)

Metasys® Server REST API client for node.js

This library is used to consume the Metasys Server API. It currently supports V1 of the Metasys® Server API.

See [Documentation](https://metasys-server.github.io/nodekit) for more information.

## Installation

```bash
npm install @metasys/nodekit
```

## Usage

The following example will log into the server, and fetch and print each alarm with a priority in
the range of 0 to 10.

```javascript
const { MetasysServerApi } = require('@metasys/nodekit');

async function main() {
  const api = new MetasysServerApi();
  await api.login('user', 'pass', 'host');

  const alarms = await api.alarms({ priorityRange: '0,10' });
  for await (const alarm of alarms) {
    console.log(JSON.stringify(alarm, null, 2));
  }
}

main();
```

## Client Options

This library depends on [request](https://github.com/request/request#tlsssl-protocol). You can pass an `options` argument as defined by `request` as the fourth parameter
of the `login` method for any special options you need. These will be used on every future call made by the api.

For example, if you are using a self signed certificate on your Metasys Server, then the
calls to the API may fail with certificate errors if your machine is not setup to trust
the self-signed certificate.

The easiest way to handle this is to get the cert in a `.pem` format and then specify that certificate in your login method:

```javascript
const fs = require('fs')
const ca = fs.readFileSync('./path/to/cert.pem');
const api = require('@metasys/nodekit');

async main() {
  await api.login('user', 'pass', 'host', { ca });
}

main()
```

See [request](https://github.com/request/request#tlsssl-protocol) for more options.
