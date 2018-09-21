const rp = require('request-promise-native');
const should = require('chai').should();
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
      const { date, expires } = getDates();
      this.stub = sinon.stub(rp, 'post').resolves({
        headers: { date },
        body: { accessToken: 'mytoken', expires },
      });
      this.api = new MetasysServerApi();
    });

    afterEach(function () {
      rp.post.restore();
    });

    it('sends a post with username, password in json', async function () {
      await this.api.login('meta', 'pass', 'host');

      this.stub.getCall(0).args[0].should.deep.include({ form: { username: 'meta', password: 'pass' } });
    });

    it('ensure that we follow redirects even on POST', async function () {
      await this.api.login('', '', '');

      this.stub.getCall(0).args[0].should.deep.include({ followAllRedirects: true });
    });
  });
});
