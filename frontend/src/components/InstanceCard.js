export default function InstanceCard({ title, children }) {
  return (
    <div className="card shadow-sm border-10 pb-4">
      <div className="card-body pb-4">
        <h5 className="card-title">{title}</h5>
        {children}
      </div>
    </div>
  );
}
