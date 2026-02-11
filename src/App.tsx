import { useState } from 'react';
import MainMenu from './MainMenu';
import AssetBrowser from './AssetBrowser';
import SkeldMapTest from './SkeldMapTest';

type Page = 'menu' | 'browser' | 'skeld';

export default function App() {
  const [page, setPage] = useState<Page>('menu');

  switch (page) {
    case 'menu':
      return <MainMenu onNavigate={setPage} />;
    case 'browser':
      return <AssetBrowser onBack={() => setPage('menu')} />;
    case 'skeld':
      return <SkeldMapTest onBack={() => setPage('menu')} />;
  }
}
