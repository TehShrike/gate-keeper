'use strict'

const test = require('tape')
const gateKeeper = require('./')

test(`Only make one function call for multiple requests`, t => {
	let called = 0
	let responses = 0
	const get = gateKeeper(cb => process.nextTick(() => {
		called++
		cb(null, 'success')
	}))

	function assertGetWorked(err, value) {
		responses++
		t.error(err, 'no error')
		t.equal(value, 'success')

		if (responses === 3) {
			t.equal(called, 1, 'only called once')
			t.end()
		}
	}

	get(assertGetWorked)
	get(assertGetWorked)
	get(assertGetWorked)
})

test(`No zalgo`, t => {
	let firstRun = true
	let responses = 0

	const get = gateKeeper(cb => cb('yup'))

	function assertGetWorked() {
		responses++
		t.notOk(firstRun)

		if (responses === 2) {
			t.end()
		}
	}

	get(assertGetWorked)
	get(assertGetWorked)

	firstRun = false
})

test(`only calls each function once, even after a second fetch`, t => {
	let called = 0
	const get = gateKeeper(cb => {
		called++
		cb('success')
	})

	function functionThatCanOnlyBeCalledOnceFactory() {
		let beenCalledBefore = false
		return function(value) {
			t.equal(value, 'success')
			t.notOk(beenCalledBefore)
			beenCalledBefore = true
		}
	}

	get(functionThatCanOnlyBeCalledOnceFactory())
	get(functionThatCanOnlyBeCalledOnceFactory())
	get(() => {
		get(functionThatCanOnlyBeCalledOnceFactory())
		get(() => {
			t.equal(called, 2)
			t.end()
		})
	})
})

test(`isCurrentlyGetting function`, t => {
	const get = gateKeeper(cb => {
		t.ok(get.isCurrentlyGetting())
		setTimeout(() => {
			t.ok(get.isCurrentlyGetting())
			cb('success')
		}, 100)
	})

	t.notOk(get.isCurrentlyGetting())
	get(() => {})
	get(() => {
		t.notOk(get.isCurrentlyGetting())
		t.end()
	})
	t.ok(get.isCurrentlyGetting())

	process.nextTick(() => t.ok(get.isCurrentlyGetting()))
})

test(`cancel function`, t => {
	let getterCalled = 0
	const get = gateKeeper(cb => {
		getterCalled++
		const callNumber = getterCalled
		setTimeout(() => {
			cb(callNumber)
		}, callNumber * 50)
	})

	get(() => t.fail())
	get(() => t.fail())
	process.nextTick(() => {
		get.cancel()
		t.notOk(get.isCurrentlyGetting())
		get(() => {})
		get(callNumber => {
			t.equal(getterCalled, 2, 'getter was called twice')
			t.equal(callNumber, 2, 'the result is from the second time the getter was called')
			t.end()
		})
	})
})

test(`calling the callback multiple times is ignored`, t => {
	let trickyCallbackQueuedAlready = false
	const get = gateKeeper(cb => {
		cb('yup')
		cb('uh huh')
		process.nextTick(() => cb('ignore'))
		if (!trickyCallbackQueuedAlready) {
			trickyCallbackQueuedAlready = true
			setTimeout(() => {
				get(value => {
					t.equal(value, 'yup')
					t.end()
				})
				cb('whatever')
			}, 50)
		}
	})

	function onlyTheFirstValue(value) {
		t.equal(value, 'yup')
	}

	get(onlyTheFirstValue)
	get(onlyTheFirstValue)

	setTimeout(() => {
		get(onlyTheFirstValue)
	}, 10)
})

test(`isCancelled method exposed to inner function`, t => {
	const get = gateKeeper(cb => {
		t.equal(cb.isCancelled(), false)
		setTimeout(() => {
			t.equal(cb.isCancelled(), true)
			t.end()
		}, 100)
	})
	get(value => value)
	setTimeout(() => get.cancel(), 20)
})
