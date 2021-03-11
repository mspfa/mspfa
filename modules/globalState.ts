import { useState, useEffect } from 'react';

/** Creates a global state. */
const createGlobalState = <StateType>(
	/** The initial value of the global state. */
	initialState: StateType
) => {
	let currentState = initialState;
	
	const stateChangeCallbacks: Array<() => void> = [];
	
	/**
	 * The setter function of the global state. Takes a new value for the global state as an argument.
	 *
	 * This can be called inside or outside a React component. Its identity remains the same between renders.
	 */
	const setGlobalState = (newState: StateType) => {
		currentState = newState;
		for (let i = 0; i < stateChangeCallbacks.length; i++) {
			stateChangeCallbacks[i]();
		}
	};
	
	/**
	 * The React hook for the global state. Returns `[globalState, setGlobalState]`, just like a [state hook](https://reactjs.org/docs/hooks-state.html).
	 *
	 * This must follow the [rules of hooks](https://reactjs.org/docs/hooks-rules.html).
	 */
	const useGlobalState = () => {
		const [state, setState] = useState(currentState);
		
		useEffect(() => {
			const changeState = () => {
				setState(currentState);
			};

			stateChangeCallbacks.push(changeState);

			return () => {
				stateChangeCallbacks.splice(stateChangeCallbacks.indexOf(changeState), 1);
			};
		}, []);
		
		return [state, setGlobalState];
	};
	
	return [useGlobalState, setGlobalState] as [
		typeof useGlobalState,
		typeof setGlobalState
	];
};

export default createGlobalState;