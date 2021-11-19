import './styles.module.scss';
import type { ClientColorGroup } from 'lib/client/colors';
import React, { useContext } from 'react';
import PrivateStoryContext from 'lib/client/PrivateStoryContext';
import Label from 'components/Label';
import LabeledGridRow from 'components/LabeledGrid/LabeledGridRow';
import Row from 'components/Row';
import Color from 'components/ColorTool/Color';
import ColorGroupLabel from 'components/ColorTool/ColorGroup/ColorGroupLabel';
import type { ColorFieldProps } from 'components/ColorField';

export type ColorGroupProps = {
	/** The `name` of the Formik field to set the value of the selected color into. */
	name: ColorFieldProps['name'],
	editing?: boolean,
	/** The `ColorGroup` to render, or undefined if colors without a group should be rendered. */
	children: ClientColorGroup | undefined
};

/** A rendered representation of a `ClientColorGroup`. */
const ColorGroup = ({
	name,
	editing,
	children: colorGroup
}: ColorGroupProps) => {
	const [story] = useContext(PrivateStoryContext)!;

	const colorGroupID = colorGroup?.id;
	const colors = story.colors.filter(({ group }) => group === colorGroupID);

	const colorsComponent = (
		// When not `editing`, this container `div` is necessary to allow the color buttons to wrap normally rather than being flex items.
		// When `editing`, it's to indent the colors.
		<div
			className={`color-group-colors${colors.length ? '' : ' translucent'}`}
		>
			{colors.length ? (
				colors.map(color => (
					<Color
						key={color.id}
						name={name}
						editing={editing}
					>
						{color}
					</Color>
				))
			) : (
				'(Empty)'
			)}
		</div>
	);

	return editing || story.colorGroups.length === 0 ? (
		<Row
			id={`color-group-${colorGroupID}`}
			className="color-group"
		>
			{colorGroup ? (
				<ColorGroupLabel>{colorGroup}</ColorGroupLabel>
			) : (
				// Only label these colors as not in a group if there are any groups.
				story.colorGroups.length !== 0 && (
					<Label block>
						(No Group)
					</Label>
				)
			)}
			{colorsComponent}
		</Row>
	) : (
		<LabeledGridRow
			label={colorGroup ? colorGroup.name : '(No Group)'}
		>
			{colorsComponent}
		</LabeledGridRow>
	);
};

export default ColorGroup;