import './styles.module.scss';
import type { ClientColor } from 'lib/client/colors';
import type { CSSProperties, DragEvent } from 'react';
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
import PrivateStoryContext from 'lib/client/reactContexts/PrivateStoryContext';
import { getChangedValues } from 'lib/client/forms';
import Grabber from 'components/Grabber';
import addHashToColor from 'lib/client/addHashToColor';

type StoryColorAPI = APIClient<typeof import('pages/api/stories/[storyID]/colors/[colorID]').default>;

export type ColorProps = Omit<ButtonProps, 'children' | 'icon' | 'className' | 'title' | 'style' | 'onClick'> & {
	/** The `name` of the Formik field to set the value of the selected color into. */
	name: ColorFieldProps['name'],
	editing?: boolean,
	children: ClientColor
};

/** A rendered representation of a `ClientColor`. */
const Color = ({
	name,
	editing,
	children: color,
	...props
}: ColorProps) => {
	const [, , { setValue }] = useField<string>(name);
	const { submitForm } = useFormikContext();

	const [story, setStory] = useContext(PrivateStoryContext)!;

	const ColorComponent = editing ? EditButton : Button;

	const button = (
		<ColorComponent
			icon
			className={`color${editing ? ' spaced' : ''}`}
			title={
				editing
					? 'Edit Color'
					: color.name === color.value
						? color.name
						: `${color.name} (${color.value})`
			}
			style={
				{
					'--button-color': addHashToColor(color.value)
				} as CSSProperties
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

	const onDragStartGrabber = useFunction((
		event: DragEvent<HTMLDivElement> & { target: HTMLDivElement & { parentNode: HTMLDivElement } }
	) => {
		event.dataTransfer.effectAllowed = 'move';

		const dragImageRect = event.target.parentNode.getBoundingClientRect();
		event.dataTransfer.setDragImage(
			event.target.parentNode as HTMLDivElement,
			event.clientX - dragImageRect.left,
			event.clientY - dragImageRect.top
		);
	});

	return editing ? (
		<div
			id={`color-container-${color.id}`}
			className="color-container"
		>
			<Grabber
				className="spaced"
				onDragStart={onDragStartGrabber}
			/>
			{button}
			<span
				className="color-label spaced"
				title={color.value}
			>
				{color.name}
			</span>
		</div>
	) : (
		button
	);
};

export default Color;