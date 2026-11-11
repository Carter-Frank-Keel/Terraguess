import { COUNTRIES } from '../data/countries';
import { CONTINENTS, getContinentCountries } from '../data/regions';
import { FindGameView, type FindScope } from '../components/game/FindGameView';

const SCOPES: FindScope[] = [
  { id: 'world', name: 'Whole world', pool: COUNTRIES },
  ...CONTINENTS.map((continent) => ({
    id: continent.id,
    name: continent.name,
    pool: getContinentCountries(continent.id),
    note: 'continent',
  })),
];

export default function FindCountryPage() {
  return (
    <FindGameView
      mode="find-country"
      title="Find the Country"
      subtitle="Click each named country on the interactive map"
      backTo="/"
      backLabel="Home"
      exitLabel="Home"
      scopes={SCOPES}
    />
  );
}
