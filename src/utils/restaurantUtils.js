import { MdStar, MdStarHalf, MdStarOutline } from 'react-icons/md';

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export function checkIsOpenNow(restaurant) {
  if (!restaurant.is_active) return false;
  const hours = restaurant.opening_hours;
  if (!hours || Object.keys(hours).length === 0) return true;
  const now = new Date();
  const dayKey = DAY_KEYS[now.getDay()];
  const todayHours = hours[dayKey];
  if (!todayHours) return true;
  if (todayHours.closed) return false;
  if (!todayHours.open || !todayHours.close) return true;
  const [oh, om] = todayHours.open.split(':').map(Number);
  const [ch, cm] = todayHours.close.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;
  return nowMinutes >= openMinutes && nowMinutes < closeMinutes;
}

export function renderStars(value) {
  const v = Math.round((value || 0) * 2) / 2;
  return (
    <span aria-label={`Rating ${v} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i + 1 <= v;
        const half = !filled && i + 0.5 === v;
        return filled
          ? <MdStar key={i} style={{ color: '#f5a623', marginRight: 2 }} />
          : half
          ? <MdStarHalf key={i} style={{ color: '#f5a623', marginRight: 2 }} />
          : <MdStarOutline key={i} style={{ color: '#f5a623', marginRight: 2 }} />;
      })}
    </span>
  );
}
