import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200">
      <Header />
      <main className="flex-1 container mx-auto px-6 sm:px-8 lg:px-10 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
