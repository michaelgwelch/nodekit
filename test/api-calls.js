const rp = require('request-promise-native');
require('chai').should();
const sinon = require('sinon');
const { MetasysServerApi } = require('../index');

/* eslint-env mocha */
/* eslint-disable func-names, prefer-arrow-callback */

/*
@todo:
1. Call sinon.restore after each test
2. test login method
3. Use catch where clause for login error handling.


*/

function getDates() {
  const now = Date.now();
  const thirtyMinutesFromNow = now + 30 * 60 * 1000;
  return {
    date: now,
    expires: thirtyMinutesFromNow,
  };
}


afterEach(() => {
  // Restore the default sandbox here
  sinon.restore();
});

context('MetasysApi', function () {
  describe('login', function () {
    beforeEach(function () {
      this.testToken = 'Gx83js83j';
      const { expires } = getDates();
      this.stub = sinon.stub(rp, 'post').resolves({
        accessToken: this.testToken,
        expires,
      });

      sinon.stub(rp, 'get').resolves({ items: [0, 1, 2] });
      // sinon.stub(rp, 'defaults').returns(this.git);
      this.api = new MetasysServerApi();
    });

    afterEach(function () {
      rp.post.restore();
      rp.get.restore();
    });

    it('sends a post with username, password in json', async function () {
      await this.api.login('meta', 'pass', 'host');

      this.stub.getCall(0).args[0].should.deep.include({ form: { username: 'meta', password: 'pass' } });
    });

    it('ensure that we follow redirects even on POST', async function () {
      await this.api.login('', '', '');

      this.stub.getCall(0).args[0].should.deep.include({ followAllRedirects: true });
    });

    it('calls the correct url with the correct hostname', async function () {
      await this.api.login('', '', 'MyComputer');

      this.stub.getCall(0).args[0].should.deep.include({ url: 'https://MyComputer/api/v1/login' });
    });

    it('passes along any options specified as fourth parameter to the request library', async function () {
      const options = { madeUpField: true, otherMadeUpField: 'myString' };
      await this.api.login('', '', '', options);

      this.stub.getCall(0).args[0].should.deep.include(options);
    });

    it('stores the received accessToken (for future use)', async function () {
      await this.api.login('', '', '');

      this.api.options.auth.bearer.should.equal(this.testToken);
    });

    it('given I\'ve logged in with options, all calls afterwards will pass along those options', async function () {
      const options = { madeUpField: true, otherMadeUpField: 'myString' };
      await this.api.login('', '', '', options);

      // async generators don't actually invoke get until at least the first element is accessed.
      // So we force a call by calling next.
      (await this.api.devices()).next();
      (await this.api.alarms()).next();

      this.get.getCall(0).args[0].should.deep.include(options);
      this.get.getCall(1).args[0].should.deep.include(options);
    });
  });

  context('after login', function () {
    describe('alarms', function () {
      beforeEach(async function () {
        this.testToken = 'Gx83js83j';
        const { expires } = getDates();
        this.stub = sinon.stub(rp, 'post').resolves({
          accessToken: this.testToken,
          expires,
        });

        this.get = sinon.stub(rp, 'get').resolves({ items: [0, 1, 2] });
        // sinon.stub(rp, 'defaults').returns(this.git);
        this.api = new MetasysServerApi();
        await this.api.login('', '', '');
      });

      afterEach(function () {
        rp.post.restore();
        rp.get.restore();
      });

      it('can be called without query string options', async function () {
        await this.api.alarms();
      });
    });
  });
});
