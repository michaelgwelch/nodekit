# nodekit

Metasys® Server REST API client for node.js

This library is used to consume the Metasys Server API. It currently supports V1 of the Metasys® Server API.

## Installation

```bash
npm install @metasys/nodekit
```

## Usage

```javascript
const { MetasysServerApi } = require('@jci/serverkit');

async main() {
  const api = new MetasysSeverApi();
  await api.login('user', 'pass', 'host');

  const alarms = api.alarms({ priorityRange: '0,120' });
  for await (const alarm in alarms) {
    console.log(JSON.stringify(alarm, null, 2));
  }

  main();
}
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
const api = require('@jci/serverkit');

async main() {
  await api.login('user', 'pass', 'host', { ca });
}

main()
```

See [request](https://github.com/request/request#tlsssl-protocol) for more options.
