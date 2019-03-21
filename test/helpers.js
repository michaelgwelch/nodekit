const _ = require('../index');
require('chai').should();

/* eslint-env mocha, chai */
/* eslint-disable func-names, prefer-arrow-callback */
/* eslint-disable no-restricted-syntax, no-unused-expressions, no-empty-function */

async function* numbers() {
  yield* [1, 2, 3, 4, 5];
}

async function throws() {
  throw new Error('Error');
}

async function* numbersThatThrow() {
  yield* [1, 3, 2];
  yield throws();
}

function isEven(e) {
  return e % 2 === 0;
}

context('api comes with query functions for async generators', function () {
  describe('toArray', function () {
    it('expects a generator, iterates thru it and returns an array of all elements from the generator in same order', async function () {
      const generator = await numbers();
      const result = await _.toArray(generator);
      result.should.deep.equal([1, 2, 3, 4, 5]);
    });

    it('will accept a promise of a generator, await it, and then return the array of elements', async function () {
      const result = await _.toArray(numbers());
      result.should.deep.equal([1, 2, 3, 4, 5]);
    });
  });

  describe('first', function () {
    it('expects a generator, iterates thru it until it finds the first element that matches and then returns it', async function () {
      const generator = await numbers();
      await _.first(generator, () => true);
    });
    it('will accept a promise of a generator, await it, and then return the first element matching the predicate', async function () {
      await _.first(numbers(), () => true);
    });

    it('stops iterating as soon as it finds the first matching element, else this would throw', async function () {
      // this should not throw
      const element = await _.first(numbersThatThrow(), isEven);
      element.should.equal(2);
    });
  });

  describe('filter', function () {
    it('expects a generator and filters down to those elements that match the predicate', async function () {
      const generator = await numbers();
      const result = await _.toArray(_.filter(generator, isEven));
      result.should.deep.equal([2, 4]);
    });

    it('will accept a promise of a generator, await it, and then apply the filter', async function () {
      const result = await _.toArray(_.filter(numbers(), isEven));
      result.should.deep.equal([2, 4]);
    });
  });
});
