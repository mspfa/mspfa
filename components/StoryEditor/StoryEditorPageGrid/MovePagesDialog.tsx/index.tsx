import Dialog from 'components/Dialog';
import Action from 'components/Dialog/Action';
import { Field } from 'formik';
import getPagesString from 'lib/client/getPagesString';
import invalidPublishedOrder from 'lib/client/invalidPublishedOrder';
import type { ClientStoryPage, ClientStoryPageRecord } from 'lib/client/stories';
import type { StoryPageID } from 'lib/server/stories';
import type { integer } from 'lib/types';
import { useEffect, useRef } from 'react';

export type MovePagesDialogValues = {
	relation: 'before' | 'after',
	targetPageID: number | ''
};

export type MovePagesDialogProps = {
	pages: ClientStoryPageRecord,
	selectedPages: StoryPageID[],
	pageCount: integer
};

const MovePagesDialog = ({
	pages,
	selectedPages,
	pageCount
}: MovePagesDialogProps) => {
	const targetPageIDInputRef = useRef<HTMLInputElement>(null as never);

	const selectedPagesString = getPagesString(selectedPages);

	const getTargetPageIDCustomValidity = ({ relation, targetPageID }: MovePagesDialogValues) => {
		const targetIsValid = typeof targetPageID === 'number' && targetPageID in pages;
		if (!targetIsValid) {
			// Let the browser handle the invalid page ID via the props on the `targetPageID` field.
			return '';
		}

		if (selectedPages.includes(targetPageID)) {
			return 'Please choose a page which is not selected.';
		}

		/** The ID of `moveAfterPage`. May not index a real page after the `while` loop. */
		let moveAfterPageID = targetPageID;
		if (relation === 'before') {
			moveAfterPageID--;
		}
		while (selectedPages.includes(moveAfterPageID)) {
			moveAfterPageID--;
		}

		/** The deselected page which the selected pages are being moved after. */
		const moveAfterPage = pages[moveAfterPageID] as ClientStoryPage | undefined;

		// The `lowestSelectedPage` is being moved after the `moveAfterPage`, so check if that arrangement is valid.
		if (moveAfterPage) {
			const lowestSelectedPage = pages[Math.min(...selectedPages)];

			if (invalidPublishedOrder(moveAfterPage, lowestSelectedPage)) {
				return `Page ${lowestSelectedPage.id} can't be moved after page ${moveAfterPage.id} because then page ${lowestSelectedPage.id} would be published first.`;
			}
		}

		/** The ID of `moveBeforePage`. May not index a real page after the `while` loop. */
		let moveBeforePageID = targetPageID;
		if (relation === 'after') {
			moveBeforePageID++;
		}
		while (selectedPages.includes(moveBeforePageID)) {
			moveBeforePageID++;
		}

		/** The deselected page which the selected pages are being moved before. */
		const moveBeforePage = pages[moveBeforePageID] as ClientStoryPage | undefined;

		// The `highestSelectedPage` is being moved before the `moveBeforePage`, so check if that arrangement is valid.
		if (moveBeforePage) {
			const highestSelectedPage = pages[Math.max(...selectedPages)];

			if (invalidPublishedOrder(highestSelectedPage, moveBeforePage)) {
				return `Page ${highestSelectedPage.id} can't be moved before page ${moveBeforePage.id} because then page ${moveBeforePage.id} would be published first.`;
			}
		}

		// All is valid.
		return '';
	};

	return (
		<Dialog<MovePagesDialogValues>
			id="move-pages"
			title="Move Pages"
			initialValues={{
				relation: 'after',
				targetPageID: ''
			}}
		>
			{function Content({ values }) {
				const targetPageIDCustomValidity = getTargetPageIDCustomValidity(values);

				useEffect(() => {
					targetPageIDInputRef.current.setCustomValidity(targetPageIDCustomValidity);
				}, [targetPageIDCustomValidity]);

				return (
					<>
						Where do you want to move {selectedPagesString}?<br />
						<br />
						This cannot be undone.<br />
						<br />
						<Field as="select" name="relation">
							<option value="before">before</option>
							<option value="after">after</option>
						</Field>
						{' page '}
						<Field
							type="number"
							name="targetPageID"
							required
							min={1}
							max={pageCount}
							autoFocus
							innerRef={targetPageIDInputRef}
						/>

						<Action>Move!</Action>
						{Action.CANCEL}
					</>
				);
			}}
		</Dialog>
	);
};

export default MovePagesDialog;
