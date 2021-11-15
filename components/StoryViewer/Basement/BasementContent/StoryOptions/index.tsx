import './styles.module.scss';
import LabeledGrid from 'components/LabeledGrid';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import Row from 'components/Row';
import { CommentaryShownContext, StoryViewerContext } from 'components/StoryViewer';
import StoryIDContext from 'lib/client/StoryIDContext';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { ChangeEvent } from 'react';
import React, { useContext } from 'react';
import RSSButton from 'components/Button/RSSButton';

const StoryOptions = React.memo(() => {
	const storyID = useContext(StoryIDContext);

	const { hasCommentary } = useContext(StoryViewerContext)!;

	const [commentaryShown, setCommentaryShown] = useContext(CommentaryShownContext)!;

	const onChangeCommentaryShown = useFunction((event: ChangeEvent<HTMLInputElement>) => {
		setCommentaryShown(event.target.checked);
	});

	return (
		<Row className="story-options">
			{hasCommentary && (
				<LabeledGrid>
					<LabeledGridRow label="Show Commentary" htmlFor="field-commentary-shown">
						<input
							type="checkbox"
							id="field-commentary-shown"
							checked={commentaryShown}
							onChange={onChangeCommentaryShown}
						/>
					</LabeledGridRow>
				</LabeledGrid>
			)}
			<Row className="story-options-buttons">
				<RSSButton href={`/s/${storyID}/rss.xml`}>
					RSS
				</RSSButton>
			</Row>
		</Row>
	);
});

export default StoryOptions;