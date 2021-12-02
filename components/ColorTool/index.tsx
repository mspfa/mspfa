import { useContext } from 'react';
import { useField } from 'formik';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import SaveButton from 'components/Button/SaveButton';
import LabeledGrid from 'components/LabeledGrid';
import useFunction from 'lib/client/reactHooks/useFunction';
import Dialog from 'lib/client/Dialog';
import useAutoSelect from 'lib/client/reactHooks/useAutoSelect';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import PrivateStoryContext from 'lib/client/reactContexts/PrivateStoryContext';
import type { ColorFieldProps } from 'components/ColorField';
import ColorField from 'components/ColorField';
import Row from 'components/Row';
import SavedColors from 'components/ColorTool/SavedColors';
import ColorOptions from 'components/ColorTool/ColorOptions';

type StoryColorsAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors').default>;

export type ColorToolProps = ColorFieldProps;

/** The content of a color BB tool. */
const ColorTool = ({ name }: ColorToolProps) => {
	const [, { value }] = useField<string>(name);

	const [story, setStory] = useContext(PrivateStoryContext) || [];

	const saveColor = useFunction(async () => {
		// Close any existing color options dialog.
		await Dialog.getByID('color-options')?.resolve();

		const dialog = new Dialog({
			id: 'color-options',
			title: 'Save Color',
			initialValues: {
				group: '',
				name: value,
				value
			},
			content: <ColorOptions />,
			actions: [
				{ label: 'Save!', autoFocus: false },
				'Cancel'
			]
		});

		if (!(await dialog)?.submit) {
			return;
		}

		const { data: color } = await (api as StoryColorsAPI).post(`/stories/${story!.id}/colors`, {
			...dialog.form!.values.group && {
				group: dialog.form!.values.group
			},
			name: dialog.form!.values.name,
			value: dialog.form!.values.value
		});

		setStory!(story => ({
			...story,
			colors: [
				...story.colors,
				color
			]
		}));
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