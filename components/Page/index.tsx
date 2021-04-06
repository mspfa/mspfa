import Header from 'components/Header';
import type { ReactNode } from 'react';
import Footer from 'components/Footer';
import Dialogs from 'components/Dialog/Dialogs';
import LoadingIndicator from 'components/LoadingIndicator';
import './styles.module.scss';

export type PageProps = { children: ReactNode };

const Page = ({ children }: PageProps) => (
	<>
		{/* This only exists to preload the Homestuck-Regular font so that, later, a fallback font doesn't flicker for a moment while Homestuck-Regular lazy-loads. */}
		<span id="preload-font" />
		{/* It is necessary for dialogs to be before the page so that dialog elements are reached first when tabbing. */}
		<Dialogs />
		<div id="page" className="layer-mid">
			<Header />
			<main>
				{children}
			</main>
			<Footer />
		</div>
		<LoadingIndicator />
	</>
);

export default Page;