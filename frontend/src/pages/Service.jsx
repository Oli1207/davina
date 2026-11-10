import { useSearchParams } from 'react-router-dom';
import { Tabs } from '../components/ui';
import { PageHeader } from '../components/Layout';
import { Intercession } from './Esprit';
import Terrain from './Terrain';
import Impact from './Impact';
import Circle from './Circle';

const TABS = [['intercession', 'Intercession'], ['terrain', 'Terrain'], ['impact', 'Impact'], ['cercle', 'Mon cercle']];

/** Service : porter les autres, aller à leur rencontre, mesurer ce qui change pour eux, s'entourer. */
export default function Service() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('onglet')) ? params.get('onglet') : 'intercession';
  return (
    <div>
      <PageHeader kicker="Mission et relations" title="Service" sub="Prier pour les autres, les écouter, voir ce qui change grâce à toi, s'entourer." />
      <Tabs tabs={TABS} value={tab} onChange={(v) => setParams({ onglet: v }, { replace: true })} />
      <div className="mt-5">
        {tab === 'intercession' && <Intercession />}
        {tab === 'terrain' && <Terrain embedded />}
        {tab === 'impact' && <Impact embedded />}
        {tab === 'cercle' && <Circle embedded />}
      </div>
    </div>
  );
}
