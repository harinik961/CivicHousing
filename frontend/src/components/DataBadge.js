function DataBadge({ lastSyncedAt }) {
  if (!lastSyncedAt) {
    return null;
  }

  const date = new Date(lastSyncedAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <span className="badge bg-secondary">
      Data as of {formattedDate}
    </span>
  );
}

export default DataBadge;
