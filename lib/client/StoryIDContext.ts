import type { StoryID } from 'lib/server/stories';
import React from 'react';

/**
 * A React context for the ID of the story which is the focus of the page.
 *
 * Undefined when there is no story which is the focus of the page.
 */
const StoryIDContext = React.createContext<StoryID | undefined>(undefined);

export default StoryIDContext;