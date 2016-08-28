The gate-keeper!

If you have some remote resource you want to fetch, and you could be requesting a bunch of times, you probably don't need more than one request going at a time.

Pairs very well with the [key-master](https://github.com/TehShrike/key-master).

# Install

```sh
npm install gate-keeper
```

`var gateKeeper = require('gate-keeper')`

# Example

<!-- js
var gateKeeper = require('./')
-->

```js
let calledAlready = false
const get = gateKeeper(function getSomeRemoteResource(cb) {
	calledAlready // => false
	calledAlready = true
	setTimeout(function() {
		cb(null, 'A successful value')
	}, 50)
})

get((err, value) => {
	// err => null
	// value => 'A successful value'
})
get((err, value) => {
	// value => 'A successful value'
	get.isCurrentlyGetting() // => false
})

get.isCurrentlyGetting() // => true

```

# API

## `const get = gateKeeper(asyncGetterFunction)`

Returns a `get` function that you can use whenever you want to trigger calling `asyncGetterFunction`.

`asyncGetterFunction` will be passed a callback.  Until the callback is called, `asyncGetterFunction` will not be called again.

### `get(callback)`

Triggers the `asyncGetterFunction`, or if it is already in progress, waits for the response.  The `callback` is passed whatever values the `asyncGetterFunction` returns.

### `get.isCurrentlyGetting()`

Returns `true` if the `asyncGetterFunction` is in progress, `false` otherwise.

### `get.cancel()`

If the `asyncGetterFunction` is in progress, its results are ignored.  No previous `get` calls will have their callbacks called.

# Using with the key-master

Because you probably have more than one remote resource you could be fetching.

```js
const keyMaster = require('key-master')

const fetchers = keyMaster(key => gateKeeper(cb => {
	setTimeout(() => cb(key + ' is awesome!'), 50)
}))

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
