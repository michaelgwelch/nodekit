/* eslint-disable no-await-in-loop, no-console */
const request = require('request-promise-native');

/**
 * @description A light weight REST API client for the the Metasys Server.
 *
 * This is a simple client designed to make it easy to deal with
 * the many collections of data provided by the server.
 *
 * Features:
 *
 * * Provides async generators for each collection resource.
 *   These hide all of the server paging from you.
 *   Instead you can iterate over the generators using `for-await`. The library
 *   will fetch additional pages as needed. (You can also use {@link first} and {@link filter}).
 *
 * @example <caption>Example usage of iterating over an async generator</caption>
 * {@lang javascript}
 * const api = require('@jci/serverkit');
 *
 * async main() {
 *   await api.login('user', 'pass', 'host');
 *
 *   const alarms = api.alarms({ priorityRange: '0,120' });
 *   for await (const alarm in alarms) {
 *     console.log(JSON.stringify(alarm, null, 2));
 *   }
 * }
 * main();
 *
 * @todo Add automatic retries
 * @todo Add better error handling
 * @todo Add methods that return array rather than generators. For now use `toArray`
 * @todo Detect when a call fails to token expiration and refresh token
 * @module serverkit
 * @tutorial example-calls
 */

/**
 * Any method that is both a generator and asynchronous. These types are new
 * to ECMAScript in version 9 (2018). They are created by defining a function
 * using the keywords `async` and `function*` like in the following:
 *
 * ```javascript
 * async function* myGenerator() {
 *   // implementation here.
 * }
 * ```
 * Such method are allowed to use `yield` in their implementation which makes it
 * easier to deal with asynchronous results. And they can be used with `await` keyword
 * which makes it easier to consume async results.
 *
 * You can use the new `for-await` statement to iterate over these generators:
 *
 * ```javascript
 * for await (const item of myGenerator()) {
 *   console.log(item);
 * }
 * ```
 *
 * All of the methods in this library that are marked `async` and `generator` return
 * instances of `AsyncGenerator`. Every method marked with these keywords have similar
 * properties:
 *
 * * The asynchronously fetch pages from the Metasys Server
 * * They only fetch a new page after you have consumed all of the items from the
 *   current page.
 * * They don't cache their results. Every time you call one of these methods it
 *   will result in calls to the server. If you want to iterate thru a collection
 *   multiple times then store the results in an array.
 *
 * At the time of writing many other utility functions for dealing with this type
 * did not exist. Some helper methods are implemented in this library.
 *
 * * {@link filter} - Filter the results of a generator. (**Note:** This filter happens on the
 *   client side.
 *   if you wish to reduce the amount of data returned by the server use query parameters
 *   in your call to limit the results.)
 * * {@link first} - Find the first item in the collection that matches your criteria.
 *   (**Note:** This happens
 *   client side. It may still results in multiple calls to the server. Use appropriate
 *   query parameters to limit the results that must be searched thru.)
 * * {@link map} - Apply a transform operation to every element in a generator.
 * @typedef {Object} AsyncGenerator
 */

/**
 * A function that takes one parameter and returns a boolean.
  * @typedef {function(*): boolean} Predicate
  */

/**
 *
 * @param {AsyncGenerator} generator
 */
async function toArray(generator) {
  const gen = (generator instanceof Promise) ? await generator : generator;
  const array = [];
  /* eslint-disable-next-line no-restricted-syntax */
  for await (const element of gen) {
    array.push(element);
  }
  return array;
}

/**
* Creates a generator that only yields the elements of the given `generator` for which the predicate
* evaluates to true.
* is true.
* @param {AsyncGenerator} generator - The generator to iterate over.
* @param {Predicate} predicate - The function called on each element.
* @returns {AsyncGenerator} - A generator that yields only the matching elements from given
* `generator`.
* @async
* @generator
*/
async function* filter(generator, predicate) {
  const gen = (generator instanceof Promise) ? await generator : generator;
  /* eslint-disable-next-line no-restricted-syntax */
  for await (const item of gen) {
    if (predicate(item)) {
      yield item;
    }
  }
}

/**
 * Iterates over elements of the generator and returns the first element it finds for which the
 * `predicate` returns true.
 * @param {AsyncGenerator|Promise<AsyncGenerator>} generator - The generator to iterate over
 * @param {Predicate} predicate - The function called on each element.
 * @returns {*} - The first element in the `generator` for which the `predicate` returns `true`, if
 * such an element exists. Returns `undefined` otherwise.
 * @async
 */
async function first(generator, predicate) {
  const gen = (generator instanceof Promise) ? await generator : generator;
  return (await filter(gen, predicate).next()).value;
}

/**
 * Returns a new generator that will apply the given transform function to each element
 * in the specified generator.
 * @param {AsyncGenerator} generator - The generator to iterate over.
 * @param {function(*): *} transform - The transform function to apply to each element.
 * @async
 * @generator
 */
async function* map(generator, transform) {
  const gen = (generator instanceof Promise) ? await generator : generator;
  /* eslint-disable-next-line no-restricted-syntax */
  for await (const item of gen) {
    yield transform(item);
  }
}

/**
*
*
* @class
*/
class MetasysServerApi {
  constructor(requestObject) {
    this.requestOriginal = requestObject || request;
  }

  /**
  * Logs the specified user into the Metasys Server and establishes a session. While this session
  * is active this instance can be used to make additional calls to the server.
  *
  * @param {String} user - The user name of the account being used to access Metasys Server
  * @param {*} pass - The password of the account being used to access Metasys Server.
  * @param {*} host - The hostname (or IP address) of the Metasys Server
  * @param {Object} [options] - Any options that you want to apply to every call as documented
  * by `request` library.
  */
  async login(user, pass, host, options) {
    this.host = host;
    const url = `https://${host}/api/v1/login`;
    const payload = { username: user, password: pass };
    try {
      // By default POSTs don't follow redirects.
      const result = await this.requestOriginal
        .post(Object.assign({
          url, json: true, followAllRedirects: true, form: payload,
        }, options));
      this.options = Object.assign({
        baseUrl: `https://${host}/api/v1`,
        json: true,
        auth: {
          bearer: result.accessToken,
        },
      }, options);
      this.rp = this.requestOriginal.defaults(this.options);
    } catch (e) {
      // check for some common issues:
      // 1. Proxy server used for local server
      // 2. Unknown host
      // 3. Bad credentials
      if (e.cause && e.cause.code === 'ECONNRESET' && e.message && e.message.startsWith('Error: tunneling')) {
        console.log('Error: There was an issue establishing a connection to the server.');
        console.log('This error is consistent with a proxy server being configured when accessing a local server,');
      } else if (e.cause && e.cause.code === 'ENOTFOUND') {
        console.log(`Error: Unknown server '${host}'.`);
      } else if (e.error && e.error.ApiErrorMessage && e.error.ApiErrorMessage.startsWith('Unable to login.')
        && e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
        console.log('Error: There was an issue logging in. Your credentials may have been incorrect. Please try again.');
      } else if (e.cause && e.cause.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
        console.log('Error: the server is using a self-signed cert that is not trusted.');
        console.log('If you trust this server, configure your computer to trust its certificate.');
      } else {
        console.log(e);
      }
      return false;
    }
    return true;
  }

  /**
  * A generator that lazily yields elements from the specified collection resource on
  * the server.
  *
  * This is a lazy function. It makes no call to the server until the first element
  * in the generator is requested by either calling `next()` or by using the `for await`
  * statement. It then only makes further calls to the server for additional pages when
  * needed.
  * @async
  * @generator
  * @param {String} collectionRelativeUrl
  * @param {Object.<string,*>} qs - An object that contains the query string parameters to include
  * on the request.
  * @private
  */
  async* generator(collectionRelativeUrl, qs) {
    let url = collectionRelativeUrl;
    try {
      while (url) {
        const { items, next } = await this.get(url, qs);
        url = next;

        yield* items;
      }
    } catch (e) {
      // Metasys API often returns 404 for empty collections
      // Convert these to empty collections rather than an error
      if (e.statusCode === 404) {
        yield* [];
      } else {
        throw e;
      }
    }
  }

  // async generatorObject(collectionRelativeUrl, qs) {
  //   const result = this.generator(collectionRelativeUrl, qs);
  //   result.toArray = () => toArray(result);
  //   return result;
  // }

  async devices(queryString) {
    return this.generator('/networkDevices', Object.assign({ pageSize: 1000 }, queryString));
  }

  async* supervisoryDevices() {
    const engineClassIds = [872, 871, 873, 877, 448, 613, 751, 192, 185, 610, 651, 193,
      358, 611, 769, 425, 753, 752];

    for (let i = 0; i < engineClassIds.length; i += 1) {
      yield* await this.devices({ type: engineClassIds[i] });
    }
  }

  async objects(options) {
    if (options.deviceId) {
      return this.generator(`/networkDevices/${options.deviceId}/objects`);
    }

    if (options.objectId) {
      return this.generator(`objects/${options.objectId}/objects`);
    }
    throw new Error('Must pass an object with either "deviceId" or "objectId" specified in calls to "objects" method.');
  }

  /**
  * A generator that yields alarms from the server.
  * @param {Object} [queryString] - The query string parameters. If not
  * specified then startTime is set to midnight of current day, and endTime is
  * set to current time. (Both times are local times.)
  * @async
  * @generator
  * @yields {Object}  The next alarm in the collection
  */
  async alarms(queryString) {
    const endTime = new Date(Date.now());
    const startTime = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
    const qs = Object.assign({ pageSize: 1000, startTime, endTime }, queryString);
    let url;
    if (queryString && queryString.deviceId) {
      url = `/networkDevices/${queryString.deviceId}/alarms`;
    } else if (queryString && queryString.objectId) {
      url = `objects/${queryString.objectId}/alarms`;
    } else {
      url = '/alarms';
    }
    return this.generator(url, qs);
  }

  async alarm(id) {
    return this.get(`/alarms/${id}`);
  }

  async audits(qs) {
    return this.generator('/audits', qs);
  }

  async equipment(qs) {
    return this.generator('/equipment', qs);
  }

  async spaces(qs) {
    return this.generator('/spaces', qs);
  }

  async trendedAttributes(objectId, qs) {
    return this.generator(`/objects/${objectId}/attributes`, qs);
  }

  async samples(objectId, attributeId, qs) {
    return this.generator(`/objects/${objectId}/attributes/${attributeId}`, qs);
  }

  assertLoggedIn() {
    if (!this.options || !this.options.auth || !this.options.auth.bearer) {
      throw new Error('Must successfully login first');
    }
  }

  /**
  * Retrieves the specified resource. This is a helper method and is not meant to be called
  * directly. Use one of the more specific methods on this class instead.
  *
  * @param {String} relativeUrl - A relative URL to the resource desired.
  * @param {Object} [qs] - An optional object that defines any query string parameters. For example
  * the object `{ startTime:'2018-08-01', endTime:'2018-08-02' }` would set the query string
  * parameters for `startTime` and `endTime`.
  * @returns {*} - Returns the JSON response as an appropriate javascript type.
  * @async
  */
  async get(relativeUrl, qs) {
    this.assertLoggedIn();
    const options = Object.assign({ url: relativeUrl }, { qs });
    return this.rp.get(options);
  }
}

class Reference {
  constructor(referenceString) {
    this.reference = referenceString;
    if (referenceString) {
      const parts = referenceString.split(':');
      [this.siteName] = parts;

      if (parts[1]) {
        const deviceParts = parts[1].split('/');
        [this.deviceName, this.path] = deviceParts;

        if (this.path) {
          this.pathParts = this.path.split('.');
        } else {
          this.pathParts = [];
        }
      }
    }

    if (!this.siteName || !this.deviceName || !this.pathParts) {
      throw new Error(`Invalid reference string: ${referenceString}`);
    }
  }

  get engineReference() {
    if (this.siteName && this.deviceName) {
      return `${this.siteName}:${this.deviceName}`;
    }
    return undefined;
  }

  get isEngineReference() {
    return this.pathParts.length === 0;
  }


  get referenceString() {
    return this.reference;
  }
}


module.exports = {
  MetasysServerApi,
  first,
  filter,
  map,
  toArray,
  Reference,
};
