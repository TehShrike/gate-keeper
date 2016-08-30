module.exports = function GateKeeper(asyncGetter) {
	let inProgress = false
	let queue = []
	let cancel = noop

	function reset() {
		inProgress = false
		queue = []
		cancel = noop
	}

	function get(cb) {
		queue.push(cb)

		if (!inProgress) {
			let done = false
			inProgress = true

			function resetAndForgetThisRequest() {
				if (!done) {
					done = true
					reset()
				}
			}

			function getterCallback(...args) {
				if (!done) {
					const lastQueue = queue
					resetAndForgetThisRequest()
					lastQueue.forEach(cb => process.nextTick(() => cb.apply(null, args)))
				}
			}

			getterCallback.isCancelled = function isCancelled() {
				return done
			}

			cancel = resetAndForgetThisRequest
			process.nextTick(() => asyncGetter(getterCallback))
		}
	}

	function isCurrentlyGetting() {
		return inProgress
	}

	get.isCurrentlyGetting = isCurrentlyGetting
	get.cancel = () => cancel()

	return get
}

function noop() {}
