import './styles.module.scss';
import Button from 'components/Button';
import Row from 'components/Row';
import type { PublicStory } from 'modules/client/stories';
import { useMobile } from 'modules/client/useMobile';
import { useCallback, useState } from 'react';

export type BasementProps = {
	story: PublicStory
};

/** The area of the `StoryViewer` between the `footer` and `#copyright` elements. */
const Basement = ({ story }: BasementProps) => {
	// Default to `true` to avoid loading the side ad unnecessarily.
	const mobile = useMobile(true);

	// This state is the basement section which is currently selected.
	const [section, setSection] = useState<'info' | 'comments' | 'news'>('info');

	return (
		<div id="basement">
			{section === 'info' && !mobile && (
				<div id="basement-section-latest-pages" className="basement-section mid">
					latest pages here (only shows if Info is open, not Comments or News)
				</div>
			)}
			<div id="basement-section-main" className="basement-section front">
				<Row id="basement-actions">
					<Button
						className="small"
						disabled={section === 'info'}
						onClick={
							useCallback(() => {
								setSection('info');
							}, [])
						}
					>
						Info
					</Button>
					<Button
						className="small"
						disabled={section === 'comments'}
						onClick={
							useCallback(() => {
								setSection('comments');
							}, [])
						}
					>
						Comments
					</Button>
					<Button
						className="small"
						disabled={section === 'news'}
						onClick={
							useCallback(() => {
								setSection('news');
							}, [])
						}
					>
						News
					</Button>
				</Row>
				<Row>
					info, comments, or news here (depending on which one is open)
				</Row>
			</div>
			{!mobile && (
				<div id="basement-section-wealth-dungeon" className="basement-section mid">
					side ad here (hidden on small screens)
				</div>
			)}
		</div>
	);
};

export default Basement;