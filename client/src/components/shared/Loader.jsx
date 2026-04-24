export default function Loader({ label = 'Loading' }) {
  return (
    <div className="loader-wrap" aria-live="polite">
      <div className="loader" />
      <span>{label}</span>
    </div>
  );
}
