export default function NewFeatureCard({ item, onAction }) {
  return (
    <div className="border rounded-lg p-4">
      <h3>{item.title}</h3>
      <button onClick={() => onAction(item)}>
        Action
      </button>
    </div>
  );
}
