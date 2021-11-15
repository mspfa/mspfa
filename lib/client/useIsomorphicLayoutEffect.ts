import { useEffect, useLayoutEffect } from 'react';

/** Equivalent to `useLayoutEffect`, except it works both client-side and server-side. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default useIsomorphicLayoutEffect;