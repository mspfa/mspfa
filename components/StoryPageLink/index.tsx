import type { LinkProps } from 'components/Link';
import Link from 'components/Link';
import type { StoryPageID } from 'lib/server/stories';
import { useContext } from 'react';
import StoryIDContext from 'lib/client/reactContexts/StoryIDContext';
import PreviewModeContext from 'lib/client/reactContexts/PreviewModeContext';

export type StoryPageLinkProps = Omit<LinkProps, 'href' | 'shallow'> & {
	pageID: StoryPageID
};

/** A shallow `Link` to a story's page that automatically gets its `s` and `preview` query params from the values of `StoryIDContext` and `PreviewModeContext`. */
const StoryPageLink = ({ pageID, ...props }: StoryPageLinkProps) => {
	const storyID = useContext(StoryIDContext);
	const previewMode = useContext(PreviewModeContext);

	return (
		<Link
			href={`/?s=${storyID}&p=${pageID}${previewMode ? '&preview=1' : ''}`}
			shallow
			{...props}
		/>
	);
};

export default StoryPageLink;