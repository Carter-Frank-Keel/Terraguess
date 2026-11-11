import { COUNTRIES } from '../data/countries';
import { NameGameView } from '../components/game/NameGameView';

export default function NameCountriesPage() {
  return (
    <NameGameView
      pool={COUNTRIES}
      mode="name-all"
      title="Name All Countries"
      subtitle="195 countries · 193 UN members plus the Holy See and Palestine"
      backTo="/"
      backLabel="Home"
      exitLabel="Home"
    />
  );
}
