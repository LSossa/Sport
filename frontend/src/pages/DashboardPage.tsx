import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addWeeks, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { WeekStrip } from '../components/dashboard/WeekStrip';
import { CategoryCard } from '../components/dashboard/CategoryCard';
import { GamificationSection } from '../components/dashboard/GamificationSection';
import { useWeeklyDashboard } from '../hooks/useDashboard';

export function DashboardPage() {
  const [weekDate, setWeekDate] = useState(new Date());
  const { data, isLoading } = useWeeklyDashboard(weekDate);
  const navigate = useNavigate();

  const goToPrevWeek = () => setWeekDate(d => subWeeks(d, 1));
  const goToNextWeek = () => setWeekDate(d => addWeeks(d, 1));

  const handleDayClick = (date: string) => navigate(`/history?date=${date}`);

  return (
    <Layout title="Sport Tracker">
      <div className="flex items-center justify-between mb-2">
        <button onClick={goToPrevWeek} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
          <ChevronLeft size={20} className="text-slate-400" />
        </button>
        <span className="text-sm text-slate-400 font-medium">
          Week of {data ? format(new Date(data.start + 'T00:00:00'), 'MMM d') : '…'}
        </span>
        <button onClick={goToNextWeek} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
          <ChevronRight size={20} className="text-slate-400" />
        </button>
      </div>

      <WeekStrip selected={weekDate} onChange={setWeekDate} />

      <GamificationSection />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-slate-800 rounded-xl h-24 animate-pulse" />)}
        </div>
      ) : data ? (
        <>
          <CategoryCard label="Workouts" icon="🏋️" data={data.workouts} weekStart={weekDate} onDayClick={handleDayClick} />
          <CategoryCard label="Meals" icon="🍽️" data={data.meals} weekStart={weekDate} onDayClick={handleDayClick} />
          <CategoryCard label="Shakes" icon="🥤" data={data.shakes} weekStart={weekDate} onDayClick={handleDayClick} />
          <CategoryCard label="Vitamins" icon="💊" data={data.vitamins} weekStart={weekDate} onDayClick={handleDayClick} />
          <CategoryCard label="Water" icon="💧" data={data.water} weekStart={weekDate} isWater waterGoal={data.water_goal_ml} onDayClick={handleDayClick} />
        </>
      ) : null}
    </Layout>
  );
}
