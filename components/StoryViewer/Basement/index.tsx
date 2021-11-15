import './styles.module.scss';
import { useMobile } from 'lib/client/reactHooks/useMobile';
import BasementSidebar from 'components/StoryViewer/Basement/BasementSidebar';
import BasementContent from 'components/StoryViewer/Basement/BasementContent';
import BasementWealthDungeon from 'components/StoryViewer/Basement/BasementWealthDungeon';

const Basement = () => {
	// Default to `true` to avoid loading the side ad unnecessarily.
	const mobile = useMobile(true);

	return (
		<div id="basement">
			<BasementSidebar />
			<BasementContent />
			{!mobile && <BasementWealthDungeon />}
		</div>
	);
};

export default Basement;