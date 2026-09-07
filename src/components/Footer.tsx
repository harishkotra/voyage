interface Props {
  compact?: boolean;
}

export default function Footer({ compact = false }: Props) {
  return (
    <div className={`credit ${compact ? "credit-compact" : ""}`}>
      <span>
        Built by{" "}
        <a
          href="https://harishkotra.me"
          target="_blank"
          rel="noopener noreferrer"
        >
          Harish Kotra
        </a>
      </span>
      <span className="credit-sep">·</span>
      <span>
        Check out my other builds →{" "}
        <a
          href="https://dailybuild.xyz"
          target="_blank"
          rel="noopener noreferrer"
        >
          dailybuild.xyz
        </a>
      </span>
    </div>
  );
}
