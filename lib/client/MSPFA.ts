// This module's exports are exposed to the client as a global object called `MSPFA`.

export { default as api } from 'lib/client/api';
export { default as Dialog } from 'lib/client/Dialog';
export { default as loadScript } from 'lib/client/loadScript';
export { getUser, promptSignIn, promptSignOut, setUserMerge, getUserMerge } from 'lib/client/users';
export { startLoading, stopLoading } from 'components/LoadingIndicator';
export { default as BBTags } from 'components/BBCode/BBTags';
export { monthNames, getTime, getAbsoluteTimestamp, getShortTimestamp, getRelativeTimestamp } from 'lib/client/dates';