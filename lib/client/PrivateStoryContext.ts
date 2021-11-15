import type { Dispatch, SetStateAction } from 'react';
import { createContext } from 'react';
import type { PrivateStory } from 'lib/client/stories';

/**
 * A React context for the React state of the `PrivateStory` which is the focus of the page.
 *
 * Undefined when there is no `PrivateStory` which is the focus of the page.
 */
const PrivateStoryContext = createContext<[
	PrivateStory,
	Dispatch<SetStateAction<PrivateStory>>
] | undefined>(undefined);

export default PrivateStoryContext;