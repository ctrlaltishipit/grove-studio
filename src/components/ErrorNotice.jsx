// Plain, calm, no exclamation mark. Never reflect a raw provider or database
// error string to an observer.
export default function ErrorNotice({ children }) {
  if (!children) return null;
  return <div className="notice" role="alert">{children}</div>;
}
