import Header from 'components/Header';
import type { ReactNode } from 'react';
import Footer from 'components/Footer';
import Dialogs from 'components/Dialog/Dialogs';
import LoadingIndicator from 'components/LoadingIndicator';
import './styles.module.scss';

export type PageProps = { children: ReactNode };

const Page = ({ children }: PageProps) => (
	<>
		{/* It is necessary for dialogs to be before the page so that dialog elements are reached first when tabbing. */}
		<Dialogs />
		<div id="page">
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