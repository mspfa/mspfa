import './styles.module.scss';
import type { ClientColor, ClientColorGroup } from 'lib/client/colors';
import React, { useContext } from 'react';
import PrivateStoryContext from 'lib/client/reactContexts/PrivateStoryContext';
import Label from 'components/Label';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import Color from 'components/ColorTool/Color';
import ColorGroupEditingLabel from 'components/ColorTool/ColorGroup/ColorGroupEditingLabel';
import type { ColorFieldProps } from 'components/ColorField';
import type { integer } from 'lib/types';
import { DROP_INDICATOR } from 'components/ColorTool/SavedColors';
import DropIndicator from 'components/ColorTool/DropIndicator';
import Row from 'components/Row';

export type ColorGroupProps = {
	/** The `name` of the Formik field to set the value of the selected color into. */
	name: ColorFieldProps['name'],
	editing?: boolean,
	/** The `ColorGroup` to render, or `null` if colors without a group should be rendered. */
	children: ClientColorGroup | null,
	/** The index in the `colors` array at which a drop indicator should be inserted. */
	dropIndicatorIndex?: integer
};

/** A rendered representation of a `ClientColorGroup`. */
const ColorGroup = ({
	name,
	editing,
	children: colorGroup,
	dropIndicatorIndex
}: ColorGroupProps) => {
	const [story] = useContext(PrivateStoryContext)!;

	const colorGroupID: ClientColor['group'] = colorGroup && colorGroup.id;

	const colors: Array<ClientColor | typeof DROP_INDICATOR> = (
		story.colors.filter(color => color.group === colorGroupID)
	);
	if (dropIndicatorIndex !== undefined) {
		colors.splice(dropIndicatorIndex, 0, DROP_INDICATOR);
	}

	// Don't render an empty `null` group when not editing.
	if (!editing && colorGroup === null && colors.length === 0) {
		return null;
	}

	const colorsElement = (
		// When not `editing`, this container `div` is necessary to allow the color buttons to wrap normally rather than being flex items.
		// When `editing`, it's to indent the colors (unless this group's label is present).
		<div className="color-group-colors">
			{colors.map(color => (
				color === DROP_INDICATOR ? (
					<DropIndicator key="drag-indicator" />
				) : (
					<Color
						key={color.id}
						name={name}
						editing={editing}
					>
						{color}
					</Color>
				)
			))}
			{!colors.some(color => color !== DROP_INDICATOR) && (
				<span className="translucent">
					(Empty)
				</span>
			)}
		</div>
	);

	// When there are no groups, this is the `null` group, and there's no need to label it.
	const noLabel = story.colorGroups.length === 0;

	if (!editing) {
		return noLabel ? (
			<Row>{colorsElement}</Row>
		) : (
			<LabeledGridRow
				label={colorGroup ? colorGroup.name : '(No Group)'}
			>
				{colorsElement}
			</LabeledGridRow>
		);
	}

	const label = !noLabel && (
		colorGroup ? (
			<ColorGroupEditingLabel>{colorGroup}</ColorGroupEditingLabel>
		) : (
			<Label block>
				(No Group)
			</Label>
		)
	);

	return (
		<Row
			id={`color-group-${colorGroupID}`}
			className="color-group"
		>
			{label}
			{colorsElement}
		</Row>
	);
};

export default ColorGroup;
