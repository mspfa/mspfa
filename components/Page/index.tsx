import Header from 'components/Header';
import type { ReactNode } from 'react';
import Footer from 'components/Footer';
import Dialogs from 'components/Dialog/Dialogs';
import LoadingIndicator from 'components/LoadingIndicator';
import Heading from 'components/Heading';
import './styles.module.scss';

export type PageProps = {
	heading?: ReactNode,
	margin?: boolean,
	children: ReactNode
};

const Page = ({ heading, margin, children }: PageProps) => (
	<>
		{/* This only exists to preload the Homestuck-Regular font so that, later, a fallback font doesn't flicker for a moment while Homestuck-Regular lazy-loads. */}
		<span id="preload-font" />
		{/* It is necessary for dialogs to be before the page so that dialog elements are reached first when tabbing. */}
		<Dialogs />
		<div id="page" className="layer-mid">
			<Header />
			<main className={margin ? 'margin' : undefined}>
				{(heading
					? <Heading>{heading}</Heading>
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