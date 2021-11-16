import type { ClientColorGroup } from 'lib/client/colors';
import EditButton from 'components/Button/EditButton';
import Label from 'components/Label';
import useFunction from 'lib/client/reactHooks/useFunction';
import type { APIClient } from 'lib/client/api';

type StoryColorGroupAPI = APIClient<typeof import('pages/api/stories/[storyID]/colorGroups/[colorGroupID]').default>;

export type ColorGroupLabelProps = {
	children: ClientColorGroup
};

/** A `Label` representing a `ClientColorGroup` when saved colors are being edited. */
const ColorGroupLabel = ({ children: colorGroup }: ColorGroupLabelProps) => (
	<Label
		block
		afterLabel={(
			<EditButton
				className="spaced"
				onClick={
					useFunction(() => {

					})
				}
			/>
		)}
	>
		{colorGroup.name}
	</Label>
);

export default ColorGroupLabel;