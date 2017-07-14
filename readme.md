The gate-keeper!

If you have some remote resource you want to fetch, and you could be requesting a bunch of times, you probably don't need more than one request going at a time.

This library uses Promises.  For the callback version, see the [1.x branch](https://github.com/TehShrike/gate-keeper/tree/1.x).

Pairs very well with the [key-master](https://github.com/TehShrike/key-master).

# Install

```sh
npm install gate-keeper
```

`const gateKeeper = require('gate-keeper')`

# Example

<!-- js
const gateKeeper = require('./')
-->

```js
let calledAlready = false
const get = gateKeeper(function getSomeRemoteResource(state) {
	// this function will only be called once, and in this example
	// won't be called again afterward.
	calledAlready // => false
	
	calledAlready = true
	
	return new Promise(resolve => {
		setTimeout(function() {
			state.isCancelled() // => false
			resolve('A successful value')
		}, 50)
	})
})

get().then(value => {
	// err => null
	// value => 'A successful value'
})
get().then(value => {
	// value => 'A successful value'
	get.isCurrentlyGetting() // => false
})

get.isCurrentlyGetting() // => true

```

# API

## `const get = gateKeeper(asyncGetterFunction)`

Returns a `get` function that you can use whenever you want to trigger calling `asyncGetterFunction`.

`asyncGetterFunction` should return a promise.  Until that promise is resolved or rejected, `asyncGetterFunction` will not be called again.

Your `asyncGetterFunction` function will be passed an object with a property named `isCancelled`, a function you can call that returns `true` or `false` depending on whether or not the gatekeeper's `cancel` method was called while the request was running.

### `get()`

Triggers the `asyncGetterFunction` if it is not running already.  Returns the promise associated with the currently-running getter.

### `get.isCurrentlyGetting()`

Returns `true` if the `asyncGetterFunction` is in progress, `false` otherwise.

### `get.cancel()`

If the `asyncGetterFunction` is in progress, its results are ignored.  Promises that are unresolved when `cancel` is called will never resolve.

# Using with the key-master

Because you probably have more than one remote resource you could be fetching.

```js
const keyMaster = require('key-master')

const fetchers = keyMaster(key => gateKeeper(() => Promise.resolve(key + ' is awesome!')))

fetchers.get('pie')(value => {
	value // => 'pie is awesome!'
})
fetchers.get('cake')(value => {
	value // => 'cake is awesome!'
})
fetchers.get('pie')(value => {
	value // => 'pie is awesome!'
})

```

# License

[WTFPL](http://wtfpl2.com/)
