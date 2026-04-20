import { ReactNode } from 'react';
import { Nav } from './Nav';

interface Props {
  children: ReactNode;
  title?: string;
}

export function Layout({ children, title }: Props) {
  return (
    <div className="min-h-screen flex flex-col">
      {title && (
        <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 sticky top-0 z-40">
          <h1 className="text-lg font-semibold text-white">{title}</h1>
        </header>
      )}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 pb-24 pt-4">
        {children}
      </main>
      <Nav />
    </div>
  );
}
