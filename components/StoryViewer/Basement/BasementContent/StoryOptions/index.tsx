import LabeledGrid from 'components/LabeledGrid';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import Row from 'components/Row';
import { CommentaryShownContext } from 'components/StoryViewer';
import useFunction from 'lib/client/useFunction';
import type { ChangeEvent } from 'react';
import React, { useContext } from 'react';

const StoryOptions = React.memo(() => {
	const [commentaryShown, setCommentaryShown] = useContext(CommentaryShownContext)!;

	const onChangeCommentaryShown = useFunction((event: ChangeEvent<HTMLInputElement>) => {
		setCommentaryShown(event.target.checked);
	});

	return (
		<Row className="story-options">
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
		</Row>
	);
});

export default StoryOptions;