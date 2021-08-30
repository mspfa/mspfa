import React from 'react';

/** A React context for whether the user is preview mode, which shows unpublished story pages. */
const PreviewModeContext = React.createContext(false);

export default PreviewModeContext;