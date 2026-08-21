export default function ResearchQuestion({ text }) {
  if (!text) return null;
  return (
    <div className="rq">
      <div className="rq__label">Research question</div>
      <p className="rq__text">{text}</p>
    </div>
  );
}
