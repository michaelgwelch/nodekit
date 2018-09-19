<!-- markdownlint-disable first-line-h1 first-header-h1 -->

See the Metasys Server API for the server documentation. This will show you how to make
many of the Server API calls using `serverkit`.

### Authentication

For all of the other examples, it is assumed that you have already imported the module
and logged in as shown in the following example:

```javascript
const _ = require('@jci/serverkit');
const { MetasysServerApi } = _;

async main() {
  const api = new MetasysServerApi();
  await api.login('username', 'password', 'host');
}

main();
```

We choose to write our script in side of an async main method so we can take
advantage of JavaScript's `await/async` feature which simplifies dealing with
asynchronous code.

Everyone of the following examples will assume that they are being written
within an async method like `main`.

### Async Generators

There are many methods on the Server API that return paged collections. The
`serverkit` API provides a simplified mechanism for dealing with these paged collections.
You can use the `for-await` syntax in ES9:

```javascript
const alarms = await api.alarms();
for await(const alarm in alarms) {
  console.log(JSON.stringify(alarm, null, 2));
}
```

**Note:** Every call to an async generator method like `alarms` may result in calls
to the server. If you want to iterate over a collection multiple times you should
cache the results in a regular array:

```javascript
const alarms = await api.alarms();
const cachedAlarms = await _.toArray(alarms);
// cachedAlarms is now a regular array
```

Notice that the `toArray` function is also asynchronous. That is because the original generator
`alarms()` doesn't return all the alarms at once. It fetches pages only as needed. The call
to `toArray` forces all of the pages to be fetched and those are asynchronous operations. Hence,
the need to use `await` on `toArray`.

### Network Devices

Find a supervisory device by itemReference. This example uses the function
`first` provided by this library. The first function will keep fetching pages from
the server until it finds the first item that matches the given predicate. It then
stops searching the server. (This is more efficient than fetching all of the pages
from the server if we are only looking for one item, for example.)

```javascript
const supervisoryDevices = await api.supervisoryDevices();
const device = await _.first(supervisoryDevices, item => item.itemReference === 'ads:nae');
```

Building on this example we can now fetch alarms for just this network device.
To do this we call the `alarms` api and include a value for `deviceId` in the query
parameters we pass.

```javascript
const alarmsForDevices = await api.alarms({ deviceId: device.id });
```

### Alarms

Fetch alarms for a given data range.

```javascript
const queryParameters = { startTime: '2018-01-01', endTime: '2018-02-01' };
const alarms = await api.alarms(queryParameters);
```

Fetch a single alarm.

```javascript
const alarm = await api.alarm('06d68217-e4a7-48f7-a2ac-7880f328549b');
```

Fetch alarms for a device.

```javascript
const alarms = await api.alarms({ deviceId: 'ac36b7c6-51b3-5236-812f-1ad6f2470947' });
```
