import { useContext } from 'react';
import { useField } from 'formik';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import SaveButton from 'components/Button/SaveButton';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'components/Dialog';
import useAutoSelect from 'lib/client/reactHooks/useAutoSelect';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import PrivateStoryContext from 'lib/client/reactContexts/PrivateStoryContext';
import type { ColorFieldProps } from 'components/ColorField';
import ColorField from 'components/ColorField';
import Row from 'components/Row';
import SavedColors from 'components/ColorTool/SavedColors';
import type { ColorOptionsValues } from 'components/ColorTool/ColorOptions';
import ColorOptions from 'components/ColorTool/ColorOptions';
import Action from 'components/Dialog/Action';

type StoryColorsAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors').default>;

export type ColorToolProps = ColorFieldProps;

/** The content of a color BB tool. */
const ColorTool = ({ name }: ColorToolProps) => {
	const [, { value }] = useField<string>(name);

	const [story, updateStory] = useContext(PrivateStoryContext) || [];

	const saveColor = useFunction(async () => {
		const initialValues: ColorOptionsValues = {
			group: '',
			name: '',
			value
		};

		const dialog = await Dialog.create<ColorOptionsValues>(
			<Dialog
				id="color-options"
				title="Save Color"
				initialValues={initialValues}
			>
				<ColorOptions />

				<Action>Save!</Action>
				{Action.CANCEL}
			</Dialog>
		);

		if (dialog.canceled) {
			return;
		}

		const { data: color } = await (api as StoryColorsAPI).post(`/stories/${story!.id}/colors`, {
			group: dialog.values.group || null,
			name: dialog.values.name,
			value: dialog.values.value
		});

		updateStory!(story => {
			story.colors.push(color);
		});
	});

	return (
		<>
			<Row>
				<LabeledGrid>
					<LabeledGridRow htmlFor="bb-tool-field-attributes" label="Color">
						<ColorField
							name={name}
							required
							innerRef={useAutoSelect()}
						/>
						{story && (
							<SaveButton
								className="spaced"
								title="Save Color"
								onClick={saveColor}
							/>
						)}
					</LabeledGridRow>
				</LabeledGrid>
			</Row>
			{story && !!(story.colors.length || story.colorGroups.length) && (
				<Row>
					<SavedColors name={name} />
				</Row>
			)}
		</>
	);
};

export default ColorTool;
