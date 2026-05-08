interface Props {
  icon?: string;
  title: string;
}

export default function SectionTitle({ icon, title }: Props) {
  return (
    <div className="section-header">
      {icon && <div className="section-icon">{icon}</div>}
      <h2>{title}</h2>
      <div className="section-line" />
    </div>
  );
}
