import { addDays, format, startOfWeek, isSameDay } from 'date-fns';

interface Props {
  selected: Date;
  onChange: (date: Date) => void;
}

export function WeekStrip({ selected, onChange }: Props) {
  const start = startOfWeek(selected, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const today = new Date();

  return (
    <div className="flex justify-between gap-1 mb-4">
      {days.map(day => {
        const isSelected = isSameDay(day, selected);
        const isToday = isSameDay(day, today);
        return (
          <button
            key={day.toISOString()}
            onClick={() => onChange(day)}
            className={`flex-1 flex flex-col items-center py-2 rounded-lg transition-colors ${
              isSelected
                ? 'bg-green-500 text-white'
                : isToday
                ? 'bg-slate-700 text-green-400'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <span className="text-xs font-medium">{format(day, 'EEE')}</span>
            <span className="text-sm font-bold">{format(day, 'd')}</span>
            <span className={`mt-0.5 w-1 h-1 rounded-full ${isToday && !isSelected ? 'bg-green-400' : 'invisible'}`} />
          </button>
        );
      })}
    </div>
  );
}
