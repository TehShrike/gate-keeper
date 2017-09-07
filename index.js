'use strict'

const unresolvablePromise = new Promise(() => {})
const noop = () => {}
const identity = value => value

module.exports = function GateKeeper(asyncGetter) {
	let inProgress = false
	let promise = null
	let cancel = noop

	function reset() {
		inProgress = false
		promise = null
		cancel = noop
	}

	function get() {
		if (!inProgress) {
			inProgress = true
			let done = false

			function resetAndForgetThisRequest() {
				if (!done) {
					done = true
					reset()
				}
			}

			const isCancelled = () => done

			function makeResponseHandler(makeResponse = identity) {
				return value => {
					const cancelled = isCancelled()
					resetAndForgetThisRequest()
					return cancelled ? unresolvablePromise : makeResponse(value)
				}
			}

			cancel = resetAndForgetThisRequest

			promise = asyncGetter({ isCancelled })
				.then(makeResponseHandler())
				.catch(makeResponseHandler(error => Promise.reject(error)))
		}

		return promise
	}

	get.isCurrentlyGetting = () => inProgress
	get.cancel = () => cancel()

	return get
}
