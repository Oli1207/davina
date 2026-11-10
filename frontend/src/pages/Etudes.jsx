import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Tabs } from '../components/ui';
import { PageHeader } from '../components/Layout';
import Hub from './etudes/Hub';
import Courses from './etudes/Courses';
import Assignments from './etudes/Assignments';
import Speaking from './etudes/Speaking';
import Argument from './etudes/Argument';
import English from './etudes/English';
import Finance from './etudes/Finance';
import Content from './etudes/Content';

const TABS = [['plan', 'Tableau de bord'], ['matieres', 'Matières'], ['devoirs', 'Devoirs'], ['oral', 'Oral'], ['argument', 'Argumenter'], ['anglais', 'Anglais'], ['finance', 'Finance'], ['contenu', 'Contenu']];

export default function Etudes() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([k]) => k === params.get('onglet')) ? params.get('onglet') : 'plan';
  const go = (v) => setParams({ onglet: v }, { replace: true });
  return (
    <div>
      <PageHeader kicker="Savoir" title="Études" sub="Avancer un peu chaque jour pour ne jamais être submergé." />
      <Tabs tabs={TABS} value={tab} onChange={go} />
      <div className="mt-5">
        {tab === 'plan' && <Hub onTab={go} />}
        {tab === 'matieres' && <Courses />}
        {tab === 'devoirs' && <Assignments />}
        {tab === 'oral' && <Speaking />}
        {tab === 'argument' && <Argument />}
        {tab === 'anglais' && <English />}
        {tab === 'finance' && <Finance />}
        {tab === 'contenu' && <Content openIdea={params.get('idee') === '1'} />}
      </div>
    </div>
  );
}
