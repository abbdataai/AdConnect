import { Link } from "react-router-dom";
import { STR } from "../../strings";

export function ForbiddenPage() {
  return (
    <div className="forbidden" role="alert">
      <h1 className="forbidden__title">{STR.forbidden.title}</h1>
      <p className="forbidden__sub">{STR.forbidden.sub}</p>
      <Link to="/" className="btn btn--primary">{STR.forbidden.cta}</Link>
    </div>
  );
}
