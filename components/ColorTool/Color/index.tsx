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
import Dialog from 'components/Dialog';
import ColorOptions from 'components/ColorTool/ColorOptions';
import type { APIClient } from 'lib/client/api';
import api from 'lib/client/api';
import PrivateStoryContext from 'lib/client/reactContexts/PrivateStoryContext';
import { getChangedValues } from 'lib/client/forms';
import Grabber from 'components/Grabber';
import addHashToColor from 'lib/client/addHashToColor';
import classNames from 'classnames';
import Action from 'components/Dialog/Action';

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

	const [story, updateStory] = useContext(PrivateStoryContext)!;

	const ColorComponent = editing ? EditButton : Button;

	const button = (
		<ColorComponent
			icon
			className={classNames('color', { spaced: editing })}
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
						const initialValues = {
							group: color.group || '',
							name: color.name,
							value: color.value
						};

						type Values = typeof initialValues;
						type Action = 'delete';
						const dialog = await Dialog.create<Values, Action>(
							<Dialog
								id="color-options"
								title="Edit Color"
								initialValues={initialValues}
							>
								<ColorOptions />
								<Action cancel value="delete">Delete</Action>
								<Action>Save</Action>
								{Action.CANCEL}
							</Dialog>
						);

						if (dialog.action === 'delete') {
							if (!await Dialog.confirm(
								<Dialog id="delete-color" title="Delete Color">
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
								</Dialog>
							)) {
								return;
							}

							await (api as StoryColorAPI).delete(`/stories/${story.id}/colors/${color.id}`);

							updateStory(story => {
								const colorIndex = story.colors.findIndex(({ id }) => id === color.id);

								story.colors.splice(colorIndex, 1);
							});
							return;
						}

						if (dialog.canceled) {
							return;
						}

						const changedValues = getChangedValues<Parameters<StoryColorAPI['patch']>[1]>(
							dialog.initialValues,
							dialog.values
						);

						if (!changedValues) {
							return;
						}

						if (changedValues.group === '') {
							changedValues.group = null;
						}

						const { data: newColor } = await (api as StoryColorAPI).patch(`/stories/${story.id}/colors/${color.id}`, changedValues);

						updateStory(story => {
							const colorIndex = story.colors.findIndex(({ id }) => id === color.id);

							story.colors[colorIndex] = newColor;
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
