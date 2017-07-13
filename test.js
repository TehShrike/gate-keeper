'use strict'

const test = require('tape')
const gateKeeper = require('./')
const pFinally = require('p-finally')
const pDelay = require('delay')

const testAwaitOnPromise = (t, tests) => pFinally(Promise.all(
	tests.map(promise => promise.catch(err => t.err(err)))
)).then(() => t.end())

test(`Only make one function call for multiple requests`, t => {
	let called = 0
	const get = gateKeeper(() => {
		called++
		return Promise.resolve('success')
	})

	function assertGetWorked(value) {
		t.equal(value, 'success')
	}

	testAwaitOnPromise(t, [
		get().then(assertGetWorked),
		get().then(assertGetWorked),
		get().then(assertGetWorked).then(() => t.equal(called, 1, 'only called once')),
	])
})

test(`Rejections are passed through`, t => {
	const get = gateKeeper(() => Promise.reject('rejected'))
	get()
	get().catch(value => {
		t.equal(value, 'rejected')
		t.end()
	})
})

test(`gated function is called twice when it should be`, t => {
	let called = 0
	const get = gateKeeper(() => {
		called++
		return Promise.resolve('success')
	})

	testAwaitOnPromise(t, [
		get(),
		get(),
		get().then(() => {
			get()
			get().then(() => {
				t.equal(called, 2)
			})
		})
	])
})

test(`isCurrentlyGetting function`, t => {
	const get = gateKeeper(() => {
		t.ok(get.isCurrentlyGetting(), 'Should be getting before the promise is returned')
		return pDelay(100).then(() => 'success')
	})

	t.notOk(get.isCurrentlyGetting())
	get()
	get().then(() => {
		t.notOk(get.isCurrentlyGetting())
		t.end()
	})
	t.ok(get.isCurrentlyGetting())

	process.nextTick(() => t.ok(get.isCurrentlyGetting()))
})

test(`cancel function`, t => {
	let getterCalled = 0
	const get = gateKeeper(() => {
		getterCalled++
		const callNumber = getterCalled
		return pDelay(callNumber * 50).then(() => callNumber)
	})

	const fail = () => t.fail('Should not resolve')
	get().then(fail)
	get().then(fail)
	process.nextTick(() => {
		get.cancel()
		t.notOk(get.isCurrentlyGetting())
		get()
		get().then(callNumber => {
			t.equal(getterCalled, 2, 'getter was called twice')
			t.equal(callNumber, 2, 'the result is from the second time the getter was called')
			t.end()
		})
	})
})

test(`isCancelled method exposed to inner function`, t => {
	const get = gateKeeper(({ isCancelled }) => {
		t.equal(isCancelled(), false)
		return pDelay(100).then(() => {
			t.equal(isCancelled(), true)
			t.end()
		})
	})
	get()
	setTimeout(() => get.cancel(), 20)
})

test(`resolved promises are ignored after cancellation`, t => {
	const get = gateKeeper(() => pDelay(100))
	const promise = get()
	promise.then(() => t.fail(`Should never be resolved`))
	promise.catch(() => t.fail(`Should never be rejected`))
	setTimeout(() => get.cancel(), 20)
	setTimeout(() => t.end(), 200)
})

test(`rejected promises are ignored after cancellation`, t => {
	const get = gateKeeper(() => pDelay(100).then(() => Promise.reject('rejected')))
	const promise = get()
	promise.then(() => t.fail(`Should never be resolved`))
	promise.catch(() => t.fail(`Should never be rejected`))
	setTimeout(() => get.cancel(), 20)
	setTimeout(() => t.end(), 200)
})
