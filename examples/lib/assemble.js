(function () {
    'use strict';

    // thunks for external libraries (replace copies with external references)

    if (heya) {
        heya.defer && (ml.defer = heya.defer);
        heya.state && (ml.StateMachine = heya.state.StateMachine, ml.makeState = heya.state.makeState);
        if (heya.async && heya.async.FastDeferred) {
            ml.async = heya.async;
            ml.Deferred = heya.async.FastDeferred;
            if (heya.async.timeout) {
                ml.timeout = heya.async.timeout(heya.async.FastDeferred);
            }
        }
        if (heya.io) {
            ml.io = heya.io;
            ml.io.Deferred = ml.Deferred;
            heya.io.mock && heya.io.mock.attach();
        }
    }
}());
