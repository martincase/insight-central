import SharedView from './SharedView';

// /demo now renders the full, real tabbed client dashboard (SharedView)
// against the seeded "Demo Brand" account (share_code DEMO1, slug 'demobrand').
const DemoView = () => (
  <SharedView forcedShareId="DEMO1" forcedBrandName="demobrand" isDemo />
);

export default DemoView;
