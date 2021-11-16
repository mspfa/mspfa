import './styles.module.scss';
import type { ClientColor } from 'lib/client/colors';
import type { CSSProperties } from 'react';
import { useContext } from 'react';
import type { ButtonProps } from 'components/Button';
import Button from 'components/Button';
import useFunction from 'lib/client/reactHooks/useFunction';
import { useField, useFormikContext } from 'formik';
import type { ColorFieldProps } from 'components/ColorField';
import EditButton from 'components/Button/EditButton';
import Dialog from 'lib/client/Dialog';
import ColorOptions from 'components/ColorTool/ColorOptions';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import PrivateStoryContext from 'lib/client/PrivateStoryContext';
import { getChangedValues } from 'lib/client/forms';

type StoryColorAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors/[colorID]').default>;

export type ColorButtonProps = Omit<ButtonProps, 'children' | 'icon' | 'className' | 'title' | 'style' | 'onClick'> & {
	/** The `name` of the Formik field to set the value of the selected color into. */
	name: ColorFieldProps['name'],
	editing?: boolean,
	children: ClientColor
};

/** An icon button representing a `ClientColor`. */
const ColorButton = ({
	name,
	editing,
	children: color,
	...props
}: ColorButtonProps) => {
	const [, , { setValue }] = useField<string>(name);
	const { submitForm } = useFormikContext();

	const [story, setStory] = useContext(PrivateStoryContext)!;

	const ColorButtonComponent = editing ? EditButton : Button;

	const button = (
		<ColorButtonComponent
			icon
			className={`color-button${editing ? ' editing spaced' : ''}`}
			title={
				editing
					? 'Edit Color'
					: color.name === color.value
						? color.name
						: `${color.name} (${color.value})`
			}
			style={
				{ '--button-color': color.value } as CSSProperties
			}
			onClick={
				useFunction(async () => {
					if (editing) {
						// Close any existing color options dialog.
						await Dialog.getByID('color-options')?.resolve();

						const dialog = new Dialog({
							id: 'color-options',
							title: 'Edit Color',
							initialValues: {
								group: color.group || '',
								name: color.name,
								value: color.value
							},
							content: <ColorOptions />,
							actions: [
								{ label: 'Delete', value: 'delete' },
								{ label: 'Save', submit: true, autoFocus: false },
								'Cancel'
							]
						});

						const dialogResult = await dialog;

						if (dialogResult?.value === 'delete') {
							if (!await Dialog.confirm({
								id: 'delete-color',
								title: 'Delete Color',
								content: (
									<>
										Are you sure you want to delete this saved color?<br />
										<br />
										<i>
											{color.name === color.value ? (
												color.name
											) : (
												`${color.name} (${color.value})`
											)}
										</i><br />
										<br />
										This cannot be undone.
									</>
								)
							})) {
								return;
							}

							await (api as StoryColorAPI).delete(`/stories/${story.id}/colors/${color.id}`);

							setStory(story => {
								const colorIndex = story.colors.findIndex(({ id }) => id === color.id);

								return {
									...story,
									colors: [
										...story.colors.slice(0, colorIndex),
										...story.colors.slice(colorIndex + 1, story.colors.length)
									]
								};
							});

							return;
						}

						if (!dialogResult?.submit) {
							return;
						}

						const changedValues = getChangedValues<Parameters<StoryColorAPI['patch']>[1]>(
							dialog.form!.initialValues,
							dialog.form!.values
						);

						if (!changedValues) {
							return;
						}

						if (changedValues.group === '') {
							changedValues.group = null;
						}

						const { data: newColor } = await (api as StoryColorAPI).patch(`/stories/${story.id}/colors/${color.id}`, changedValues);

						setStory(story => {
							const colorIndex = story.colors.findIndex(({ id }) => id === color.id);

							return {
								...story,
								colors: [
									...story.colors.slice(0, colorIndex),
									newColor,
									...story.colors.slice(colorIndex + 1, story.colors.length)
								]
							};
						});
					} else {
						setValue(color.value);
						submitForm();
					}
				})
			}
			{...props}
		/>
	);

	return editing ? (
		<div className="color-button-container">
			{button}
			<span
				className="color-button-label spaced"
				title={color.value}
			>
				{color.name}
			</span>
		</div>
	) : (
		button
	);
};

export default ColorButton;