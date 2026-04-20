interface Props {
  message: string;
  icon?: string;
}

export function EmptyState({ message, icon = '📭' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm">{message}</p>
    </div>
  );
}
