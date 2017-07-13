'use strict'

const unresolvablePromise = new Promise(() => {})

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

			cancel = resetAndForgetThisRequest
			promise = asyncGetter({ isCancelled })
				.then(value => {
					const cancelled = isCancelled()
					resetAndForgetThisRequest()
					return cancelled ? unresolvablePromise : value
				})
				.catch(error => {
					const cancelled = isCancelled()
					resetAndForgetThisRequest()
					return cancelled ? unresolvablePromise : Promise.reject(error)
				})
		}

		return promise
	}

	function isCurrentlyGetting() {
		return inProgress
	}

	get.isCurrentlyGetting = isCurrentlyGetting
	get.cancel = () => cancel()

	return get
}

function noop() {}
