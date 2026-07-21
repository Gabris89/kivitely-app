export type NavIconName =
  | "dashboard"
  | "issues"
  | "add"
  | "blockers"
  | "documents"
  | "worklog"
  | "tig"
  | "workflow"
  | "subcontractors"
  | "projects"
  | "more"
  | "logout";

export function NavIcon({ name }: { name: NavIconName }) {
  switch (name) {
    case "dashboard":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M4 11l8-7 8 7" />
          <path d="M6 10v9h5v-5h2v5h5v-9" />
        </svg>
      );
    case "issues":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 4l9 16H3z" />
          <path d="M12 10v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "add":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "blockers":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 4l4 14H8z" />
          <path d="M9.3 12h5.4" />
          <path d="M6 18h12" />
        </svg>
      );
    case "documents":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v4h4" />
          <path d="M9.5 12h5M9.5 15.5h5" />
        </svg>
      );
    case "worklog":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M6 4h12v16H6z" />
          <path d="M9 4v16" />
          <path d="M13 10h4M13 13h4M13 16h2.5" />
        </svg>
      );
    case "tig":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 4l7 3v5c0 5-3 7.5-7 8-4-.5-7-3-7-8V7z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "workflow":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M5 5h4v14H5zM10 5h4v9h-4zM15 5h4v11h-4z" />
        </svg>
      );
    case "subcontractors":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M4 15a8 8 0 0 1 16 0z" />
          <path d="M2 15h20" />
          <path d="M11 4v3" />
        </svg>
      );
    case "projects":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M6 20V6h6v14M12 20V10h6v10" />
          <path d="M8 9h2M8 13h2M14 13h2M14 16h2" />
        </svg>
      );
    case "more":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="nav-icon-dots">
          <circle cx="7" cy="7" r="1.6" />
          <circle cx="12" cy="7" r="1.6" />
          <circle cx="17" cy="7" r="1.6" />
          <circle cx="7" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="17" cy="12" r="1.6" />
          <circle cx="7" cy="17" r="1.6" />
          <circle cx="12" cy="17" r="1.6" />
          <circle cx="17" cy="17" r="1.6" />
        </svg>
      );
    case "logout":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M9 4H5v16h4" />
          <path d="M13 8l4 4-4 4" />
          <path d="M17 12H9" />
        </svg>
      );
  }
}
