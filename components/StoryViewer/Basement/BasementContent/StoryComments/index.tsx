import BBField from 'components/BBCode/BBField';
import Button from 'components/Button';
import Label from 'components/Label';
import Row from 'components/Row';
import type { FormikHelpers } from 'formik';
import { Formik, Form } from 'formik';
import { useLeaveConfirmation } from 'lib/client/forms';
import IDPrefix from 'lib/client/IDPrefix';
import useFunction from 'lib/client/useFunction';
import React from 'react';

const StoryComments = React.memo(() => (
	<IDPrefix.Provider value="story-comments">
		<Formik
			initialValues={{ content: '' }}
			onSubmit={
				useFunction(async (
					values: { content: string },
					formikHelpers: FormikHelpers<{ content: string }>
				) => {
					console.log(values.content);

					formikHelpers.setFieldValue('content', '');
				})
			}
		>
			{function StoryCommentsForm({ dirty, isSubmitting }) {
				useLeaveConfirmation(dirty);

				return (
					<Form className="row story-comments-form">
						<Label block htmlFor="story-comments-field-content">
							Post a Comment
						</Label>
						<BBField
							name="content"
							required
							maxLength={2000}
							rows={3}
							disabled={isSubmitting}
						/>
						<div className="story-comments-form-actions">
							<Button
								type="submit"
								className="small"
								disabled={isSubmitting}
							>
								Submit!
							</Button>
						</div>
					</Form>
				);
			}}
		</Formik>
		<Row className="story-comments">
			comments here
		</Row>
	</IDPrefix.Provider>
));

export default StoryComments;