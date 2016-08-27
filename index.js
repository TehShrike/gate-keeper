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
			function resetAndForgetThisRequest() {
				if (!done) {
					done = true
					reset()
				}
			}
			cancel = resetAndForgetThisRequest
			inProgress = true
			process.nextTick(() => asyncGetter((...args) => {
				if (!done) {
					const lastQueue = queue
					resetAndForgetThisRequest()
					lastQueue.forEach(cb => process.nextTick(() => cb.apply(null, args)))
				}
			}))
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
