import type { Updater } from 'use-immer';
import { createContext } from 'react';
import type { PrivateStory } from 'lib/client/stories';

/**
 * A React context for the React state of the `PrivateStory` which is the focus of the page.
 *
 * Undefined when there is no `PrivateStory` which is the focus of the page.
 */
const PrivateStoryContext = createContext<[
	PrivateStory,
	Updater<PrivateStory>
] | undefined>(undefined);

export default PrivateStoryContext;
