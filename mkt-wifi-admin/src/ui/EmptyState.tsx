type Props = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: Props) {
  return (
    <div className="empty">
      <h3 className="empty__title">{title}</h3>
      {description && <p className="empty__sub">{description}</p>}
    </div>
  );
}
