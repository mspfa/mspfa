import { Fragment } from 'react';

export type DelimitProps = {
	children?: JSX.Element | JSX.Element[],
	/** The element to delimit this component's children with. */
	with: JSX.Element
};

/**
 * ⚠️ To avoid unnecessary virtual DOM complexity, please use this sparingly.
 *
 * Inserts the delimiter element set in the `with` prop between each child of this component.
 *
 * Each child has a `key` prop which defaults to its `id` prop, or to its index in this component's children if its `id` is undefined.
 *
 * Example:
 * ```
 * <Delimit with={<span className="delimiter"> | </span>}>
 * 	<span>example 1</span>
 * 	<span>example 2</span>
 * 	<span key="my-key">example 3</span>
 * </Delimit>
 * ```
 *
 * Example output:
 * ```
 * <>
 * 	{[
 * 		<Fragment key={0}>
 * 			<span>example 1</span>
 * 		</Fragment>,
 * 		<Fragment key={1}>
 * 			<span className="delimiter"> | </span>
 * 			<span>example 2</span>
 * 		</Fragment>,
 * 		<Fragment key="my-key">
 * 			<span className="delimiter"> | </span>
 * 			<span>example 3</span>
 * 		</Fragment>
 * 	]}
 * </>
 * ```
 */
const Delimit = ({ children = [], with: delimiter }: DelimitProps) => (
	<>
		{
			Array.isArray(children)
				? children.map((child, index) => (
					<Fragment key={child.key === null ? child.props.id || index : child.key}>
						{index !== 0 && delimiter}
						{child}
					</Fragment>
				))
				: children
		}
	</>
);

export default Delimit;