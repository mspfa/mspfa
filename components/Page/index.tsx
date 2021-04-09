import Header from 'components/Header';
import type { ReactNode } from 'react';
import Footer from 'components/Footer';
import Dialogs from 'components/Dialog/Dialogs';
import LoadingIndicator from 'components/LoadingIndicator';
import PageHeading from 'components/Page/PageHeading';
import './styles.module.scss';

export type PageProps = {
	/** The content of the heading displayed at the top of the page. */
	heading?: ReactNode,
	/** Whether the page has margins. */
	margin?: boolean,
	children: ReactNode
};

const Page = ({ heading, margin, children }: PageProps) => (
	<>
		{/* This only exists to preload the Homestuck-Regular font so that, later, a fallback font doesn't flicker for a moment while Homestuck-Regular lazy-loads. */}
		<span id="preload-font" />
		{/* It is necessary for dialogs to be before the page so that dialog elements are reached first when tabbing. */}
		<Dialogs />
		<div id="page" className="mid">
			<Header />
			<main className={margin ? 'margin' : undefined}>
				{(heading
					? <PageHeading>{heading}</PageHeading>
					: null
				)}
				{children}
			</main>
			<Footer />
		</div>
		<LoadingIndicator />
	</>
);

export default Page;