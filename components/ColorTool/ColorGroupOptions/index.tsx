import LabeledGrid from 'components/LabeledGrid';
import LabeledGridField from 'components/LabeledGrid/LabeledGridField';
import IDPrefix from 'lib/client/reactContexts/IDPrefix';

/**
 * A `LabeledGrid` of form fields containing options for a `ClientColorGroup`.
 *
 * Must be placed in a Formik form with a value named `name` (corresponding to the property of a `ClientColorGroup`).
 */
const ColorGroupOptions = () => (
	<IDPrefix.Provider value="color-group-options">
		<LabeledGrid>
			<LabeledGridField
				name="name"
				label="Name"
				required
				maxLength={50}
				autoComplete="off"
				autoFocus
			/>
		</LabeledGrid>
	</IDPrefix.Provider>
);

export default ColorGroupOptions;